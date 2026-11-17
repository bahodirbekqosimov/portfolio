/**
 * Register → verify-email o'tishida parolni faqat xotirada (JS o'zgaruvchida) ushlab turadi.
 * localStorage/sessionStorage'ga yozilmaydi: sahifa yangilansa yoki yopilsa parol yo'qoladi
 * va foydalanuvchi uni verify sahifasida qayta kiritadi.
 */

let pending: { email: string; password: string } | null = null;

export function setPendingVerification(email: string, password: string): void {
  pending = { email, password };
}

export function takePendingPassword(email: string): string | null {
  if (!pending || pending.email !== email) return null;
  return pending.password;
}

export function clearPendingVerification(): void {
  pending = null;
}

/** Eski versiya brauzerda qoldirgan parolni o'chiradi. */
export function removeLegacyStoredPassword(): void {
  try {
    localStorage.removeItem("verify_pw");
    sessionStorage.removeItem("verify_pw");
  } catch {
    // Storage bloklangan bo'lishi mumkin: o'chiradigan narsa ham yo'q.
  }
}
