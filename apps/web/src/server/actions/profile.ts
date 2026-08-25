"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiMutate, ApiError } from "../api-client";
import { getAccessToken } from "../auth";

export interface ProfileFormState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  businessName: z.string().max(200).optional(),
  bio: z.string().max(1000).optional(),
});

/** Update the agent's profile / agency details via PATCH /auth/me. */
export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const token = await getAccessToken();
  if (!token) return { error: "Please sign in again." };

  const parsed = schema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    businessName: formData.get("businessName") || undefined,
    bio: formData.get("bio") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form" };

  try {
    await apiMutate("PATCH", "/auth/me", { token, body: parsed.data });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return { error: "Please sign in again." };
    return { error: "Could not save your profile." };
  }

  revalidatePath("/dashboard/settings");
  return { ok: true };
}
