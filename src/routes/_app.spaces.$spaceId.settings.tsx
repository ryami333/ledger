import { SpaceSettingsView } from "../components/views/SpaceSettingsView/SpaceSettingsView.tsx";
import { getSpaceSettingsServerFn } from "../serverFunctions/getSpaceSettingsServerFn.ts";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/spaces/$spaceId/settings")({
  loader: ({ params }) =>
    getSpaceSettingsServerFn({ data: { spaceId: params.spaceId } }),
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
    />
  );
}
