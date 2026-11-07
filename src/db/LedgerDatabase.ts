import type { Database } from "./database.types.ts";

type GeneratedPublic = Database["public"];
type GeneratedFunctions = GeneratedPublic["Functions"];

/**
 * Replaces the types of some arguments of a function with nullable types.
 * postgres-meta types each argument as not nullable. The functions of D9
 * accept `null` for a new row and for an empty description.
 */
type WithNullableArgs<
  FunctionName extends keyof GeneratedFunctions,
  ArgName extends keyof GeneratedFunctions[FunctionName]["Args"],
> = {
  Args: Omit<GeneratedFunctions[FunctionName]["Args"], ArgName> & {
    [Name in ArgName]: GeneratedFunctions[FunctionName]["Args"][Name] | null;
  };
  Returns: GeneratedFunctions[FunctionName]["Returns"];
};

/**
 * The generated `Database` types, with the nullable arguments of the
 * functions of D9: `p_description`, `p_alias_id`, `p_transaction_id`, and
 * `p_rate`, `p_member_id` of `set_linked_member` (D16), and `p_space_id` of
 * `set_default_space` (D17).
 */
export type LedgerDatabase = Omit<Database, "public"> & {
  public: Omit<GeneratedPublic, "Functions"> & {
    Functions: Omit<
      GeneratedFunctions,
      | "create_space"
      | "save_alias"
      | "save_transaction"
      | "set_linked_member"
      | "set_default_space"
    > & {
      create_space: WithNullableArgs<"create_space", "p_description">;
      save_alias: WithNullableArgs<"save_alias", "p_alias_id">;
      save_transaction: WithNullableArgs<
        "save_transaction",
        "p_transaction_id" | "p_description" | "p_rate"
      >;
      set_linked_member: WithNullableArgs<"set_linked_member", "p_member_id">;
      set_default_space: WithNullableArgs<"set_default_space", "p_space_id">;
    };
  };
};
