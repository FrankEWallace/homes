import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/server/auth";
import { DeleteAccount } from "@/components/marketplace/delete-account";

export const metadata: Metadata = {
  title: "Account & privacy",
  robots: { index: false, follow: false },
};

// Personalized, per-user — never cached.
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account");

  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-12 md:px-10">
      <h1 className="text-hof text-[26px] font-bold tracking-[-0.02em]">Account &amp; privacy</h1>
      <p className="text-foggy mt-1 text-[15px]">
        Signed in as {user.firstName} {user.lastName}
        {user.email ? ` · ${user.email}` : ""}
      </p>

      <div className="mt-8 flex flex-col gap-8">
        {/* Data access / portability */}
        <div className="border-bebe rounded-2xl border p-6">
          <h2 className="text-hof text-[18px] font-semibold">Your data</h2>
          <p className="text-foggy mt-1 text-[14px]">
            Download a copy of your personal data — profile, favorites, saved searches, enquiries
            and notifications — as a JSON file.
          </p>
          <a
            href="/api/me/export"
            className="border-bebe text-hof hover:bg-faint mt-4 inline-flex rounded-full border px-5 py-2.5 text-[14px] font-semibold transition-colors"
          >
            Download my data
          </a>
        </div>

        {/* Erasure */}
        <div className="rounded-2xl border border-red-200 bg-red-50/40 p-6">
          <h2 className="text-[18px] font-semibold text-red-800">Delete account</h2>
          <p className="text-foggy mt-1 text-[14px]">
            Permanently delete your account and personal data. This cannot be undone.
          </p>
          <div className="mt-4">
            <DeleteAccount />
          </div>
        </div>
      </div>
    </section>
  );
}
