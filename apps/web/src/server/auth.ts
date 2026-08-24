import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { apiMutate, apiGet, ApiError } from "./api-client";

/**
 * Web-side session layer. The backend owns identity and issues JWTs; the web app
 * stores them in httpOnly cookies and never trusts the client with authz — every
 * protected read/write carries the access token to the backend, which enforces
 * ownership and roles (CLAUDE.md rule 3).
 */

const ACCESS_COOKIE = "homes_at";
const REFRESH_COOKIE = "homes_rt";

export interface SessionUser {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: "seeker" | "agent" | "admin";
  avatarUrl: string | null;
  businessName: string | null;
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

const ACCESS_MAX_AGE = 60 * 60 * 8; // 8h — mirrors JWT_ACCESS_EXPIRES_IN
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30d

async function persistTokens(accessToken: string, refreshToken: string) {
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  jar.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });
  jar.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  });
}

/** The current access token, or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ACCESS_COOKIE)?.value ?? null;
}

/** Read the signed-in user (deduped per request), or null. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await apiGet<{ data: SessionUser }>("/auth/me", { token });
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
});

export async function loginWithEmail(email: string, password: string): Promise<SessionUser> {
  const res = await apiMutate<{ data: AuthResult }>("POST", "/auth/login-email", {
    body: { email, password },
  });
  await persistTokens(res.data.accessToken, res.data.refreshToken);
  return res.data.user;
}

export async function registerWithEmail(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: "seeker" | "agent";
  businessName?: string;
}): Promise<SessionUser> {
  const res = await apiMutate<{ data: AuthResult }>("POST", "/auth/register-email", {
    body: input,
  });
  await persistTokens(res.data.accessToken, res.data.refreshToken);
  return res.data.user;
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await apiMutate("POST", "/auth/logout", { body: { refreshToken } }).catch(() => {});
  }
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}
