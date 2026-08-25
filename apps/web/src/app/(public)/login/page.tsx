import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · homes" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (await getSession()) redirect(safeNext);

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col px-6 py-16">
      <h1 className="text-hof mb-1 text-[26px] font-bold tracking-[-0.02em]">Welcome back</h1>
      <p className="text-foggy mb-8 text-[15px]">Sign in to save homes and searches.</p>
      <LoginForm next={safeNext} />
    </div>
  );
}
