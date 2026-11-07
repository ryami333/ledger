/**
 * The OAuth scopes of the MCP server (PLAN.md, D15). `ledger:read` reads the
 * spaces, the members, the transactions, and the balances. `ledger:write`
 * adds, changes, and deletes transactions.
 */
export const ledgerScopes = {
  read: "ledger:read",
  write: "ledger:write",
} as const;

export type LedgerScope = (typeof ledgerScopes)[keyof typeof ledgerScopes];

/** The text of each scope on the consent page. */
export const ledgerScopeDescriptions: Record<string, string> = {
  [ledgerScopes.read]: "Read your spaces, members, transactions, and balances.",
  [ledgerScopes.write]: "Add, change, and delete transactions.",
  openid: "Know who you are.",
  profile: "Read your name and picture.",
  email: "Read your email address.",
  offline_access: "Stay connected when you are not using it.",
};
