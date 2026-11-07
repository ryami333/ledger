/** A member on the settings page. */
export type SettingsMember = {
  id: string;
  name: string;
  isArchived: boolean;
  transactionCount: number;
  aliasCount: number;
  /**
   * The user that selected this member as the linked member (PLAN.md, D16),
   * or null. `name` is null when the user has no name.
   */
  linkedUser: { name: string | null; isCurrentUser: boolean } | null;
};

/** An alias on the settings page. */
export type SettingsAlias = {
  id: string;
  name: string;
  memberIds: string[];
  transactionCount: number;
};

/** A space currency on the settings page. The rate is the text of `rate::text`. */
export type SettingsCurrency = {
  currency: string;
  rate: string;
  isDefault: boolean;
  transactionCount: number;
};

/** The space on the settings page. */
export type SettingsSpace = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  /** The space is the default space of the signed-in user (PLAN.md, D17). */
  isDefault: boolean;
};
