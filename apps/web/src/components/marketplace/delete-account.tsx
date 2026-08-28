"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteAccountAction, type DeleteAccountState } from "@/server/actions/account";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-red-600 px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Permanently delete my account"}
    </button>
  );
}

/**
 * GDPR "delete my account" control. Two-step: the destructive form is revealed
 * only after an explicit confirm click, and requires the password (verified
 * server-side) before submitting.
 */
export function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState<DeleteAccountState, FormData>(deleteAccountAction, {});

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-full border border-red-300 px-5 py-2.5 text-[14px] font-semibold text-red-700 transition-colors hover:bg-red-50"
      >
        Delete my account
      </button>
    );
  }

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3">
      <p className="text-hof text-[14px]">
        This permanently deletes your account and personal data. Saved searches, favorites and
        alerts are removed. This cannot be undone.
      </p>
      <div className="flex flex-col gap-1">
        <label htmlFor="delete-password" className="text-hof text-[13px] font-medium">
          Confirm your password
        </label>
        <input
          id="delete-password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="border-bebe focus:border-rausch rounded-lg border px-3 py-2 text-[14px] outline-none"
        />
        <span className="text-foggy text-[12px]">
          If you signed in with Google, leave this blank.
        </span>
      </div>
      {state.error && (
        <p role="alert" className="text-[13px] font-medium text-red-700">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <SubmitButton />
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-foggy text-[14px] font-medium hover:underline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
