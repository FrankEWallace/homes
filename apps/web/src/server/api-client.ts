import "server-only";
import { env } from "@/lib/env";

/**
 * Typed client for the backend API — the ONLY way the web app reaches data.
 * Feature code calls the functions in `src/server/*` (which use this client),
 * never the backend or a database directly. (CLAUDE.md architecture rule 1.)
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type QueryValue = string | number | boolean | undefined | null;

function buildQuery(params?: Record<string, QueryValue | QueryValue[]>): string {
  if (!params) return "";
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      const joined = value.filter((v) => v !== undefined && v !== null).join(",");
      if (joined) usp.set(key, joined);
    } else {
      usp.set(key, String(value));
    }
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export interface ApiGetOptions {
  query?: Record<string, QueryValue | QueryValue[]>;
  /** Next.js fetch cache/revalidate controls. */
  next?: { revalidate?: number | false; tags?: string[] };
  token?: string;
}

export async function apiGet<T = unknown>(path: string, opts: ApiGetOptions = {}): Promise<T> {
  const url = `${env.API_BASE_URL}${path}${buildQuery(opts.query)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    ...(opts.next ? { next: opts.next } : {}),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body && (body.message as string)) || `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return body as T;
}
