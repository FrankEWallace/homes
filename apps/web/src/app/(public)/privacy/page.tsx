import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How homes handles your personal data, and your rights over it.",
};

export const revalidate = 86400;

/**
 * Plain-language privacy summary (Phase 6 compliance). This is a good-faith
 * summary of current data practices, not a substitute for legal review before
 * launch — replace/extend with counsel-approved terms in Phase 6 task 5.
 */
export default function PrivacyPage() {
  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-12 md:px-10">
      <h1 className="text-hof text-[28px] font-bold tracking-[-0.02em]">Privacy</h1>
      <p className="text-foggy mt-2 text-[15px]">
        This summary explains what we collect and the rights you have over your data.
      </p>

      <div className="text-hof mt-8 flex flex-col gap-6 text-[15px] leading-relaxed">
        <div>
          <h2 className="text-[18px] font-semibold">What we collect</h2>
          <p className="text-foggy mt-1">
            Account details you provide (name, email, and — for agents — agency name and bio),
            the listings you save, searches you save, and enquiries you send to agents. We set an
            essential, sign-in cookie; we don&apos;t use non-essential cookies unless you accept them.
          </p>
        </div>
        <div>
          <h2 className="text-[18px] font-semibold">How we use it</h2>
          <p className="text-foggy mt-1">
            To run the marketplace: show your favorites and saved searches, send alerts you asked
            for, and deliver your enquiries to the relevant agent.
          </p>
        </div>
        <div>
          <h2 className="text-[18px] font-semibold">Your rights</h2>
          <p className="text-foggy mt-1">
            You can download a copy of your data or permanently delete your account at any time
            from your{" "}
            <Link href="/account" className="text-rausch font-medium hover:underline">
              account &amp; privacy
            </Link>{" "}
            page. Deletion removes your personal data; enquiries you sent remain with the agent as
            their record, with your identifying details removed.
          </p>
        </div>
      </div>
    </section>
  );
}
