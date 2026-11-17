export interface ParsedContact {
  href?: string;
  displayText: string;
  isExternal: boolean;
  type: "email" | "phone" | "telegram" | "url" | "text";
}

/**
 * Parses raw contact data (code schema like mailto:, tel:, https://t.me/, URLs)
 * into a clean user-facing display text and an actionable href attribute.
 */
export function parseContactData(raw: string): ParsedContact {
  if (!raw || typeof raw !== "string") {
    return { displayText: "", isExternal: false, type: "text" };
  }

  const trimmed = raw.trim();

  // 1. mailto: schema (e.g. mailto:name@example.com or mailto:name@example.com?subject=Hello)
  if (/^mailto:/i.test(trimmed)) {
    const afterScheme = trimmed.replace(/^mailto:/i, "");
    const emailOnly = afterScheme.split("?")[0].trim();
    return {
      href: trimmed,
      displayText: emailOnly || afterScheme,
      isExternal: false,
      type: "email",
    };
  }

  // 2. tel: schema (e.g. tel:+998901234567 or tel:998901234567)
  if (/^tel:/i.test(trimmed)) {
    const phone = trimmed.replace(/^tel:/i, "").trim();
    return {
      href: trimmed,
      displayText: phone,
      isExternal: false,
      type: "phone",
    };
  }

  // 3. sms: schema (e.g. sms:+998901234567)
  if (/^sms:/i.test(trimmed)) {
    const sms = trimmed.replace(/^sms:/i, "").trim();
    return {
      href: trimmed,
      displayText: sms,
      isExternal: false,
      type: "phone",
    };
  }

  // 4. tg:// schema (e.g. tg://resolve?domain=username)
  if (/^tg:\/\/resolve\?domain=/i.test(trimmed)) {
    const username = trimmed.replace(/^tg:\/\/resolve\?domain=/i, "").split("&")[0].trim();
    return {
      href: trimmed,
      displayText: username ? `@${username}` : trimmed,
      isExternal: false,
      type: "telegram",
    };
  }

  // 5. Telegram web URL: https://t.me/username or t.me/username
  const tmeMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?t\.me\/([a-zA-Z0-9_+\-]+)(?:\/.*)?$/i);
  if (tmeMatch) {
    const username = tmeMatch[1];
    return {
      href: trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
      displayText: `@${username}`,
      isExternal: true,
      type: "telegram",
    };
  }

  // 6. Generic HTTP / HTTPS URLs (e.g. https://github.com/user, https://example.com)
  if (/^https?:\/\//i.test(trimmed)) {
    let display = trimmed.replace(/^https?:\/\/(?:www\.)?/i, "");
    // Remove single trailing slash for root domains
    if (/^[^\/]+\/$/.test(display)) {
      display = display.slice(0, -1);
    }
    return {
      href: trimmed,
      displayText: display,
      isExternal: true,
      type: "url",
    };
  }

  // 7. Plain email fallback without mailto: prefix
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return {
      href: `mailto:${trimmed}`,
      displayText: trimmed,
      isExternal: false,
      type: "email",
    };
  }

  // 8. Plain phone number fallback (e.g. +998 90 123 45 67)
  if (/^\+?[0-9\s\-\(\)]{7,}$/.test(trimmed) && trimmed.replace(/\D/g, "").length >= 7) {
    const cleanDigits = trimmed.replace(/[^\d+]/g, "");
    return {
      href: `tel:${cleanDigits}`,
      displayText: trimmed,
      isExternal: false,
      type: "phone",
    };
  }

  // 9. Plain web address without protocol (e.g. github.com/user, linkedin.com/in/user)
  if (/^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/.*)?$/.test(trimmed)) {
    return {
      href: `https://${trimmed}`,
      displayText: trimmed,
      isExternal: true,
      type: "url",
    };
  }

  // 10. Fallback: plain text
  return {
    href: undefined,
    displayText: trimmed,
    isExternal: false,
    type: "text",
  };
}
