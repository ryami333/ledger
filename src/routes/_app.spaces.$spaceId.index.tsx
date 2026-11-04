import { SpaceView } from "../components/views/SpaceView/SpaceView.tsx";
import { getSpaceServerFn } from "../serverFunctions/getSpaceServerFn.ts";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * The search param `transaction` holds the ID of the open transaction, or
 * `new` (PLAN.md, UI). A value that is not valid closes the drawer.
 */
const spaceSearchSchema = z.object({
  transaction: z
    .union([z.literal("new"), z.guid()])
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/_app/spaces/$spaceId/")({
  validateSearch: spaceSearchSchema,
  loader: ({ params }) =>
    getSpaceServerFn({ data: { spaceId: params.spaceId } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.space.title ?? "Space"} · ledger` }],
  }),
  component: SpaceRouteComponent,
});

function SpaceRouteComponent() {
  const space = Route.useLoaderData();
  const { transaction } = Route.useSearch();
  return (
    <SpaceView
      locale={space.locale}
      defaultTransactionDate={space.defaultTransactionDate}
      defaultCurrency={space.defaultCurrency}
      space={space.space}
      members={space.members}
      aliases={space.aliases}
      aliasMembers={space.aliasMembers}
      spaceCurrencies={space.spaceCurrencies}
      transactions={space.transactions}
      balances={space.balances}
      openTransaction={transaction ?? null}
    />
  );
}
