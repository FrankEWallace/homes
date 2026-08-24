import "server-only";
import { z } from "zod";
import { apiGet, ApiError } from "./api-client";
import { getAccessToken } from "./auth";

export const leadStatusSchema = z.enum(["new", "contacted", "qualified", "closed"]);
export type LeadStatus = z.infer<typeof leadStatusSchema>;

export const leadSchema = z.object({
  id: z.string(),
  kind: z.enum(["enquiry", "contact", "viewing_request"]),
  status: leadStatusSchema,
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  message: z.string(),
  preferredAt: z.string().nullable(),
  createdAt: z.string(),
  listing: z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    city: z.string().nullable(),
    images: z.array(z.string()),
  }),
});
export type Lead = z.infer<typeof leadSchema>;

const listResponse = z.object({
  data: z.array(leadSchema),
  meta: z
    .object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() })
    .optional(),
});

const statsResponse = z.object({
  data: z.object({ new: z.number(), contacted: z.number(), qualified: z.number(), closed: z.number() }),
});

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
    const res = await apiGet<unknown>("/leads", {
      token,
      query: { status, limit: 50 },
    });
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
