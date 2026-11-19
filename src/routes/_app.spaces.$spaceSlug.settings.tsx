import { SpaceSettingsView } from "../components/views/SpaceSettingsView/SpaceSettingsView.tsx";
import { getSpaceSettingsServerFn } from "../serverFunctions/getSpaceSettingsServerFn.ts";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/spaces/$spaceSlug/settings")({
  loader: async ({ params, context }) => ({
    ...(await getSpaceSettingsServerFn({
      data: { spaceSlug: params.spaceSlug },
    })),
    // Only an admin changes the details of a space and deletes it (D20).
    canManageSpace: context.user.role === "admin",
  }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `Settings · ${loaderData?.space.title ?? "Space"} · ledger` },
    ],
  }),
  component: SpaceSettingsRouteComponent,
});

function SpaceSettingsRouteComponent() {
  const settings = Route.useLoaderData();
  return (
    <SpaceSettingsView
      locale={settings.locale}
      space={settings.space}
      members={settings.members}
      aliases={settings.aliases}
      currencies={settings.currencies}
      canManageSpace={settings.canManageSpace}
    />
  );
}
