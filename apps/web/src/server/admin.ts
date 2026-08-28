import "server-only";
import { apiGet } from "./api-client";
import { getAccessToken } from "./auth";

export interface ModerationFlag {
  type: "content" | "duplicate" | "suspended";
  detail: string;
}

export interface ModerationItem {
  id: string;
  slug: string;
  title: string;
  city: string;
  address: string | null;
  status: string;
  rejectionNote: string | null;
  createdAt: string;
  host: {
    id: string;
    firstName: string;
    lastName: string;
    businessName: string | null;
    email: string | null;
  };
  flags: ModerationFlag[];
}

/**
 * Admin moderation queue — listings flagged for content, duplicates, or already
 * suspended. Admin-only; the backend enforces the role, this just carries the
 * session token. Returns [] if the caller isn't an admin or the backend errors.
 */
export async function getModerationQueue(): Promise<ModerationItem[]> {
  const token = await getAccessToken();
  if (!token) return [];
  try {
    const body = await apiGet<{ data: ModerationItem[] }>("/admin/moderation", {
      token,
      next: { revalidate: 0 },
    });
    return body.data ?? [];
  } catch {
    return [];
  }
}
