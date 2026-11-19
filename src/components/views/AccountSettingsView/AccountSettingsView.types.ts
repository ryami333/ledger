import type { getAccountSettingsServerFn } from "../../../serverFunctions/getAccountSettingsServerFn.ts";

/** The data of the page `/account`, from its loader. */
export type AccountSettings = Awaited<
  ReturnType<typeof getAccountSettingsServerFn>
>;

/** One space on the tab "MCP", with the choices of the signed-in user. */
export type AccountSpace = AccountSettings["spaces"][number];

/** The tabs of the page `/account`. The search param `tab` holds one. */
export const accountSettingsTabs = ["profile", "mcp"] as const;

export type AccountSettingsTab = (typeof accountSettingsTabs)[number];
