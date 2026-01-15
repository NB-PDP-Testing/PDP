import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  Building2,
  CheckCircle,
  Clock,
  FileText,
  Shield,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChildForSharing, SharedElements } from "./enable-sharing-wizard";

/**
 * Step 5: Review Summary
 */
type ReviewStepProps = {
  child: ChildForSharing;
  sharedElements: SharedElements;
  sourceOrgMode: "all_enrolled" | "specific_orgs";
  selectedOrgIds: string[];
  playerIdentityId: Id<"playerIdentities">;
  expiresAt: Date | undefined;
};

export function ReviewStep({
  child,
  sharedElements,
  sourceOrgMode,
  selectedOrgIds,
  playerIdentityId,
  expiresAt,
}: ReviewStepProps) {
  // Format date for display
  const formatDate = (date: Date): string =>
    date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // Count selected elements
  const selectedElementCount =
    Object.values(sharedElements).filter(Boolean).length;

  // Get element labels for display
  const elementLabels: Record<keyof SharedElements, string> = {
    basicProfile: "Basic Profile",
    skillRatings: "Skill Ratings",
    skillHistory: "Skill History",
    developmentGoals: "Development Goals",
    coachNotes: "Coach Notes",
    benchmarkData: "Benchmark Data",
    attendanceRecords: "Attendance Records",
    injuryHistory: "Injury History",
    medicalSummary: "Medical Summary",
    contactInfo: "Contact Information",
  };

  // Get selected element labels
  const selectedElementLabels = (
    Object.keys(sharedElements) as Array<keyof SharedElements>
  )
    .filter((key) => sharedElements[key])
    .map((key) => elementLabels[key]);

  // Fetch enrollments to show org count or names
  const enrollments = useQuery(
    api.models.orgPlayerEnrollments.getEnrollmentsForPlayer,
    { playerIdentityId }
  );

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Please review your sharing consent before confirming. You can revoke or
        modify this at any time.
      </p>

      {/* Child Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Child
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">
                {child.firstName} {child.lastName}
              </p>
              {(child.sport || child.ageGroup) && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {child.sport && (
                    <Badge className="text-xs" variant="secondary">
                      {child.sport}
                    </Badge>
                  )}
                  {child.ageGroup && (
                    <Badge className="text-xs" variant="secondary">
                      {child.ageGroup}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Elements Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Sharing {selectedElementCount} Passport{" "}
            {selectedElementCount === 1 ? "Element" : "Elements"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {selectedElementLabels.map((label) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Organizations Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Source Organizations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sourceOrgMode === "all_enrolled" ? (
            <div className="space-y-2">
              <p className="font-medium text-sm">All Enrolled Organizations</p>
              <p className="text-muted-foreground text-xs">
                Sharing data from {enrollments?.length || 0}{" "}
                {enrollments?.length === 1 ? "organization" : "organizations"}{" "}
                where your child is enrolled
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-medium text-sm">
                Specific Organizations ({selectedOrgIds.length})
              </p>
              <div className="space-y-2">
                {selectedOrgIds.map((orgId) => (
                  <OrganizationDisplay key={orgId} organizationId={orgId} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duration Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Duration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expiresAt && (
            <p className="text-sm">
              Expires:{" "}
              <span className="font-medium">{formatDate(expiresAt)}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-800">
        <Shield className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1 text-xs">
          <p className="font-medium">Your Data, Your Control</p>
          <p>
            You can revoke or modify this sharing consent at any time from your
            sharing dashboard. All access to shared data is logged for your
            review.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper component to display organization name
 */
type OrganizationDisplayProps = {
  organizationId: string;
};

function OrganizationDisplay({ organizationId }: OrganizationDisplayProps) {
  const organization = useQuery(api.models.organizations.getOrganization, {
    organizationId,
  });

  if (!organization) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return <Badge variant="outline">{organization.name}</Badge>;
}

/**
 * Step 6: Success Screen
 */
type SuccessStepProps = {
  child: ChildForSharing;
  consentId: string | undefined;
  onClose: () => void;
};

export function SuccessStep({
  child,
  consentId: _consentId,
  onClose,
}: SuccessStepProps) {
  return (
    <div className="space-y-6 text-center">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
      </div>

      {/* Success Message */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Sharing Enabled Successfully!</h3>
        <p className="text-muted-foreground text-sm">
          You've enabled passport sharing for {child.firstName} {child.lastName}
        </p>
      </div>

      {/* Next Steps */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-left text-base">
            What Happens Next?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-left text-sm">
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-xs">
              1
            </div>
            <p className="text-muted-foreground">
              Coaches at the receiving organization will be notified about the
              shared passport
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-xs">
              2
            </div>
            <p className="text-muted-foreground">
              A coach must accept the share before they can view your child's
              data
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-xs">
              3
            </div>
            <p className="text-muted-foreground">
              You'll receive a notification when a coach accepts or declines the
              share
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-xs">
              4
            </div>
            <p className="text-muted-foreground">
              All access to shared data is logged and visible in your audit log
            </p>
          </div>
        </CardContent>
      </Card>

      {/* TODO: Add consent receipt download button */}
      {/* <Button type="button" variant="outline" className="w-full">
        <Download className="mr-2 h-4 w-4" />
        Download Consent Receipt
      </Button> */}

      {/* Close Button */}
      <Button className="w-full" onClick={onClose} type="button">
        Done
      </Button>
    </div>
  );
}
