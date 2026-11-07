import { transactionFormSchema } from "../../core/forms/transactionFormSchema.ts";
import {
  type McpSplit,
  buildTransactionFormInput,
} from "../../core/mcp/buildTransactionFormInput.ts";
import { findDuplicateTransaction } from "../../core/mcp/findDuplicateTransaction.ts";
import { type LedgerScope, ledgerScopes } from "../../core/mcp/ledgerScopes.ts";
import type { McpSpace } from "../../core/mcp/McpSpace.ts";
import { findLinkedMemberId } from "../../core/mcp/findLinkedMemberId.ts";
import {
  addTransactionInputSchema,
  claimSpaceMemberInputSchema,
  deleteTransactionInputSchema,
  getSpaceInputSchema,
  listSpacesInputSchema,
  listTransactionsInputSchema,
  updateTransactionInputSchema,
} from "../../core/mcp/mcpToolSchemas.ts";
import {
  normalizePartyName,
  resolvePartyNames,
} from "../../core/mcp/resolvePartyNames.ts";
import { resolveSpaceSlug } from "../../core/mcp/resolveSpaceSlug.ts";
import { summarizeSpace } from "../../core/mcp/summarizeSpace.ts";
import { summarizeTransaction } from "../../core/mcp/summarizeTransaction.ts";
import { formatAmountInput } from "../../core/money/formatAmountInput.ts";
import { filterTransactions } from "../../core/transactions/filterTransactions.ts";
import type { PartyReference } from "../../core/transactions/partyValueHelpers.ts";
import type { PostgrestDbClient } from "../../db/createPostgrestClient.ts";
import { deleteTransaction } from "../deleteTransaction.ts";
import { loadSpace } from "../loadSpace.ts";
import { saveTransaction } from "../saveTransaction.ts";
import { setLinkedMember } from "../setLinkedMember.ts";
import { throwDatabaseError } from "../throwDatabaseError.ts";
import type { CallToolResult } from "@modelcontextprotocol/server";
import { McpServer } from "@modelcontextprotocol/server";
import { Temporal } from "temporal-polyfill";

/** The instructions of the server. The MCP client gives them to the model. */
const serverInstructions = `ledger is a shared expense tracker. A space is a group with a shared ledger, for example a trip or a household. A member is a name in a space. An alias is a name for a set of members, for example a shared account.

To record a payment:
1. Call list_spaces, then get_space, to get the names of the members and aliases, the currencies, and today.
2. Call add_transaction with the names as get_space gives them. Put each party that got a part of the value in paid_for, the payer too when the payer got a part. Example: "Barack paid 90 euros for dinner with Donald" gives paid_by ["Barack"] and paid_for ["Barack", "Donald"].
3. Tell the user the result line and the link.

"me", "I", and "myself" mean the user. list_spaces and get_space give "you": the member that the user is in each space, or null. When it is null and the user writes about themselves, ask which member they are, then call claim_space_member. ledger then remembers it.

When a name, the space, or the currency is not clear, ask the user. Do not guess. Before you delete a transaction, ask the user to confirm.`;

/** An error that the tool gives to the model as a result with isError. */
class ToolInputError extends Error {}

const textResult = (data: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});

const errorResult = (message: string): CallToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

/** Gives the value of a result with an error, or throws a ToolInputError. */
const unwrap = <Value extends object>(
  result: Value | { error: string },
): Value => {
  if ("error" in result) throw new ToolInputError(result.error);
  return result;
};

/**
 * Makes the MCP server of ledger for one request (PLAN.md, D15). Each tool
 * reads and writes with `db`, the user client of the access token. Thus RLS
 * and the actor triggers apply as in the web app. `userId` and `scopes` are
 * the user and the scopes of the access token.
 */
