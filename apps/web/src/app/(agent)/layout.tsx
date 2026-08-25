import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentSidebar } from "@/components/agent/agent-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSession } from "@/server/auth";

/**
 * Agent back-office shell — dark-sidebar dashboard harvested from studio-admin's
 * sidebar primitive. Gated to agents (and admins): the proxy guards on session
 * presence, and this layer enforces the role. The backend re-checks ownership +
 * role on every mutation regardless (never trust the client).
 */
export default async function AgentLayout({ children }: LayoutProps<"/">) {
  const user = await getSession();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role !== "agent" && user.role !== "admin") redirect("/");

  const agentName = user.businessName || `${user.firstName} ${user.lastName}`.trim();

  return (
    <TooltipProvider delayDuration={0}>
    <SidebarProvider>
      <AgentSidebar />
      <SidebarInset className="min-w-0 overflow-x-clip">
        <header className="bg-background/50 sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b backdrop-blur">
          <div className="flex w-full items-center gap-2 px-4 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4 self-center" />
            <span className="text-sm font-medium">{agentName}</span>
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground ml-auto text-sm transition-colors"
            >
              View site →
            </Link>
          </div>
        </header>
        <div className="min-h-0 min-w-0 flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
    </TooltipProvider>
  );
}
