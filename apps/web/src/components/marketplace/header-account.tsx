"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Heart, Bell, User } from "lucide-react";
import { logoutAction } from "@/server/actions/auth";

interface HeaderUser {
  firstName: string;
  lastName: string;
  email: string | null;
  role: "seeker" | "agent" | "admin";
}

/**
 * Account menu in the public header. Fetches session state client-side from
 * /api/me so the shared layout stays static and content pages keep ISR/SEO.
 */
export function HeaderAccount() {
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => {
        if (active) setUser(d.user ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="border-bebe hover:shadow-subtle inline-flex h-10 items-center gap-2 rounded-full border pl-3 pr-4 text-[14px] font-semibold transition-shadow"
      >
        <User className="size-4" />
        Sign in
      </Link>
    );
  }

  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="border-bebe hover:shadow-subtle flex h-10 items-center gap-2 rounded-full border pl-3 pr-1 transition-shadow"
      >
        <span className="bg-hof block h-0.5 w-4 shadow-[0_5px_0_0_currentColor,0_-5px_0_0_currentColor]" />
        <span className="bg-rausch grid size-7 place-items-center rounded-full text-[12px] font-bold text-white">
          {initials || <User className="size-4" />}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="border-bebe shadow-subtle absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border bg-white py-2 text-[14px]"
        >
          <div className="text-foggy border-bebe border-b px-4 pb-2 text-[12px]">
            Signed in as
            <div className="text-hof truncate text-[14px] font-semibold">{user.email ?? user.firstName}</div>
          </div>
          <MenuLink href="/favorites" icon={<Heart className="size-4" />}>
            Saved homes
          </MenuLink>
          <MenuLink href="/saved-searches" icon={<Bell className="size-4" />}>
            Saved searches
          </MenuLink>
          {user.role === "agent" ? (
            <MenuLink href="/dashboard" icon={<User className="size-4" />}>
              Agent dashboard
            </MenuLink>
          ) : null}
          <form action={logoutAction} className="border-bebe mt-1 border-t pt-1">
            <button
              type="submit"
              role="menuitem"
              className="text-hof hover:bg-faint w-full px-4 py-2 text-left font-medium"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} role="menuitem" className="text-hof hover:bg-faint flex items-center gap-3 px-4 py-2">
      {icon}
      {children}
    </Link>
  );
}