export const createLedgerMcpServer = ({
  db,
  userId,
  scopes,
  clientId,
  appUrl,
  locale,
  timeZone,
}: {
  db: PostgrestDbClient;
  userId: string;
  scopes: readonly string[];
  clientId: string;
  appUrl: string;
  locale: string;
  timeZone: string;
}): McpServer => {
  const server = new McpServer(
    { name: "ledger", version: "1.0.0" },
    { instructions: serverInstructions },
  );
  const today = () => Temporal.Now.plainDateISO(timeZone).toString();

  /**
   * Runs a tool: checks the scope, logs the tool name, the client, the
   * duration, and the status, and converts an error to a tool result. It
   * does not log the arguments (AGENTS.md, core principle 6).
   */
  const runTool = async ({
    toolName,
    scope,
    run,
  }: {
    toolName: string;
    scope: LedgerScope;
    run: () => Promise<unknown>;
  }): Promise<CallToolResult> => {
    const startedAt = Date.now();
    const log = (status: string) =>
      console.info("mcp tool", {
        toolName,
        clientId,
        status,
        durationMs: Date.now() - startedAt,
      });
    if (!scopes.includes(scope)) {
      log("missing_scope");
      return errorResult(
        `This connection has no access for ${toolName}. Connect again and allow the scope ${scope}.`,
      );
    }
    try {
      const data = await run();
      log("ok");
      return textResult(data);
    } catch (err) {
      if (err instanceof ToolInputError) {
        log("input_error");
        return errorResult(err.message);
      }
      log("error");
      // throwDatabaseError gives a text for the user, with no row data.
      return errorResult(
        err instanceof Error ? err.message : "The request failed.",
      );
    }
  };

  const loadSpaceList = async () => {
    const { data, error } = await db
      .from("spaces")
      .select(
        "slug, title, space_currencies(currency, is_default), members(id, name, archived_at), linked_members(user_id, member_id)",
      )
      .order("created_at", { ascending: false });
    if (error) {
      return throwDatabaseError({
        operation: "mcp.loadSpaceList",
        error,
        messages: { fallback: "The spaces cannot be read." },
      });
    }
    return data;
  };

  /** Selects the space of a tool call and reads it. */
  const readSpace = async (slug: string | undefined): Promise<McpSpace> => {
    const resolution = unwrap(
      resolveSpaceSlug({ slug, spaces: await loadSpaceList() }),
    );
    const space = await loadSpace({ db, spaceSlug: resolution.slug });
    if (space === null) {
      throw new ToolInputError(`There is no space "${resolution.slug}".`);
    }
    return space;
  };

  const findSpaceCurrency = ({
    space,
    currency,
  }: {
    space: McpSpace;
    currency: string;
  }) => {
    const code = currency.trim().toUpperCase();
    const spaceCurrency = space.spaceCurrencies.find(
      (candidate) => candidate.currency === code,
    );
    if (spaceCurrency === undefined) {
      const codes = space.spaceCurrencies
        .map((candidate) => candidate.currency)
        .join(", ");
      throw new ToolInputError(
        `The space has no currency ${code}. Its currencies are: ${codes}. Ask the user, or add the currency in the space settings of ledger.`,
      );
    }
    return spaceCurrency;
  };

  const resolveSide = ({
    space,
    names,
    split,
    side,
  }: {
    space: McpSpace;
    names: readonly string[];
    split: McpSplit | null;
    side: string;
  }): PartyReference[] => {
    const resolution = unwrap(
      resolvePartyNames({
        names,
        members: space.members,
        aliases: space.aliases,
        currentMemberId: findLinkedMemberId({
          linkedMembers: space.linkedMembers,
          userId,
        }),
      }),
    );
    if (resolution.usesEveryone && split !== null) {
      throw new ToolInputError(
        `A custom split of ${side} needs the names of the parties, not "everyone".`,
      );
    }
    return resolution.parties;
  };

  /** Parses the form input with the schema of the transaction form. */
  const parseTransactionValues = (
    formInput: ReturnType<typeof buildTransactionFormInput>,
  ) => {
    const input = unwrap(formInput);
    const parsed = transactionFormSchema.safeParse(input);
    if (!parsed.success) {
      throw new ToolInputError(
        parsed.error.issues.map((issue) => issue.message).join(" "),
      );
    }
    return parsed.data;
  };

  /** Reads the space again, and describes the saved transaction. */
  const describeSavedTransaction = async ({
    spaceSlug,
    transactionId,
  }: {
    spaceSlug: string;
    transactionId: string;
  }) => {
    const space = await readSpace(spaceSlug);
    const transaction = space.transactions.find(
      (candidate) => candidate.id === transactionId,
    );
    return {
      transaction:
        transaction === undefined
          ? null
          : summarizeTransaction({ transaction, space, locale, appUrl }),
      balances: summarizeSpace({ space, locale, today: today(), userId })
        .balances,
    };
  };

  server.registerTool(
    "list_spaces",
    {
      title: "List Spaces",
      description:
        "Lists the spaces of ledger: the slug, the title, the default currency, the names of the members, and you: the member that the user is, or null.",
      inputSchema: listSpacesInputSchema,
      annotations: { readOnlyHint: true },
    },
    () =>
      runTool({
        toolName: "list_spaces",
        scope: ledgerScopes.read,
        run: async () =>
          (await loadSpaceList()).map((space) => ({
            slug: space.slug,
            title: space.title,
            default_currency:
              space.space_currencies.find(
                (spaceCurrency) => spaceCurrency.is_default,
              )?.currency ?? null,
            members: space.members
              .filter((member) => member.archived_at === null)
              .map((member) => member.name),
            you: (() => {
              const linkedMemberId = findLinkedMemberId({
                linkedMembers: space.linked_members,
                userId,
              });
              return (
                space.members.find((member) => member.id === linkedMemberId)
                  ?.name ?? null
              );
            })(),
          })),
      }),
  );

  server.registerTool(
    "get_space",
    {
      title: "Get Space",
      description:
        "Gives one space: the members, the aliases and their members, the currencies with their rates, the balances, today, and you: the member that the user is, or null. Call it before add_transaction.",
      inputSchema: getSpaceInputSchema,
      annotations: { readOnlyHint: true },
    },
    (input) =>
      runTool({
        toolName: "get_space",
        scope: ledgerScopes.read,
        run: async () =>
          summarizeSpace({
            space: await readSpace(input.space),
            locale,
            today: today(),
            userId,
          }),
      }),
  );

  server.registerTool(
    "list_transactions",
    {
      title: "List Transactions",
      description:
        "Lists the transactions of a space, the newest first. It can search a text or an amount, and a date range. Use it to find a transaction to change or delete.",
      inputSchema: listTransactionsInputSchema,
      annotations: { readOnlyHint: true },
    },
    (input) =>
      runTool({
        toolName: "list_transactions",
        scope: ledgerScopes.read,
        run: async () => {
          const space = await readSpace(input.space);
          const matches = filterTransactions({
            transactions: space.transactions,
            searchText: input.search ?? "",
            fromDate: input.from ? Temporal.PlainDate.from(input.from) : null,
            toDate: input.to ? Temporal.PlainDate.from(input.to) : null,
            defaultCurrency: space.defaultCurrency,
            locale,
          });
          return {
            space: space.space.slug,
            match_count: matches.length,
            transactions: matches
              .slice(0, input.limit ?? 20)
              .map((transaction) =>
                summarizeTransaction({ transaction, space, locale, appUrl }),
              ),
          };
        },
      }),
  );

  server.registerTool(
    "add_transaction",
    {
      title: "Add Transaction",
      description:
        'Records one payment in a space: who paid, and who the payment is for. Use the names that get_space gives. The amount is a text, for example "90.00". Each side splits equally, unless a split is given.',
      inputSchema: addTransactionInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (input) =>
      runTool({
        toolName: "add_transaction",
        scope: ledgerScopes.write,
        run: async () => {
          const space = await readSpace(input.space);
          const spaceCurrency = findSpaceCurrency({
            space,
            currency: input.currency ?? space.defaultCurrency,
          });
          const paidBySplit = input.paid_by_split ?? null;
          const paidForSplit = input.paid_for_split ?? null;
          const values = parseTransactionValues(
            buildTransactionFormInput({
              title: input.title,
              description: input.description ?? null,
              amount: input.amount,
              currency: spaceCurrency.currency,
              rate: spaceCurrency.rate,
              transactionDate: input.date ?? today(),
              paidBy: resolveSide({
                space,
                names: input.paid_by,
                split: paidBySplit,
                side: "paid_by",
              }),
              paidFor: resolveSide({
                space,
                names: input.paid_for,
                split: paidForSplit,
                side: "paid_for",
              }),
              paidBySplit,
              paidForSplit,
            }),
          );
          if (input.allow_duplicate !== true) {
            const duplicate = findDuplicateTransaction({
              transactions: space.transactions,
              candidate: {
                title: values.title,
                amount_minor: values.amount_minor,
                currency: values.currency,
                transaction_date: values.transaction_date.toString(),
              },
              ignoreTransactionId: null,
            });
            if (duplicate !== null) {
              const summary = summarizeTransaction({
                transaction: duplicate,
                space,
                locale,
                appUrl,
              });
              throw new ToolInputError(
                `The space already has this transaction: ${summary.date}, "${summary.title}", ${summary.amount}, ${summary.summary} (${summary.link}). Nothing was added. If the user wants a second one, call add_transaction again with allow_duplicate: true.`,
              );
            }
          }
          const transactionId = await saveTransaction({
            db,
            spaceId: space.space.id,
            transactionId: null,
            values,
          });
          return describeSavedTransaction({
            spaceSlug: space.space.slug,
            transactionId,
          });
        },
      }),
  );

  server.registerTool(
    "update_transaction",
    {
      title: "Update Transaction",
      description:
        "Changes one transaction. Give only the fields to change. A new list of payers or parties resets its side to an equal split, unless a split is given.",
      inputSchema: updateTransactionInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    (input) =>
      runTool({
        toolName: "update_transaction",
        scope: ledgerScopes.write,
        run: async () => {
          const space = await readSpace(input.space);
          const transaction = space.transactions.find(
            (candidate) => candidate.id === input.transaction_id,
          );
          if (transaction === undefined) {
            throw new ToolInputError(
              "The space has no transaction with this ID. Call list_transactions to find it.",
            );
          }
          const currency =
            input.currency === undefined
              ? transaction.currency
              : findSpaceCurrency({ space, currency: input.currency }).currency;
          const rate =
            currency === transaction.currency
              ? transaction.rate
              : findSpaceCurrency({ space, currency }).rate;
          const amount =
            input.amount ??
            formatAmountInput({
              amountMinor: transaction.amount_minor,
              currency: transaction.currency,
            });
          const amountChanged =
            input.amount !== undefined || currency !== transaction.currency;

          /** The parties and the split of one side after the change. */
          const resolveUpdatedSide = ({
            side,
            names,
            split,
          }: {
            side: "paid_by" | "paid_for";
            names: readonly string[] | undefined;
            split: McpSplit | null | undefined;
          }): { parties: PartyReference[]; split: McpSplit | null } => {
            if (names !== undefined) {
              return {
                parties: resolveSide({
                  space,
                  names,
                  split: split ?? null,
                  side,
                }),
                split: split ?? null,
              };
            }
            const existingParties = transaction.parties.filter(
              (party) => party.side === side,
            );
            const parties = existingParties.map((party): PartyReference =>
              party.member_id !== null
                ? { member_id: party.member_id }
                : { alias_id: party.alias_id ?? "" },
            );
            if (split !== undefined) return { parties, split };
            const hasCustomSplit = existingParties.some(
              (party) => party.share_minor !== null,
            );
            if (!hasCustomSplit) return { parties, split: null };
            if (amountChanged) {
              throw new ToolInputError(
                `${side} has a custom split. Give ${side}_split again for the new amount, or null for an equal split.`,
              );
            }
            return {
              parties,
              split: {
                mode: "amount",
                values: existingParties.map((party) =>
                  formatAmountInput({
                    amountMinor: party.share_minor ?? 0n,
                    currency,
                  }),
                ),
              },
            };
          };
          const paidBy = resolveUpdatedSide({
            side: "paid_by",
            names: input.paid_by,
            split: input.paid_by_split,
          });
          const paidFor = resolveUpdatedSide({
            side: "paid_for",
            names: input.paid_for,
            split: input.paid_for_split,
          });
          const values = parseTransactionValues(
            buildTransactionFormInput({
              title: input.title ?? transaction.title,
              description:
                input.description === undefined
                  ? transaction.description
                  : input.description,
              amount,
              currency,
              rate,
              transactionDate: input.date ?? transaction.transaction_date,
              paidBy: paidBy.parties,
              paidFor: paidFor.parties,
              paidBySplit: paidBy.split,
              paidForSplit: paidFor.split,
            }),
          );
          await saveTransaction({
            db,
            spaceId: space.space.id,
            transactionId: transaction.id,
            values,
          });
          return describeSavedTransaction({
            spaceSlug: space.space.slug,
            transactionId: transaction.id,
          });
        },
      }),
  );

  server.registerTool(
    "delete_transaction",
    {
      title: "Delete Transaction",
      description:
        "Deletes one transaction. There is no undo. Ask the user to confirm first.",
      inputSchema: deleteTransactionInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (input) =>
      runTool({
        toolName: "delete_transaction",
        scope: ledgerScopes.write,
        run: async () => {
          const space = await readSpace(input.space);
          const transaction = space.transactions.find(
            (candidate) => candidate.id === input.transaction_id,
          );
          if (transaction === undefined) {
            throw new ToolInputError(
              "The space has no transaction with this ID. Call list_transactions to find it.",
            );
          }
          const summary = summarizeTransaction({
            transaction,
            space,
            locale,
            appUrl,
          });
          await deleteTransaction({ db, transactionId: transaction.id });
          const spaceAfterDelete = await readSpace(space.space.slug);
          return {
            deleted: summary,
            balances: summarizeSpace({
              space: spaceAfterDelete,
              locale,
              today: today(),
              userId,
            }).balances,
          };
        },
      }),
  );

  server.registerTool(
    "claim_space_member",
    {
      title: "Claim Space Member",
      description:
        'Stores which member the user is in a space, so that "me" works in later calls. Call it only when the user tells you who they are. null removes the link.',
      inputSchema: claimSpaceMemberInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    (input) =>
      runTool({
        toolName: "claim_space_member",
        scope: ledgerScopes.write,
        run: async () => {
          const space = await readSpace(input.space);
          const member = (() => {
            if (input.member === null) return null;
            const key = normalizePartyName(input.member);
            const match = space.members.find(
              (candidate) => normalizePartyName(candidate.name) === key,
            );
            if (match === undefined) {
              const memberNames = space.members
                .map((candidate) => candidate.name)
                .join(", ");
              throw new ToolInputError(
                `The space has no member with the name "${input.member}". The members are: ${memberNames}.`,
              );
            }
            return match;
          })();
          await setLinkedMember({
            db,
            spaceId: space.space.id,
            memberId: member?.id ?? null,
          });
          return { space: space.space.slug, you: member?.name ?? null };
        },
      }),
  );

  return server;
};
