import { SpaceView } from "../components/views/SpaceView/SpaceView.tsx";
import { getSpaceServerFn } from "../serverFunctions/getSpaceServerFn.ts";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/spaces/$spaceId/")({
  loader: ({ params }) =>
    getSpaceServerFn({ data: { spaceId: params.spaceId } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.space.title ?? "Space"} · ledger` }],
  }),
  component: SpaceRouteComponent,
});

function SpaceRouteComponent() {
  const { space } = Route.useLoaderData();
  return <SpaceView space={space} />;
}
