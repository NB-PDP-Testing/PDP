/**
 * Phone verification using Twilio Verify API
 *
 * Actions (can use fetch) handle the Twilio API calls.
 * Internal mutation handles the DB update after verification.
 *
 * Custom implementation (not using Better Auth phone plugin) to avoid
 * dual phone field conflict between our existing `phone` field and
 * the plugin's `phoneNumber` field.
 */
"use node";

import { v } from "convex/values";
import { components } from "../_generated/api";
import { action } from "../_generated/server";
import { authComponent } from "../auth";
import { normalizePhoneNumber } from "../lib/phoneUtils";
import { checkPhoneVerification, sendPhoneVerification } from "../utils/sms";

/**
 * Send a phone verification OTP (action — can use fetch)
 * Rate limited by Twilio Fraud Guard + frontend cooldown
 */
export const sendPhoneOTP = action({
  args: { phoneNumber: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // 1. Auth check
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    // 2. Normalize phone
    const normalized = normalizePhoneNumber(args.phoneNumber);

    console.log(
      "[phoneVerification] OTP requested by:",
      authUser.email,
      "for:",
      normalized
    );

    // 3. Send via Twilio Verify (Twilio generates the OTP)
    await sendPhoneVerification({ to: normalized });

    return { success: true };
  },
});

/**
 * Verify a phone OTP code (action — can use fetch)
 * Checks via Twilio, then calls internal mutation to update DB
 */
export const verifyPhoneOTP = action({
  args: {
    phoneNumber: v.string(),
    code: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // 1. Auth check
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    // 2. Normalize phone
    const normalized = normalizePhoneNumber(args.phoneNumber);

    // 3. Check code via Twilio Verify
    const result = await checkPhoneVerification({
      to: normalized,
      code: args.code,
    });

    if (result.status !== "approved") {
      console.log(
        "[phoneVerification] OTP check failed for:",
        authUser.email,
        "status:",
        result.status
      );
      return { success: false };
    }

    // 4. Update user record via internal mutation
    console.log("[phoneVerification] OTP verified for:", authUser.email);
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: authUser._id, operator: "eq" }],
        update: { phoneVerified: true, phoneVerifiedAt: Date.now() },
      },
    });

    return { success: true };
  },
});
