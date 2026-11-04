import { SpacesView } from "../components/views/SpacesView/SpacesView.tsx";
import { getSpacesServerFn } from "../serverFunctions/getSpacesServerFn.ts";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({
  loader: () => getSpacesServerFn(),
  component: SpacesRouteComponent,
});

function SpacesRouteComponent() {
  const { locale, spaces } = Route.useLoaderData();
  return <SpacesView locale={locale} spaces={spaces} />;
}
