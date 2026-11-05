import { SpaceView } from "../components/views/SpaceView/SpaceView.tsx";
import { getSpaceServerFn } from "../serverFunctions/getSpaceServerFn.ts";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * The search params of the space page (PLAN.md, UI):
 *
 * - `transaction`: the ID of the open transaction, or `new`. A value that is
 *   not valid closes the drawer.
 * - `query`, `from`, `to`: the filters of the transaction list. `from` and
 *   `to` are dates as `YYYY-MM-DD`.
 * - `page`: the page of the transaction list, from 1.
 *
 * The page ignores a value that is not valid.
 */
const spaceSearchSchema = z.object({
  transaction: z
    .union([z.literal("new"), z.guid()])
    .optional()
    .catch(undefined),
  query: z.string().optional().catch(undefined),
  from: z.iso.date().optional().catch(undefined),
  to: z.iso.date().optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
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
  const { transaction, query, from, to, page } = Route.useSearch();
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
      transactionFilters={{
        searchText: query ?? "",
        fromDate: from ?? null,
        toDate: to ?? null,
        page: page ?? 1,
      }}
    />
  );
}
