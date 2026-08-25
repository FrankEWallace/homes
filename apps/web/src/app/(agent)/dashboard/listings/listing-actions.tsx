"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  publishListingAction,
  unpublishListingAction,
  deleteListingAction,
} from "@/server/actions/listings";
import type { AgentListing } from "@/server/agent-listings";

export function ListingActions({ listing }: { listing: AgentListing }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const r = await fn();
      if (!r.ok && r.error) window.alert(r.error);
      router.refresh();
    });

  const isPublished = listing.status === "published";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending} aria-label="Listing actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/listings/${listing.id}/edit`}>Edit</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/listing/${listing.slug}`} target="_blank">
            View public page
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isPublished ? (
          <DropdownMenuItem onSelect={() => run(() => unpublishListingAction(listing.id))}>
            Unpublish
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => run(() => publishListingAction(listing.id))}>
            Publish
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(e) => {
            e.preventDefault();
            if (confirmingDelete) {
              run(() => deleteListingAction(listing.id));
            } else {
              setConfirmingDelete(true);
            }
          }}
        >
          {confirmingDelete ? "Click again to confirm" : "Delete"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
