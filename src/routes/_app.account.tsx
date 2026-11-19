import { AccountSettingsView } from "../components/views/AccountSettingsView/AccountSettingsView.tsx";
import { accountSettingsTabs } from "../components/views/AccountSettingsView/AccountSettingsView.types.ts";
import { getAccountSettingsServerFn } from "../serverFunctions/getAccountSettingsServerFn.ts";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/** The settings of the signed-in user, with the setup of an MCP client. */
export const Route = createFileRoute("/_app/account")({
  validateSearch: z.object({
    tab: z.enum(accountSettingsTabs).optional().catch(undefined),
  }),
  loader: () => getAccountSettingsServerFn(),
  head: () => ({ meta: [{ title: "Account settings · ledger" }] }),
  component: AccountRouteComponent,
});

function AccountRouteComponent() {
  const { tab } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const settings = Route.useLoaderData();
  return (
    <AccountSettingsView
      tab={tab ?? "profile"}
      user={user}
      mcpUrl={settings.mcpUrl}
      isLocalServer={settings.isLocalServer}
      locale={settings.locale}
      mcpRemoteClients={settings.mcpRemoteClients}
      spaces={settings.spaces}
    />
  );
}
