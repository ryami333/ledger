import { AppLayout } from "../components/layout/AppLayout/AppLayout.tsx";
import { getCurrentUserServerFn } from "../serverFunctions/getCurrentUserServerFn.ts";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

/** The layout of each page that needs a signed-in user. */
export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUserServerFn();
    if (!user) {
      throw redirect({ to: "/login", search: { next: location.href } });
    }
    return { user };
  },
  component: AppRouteComponent,
});

function AppRouteComponent() {
  const { user } = Route.useRouteContext();
  return (
    <AppLayout userName={user.name} userEmail={user.email}>
      <Outlet />
    </AppLayout>
  );
}
