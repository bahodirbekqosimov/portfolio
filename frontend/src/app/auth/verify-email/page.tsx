"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Mail, Lock, KeyRound, AlertCircle, Check, ArrowRight, RotateCw, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  clearPendingVerification,
  removeLegacyStoredPassword,
  takePendingPassword,
} from "@/lib/pendingVerification";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const { verifyEmail } = useAuth();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState("");
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  // Email URL yoki sessionStorage'dan; parol faqat register sahifasidan xotira orqali keladi.
  useEffect(() => {
    removeLegacyStoredPassword();
    let storedEmail: string | null = null;
    try {
      storedEmail = sessionStorage.getItem("verify_email") || localStorage.getItem("verify_email");
    } catch {
      storedEmail = null;
    }
    const effectiveEmail = (email || storedEmail || "").trim().toLowerCase();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!email && storedEmail) setEmail(storedEmail);
    const remembered = takePendingPassword(effectiveEmail);
    if (remembered) setPassword(remembered);
  }, [email]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleCodeChange = (val: string) => {
    // Only accept numeric digits up to 6
    const digits = val.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAlreadyVerified(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password to complete verification.");
      return;
    }

    if (code.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const user = await verifyEmail({
        email: cleanEmail,
        password,
        code: code.trim(),
      });

      clearPendingVerification();
      try {
        sessionStorage.removeItem("verify_email");
        localStorage.removeItem("verify_email");
      } catch {
        // Storage bloklangan.
      }

      if (user.is_admin && (redirect === "/" || redirect === "")) {
        router.push("/admin");
      } else {
        router.push(redirect);
      }
    } catch (err: any) {
      const msg = err.message || "An error occurred during verification.";
      setError(msg);

      if (msg.toLowerCase().includes("already verified")) {
        setAlreadyVerified(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter your email to resend the code.");
      return;
    }

    if (cooldown > 0 || resending) return;

    setResending(true);
    setError("");
    setResendSuccess(false);

    try {
      await api.post("/api/v1/auth/resend-code/", { email: cleanEmail });
      setResendSuccess(true);
      setCooldown(60); // 60s cooldown according to backend settings
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to resend verification code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-2">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-[var(--text-main)] tracking-tight">
          Verify Your Email
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)]">
          Enter the 6-digit verification code sent to your email
        </p>
      </div>

      {resendSuccess && (
        <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>A new verification code has been sent to your email.</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>

          {alreadyVerified && (
            <div className="mt-1 pt-2 border-t border-red-500/20 flex items-center justify-between">
              <span className="text-[11px] text-red-400">Account already verified:</span>
              <Link
                href={`/auth/login?redirect=${encodeURIComponent(redirect)}`}
                className="text-xs font-semibold text-orange-400 hover:text-orange-300 underline"
              >
                Sign in &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)]" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Password
            </label>
            {password ? (
              <span className="text-[11px] text-green-500 font-medium">
                ✓ Password filled
              </span>
            ) : (
              <span className="text-[11px] text-orange-500 font-medium">
                Enter your account password
              </span>
            )}
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)]" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-3 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              6-Digit Verification Code
            </label>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending || cooldown > 0 || !email.trim()}
              className="text-xs font-medium text-orange-500 hover:text-orange-600 disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="123456"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-lg text-[var(--text-main)] tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email.trim() || code.length !== 6}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Verifying..." : "Verify and Sign In"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="pt-4 border-t border-[var(--border-color)] text-center text-xs text-[var(--text-muted)]">
        Want to use another account?{" "}
        <Link href="/auth/login" className="font-semibold text-orange-500 hover:text-orange-600">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-sm text-[var(--text-muted)]">Loading...</div>}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
