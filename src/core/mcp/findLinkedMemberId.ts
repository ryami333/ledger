/**
 * Gives the ID of the linked member of a user in a space (PLAN.md, D16), or
 * null when the user selected no member.
 */
export const findLinkedMemberId = ({
  linkedMembers,
  userId,
}: {
  linkedMembers: readonly { user_id: string; member_id: string }[];
  userId: string;
}): string | null =>
  linkedMembers.find((linkedMember) => linkedMember.user_id === userId)
    ?.member_id ?? null;
