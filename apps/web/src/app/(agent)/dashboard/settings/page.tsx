import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function AgentSettingsPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/dashboard/settings");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Your agent profile and agency details.</p>
      </div>
      <SettingsForm user={user} />
    </div>
  );
}
