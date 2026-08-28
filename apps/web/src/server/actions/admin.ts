"use server";

import { revalidatePath } from "next/cache";
import { apiMutate, ApiError } from "../api-client";
import { getAccessToken } from "../auth";

export interface AdminActionState {
  error?: string;
  ok?: boolean;
}

async function mutate(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body: unknown,
  revalidate: string,
): Promise<AdminActionState> {
  const token = await getAccessToken();
  if (!token) return { error: "Not signed in" };
  try {
    await apiMutate(method, path, { token, ...(body !== undefined ? { body } : {}) });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Something went wrong" };
  }
  revalidatePath(revalidate);
  return { ok: true };
}

// ─── Cities ───────────────────────────────────────────────────────────────────
export async function createCityAction(input: { name: string; tags?: string[] }) {
  if (!input.name.trim()) return { error: "Name is required" };
  return mutate("POST", "/admin/cities", input, "/dashboard/taxonomy");
}
export async function updateCityAction(
  id: string,
  input: { isActive?: boolean; tags?: string[]; name?: string },
) {
  return mutate("PATCH", `/admin/cities/${id}`, input, "/dashboard/taxonomy");
}
export async function deleteCityAction(id: string) {
  return mutate("DELETE", `/admin/cities/${id}`, undefined, "/dashboard/taxonomy");
}

// ─── Property types ───────────────────────────────────────────────────────────
export async function createListingTypeAction(input: { name: string; description?: string }) {
  if (!input.name.trim()) return { error: "Name is required" };
  return mutate("POST", "/admin/listing-types", input, "/dashboard/taxonomy");
}
export async function deleteListingTypeAction(id: string) {
  return mutate("DELETE", `/admin/listing-types/${id}`, undefined, "/dashboard/taxonomy");
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function updateUserAction(
  id: string,
  input: { status?: "active" | "suspended" | "banned"; role?: "seeker" | "agent" | "admin" },
) {
  return mutate("PATCH", `/admin/users/${id}`, input, "/dashboard/users");
}
