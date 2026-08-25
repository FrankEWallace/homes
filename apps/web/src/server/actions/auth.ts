"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ApiError } from "../api-client";
import { loginWithEmail, registerWithEmail, logout as logoutSession } from "../auth";

export interface AuthFormState {
  error?: string;
}

function safeNext(next: FormDataEntryValue | null): string {
  // Only allow same-site relative paths to prevent open-redirect.
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  try {
    await loginWithEmail(parsed.data.email, parsed.data.password);
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.status === 401 ? "Incorrect email or password" : err.message };
    }
    return { error: "Something went wrong. Please try again." };
  }

  redirect(safeNext(formData.get("next")));
}

const registerSchema = z.object({
  firstName: z.string().min(1, "Enter your first name"),
  lastName: z.string().min(1, "Enter your last name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  try {
    await registerWithEmail({ ...parsed.data, role: "seeker" });
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.status === 409 ? "That email is already registered" : err.message };
    }
    return { error: "Something went wrong. Please try again." };
  }

  redirect(safeNext(formData.get("next")));
}

export async function logoutAction() {
  await logoutSession();
  redirect("/");
}
