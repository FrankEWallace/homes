import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { getAdminCities, getAdminListingTypes } from "@/server/admin";
import { TaxonomyManager } from "@/components/agent/taxonomy-manager";

export const dynamic = "force-dynamic";

export default async function TaxonomyPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/dashboard/taxonomy");
  if (user.role !== "admin") redirect("/dashboard");

  const [cities, types] = await Promise.all([getAdminCities(), getAdminListingTypes()]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Taxonomy</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage the cities and property types that power search, landing pages, and the listing
          form.
        </p>
      </div>
      <TaxonomyManager cities={cities} types={types} />
    </div>
  );
}
