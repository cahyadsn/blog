"use client";

import React, { useState } from "react";
import { Mail, CheckCircle2, AlertCircle, Info, Loader2 } from "lucide-react";

export type NewsletterFormVariant = "footer" | "card" | "inline";

export interface NewsletterFormProps {
  variant?: NewsletterFormVariant;
  className?: string;
  onSuccess?: (email: string) => void;
}

export function NewsletterForm({
  variant = "footer",
  className = "",
  onSuccess,
}: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "duplicate" | "error">("idle");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setStatus("error");
      setFeedbackMessage("Silakan masukkan alamat email Anda.");
      return;
    }

    setStatus("loading");
    setFeedbackMessage("");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();

      if (data.alreadySubscribed) {
        setStatus("duplicate");
        setFeedbackMessage(data.message || "Email Anda sudah terdaftar dalam newsletter kami.");
      } else if (res.ok && data.success) {
        setStatus("success");
        setFeedbackMessage(data.message || "Terima kasih telah berlangganan newsletter kami!");
        setEmail("");
        if (onSuccess) onSuccess(cleanEmail);
      } else {
        setStatus("error");
        setFeedbackMessage(data.error || "Gagal mendaftar newsletter. Silakan periksa kembali email Anda.");
      }
    } catch {
      setStatus("error");
      setFeedbackMessage("Terjadi kendala jaringan. Silakan coba beberapa saat lagi.");
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status !== "idle") setStatus("idle");
              }}
              disabled={status === "loading"}
              placeholder="nama@email.com"
              aria-label="Alamat Email Newsletter"
              className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
              required
            />
          </div>
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none cursor-pointer shadow-sm shrink-0"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mendaftar...</span>
              </>
            ) : (
              <span>Langganan</span>
            )}
          </button>
        </div>

        {/* Feedback Alert Banners */}
        {status === "success" && (
          <div
            role="status"
            className="flex items-start gap-2.5 p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 animate-in fade-in duration-200"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <p className="leading-relaxed">{feedbackMessage}</p>
          </div>
        )}

        {status === "duplicate" && (
          <div
            role="status"
            className="flex items-start gap-2.5 p-3 rounded-xl text-xs font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 animate-in fade-in duration-200"
          >
            <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="leading-relaxed">{feedbackMessage}</p>
          </div>
        )}

        {status === "error" && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-xl text-xs font-medium bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 animate-in fade-in duration-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <p className="leading-relaxed">{feedbackMessage}</p>
          </div>
        )}
      </form>
    </div>
  );
}
