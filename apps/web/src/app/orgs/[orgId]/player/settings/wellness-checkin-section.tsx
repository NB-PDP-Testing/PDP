"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  CheckCircle,
  Loader2,
  MessageSquare,
  Phone,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Switch } from "@/components/ui/switch";

type VerifyStep = "phone" | "pin" | "verified";

type Props = {
  playerIdentityId: Id<"playerIdentities">;
  orgId: string;
  orgName: string;
  configuredSendTime?: string; // e.g. "08:00"
};

function maskPhoneNumber(phone: string): string {
  // Input: +353871234567 → "+353 87 *** 4567"
  // Strip non-digits except leading +
  const cleaned = phone.replace(/(?!^\+)\D/g, "");
  if (cleaned.length < 6) {
    return phone;
  }
  // Keep country code (first 4 chars including +), mask middle, show last 4
  const countryCode = cleaned.slice(0, 4); // e.g. +353
  const last4 = cleaned.slice(-4);
  return `${countryCode} *** ${last4}`;
}

export function WellnessCheckInSection({
  playerIdentityId,
  orgId,
  orgName,
  configuredSendTime = "08:00",
}: Props) {
  const settings = useQuery(
    api.models.whatsappWellness.getMyWellnessChannelSettings,
    { playerIdentityId, organizationId: orgId }
  );

  const [step, setStep] = useState<VerifyStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSendingPin, setIsSendingPin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTogglingOptIn, setIsTogglingOptIn] = useState(false);
  const [detectedChannel, setDetectedChannel] = useState<
    "whatsapp_flows" | "sms_conversational" | null
  >(null);
  const [preferSms, setPreferSms] = useState(false);

  const sendPin = useAction(api.actions.phoneVerification.sendVerificationPin);
  const verifyPin = useAction(
    api.actions.phoneVerification.verifyPinAndDetectChannel
  );
  const setOptIn = useMutation(api.models.whatsappWellness.setWellnessOptIn);
  const updateChannel = useMutation(
    api.models.whatsappWellness.updateWellnessChannel
  );
  const clearPhone = useMutation(
    api.models.whatsappWellness.clearWellnessPhone
  );

  // Determine effective channel (override if player prefers SMS)
  const effectiveChannel =
    preferSms && detectedChannel === "whatsapp_flows"
      ? "sms_conversational"
      : detectedChannel;

  const handleSendPin = async () => {
    if (!phoneNumber) {
      toast.error("Please enter a phone number");
      return;
    }
    setIsSendingPin(true);
    try {
      const result = await sendPin({
        phoneNumber,
        playerIdentityId,
        organizationId: orgId,
      });
      if (result.sent) {
        setStep("pin");
        setPinError(null);
        setPin("");
        toast.success("Verification code sent via SMS");
      } else {
        toast.error("Failed to send verification code. Please try again.");
      }
    } catch {
      toast.error("Failed to send verification code. Please try again.");
    } finally {
      setIsSendingPin(false);
    }
  };

  const handleVerifyPin = async () => {
    if (pin.length !== 6) {
      setPinError("Please enter all 6 digits");
      return;
    }
    setIsVerifying(true);
    setPinError(null);
    try {
      const result = await verifyPin({
        playerIdentityId,
        organizationId: orgId,
        pin,
        phoneNumber,
      });
      if (result.success) {
        setDetectedChannel(result.wellnessChannel);
        setPreferSms(false);
        setStep("verified");
        toast.success("Phone number verified!");
      } else {
        setPinError(result.error);
      }
    } catch {
      setPinError("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleToggleOptIn = async (checked: boolean) => {
    setIsTogglingOptIn(true);
    try {
      // If toggling on and channel preference differs from detected, update it first
      if (checked && effectiveChannel && effectiveChannel !== detectedChannel) {
        await updateChannel({
          playerIdentityId,
          organizationId: orgId,
          wellnessChannel: effectiveChannel,
        });
      }
      await setOptIn({
        playerIdentityId,
        organizationId: orgId,
        whatsappOptIn: checked,
      });
      toast.success(
        checked
          ? "Daily wellness check-ins enabled"
          : "Daily wellness check-ins disabled"
      );
    } catch {
      toast.error("Failed to update preference. Please try again.");
    } finally {
      setIsTogglingOptIn(false);
    }
  };

  const handlePreferSmsChange = async (checked: boolean) => {
    setPreferSms(checked);
    const newChannel = checked
      ? "sms_conversational"
      : (detectedChannel ?? "sms_conversational");
    try {
      await updateChannel({
        playerIdentityId,
        organizationId: orgId,
        wellnessChannel: newChannel,
      });
    } catch {
      toast.error("Failed to update channel preference.");
      setPreferSms(!checked); // revert
    }
  };

  const handleChangeNumber = async () => {
    try {
      await clearPhone({ playerIdentityId, organizationId: orgId });
      setStep("phone");
      setPhoneNumber("");
      setPin("");
      setPinError(null);
      setDetectedChannel(null);
      setPreferSms(false);
    } catch {
      toast.error("Failed to clear phone number. Please try again.");
    }
  };

  // Existing registered phone from DB
  const registeredPhone = settings?.whatsappNumber;
  const isOptedIn = settings?.whatsappOptIn ?? false;
  const savedChannel = settings?.wellnessChannel;

  // If already registered (from DB), show the registered view
  const isRegistered = Boolean(registeredPhone && savedChannel);

  if (settings === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Wellness Check-In Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Wellness Check-In Notifications
        </CardTitle>
        <CardDescription>
          Register your phone to receive daily wellness check-in prompts via
          WhatsApp or SMS.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isRegistered ? (
          /* ── Already registered ── */
          <RegisteredView
            configuredSendTime={configuredSendTime}
            isOptedIn={isOptedIn}
            isTogglingOptIn={isTogglingOptIn}
            onChangeNumber={handleChangeNumber}
            onToggleOptIn={handleToggleOptIn}
            orgName={orgName}
            registeredPhone={registeredPhone ?? ""}
            savedChannel={savedChannel ?? "sms_conversational"}
          />
        ) : (
          /* ── Registration flow ── */
          <RegistrationFlow
            configuredSendTime={configuredSendTime}
            detectedChannel={detectedChannel}
            effectiveChannel={effectiveChannel}
            isOptedIn={isOptedIn}
            isSendingPin={isSendingPin}
            isTogglingOptIn={isTogglingOptIn}
            isVerifying={isVerifying}
            onPhoneChange={setPhoneNumber}
            onPinChange={setPin}
            onPreferSmsChange={handlePreferSmsChange}
            onResendPin={handleSendPin}
            onSendPin={handleSendPin}
            onToggleOptIn={handleToggleOptIn}
            onVerifyPin={handleVerifyPin}
            orgName={orgName}
            phoneNumber={phoneNumber}
            pin={pin}
            pinError={pinError}
            preferSms={preferSms}
            step={step}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ── Sub-component: Already Registered View ──

type RegisteredViewProps = {
  registeredPhone: string;
  savedChannel: "whatsapp_flows" | "sms_conversational";
  isOptedIn: boolean;
  isTogglingOptIn: boolean;
  orgName: string;
  configuredSendTime: string;
  onToggleOptIn: (checked: boolean) => void;
  onChangeNumber: () => void;
};

function RegisteredView({
  registeredPhone,
  savedChannel,
  isOptedIn,
  isTogglingOptIn,
  orgName,
  configuredSendTime,
  onToggleOptIn,
  onChangeNumber,
}: RegisteredViewProps) {
  return (
    <>
      {/* Registered phone + channel */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
        <div className="space-y-0.5">
          <p className="font-medium text-sm">
            {maskPhoneNumber(registeredPhone)}
          </p>
          <div className="flex items-center gap-1.5">
            {savedChannel === "whatsapp_flows" ? (
              <>
                <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                <span className="text-muted-foreground text-xs">
                  WhatsApp Flows
                </span>
              </>
            ) : (
              <>
                <Phone className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-muted-foreground text-xs">SMS</span>
              </>
            )}
          </div>
        </div>
        <Button onClick={onChangeNumber} size="sm" variant="ghost">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Change
        </Button>
      </div>

      {/* GDPR Article 9 consent + opt-in toggle */}
      <GdprConsentAndOptIn
        isOptedIn={isOptedIn}
        isTogglingOptIn={isTogglingOptIn}
        onToggleOptIn={onToggleOptIn}
        orgName={orgName}
      />

      {/* How it works */}
      {isOptedIn && (
        <HowItWorks channel={savedChannel} sendTime={configuredSendTime} />
      )}
    </>
  );
}

// ── Sub-component: Registration Flow ──

type RegistrationFlowProps = {
  step: VerifyStep;
  phoneNumber: string;
  pin: string;
  pinError: string | null;
  isSendingPin: boolean;
  isVerifying: boolean;
  isTogglingOptIn: boolean;
  detectedChannel: "whatsapp_flows" | "sms_conversational" | null;
  effectiveChannel: "whatsapp_flows" | "sms_conversational" | null;
  preferSms: boolean;
  isOptedIn: boolean;
  orgName: string;
  configuredSendTime: string;
  onPhoneChange: (v: string) => void;
  onPinChange: (v: string) => void;
  onSendPin: () => void;
  onVerifyPin: () => void;
  onResendPin: () => void;
  onToggleOptIn: (checked: boolean) => void;
  onPreferSmsChange: (checked: boolean) => void;
};

function RegistrationFlow({
  step,
  phoneNumber,
  pin,
  pinError,
  isSendingPin,
  isVerifying,
  isTogglingOptIn,
  detectedChannel,
  effectiveChannel,
  preferSms,
  isOptedIn,
  orgName,
  configuredSendTime,
  onPhoneChange,
  onPinChange,
  onSendPin,
  onVerifyPin,
  onResendPin,
  onToggleOptIn,
  onPreferSmsChange,
}: RegistrationFlowProps) {
  if (step === "phone") {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="wellness-phone">Phone number</Label>
          <PhoneInput
            id="wellness-phone"
            onChange={(value) => onPhoneChange(value ?? "")}
            placeholder="+353 87 123 4567"
            value={phoneNumber}
          />
          <p className="text-muted-foreground text-xs">
            Enter your number in international format. We'll detect whether you
            have WhatsApp.
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          disabled={!phoneNumber || isSendingPin}
          onClick={onSendPin}
        >
          {isSendingPin ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending code...
            </>
          ) : (
            "Verify Number"
          )}
        </Button>
      </div>
    );
  }

  if (step === "pin") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-blue-800 text-sm">
            A 6-digit verification code has been sent to{" "}
            <span className="font-medium">{phoneNumber}</span> via SMS.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Enter verification code</Label>
          <InputOTP maxLength={6} onChange={onPinChange} value={pin}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          {pinError && <p className="text-destructive text-sm">{pinError}</p>}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            disabled={pin.length !== 6 || isVerifying}
            onClick={onVerifyPin}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Code"
            )}
          </Button>
          <Button
            disabled={isSendingPin}
            onClick={onResendPin}
            variant="outline"
          >
            {isSendingPin ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Resend Code"
            )}
          </Button>
        </div>
      </div>
    );
  }

  // step === "verified"
  return (
    <div className="space-y-5">
      {/* Channel detection result */}
      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
        <div className="space-y-1">
          <p className="font-medium text-sm">Number verified</p>
          {detectedChannel === "whatsapp_flows" ? (
            <p className="text-muted-foreground text-xs">
              ✅ WhatsApp detected — you'll receive a native WhatsApp Flows form
              for the best experience.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              📱 SMS will be used — you'll receive questions one at a time via
              text.
            </p>
          )}
        </div>
      </div>

      {/* Channel override (only shown if WhatsApp detected) */}
      {detectedChannel === "whatsapp_flows" && (
        <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <div>
            <p className="font-medium text-sm">
              Prefer SMS instead of WhatsApp Flows
            </p>
            <p className="text-muted-foreground text-xs">
              Switch to simple SMS questions if you prefer.
            </p>
          </div>
          <Switch
            aria-label="Prefer SMS over WhatsApp Flows"
            checked={preferSms}
            onCheckedChange={onPreferSmsChange}
          />
        </div>
      )}

      {/* Channel badge */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">Channel:</span>
        {effectiveChannel === "whatsapp_flows" ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <MessageSquare className="mr-1 h-3 w-3" />
            WhatsApp Flows
          </Badge>
        ) : (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Phone className="mr-1 h-3 w-3" />
            SMS
          </Badge>
        )}
      </div>

      {/* GDPR Article 9 consent + opt-in toggle */}
      <GdprConsentAndOptIn
        isOptedIn={isOptedIn}
        isTogglingOptIn={isTogglingOptIn}
        onToggleOptIn={onToggleOptIn}
        orgName={orgName}
      />

      {/* How it works */}
      {isOptedIn && effectiveChannel && (
        <HowItWorks channel={effectiveChannel} sendTime={configuredSendTime} />
      )}
    </div>
  );
}

