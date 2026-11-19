import { UsersView } from "../components/views/UsersView/UsersView.tsx";
import { listUsersServerFn } from "../serverFunctions/listUsersServerFn.ts";
import { createFileRoute } from "@tanstack/react-router";

/**
 * The users of ledger (PLAN.md, D19, rule 3). Only an admin sees the list.
 * A guest gets the state "not-found", and the loader does not call the
 * server function, which refuses a guest with 403.
 */
export const Route = createFileRoute("/_app/users")({
  loader: async ({ context }) => {
    if (context.user.role !== "admin") {
      return { state: "not-found" as const };
    }
    const { locale, users, spaces } = await listUsersServerFn();
    return {
      state: "ready" as const,
      locale,
      users,
      spaces,
      currentUserId: context.user.id,
    };
  },
  head: () => ({ meta: [{ title: "Users · ledger" }] }),
  component: UsersRouteComponent,
});

function UsersRouteComponent() {
  const loaderData = Route.useLoaderData();
  return <UsersView {...loaderData} />;
}
