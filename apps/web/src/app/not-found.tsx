import Link from "next/link";

export default function NotFound() {
  return (
    <div className="marketplace flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="text-rausch text-[56px] font-bold leading-none tracking-[-0.03em]">404</p>
      <h1 className="text-hof text-[22px] font-semibold tracking-[-0.02em]">Page not found</h1>
      <p className="text-foggy max-w-[420px] text-[15px]">
        The page you’re looking for doesn’t exist or may have moved.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="bg-rausch rounded-full px-5 py-2.5 text-[14px] font-semibold text-white hover:opacity-90"
        >
          Go home
        </Link>
        <Link
          href="/search"
          className="border-bebe text-hof hover:border-hof rounded-full border px-5 py-2.5 text-[14px] font-semibold"
        >
          Browse homes
        </Link>
      </div>
    </div>
  );
}
