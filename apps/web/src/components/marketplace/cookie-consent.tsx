"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "homes_cookie_consent"; // "essential" | "all"

/**
 * Cookie/consent notice (Phase 6 compliance). The app currently sets only
 * essential cookies (the httpOnly session), so this is a transparency notice
 * plus a recorded preference that gates any *future* non-essential/analytics
 * cookies. Declining is the privacy-preserving default and sets nothing extra.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // storage blocked (private mode) — don't nag; treat as essential-only.
    }
  }, []);

  function choose(choice: "essential" | "all") {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // ignore — nothing non-essential is loaded regardless.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4"
    >
      <div className="border-bebe mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border bg-white p-5 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <p className="text-hof text-[14px]">
          We use essential cookies to keep you signed in. We&apos;ll only use anything beyond that
          if you accept.{" "}
          <a href="/privacy" className="text-rausch font-medium hover:underline">
            Privacy
          </a>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => choose("essential")}
            className="border-bebe text-hof hover:bg-faint rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => choose("all")}
            className="bg-rausch rounded-full px-4 py-2 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
