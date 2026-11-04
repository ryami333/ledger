import { LoginView } from "../components/views/LoginView/LoginView.tsx";
import { getCurrentUserServerFn } from "../serverFunctions/getCurrentUserServerFn.ts";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    next: z.string().optional().catch(undefined),
    error: z.string().optional().catch(undefined),
  }),
  beforeLoad: async () => {
    if (await getCurrentUserServerFn()) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginRouteComponent,
});

function LoginRouteComponent() {
  const { next, error } = Route.useSearch();
  return <LoginView next={next} error={error} />;
}
