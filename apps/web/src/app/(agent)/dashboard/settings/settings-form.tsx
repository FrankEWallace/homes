"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileFormState } from "@/server/actions/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/server/auth";

export function SettingsForm({ user }: { user: SessionUser }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfileAction, {});

  return (
    <form action={action} className="flex max-w-xl flex-col gap-5">
      {state.ok ? (
        <p className="border-primary/30 text-primary rounded-md border px-3 py-2 text-sm">Profile saved.</p>
      ) : null}
      {state.error ? (
        <p role="alert" className="border-destructive/40 text-destructive rounded-md border px-3 py-2 text-sm">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" defaultValue={user.firstName} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" defaultValue={user.lastName} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="businessName">Agency / brokerage name</Label>
        <Input id="businessName" name="businessName" defaultValue={user.businessName ?? ""} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" rows={4} defaultValue={user.bio ?? ""} placeholder="Tell buyers about your agency…" />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
        <span className="text-muted-foreground text-xs">Signed in as {user.email}</span>
      </div>
    </form>
  );
}
