import { OAuthConsentView } from "../components/views/OAuthConsentView/OAuthConsentView.tsx";
import { getCurrentUserServerFn } from "../serverFunctions/getCurrentUserServerFn.ts";
import { getOAuthClientServerFn } from "../serverFunctions/getOAuthClientServerFn.ts";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

/**
 * The consent page of the OAuth server for the MCP clients (PLAN.md, D15).
 * better-auth opens it with a signed query. The view sends the query back
 * as the browser got it, because the signature covers it.
 */
export const Route = createFileRoute("/oauth/consent")({
  validateSearch: z.object({
    client_id: z.string().catch(""),
    scope: z.string().optional().catch(undefined),
    redirect_uri: z.string().optional().catch(undefined),
  }),
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUserServerFn();
    if (!user) {
      throw redirect({ to: "/login", search: { next: location.href } });
    }
    return { user };
  },
  loaderDeps: ({ search }) => ({ clientId: search.client_id }),
  loader: async ({ deps }) => ({
    client: deps.clientId
      ? await getOAuthClientServerFn({ data: { clientId: deps.clientId } })
      : null,
  }),
  component: OAuthConsentRouteComponent,
});

function OAuthConsentRouteComponent() {
  const { client } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const search = Route.useSearch();
  return (
    <OAuthConsentView
      client={client}
      clientId={search.client_id}
      scopes={search.scope?.split(" ").filter(Boolean) ?? []}
      redirectUri={search.redirect_uri ?? null}
      userName={user.name}
    />
  );
}
