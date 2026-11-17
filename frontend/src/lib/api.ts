/**
 * Centralized API Client
 */

const getBaseUrl = (): string => {
  if (typeof window === "undefined") {
    return process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";
  }
  return ""; // Browser uses Next.js rewrites
};

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const getStoredTokens = () => {
  if (typeof window === "undefined") return { access_token: null, refresh_token: null };
  return {
    access_token: localStorage.getItem("access_token"),
    refresh_token: localStorage.getItem("refresh_token"),
  };
};

export const setStoredTokens = (access_token: string, refresh_token: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", access_token);
  localStorage.setItem("refresh_token", refresh_token);
};

export const clearStoredTokens = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.dispatchEvent(new Event("auth:logout"));
};

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

const onRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const baseUrl = getBaseUrl();
  let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Ensure trailing slash for backend API paths to prevent 307 redirects
  if (!cleanEndpoint.includes(".")) {
    const [pathPart, queryPart] = cleanEndpoint.split("?");
    const normalizedPath = pathPart.endsWith("/") ? pathPart : `${pathPart}/`;
    cleanEndpoint = queryPart !== undefined ? `${normalizedPath}?${queryPart}` : normalizedPath;
  }

  const url = `${baseUrl}${cleanEndpoint}`;

  const headers = new Headers(options.headers || {});
  const { access_token, refresh_token } = getStoredTokens();

  if (access_token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${access_token}`);
  }

  // Set Content-Type to JSON only if body is not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized and attempt token refresh (NEVER for auth endpoints like login/register)
  const isAuthEndpoint = cleanEndpoint.startsWith("/api/v1/auth/");
  if (response.status === 401 && retry && refresh_token && !isAuthEndpoint && typeof window !== "undefined") {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setStoredTokens(data.access_token, data.refresh_token);
          isRefreshing = false;
          onRefreshed(data.access_token);
          return apiFetch<T>(endpoint, options, false);
        } else {
          isRefreshing = false;
          clearStoredTokens();
          onRefreshed(null);
        }
      } catch (err) {
        isRefreshing = false;
        clearStoredTokens();
        onRefreshed(null);
      }
    } else {
      return new Promise<T>((resolve, reject) => {
        addRefreshSubscriber((newToken) => {
          if (newToken) {
            resolve(apiFetch<T>(endpoint, options, false));
          } else {
            reject(new ApiError(401, "Session expired"));
          }
        });
      });
    }
  }

  if (!response.ok) {
    let errorDetail = "Xatolik yuz berdi.";
    let errorData: any = null;
    try {
      errorData = await response.json();
      if (typeof errorData.detail === "string") {
        errorDetail = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        const messages = errorData.detail.map((d: any) => {
          const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : "";
          const msg = d.msg || JSON.stringify(d);
          if (field === "email") return "Please enter a valid email address.";
          if (field === "password") return "Password must be at least 8 characters long.";
          if (field === "code") return "Verification code must be 6 digits (e.g. 123456).";
          if (field === "name") return "Name field is required.";
          return field ? `${field}: ${msg}` : msg;
        });
        errorDetail = messages.join(". ");
      } else if (errorData.message) {
        errorDetail = errorData.message;
      }
    } catch {
      if (response.status === 401) {
        errorDetail = "Invalid email or password.";
      } else if (response.status === 403) {
        errorDetail = "Access denied or email not verified.";
      } else if (response.status === 429) {
        errorDetail = "Too many requests. Please try again shortly.";
      } else {
        errorDetail = `Error (${response.status}): ${response.statusText}`;
      }
    }

    throw new ApiError(response.status, errorDetail, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  try {
    return await response.json();
  } catch {
    return {} as T;
  }
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { method: "GET", ...options }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) => {
    const isFormData = body instanceof FormData;
    return apiFetch<T>(endpoint, {
      method: "POST",
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    });
  },

  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) => {
    const isFormData = body instanceof FormData;
    return apiFetch<T>(endpoint, {
      method: "PATCH",
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    });
  },

  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) => {
    const isFormData = body instanceof FormData;
    return apiFetch<T>(endpoint, {
      method: "PUT",
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    });
  },

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { method: "DELETE", ...options }),
};
