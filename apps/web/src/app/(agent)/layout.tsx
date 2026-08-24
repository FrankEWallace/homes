import Link from "next/link";
import { AgentSidebar } from "@/components/agent/agent-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Agent back-office shell — dark-sidebar dashboard harvested from studio-admin's
 * sidebar primitive, using the app's Geist fonts (the public marketplace uses
 * DM Sans; the two surfaces stay distinct). Real data + agent auth land in Phase 4.
 */
export default function AgentLayout({ children }: LayoutProps<"/">) {
  return (
    <TooltipProvider delayDuration={0}>
    <SidebarProvider>
      <AgentSidebar />
      <SidebarInset className="min-w-0 overflow-x-clip">
        <header className="bg-background/50 sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b backdrop-blur">
          <div className="flex w-full items-center gap-2 px-4 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4 self-center" />
            <span className="text-sm font-medium">Agent workspace</span>
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
