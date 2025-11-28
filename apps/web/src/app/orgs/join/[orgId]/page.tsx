"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Building2, Loader2, Send } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function JoinOrganizationRequestPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [selectedRole, setSelectedRole] = useState<
    "member" | "coach" | "parent"
  >("member");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createJoinRequest = useMutation(
    api.models.orgJoinRequests.createJoinRequest
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createJoinRequest({
        organizationId: orgId,
        requestedRole: selectedRole,
        message: message || undefined,
      });

      toast.success("Join request submitted successfully!");
      router.push("/orgs");
    } catch (error: unknown) {
      console.error("Error submitting join request:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to submit request";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-6 py-8">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl tracking-tight">
          Request to Join Organization
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose your role and submit your request
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Join Request</CardTitle>
                <CardDescription>
                  Select your role and provide any additional information
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">
                Select Your Role <span className="text-destructive">*</span>
              </Label>
              <Select
                disabled={isSubmitting}
                onValueChange={(value) =>
                  setSelectedRole(value as "member" | "coach" | "parent")
                }
                value={selectedRole}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {selectedRole === "coach" &&
                  "Coaches can manage teams, players, and training sessions"}
                {selectedRole === "parent" &&
                  "Parents can view information and create reports about their players"}
                {selectedRole === "member" &&
                  "Members have basic viewing access to organization data"}
              </p>
            </div>

            {/* Optional Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                className="min-h-24"
                disabled={isSubmitting}
                id="message"
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add any additional information about why you want to join..."
                value={message}
              />
              <p className="text-muted-foreground text-xs">
                This message will be visible to organization administrators
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={isSubmitting}
                type="submit"
                variant="default"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Request
                  </>
                )}
              </Button>
              <Button
                asChild
                disabled={isSubmitting}
                type="button"
                variant="outline"
              >
                <Link href={"/orgs/join" as Route}>Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Back Link */}
      <div className="pt-4">
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href={"/orgs/join" as Route}
        >
          ← Back to organizations
        </Link>
      </div>
    </div>
  );
}
