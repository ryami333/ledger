import { LoginView } from "../components/views/LoginView/LoginView.tsx";
import { getAuthMethodsServerFn } from "../serverFunctions/getAuthMethodsServerFn.ts";
import { getCurrentUserServerFn } from "../serverFunctions/getCurrentUserServerFn.ts";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    next: z.string().optional().catch(undefined),
    error: z.string().optional().catch(undefined),
    // The signed query of an MCP authorization, as one text (PLAN.md, D18,
    // rule 6). The server function verifies its signature.
    oauth_query: z.string().optional().catch(undefined),
  }),
  beforeLoad: async () => {
    if (await getCurrentUserServerFn()) {
      throw redirect({ to: "/" });
    }
  },
  loader: () => getAuthMethodsServerFn(),
  component: LoginRouteComponent,
});

function LoginRouteComponent() {
  const { next, error, oauth_query: oauthQuery } = Route.useSearch();
  const { isMagicLinkEnabled } = Route.useLoaderData();
  return (
    <LoginView
      next={next}
      error={error}
      oauthQuery={oauthQuery}
      isMagicLinkEnabled={isMagicLinkEnabled}
    />
  );
}
