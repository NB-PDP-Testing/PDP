"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import {
  Building2,
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
import { Checkbox } from "@/components/ui/checkbox";
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
                <div
                  className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors ${
                    selectedRoles.includes("admin")
                      ? "border-purple-500 bg-purple-50"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => toggleRole("admin")}
                >
                  <Checkbox
                    checked={selectedRoles.includes("admin")}
                    className="mt-1"
                    disabled={isSubmitting}
                    id="role-admin"
                    onCheckedChange={() => toggleRole("admin")}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-600" />
                      <Label
                        className="cursor-pointer font-medium"
                        htmlFor="role-admin"
                      >
                        Admin
                      </Label>
                    </div>
                    <p className="mt-1 text-muted-foreground text-sm">
                      Manage organization settings, users, and have full access
                      to all features.
                    </p>
                  </div>
                </div>

                {/* Coach Role */}
                <div
                  className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors ${
                    selectedRoles.includes("coach")
                      ? "border-green-500 bg-green-50"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => toggleRole("coach")}
                >
                  <Checkbox
                    checked={selectedRoles.includes("coach")}
                    className="mt-1"
                    disabled={isSubmitting}
                    id="role-coach"
                    onCheckedChange={() => toggleRole("coach")}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-green-600" />
                      <Label
                        className="cursor-pointer font-medium"
                        htmlFor="role-coach"
                      >
                        Coach
                      </Label>
                    </div>
                    <p className="mt-1 text-muted-foreground text-sm">
                      Manage teams, players, and training sessions. View and
                      update player passports.
                    </p>
                  </div>
                </div>

                {/* Parent Role */}
                <div
                  className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors ${
                    selectedRoles.includes("parent")
                      ? "border-blue-500 bg-blue-50"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => toggleRole("parent")}
                >
                  <Checkbox
                    checked={selectedRoles.includes("parent")}
                    className="mt-1"
                    disabled={isSubmitting}
                    id="role-parent"
                    onCheckedChange={() => toggleRole("parent")}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-blue-600" />
                      <Label
                        className="cursor-pointer font-medium"
                        htmlFor="role-parent"
                      >
                        Parent
                      </Label>
                    </div>
                    <p className="mt-1 text-muted-foreground text-sm">
                      View your children&apos;s development progress, passports,
                      and provide feedback.
                    </p>
                  </div>
                </div>
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
