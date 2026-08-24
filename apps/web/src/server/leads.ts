import "server-only";
import { z } from "zod";
import { leadSchema, leadStatsSchema, type Lead, type LeadStatus } from "@homes/shared";
import { apiGet, ApiError } from "./api-client";
import { getAccessToken } from "./auth";

// Canonical contracts live in @homes/shared — re-exported for feature code.
export { leadSchema, leadStatusSchema, type Lead, type LeadStatus } from "@homes/shared";

const listResponse = z.object({
  data: z.array(leadSchema),
  meta: z
    .object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() })
    .optional(),
});

const statsResponse = z.object({ data: leadStatsSchema });

export interface AgentLeadsResult {
  leads: Lead[];
  total: number;
  /** True when there's no session / the user isn't an agent. */
  unauthorized: boolean;
}

/** Fetch the signed-in agent's lead inbox. */
export async function getAgentLeads(status?: LeadStatus): Promise<AgentLeadsResult> {
  const token = await getAccessToken();
  if (!token) return { leads: [], total: 0, unauthorized: true };

  try {
    const res = await apiGet<unknown>("/leads", { token, query: { status, limit: 50 } });
    const parsed = listResponse.parse(res);
    return { leads: parsed.data, total: parsed.meta?.total ?? parsed.data.length, unauthorized: false };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return { leads: [], total: 0, unauthorized: true };
    }
    throw err;
  }
}

/** Lead counts by status for the inbox tabs. */
export async function getLeadStats(): Promise<Record<LeadStatus, number> | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await apiGet<unknown>("/leads/stats", { token });
    return statsResponse.parse(res).data;
  } catch {
    return null;
  }
}
