import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Create account · homes" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (await getSession()) redirect(safeNext);

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col px-6 py-16">
      <h1 className="text-hof mb-1 text-[26px] font-bold tracking-[-0.02em]">Create your account</h1>
      <p className="text-foggy mb-8 text-[15px]">Save homes, save searches, get alerts.</p>
      <RegisterForm next={safeNext} />
    </div>
  );
}
