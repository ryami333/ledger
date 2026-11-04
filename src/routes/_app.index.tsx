import { SpacesView } from "../components/views/SpacesView/SpacesView.tsx";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({
  component: SpacesView,
});
