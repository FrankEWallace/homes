"use client";

import { useEffect } from "react";

/** Error boundary for the public marketplace surface. */
export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-hof text-[22px] font-bold tracking-[-0.02em]">Something went wrong</h1>
      <p className="text-foggy text-[15px]">
        We couldn’t load this page. It may be a temporary hiccup reaching the listings service.
      </p>
      <button
        type="button"
        onClick={reset}
        className="bg-rausch rounded-full px-5 py-2.5 text-[14px] font-semibold text-white hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
