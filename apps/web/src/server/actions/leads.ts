"use server";

import { z } from "zod";
import { apiMutate, ApiError } from "../api-client";
import { getAccessToken } from "../auth";

export interface LeadFormState {
  ok?: boolean;
  error?: string;
}

const leadSchema = z.object({
  listingId: z.string().min(1),
  kind: z.enum(["enquiry", "contact", "viewing_request"]).default("enquiry"),
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  message: z.string().min(10, "Please add a short message"),
  preferredAt: z.string().optional(),
  website: z.string().optional(), // honeypot
});

/** Submit an enquiry/viewing request on a listing. Public; links to the seeker if signed in. */
export async function submitLeadAction(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const parsed = leadSchema.safeParse({
    listingId: formData.get("listingId"),
    kind: formData.get("kind") ?? "enquiry",
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    message: formData.get("message"),
    preferredAt: formData.get("preferredAt") || undefined,
    website: formData.get("website") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  }

  // Attach the seeker's token when signed in so the backend links the lead.
  const token = (await getAccessToken()) ?? undefined;

  try {
    await apiMutate("POST", "/leads", {
      body: parsed.data,
      ...(token ? { token } : {}),
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) {
      return { error: "Too many messages just now — please try again in a few minutes." };
    }
    return { error: "Could not send your message. Please try again." };
  }
}
