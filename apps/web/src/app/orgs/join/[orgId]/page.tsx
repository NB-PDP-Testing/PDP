"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import {
  Building2,
  Check,
  Loader2,
  Send,
  Shield,
  UserCircle,
  Users,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

type FunctionalRole = "coach" | "parent" | "admin";

export default function JoinOrganizationRequestPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  // Users can select multiple functional roles
  const [selectedRoles, setSelectedRoles] = useState<FunctionalRole[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createJoinRequest = useMutation(
    api.models.orgJoinRequests.createJoinRequest
  );

  const toggleRole = (role: FunctionalRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  // Helper function to infer Better Auth role from functional roles
  // If functional roles include "admin", Better Auth role should be "admin"
  // Otherwise, default to "member"
  const inferBetterAuthRole = (
    functionalRoles: FunctionalRole[]
  ): "member" | "admin" =>
    functionalRoles.includes("admin") ? "admin" : "member";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Auto-infer Better Auth role from functional roles:
      // - If "admin" functional role selected → Better Auth role = "admin"
      // - Otherwise → Better Auth role = "member"
      const betterAuthRole = inferBetterAuthRole(selectedRoles);

      await createJoinRequest({
        organizationId: orgId,
        requestedRole: betterAuthRole, // Auto-inferred from functional roles
        requestedFunctionalRoles: selectedRoles,
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
          Select your role(s) and submit your request
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
                  Select your role(s) and provide any additional information
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Role Selection - Multiple checkboxes */}
            <div className="space-y-4">
              <Label>
                Select Your Role(s) <span className="text-destructive">*</span>
              </Label>
              <p className="text-muted-foreground text-sm">
                You can select multiple roles if applicable
              </p>

              <div className="space-y-3">
                {/* Admin Role */}
                <button
                  className={`flex w-full cursor-pointer items-start gap-4 rounded-lg border p-4 text-left transition-colors ${
                    selectedRoles.includes("admin")
                      ? "border-purple-500 bg-purple-50"
                      : "hover:bg-accent/50"
                  }`}
                  disabled={isSubmitting}
                  onClick={() => toggleRole("admin")}
                  type="button"
                >
                  <div
                    className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                      selectedRoles.includes("admin")
                        ? "border-purple-500 bg-purple-500 text-white"
                        : "border-input"
                    }`}
                  >
                    {selectedRoles.includes("admin") && (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">Admin</span>
                    </div>
                    <p className="mt-1 text-muted-foreground text-sm">
                      Manage organization settings, users, and have full access
                      to all features.
                    </p>
                  </div>
                </button>

                {/* Coach Role */}
                <button
                  className={`flex w-full cursor-pointer items-start gap-4 rounded-lg border p-4 text-left transition-colors ${
                    selectedRoles.includes("coach")
                      ? "border-green-500 bg-green-50"
                      : "hover:bg-accent/50"
                  }`}
                  disabled={isSubmitting}
                  onClick={() => toggleRole("coach")}
                  type="button"
                >
                  <div
                    className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                      selectedRoles.includes("coach")
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-input"
                    }`}
                  >
                    {selectedRoles.includes("coach") && (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Coach</span>
                    </div>
                    <p className="mt-1 text-muted-foreground text-sm">
                      Manage teams, players, and training sessions. View and
                      update player passports.
                    </p>
                  </div>
                </button>

                {/* Parent Role */}
                <button
                  className={`flex w-full cursor-pointer items-start gap-4 rounded-lg border p-4 text-left transition-colors ${
                    selectedRoles.includes("parent")
                      ? "border-blue-500 bg-blue-50"
                      : "hover:bg-accent/50"
                  }`}
                  disabled={isSubmitting}
                  onClick={() => toggleRole("parent")}
                  type="button"
                >
                  <div
                    className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                      selectedRoles.includes("parent")
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-input"
                    }`}
                  >
                    {selectedRoles.includes("parent") && (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Parent</span>
                    </div>
                    <p className="mt-1 text-muted-foreground text-sm">
                      View your children&apos;s development progress, passports,
                      and provide feedback.
                    </p>
                  </div>
                </button>
              </div>

              {selectedRoles.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  Please select at least one role to continue
                </p>
              )}
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
                disabled={isSubmitting || selectedRoles.length === 0}
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
                <Link href={"/orgs/join"}>Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Back Link */}
      <div className="pt-4">
        <Link
          className="text-muted-foreground text-sm hover:text-foreground"
          href={"/orgs/join"}
        >
          ← Back to organizations
        </Link>
      </div>
    </div>
  );
}
