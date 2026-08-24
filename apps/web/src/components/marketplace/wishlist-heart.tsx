"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Save/favorite toggle on listing cards. Visual-only for now — real
 * persistence (favorites) lands in Phase 3 once seeker auth is wired.
 */
export function WishlistHeart({ className }: { className?: string }) {
  const [active, setActive] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Save to wishlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setActive((v) => !v);
      }}
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
