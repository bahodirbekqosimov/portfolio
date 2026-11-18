// In-page replacements for window.confirm() / window.alert().
// Browsers let users suppress native dialogs ("don't allow this site to prompt again"),
// after which confirm() silently returns false and delete buttons stop working.
// These are rendered by <DialogHost /> (mounted once in the root layout) instead.

export type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export type ConfirmRequest = ConfirmOptions & {
  message: string;
  resolve: (ok: boolean) => void;
};

export type NoticeKind = "error" | "success" | "info";
export type Notice = { id: number; message: string; kind: NoticeKind };

type Listener = {
  confirm: (request: ConfirmRequest) => void;
  notify: (notice: Notice) => void;
};

let host: Listener | null = null;
let nextId = 1;

export function registerDialogHost(listener: Listener): () => void {
  host = listener;
  return () => {
    if (host === listener) host = null;
  };
}

export function confirmDialog(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  if (!host) return Promise.resolve(typeof window !== "undefined" && window.confirm(message));
  const listener = host;
  return new Promise((resolve) => listener.confirm({ ...options, message, resolve }));
}

export function notify(message: string, kind: NoticeKind = "error"): void {
  if (!host) {
    if (typeof window !== "undefined") window.alert(message);
    return;
  }
  host.notify({ id: nextId++, message, kind });
}
