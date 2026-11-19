import { renderInvitationEmail } from "../core/email/renderInvitationEmail.ts";
import { inviteUserSchema } from "../core/forms/inviteUserSchema.ts";
import { env } from "../env.ts";
import { adminMiddleware } from "../server/adminMiddleware.ts";
import { auth } from "../server/auth.ts";
import { isEmailEnabled, sendEmail } from "../server/sendEmail.ts";
import { setSpaceGuests } from "../server/setSpaceGuests.ts";
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";

/**
 * Invites a guest (PLAN.md, D19, rule 4): it makes the user, gives the user
 * the selected spaces (D20), then sends the invitation email. The email has
 * no token. It links to `/login`, where the guest asks for a sign-in code.
 *
 * The database hook of auth.ts gives the new user the role guest, because no
 * Pocket ID callback makes it. If a later step fails, the server function
 * deletes the user again, so that the admin can try again. The delete also
 * deletes the spaces of the user.
 */
export const inviteUserServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(inviteUserSchema)
  .handler(async ({ data, context }) => {
    if (!isEmailEnabled) {
      setResponseStatus(503);
      throw new Error("Email is off. Set RESEND_API_KEY to invite users.");
    }
    const { internalAdapter } = await auth.$context;
    if (await internalAdapter.findUserByEmail(data.email)) {
      setResponseStatus(409);
      throw new Error("A user with this email exists.");
    }
    const user = await internalAdapter.createUser(
      { name: data.name, email: data.email, emailVerified: false },
      { method: "invitation" },
    );
    try {
      await setSpaceGuests({
        db: context.db,
        userId: user.id,
        spaceIds: data.space_ids,
      });
      await sendEmail({
        to: user.email,
        email: renderInvitationEmail({
          inviterName: context.user.name,
          loginUrl: new URL("/login", env.APP_URL).href,
        }),
        purpose: "invitation",
      });
    } catch (err) {
      await internalAdapter.deleteUser(user.id);
      throw err;
    }
    console.log("inviteUserServerFn invited", {
      userId: user.id,
      invitedBy: context.userId,
      spaceCount: data.space_ids.length,
    });
    return { userId: user.id };
  });
