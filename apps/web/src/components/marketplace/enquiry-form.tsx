"use client";

import { useActionState, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { submitLeadAction, type LeadFormState } from "@/server/actions/leads";

const inputCls =
  "border-bebe focus:border-hof w-full rounded-xl border bg-white px-3 py-2.5 text-[14px] outline-none transition-colors";

type Kind = "enquiry" | "viewing_request";

export function EnquiryForm({
  listingId,
  listingTitle,
}: {
  listingId: string;
  listingTitle: string;
}) {
  const [kind, setKind] = useState<Kind>("enquiry");
  const [defaultName, setDefaultName] = useState("");
  const [defaultEmail, setDefaultEmail] = useState("");
  const [state, action, pending] = useActionState<LeadFormState, FormData>(submitLeadAction, {});

  // Prefill from the signed-in seeker (client-side so the page stays static/ISR).
  useEffect(() => {
    let active = true;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => {
        if (!active || !d.user) return;
        setDefaultName(`${d.user.firstName ?? ""} ${d.user.lastName ?? ""}`.trim());
        setDefaultEmail(d.user.email ?? "");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <span className="bg-rausch grid size-10 place-items-center rounded-full text-white">
          <Check className="size-5" />
        </span>
        <p className="text-hof text-[15px] font-semibold">Message sent</p>
        <p className="text-foggy text-[13px]">The agent will get back to you by email.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2.5">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="kind" value={kind} />
      {/* Honeypot — visually hidden, must stay empty. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="border-bebe mb-1 grid grid-cols-2 gap-1 rounded-full border p-1 text-[13px] font-medium">
        <button
          type="button"
          onClick={() => setKind("enquiry")}
          className={`rounded-full py-1.5 transition-colors ${kind === "enquiry" ? "bg-hof text-white" : "text-hof"}`}
        >
          Contact agent
        </button>
        <button
          type="button"
          onClick={() => setKind("viewing_request")}
          className={`rounded-full py-1.5 transition-colors ${kind === "viewing_request" ? "bg-hof text-white" : "text-hof"}`}
        >
          Request viewing
        </button>
      </div>

      <label htmlFor="lead-name" className="sr-only">
        Your name
      </label>
      <input
        id="lead-name"
        name="name"
        placeholder="Your name"
        value={defaultName}
        onChange={(e) => setDefaultName(e.target.value)}
        required
        className={inputCls}
      />

      <label htmlFor="lead-email" className="sr-only">
        Email
      </label>
      <input
        id="lead-email"
        name="email"
        type="email"
        placeholder="Email"
        value={defaultEmail}
        onChange={(e) => setDefaultEmail(e.target.value)}
        required
        className={inputCls}
      />

      <label htmlFor="lead-phone" className="sr-only">
        Phone (optional)
      </label>
      <input id="lead-phone" name="phone" type="tel" placeholder="Phone (optional)" className={inputCls} />

      {kind === "viewing_request" ? (
        <>
          <label htmlFor="lead-preferred" className="text-hof text-[12px] font-medium">
            Preferred date &amp; time
          </label>
          <input id="lead-preferred" name="preferredAt" type="datetime-local" className={inputCls} />
        </>
      ) : null}

      <label htmlFor="lead-message" className="sr-only">
        Message
      </label>
      <textarea
        id="lead-message"
        name="message"
        rows={3}
        required
        defaultValue={`I'm interested in ${listingTitle}. Please get in touch.`}
        className={inputCls}
      />

      {state.error ? (
        <p role="alert" className="text-rausch text-[13px]">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bg-hof mt-1 h-11 w-full rounded-full text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Sending…" : kind === "viewing_request" ? "Request viewing" : "Send message"}
      </button>
      <p className="text-foggy text-center text-[11px]">
        By sending, you agree the agent may contact you about this property.
      </p>
    </form>
  );
}
