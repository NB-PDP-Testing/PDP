"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useAction } from "convex/react";
import { CheckCircle, Loader2, Phone } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type PhoneVerificationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  onVerified?: () => void;
};

/**
 * Two-step phone verification dialog using Twilio Verify OTP.
 * Step 1: Send code → Step 2: Enter 6-digit OTP → Verified
 */
export function PhoneVerificationDialog({
  open,
  onOpenChange,
  phoneNumber,
  onVerified,
}: PhoneVerificationDialogProps) {
  const [step, setStep] = useState<"send" | "verify" | "success">("send");
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const sendOTP = useAction(api.models.phoneVerification.sendPhoneOTP);
  const verifyOTP = useAction(api.models.phoneVerification.verifyPhoneOTP);

  const handleSendCode = useCallback(async () => {
    setIsSending(true);
    try {
      await sendOTP({ phoneNumber });
      setStep("verify");
      toast.success("Verification code sent!");
    } catch {
      toast.error("Failed to send code. Please try again.");
    } finally {
      setIsSending(false);
    }
  }, [phoneNumber, sendOTP]);

  const handleVerify = useCallback(async () => {
    if (code.length !== 6) {
      return;
    }
    setIsVerifying(true);
    try {
      const result = await verifyOTP({ phoneNumber, code });
      if (result.success) {
        setStep("success");
        toast.success("Phone number verified!");
        onVerified?.();
        // Auto-close after 1.5s
        setTimeout(() => onOpenChange(false), 1500);
      } else {
        toast.error("Invalid code. Please try again.");
        setCode("");
      }
    } catch {
      toast.error("Verification failed. Please try again.");
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  }, [code, phoneNumber, verifyOTP, onVerified, onOpenChange]);

  const handleResend = useCallback(async () => {
    setCode("");
    setIsSending(true);
    try {
      await sendOTP({ phoneNumber });
      toast.success("New code sent!");
    } catch {
      toast.error("Failed to resend code.");
    } finally {
      setIsSending(false);
    }
  }, [phoneNumber, sendOTP]);

  // Reset state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setStep("send");
      setCode("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "success" ? "Phone Verified" : "Verify Phone Number"}
          </DialogTitle>
          <DialogDescription>
            {step === "send" &&
              `We'll send a verification code to ${phoneNumber}`}
            {step === "verify" && "Enter the 6-digit code sent to your phone"}
            {step === "success" && "Your phone number has been verified"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {step === "send" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-sm">{phoneNumber}</span>
              </div>
              <Button
                className="w-full"
                disabled={isSending}
                onClick={handleSendCode}
              >
                {isSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isSending ? "Sending..." : "Send Verification Code"}
              </Button>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <InputOTP
                  autoComplete="one-time-code"
                  maxLength={6}
                  onChange={setCode}
                  value={code}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                className="w-full"
                disabled={code.length !== 6 || isVerifying}
                onClick={handleVerify}
              >
                {isVerifying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isVerifying ? "Verifying..." : "Verify"}
              </Button>
              <div className="text-center">
                <button
                  className="text-muted-foreground text-sm hover:underline"
                  disabled={isSending}
                  onClick={handleResend}
                  type="button"
                >
                  {isSending ? "Sending..." : "Didn't receive a code? Resend"}
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="font-medium text-sm">Verified</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
