"use server";

import { redirect } from "next/navigation";
import { ApiError } from "../api-client";
import { deleteAccount } from "../auth";

export interface DeleteAccountState {
  error?: string;
}

/**
 * GDPR erasure (Art. 17). The backend re-verifies the password and blocks
 * deletion for agents who still have live listings; we surface those messages.
 * On success the session cookies are cleared and we redirect home.
 */
export async function deleteAccountAction(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const password = formData.get("password");

  try {
    await deleteAccount(typeof password === "string" && password ? password : undefined);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) return { error: "Incorrect password." };
      if (err.status === 400) return { error: "Please enter your password to confirm." };
      if (err.status === 409) return { error: err.message }; // "Remove your listings first…"
      return { error: err.message };
    }
    return { error: "Something went wrong. Please try again." };
  }

  redirect("/?deleted=1");
}
