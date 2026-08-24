"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/server/actions/auth";

const inputCls =
  "border-bebe focus:border-hof h-12 w-full rounded-xl border bg-white px-4 text-[15px] outline-none transition-colors";
const labelCls = "text-hof mb-1.5 block text-[13px] font-semibold";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

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
          autoComplete="current-password"
          required
          className={inputCls}
        />
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
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-foggy text-center text-[14px]">
        New to homes?{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-hof font-semibold underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
