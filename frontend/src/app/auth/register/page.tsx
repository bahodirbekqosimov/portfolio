"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus, User, Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { setPendingVerification } from "@/lib/pendingVerification";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isExistingAccount, setIsExistingAccount] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsExistingAccount(false);

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: cleanEmail,
        password,
      });

      // Parol faqat xotirada qoladi (brauzer storage'iga yozilmaydi).
      setPendingVerification(cleanEmail, password);
      try {
        sessionStorage.setItem("verify_email", cleanEmail);
      } catch {
        // Email URL'da ham bor, storage shart emas.
      }

      router.push(
        `/auth/verify-email?email=${encodeURIComponent(cleanEmail)}&redirect=${encodeURIComponent(
          redirect
        )}`
      );
    } catch (err: any) {
      const msg = err.message || "An error occurred during registration.";
      setError(msg);

      if (err.status === 409 || msg.includes("already")) {
        setIsExistingAccount(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-2">
          <UserPlus className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-[var(--text-main)] tracking-tight">
          Create an Account
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)]">
          Create your account on bahodirbek.uz
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>

          {isExistingAccount && (
            <div className="mt-1 pt-2 border-t border-red-500/20 flex items-center justify-between">
              <span className="text-[11px] text-red-400">Already registered?</span>
              <Link
                href={`/auth/login?redirect=${encodeURIComponent(redirect)}`}
                className="text-xs font-semibold text-orange-400 hover:text-orange-300 underline"
              >
                Go to sign in &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
            />
          </div>
        </div>

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
              Password (min. 8 characters)
            </label>
            <span className="text-[11px] text-[var(--text-muted)]">
              {password.length}/8
            </span>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)]" />
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
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

        <button
          type="submit"
          disabled={loading || !name.trim() || !email.trim() || password.length < 8}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Creating account..." : "Continue to Verification"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="pt-4 border-t border-[var(--border-color)] text-center text-xs text-[var(--text-muted)]">
        Already have an account?{" "}
        <Link
          href={`/auth/login?redirect=${encodeURIComponent(redirect)}`}
          className="font-semibold text-orange-500 hover:text-orange-600"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-sm text-[var(--text-muted)]">Loading...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
