"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleFavoriteAction } from "@/server/actions/favorites";

/**
 * Save/favorite toggle on listing cards. Optimistic: flips immediately, calls the
 * backend through a server action, and rolls back on failure. Signed-out users are
 * routed to sign in (with a return path) rather than silently no-op'ing.
 */
export function WishlistHeart({
  listingId,
  initialSaved = false,
  className,
}: {
  listingId: string;
  initialSaved?: boolean;
  className?: string;
}) {
  const [active, setActive] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    const nextActive = !active;
    setActive(nextActive); // optimistic

    startTransition(async () => {
      const result = await toggleFavoriteAction(listingId);
      if (result.authRequired) {
        setActive(false);
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      if (!result.ok) {
        setActive(!nextActive); // rollback
        return;
      }
      if (typeof result.saved === "boolean") setActive(result.saved);
    });
  };

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Remove from saved homes" : "Save home"}
      onClick={onToggle}
      className={cn(
        "grid size-8 place-items-center rounded-full transition-transform hover:scale-110",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        className,
      )}
    >
      <Heart
        className={cn(
          "size-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-colors",
          active ? "fill-rausch text-rausch" : "fill-black/25 text-white",
        )}
        strokeWidth={2}
      />
    </button>
  );
}