// ── Sub-component: GDPR Consent + Opt-in Toggle ──

type GdprConsentAndOptInProps = {
  isOptedIn: boolean;
  isTogglingOptIn: boolean;
  orgName: string;
  onToggleOptIn: (checked: boolean) => void;
};

function GdprConsentAndOptIn({
  isOptedIn,
  isTogglingOptIn,
  orgName,
  onToggleOptIn,
}: GdprConsentAndOptInProps) {
  return (
    <div className="space-y-3">
      {/* GDPR Article 9 disclosure — MANDATORY, exact wording required */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-amber-900 text-xs leading-relaxed">
          <span className="font-semibold">
            GDPR Article 9 — Health Data Consent
          </span>
          <br />I consent to {orgName} processing my daily wellness responses
          (sleep quality, energy level, mood, motivation, and physical feeling)
          as special category health data under GDPR Article 9(2)(a). My
          responses will be used only for player development and coaching
          support. I can withdraw this consent at any time by toggling off or
          replying WELLNESSSTOP.
        </p>
      </div>

      {/* Enable toggle */}
      <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border px-4 py-3">
        <div>
          <p className="font-medium text-sm">Enable daily wellness check-ins</p>
          <p className="text-muted-foreground text-xs">
            By enabling, you agree to the consent statement above.
          </p>
        </div>
        <Switch
          aria-label="Enable daily wellness check-ins"
          checked={isOptedIn}
          disabled={isTogglingOptIn}
          onCheckedChange={onToggleOptIn}
        />
      </div>
    </div>
  );
}

// ── Sub-component: How It Works ──

type HowItWorksProps = {
  channel: "whatsapp_flows" | "sms_conversational";
  sendTime: string;
};

function HowItWorks({ channel, sendTime }: HowItWorksProps) {
  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3">
      <p className="mb-1 font-medium text-sm">How it works</p>
      {channel === "whatsapp_flows" ? (
        <p className="text-muted-foreground text-xs">
          At {sendTime}, you'll receive a WhatsApp message. Tap 'Start Check-In'
          to open a quick form — takes under 60 seconds.
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          At {sendTime}, you'll receive a text message. Reply with numbers 1–5
          for each question.
        </p>
      )}
    </div>
  );
}
