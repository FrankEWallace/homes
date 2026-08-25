import "server-only";
import { z } from "zod";
import { apiGet } from "./api-client";
import { getAccessToken } from "./auth";

const analyticsSchema = z.object({
  totals: z.object({
    listings: z.number(),
    published: z.number(),
    views: z.number(),
    leads: z.number(),
    saved: z.number(),
  }),
  listings: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      slug: z.string(),
      status: z.string(),
      views: z.number(),
      leads: z.number(),
      saved: z.number(),
    }),
  ),
});
export type AgentAnalytics = z.infer<typeof analyticsSchema>;

/** Per-agent listing analytics, or null when signed out / not an agent. */
export async function getAgentAnalytics(): Promise<AgentAnalytics | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await apiGet<{ data: unknown }>("/listings/analytics", { token });
    return analyticsSchema.parse(res.data);
  } catch {
    return null;
  }
}
