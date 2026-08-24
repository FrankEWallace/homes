import Link from "next/link";
import { HeaderAccount } from "@/components/marketplace/header-account";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="marketplace flex min-h-full flex-col">
      <header className="border-bebe bg-white/95 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-6 md:px-10">
          <Link href="/" className="text-rausch text-[22px] font-bold tracking-[-0.02em]">
            homes
          </Link>
          <nav className="text-hof hidden items-center gap-8 text-[16px] font-medium sm:flex">
            <Link href="/search?tenure=sale" className="hover:text-rausch transition-colors">
              Buy
            </Link>
            <Link href="/search?tenure=rent" className="hover:text-rausch transition-colors">
              Rent
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-hof hover:bg-faint hidden rounded-full px-4 py-2 text-[14px] font-medium transition-colors sm:inline-flex"
            >
              List a property
            </Link>
            <HeaderAccount />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-bebe bg-faint text-foggy mt-12 border-t">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-1 px-6 py-8 text-[14px] md:px-10">
          <p className="text-hof font-semibold">homes</p>
          <p>© {new Date().getFullYear()} homes — a listings marketplace.</p>
        </div>
      </footer>
    </div>
  );
}
