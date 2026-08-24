/**
 * @homes/shared — cross-cutting contracts shared by the web app and the backend API.
 * The web data-access seam validates backend responses against these schemas so
 * both sides agree on one source of truth.
 */

export const SHARED_PACKAGE = "@homes/shared" as const;

export * from "./listing";
export * from "./search";
export * from "./listing-detail";
