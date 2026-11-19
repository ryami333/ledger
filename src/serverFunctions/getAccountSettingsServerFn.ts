import { env } from "../env.ts";
import { mcpResourceUrl } from "../server/auth.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";

/**
 * Returns the data of the page `/account`: the URL of the MCP server
 * (PLAN.md, D15), and for each space the members, the linked member of the
 * signed-in user (D16), and whether it is the default space (D17).
 */
export const getAccountSettingsServerFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { data, error } = await context.db
      .from("spaces")
      .select(
        `id, slug, title,
        members(id, name, archived_at),
        linked_members(user_id, member_id),
        default_spaces(user_id)`,
      )
      .order("title");
    if (error) {
      throwDatabaseError({
        operation: "getAccountSettingsServerFn",
        error,
        messages: { fallback: "The account settings cannot be read." },
      });
    }
    const appHostname = new URL(env.APP_URL).hostname;
    return {
      mcpUrl: mcpResourceUrl,
      // The hosted Claude apps cannot reach a local server (D15).
      isLocalServer: ["localhost", "127.0.0.1", "[::1]"].includes(appHostname),
      spaces: (data ?? []).map((space) => {
        const linkedMemberId =
          space.linked_members.find(
            (linkedMember) => linkedMember.user_id === context.userId,
          )?.member_id ?? null;
        const otherLinkedMemberIds = new Set(
          space.linked_members
            .filter((linkedMember) => linkedMember.user_id !== context.userId)
            .map((linkedMember) => linkedMember.member_id),
        );
        return {
          id: space.id,
          slug: space.slug,
          title: space.title,
          // RLS gives only the row of the signed-in user (D17).
          isDefault: space.default_spaces.length > 0,
          linkedMemberId,
          members: space.members
            // An archived member stays only when it is the linked member.
            .filter(
              (member) =>
                member.archived_at === null || member.id === linkedMemberId,
            )
            .map((member) => ({
              id: member.id,
              name: member.name,
              isLinkedToOtherUser: otherLinkedMemberIds.has(member.id),
            }))
            .toSorted((first, second) =>
              first.name.localeCompare(second.name, env.APP_LOCALE),
            ),
        };
      }),
    };
  });
