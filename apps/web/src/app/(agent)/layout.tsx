import Link from "next/link";

/**
 * Agent back-office shell (placeholder).
 * Phase 4 replaces this with the harvested studio-admin dashboard shell
 * (dark sidebar SP-1) wired to agent auth + the data-access layer.
 */
export default function AgentLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-border/60 bg-card sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Homes · Agent
          </Link>
          <span className="text-muted-foreground text-sm">Back-office</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
