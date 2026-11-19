import { SpacesView } from "../components/views/SpacesView/SpacesView.tsx";
import { getSpacesServerFn } from "../serverFunctions/getSpacesServerFn.ts";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({
  loader: async ({ context }) => ({
    ...(await getSpacesServerFn()),
    // Only an admin makes a space (PLAN.md, D20).
    canCreateSpace: context.user.role === "admin",
  }),
  component: SpacesRouteComponent,
});

function SpacesRouteComponent() {
  const { locale, spaces, canCreateSpace } = Route.useLoaderData();
  return (
    <SpacesView
      locale={locale}
      spaces={spaces}
      canCreateSpace={canCreateSpace}
    />
  );
}
