"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type AuthFormState } from "@/server/actions/auth";

const inputCls =
  "border-bebe focus:border-hof h-12 w-full rounded-xl border bg-white px-4 text-[15px] outline-none transition-colors";
const labelCls = "text-hof mb-1.5 block text-[13px] font-semibold";

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(registerAction, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="firstName" className={labelCls}>
            First name
          </label>
          <input id="firstName" name="firstName" autoComplete="given-name" required className={inputCls} />
        </div>
        <div className="flex-1">
          <label htmlFor="lastName" className={labelCls}>
            Last name
          </label>
          <input id="lastName" name="lastName" autoComplete="family-name" required className={inputCls} />
        </div>
      </div>

      <div>
        <label htmlFor="email" className={labelCls}>
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputCls} />
      </div>

      <div>
        <label htmlFor="password" className={labelCls}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={inputCls}
        />
        <p className="text-foggy mt-1 text-[12px]">At least 8 characters.</p>
      </div>

      {state.error ? (
        <p role="alert" className="text-rausch text-[14px]">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bg-rausch mt-2 h-12 rounded-xl text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-foggy text-center text-[14px]">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-hof font-semibold underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
