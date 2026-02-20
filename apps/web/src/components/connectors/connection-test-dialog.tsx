"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useAction } from "convex/react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConnectionTestDialogProps = {
  connectorId: Id<"federationConnectors">;
  connectorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type TestStatus = "idle" | "testing" | "success" | "error";

export function ConnectionTestDialog({
  connectorId,
  connectorName,
  open,
  onOpenChange,
}: ConnectionTestDialogProps) {
  const [status, setStatus] = useState<TestStatus>("idle");
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    responseTime: number;
  } | null>(null);

  const testConnection = useAction(api.actions.federationAuth.testConnection);

  const handleTest = async () => {
    setStatus("testing");
    setResult(null);

    try {
      const testResult = await testConnection({
        connectorId,
      });

      setResult(testResult);
      setStatus(testResult.success ? "success" : "error");
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        responseTime: 0,
      });
      setStatus("error");
    }
  };

  const handleClose = () => {
    setStatus("idle");
    setResult(null);
    onOpenChange(false);
  };

  // Auto-test when dialog opens
  const handleDialogOpenChange = (isOpen: boolean) => {
    if (isOpen && status === "idle") {
      handleTest();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog onOpenChange={handleDialogOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Test Connection</DialogTitle>
          <DialogDescription>
            Testing connection to {connectorName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Testing State */}
          {status === "testing" && (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">
                Testing connection to {connectorName}...
              </p>
              <p className="mt-2 text-center text-muted-foreground text-sm">
                This may take a few seconds
              </p>
            </div>
          )}

          {/* Success State */}
          {status === "success" && result && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">
                Connection Successful!
              </AlertTitle>
              <AlertDescription className="text-green-700">
                <p>{result.message}</p>
                <p className="mt-1 text-sm">
                  Response time: {result.responseTime}ms
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Error State */}
          {status === "error" && result && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Failed</AlertTitle>
              <AlertDescription>
                <p>{result.message}</p>
                {result.responseTime > 0 && (
                  <p className="mt-1 text-sm">
                    Response time: {result.responseTime}ms
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {status === "error" && (
              <Button className="flex-1" onClick={handleTest}>
                Retry
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={handleClose}
              variant={status === "error" ? "outline" : "default"}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
