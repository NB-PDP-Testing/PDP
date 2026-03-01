/**
 * SMS/Phone verification utilities using Twilio Verify API
 *
 * Uses Twilio Verify (not raw SMS Messages API) for:
 * - Built-in OTP generation and validation
 * - Fraud Guard protection
 * - Automatic rate limiting
 * - $0.05/successful verification pricing
 */

/**
 * Send a phone verification OTP via Twilio Verify
 * Twilio generates the OTP code — we don't store it
 */
export async function sendPhoneVerification({
  to,
}: {
  to: string;
}): Promise<{ status: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!(sid && token && verifySid)) {
    console.warn(
      "⚠️ Twilio Verify not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID."
    );
    throw new Error("Phone verification service not configured");
  }

  console.log("[sms] Sending phone verification to:", to);

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, Channel: "sms" }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("❌ Twilio Verify send failed:", {
      status: response.status,
      error: errorData,
    });
    throw new Error(`Twilio Verify failed: ${response.status}`);
  }

  const result = await response.json();
  console.log("✅ Phone verification sent:", { status: result.status, to });
  return { status: result.status };
}

/**
 * Check a phone verification OTP via Twilio Verify
 * Returns { status: "approved" } on success, { status: "pending" } on failure
 */
export async function checkPhoneVerification({
  to,
  code,
}: {
  to: string;
  code: string;
}): Promise<{ status: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!(sid && token && verifySid)) {
    throw new Error("Phone verification service not configured");
  }

  console.log("[sms] Checking phone verification for:", to);

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, Code: code }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("❌ Twilio Verify check failed:", {
      status: response.status,
      error: errorData,
    });
    throw new Error(`Twilio Verify check failed: ${response.status}`);
  }

  const result = await response.json();
  console.log("✅ Phone verification check:", {
    status: result.status,
    to,
  });
  return { status: result.status };
}
