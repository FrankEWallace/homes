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

export interface AdminCity {
  id: string;
  name: string;
  slug: string;
  tags: string[];
  isActive: boolean;
}

export interface AdminListingType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  listingCount: number;
}

export interface AdminUser {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  businessName: string | null;
  role: "seeker" | "agent" | "admin";
  status: "active" | "suspended" | "banned";
  createdAt: string;
  listingCount: number;
}

async function adminGet<T>(path: string, fallback: T): Promise<T> {
  const token = await getAccessToken();
  if (!token) return fallback;
  try {
    const body = await apiGet<{ data: T }>(path, { token, next: { revalidate: 0 } });
    return body.data ?? fallback;
  } catch {
    return fallback;
  }
}

export const getAdminCities = () => adminGet<AdminCity[]>("/admin/cities", []);
export const getAdminListingTypes = () => adminGet<AdminListingType[]>("/admin/listing-types", []);

export async function getAdminUsers(query: {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
}): Promise<{ users: AdminUser[]; total: number; page: number; totalPages: number }> {
  const token = await getAccessToken();
  const empty = { users: [], total: 0, page: 1, totalPages: 1 };
  if (!token) return empty;
  try {
    const body = await apiGet<{ data: AdminUser[]; meta: { total: number; page: number; totalPages: number } }>(
      "/admin/users",
      {
        token,
        query: { role: query.role, status: query.status, search: query.search, page: query.page },
        next: { revalidate: 0 },
      },
    );
    return {
      users: body.data ?? [],
      total: body.meta?.total ?? 0,
      page: body.meta?.page ?? 1,
      totalPages: body.meta?.totalPages ?? 1,
    };
  } catch {
    return empty;
  }
}
