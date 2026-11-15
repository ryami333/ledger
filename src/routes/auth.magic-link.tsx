import { MagicLinkConfirmView } from "../components/views/MagicLinkConfirmView/MagicLinkConfirmView.tsx";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * The confirm page of a magic link (PLAN.md, D18, rule 4). The page sends no
 * referrer, so that no request of the page carries the token to a different
 * site.
 */
export const Route = createFileRoute("/auth/magic-link")({
  validateSearch: z.object({
    token: z.string().optional().catch(undefined),
    next: z.string().optional().catch(undefined),
  }),
  head: () => ({
    meta: [
      { title: "Sign in · ledger" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: MagicLinkConfirmRouteComponent,
});

function MagicLinkConfirmRouteComponent() {
  const { token, next } = Route.useSearch();
  return <MagicLinkConfirmView token={token} next={next} />;
}
