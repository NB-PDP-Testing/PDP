"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Car, Eye, EyeOff, Loader2, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";

type Props = { orgId: string };

export function GuardianSettingsPrivacy({ orgId }: Props) {
  const { data: session } = authClient.useSession();
  const [savingField, setSavingField] = useState<string | null>(null);
  const [reclaimConsentMap, setReclaimConsentMap] = useState<
    Record<string, boolean>
  >({});

  const { guardianIdentity } = useGuardianChildrenInOrg(
    orgId,
    session?.user?.email
  );

  const guardianPlayerLinks = useQuery(
    api.models.guardianPlayerLinks.getPlayersForGuardian,
    guardianIdentity ? { guardianIdentityId: guardianIdentity._id } : "skip"
  );

  const orgEnrollments = useQuery(
    api.models.orgPlayerEnrollments.getEnrollmentsForOrg,
    { organizationId: orgId, status: "active" }
  );

  const enrollmentVisibility = useQuery(
    api.models.passportSharing.getEnrollmentVisibilityForAllChildren,
    guardianIdentity ? { guardianIdentityId: guardianIdentity._id } : "skip"
  );

  const orgEnrolledIds = new Set(
    (orgEnrollments ?? []).map((e: any) => e.playerIdentityId)
  );
  const orgGuardianLinks = (guardianPlayerLinks ?? []).filter((link: any) =>
    orgEnrolledIds.has(link.player._id)
  );

  const declinedChildren = useQuery(
    api.models.guardianPlayerLinks.getDeclinedChildrenForGuardian,
    guardianIdentity ? { guardianIdentityId: guardianIdentity._id } : "skip"
  );

  const updateConsent = useMutation(
    api.models.guardianPlayerLinks.updateLinkConsent
  );
  const updateLink = useMutation(
    api.models.guardianPlayerLinks.updateGuardianPlayerLink
  );
  const updateEnrollmentVisibility = useMutation(
    api.models.passportSharing.updateEnrollmentVisibility
  );
  const reclaimChild = useMutation(
    api.models.guardianPlayerLinks.reclaimDeclinedChild
  );

  const handleConsentChange = async (
    playerIdentityId: Id<"playerIdentities">,
    newConsent: boolean
  ) => {
    if (!guardianIdentity) {
      return;
    }
    const key = `${playerIdentityId}-sharing`;
    setSavingField(key);
    try {
      await updateConsent({
        guardianIdentityId: guardianIdentity._id,
        playerIdentityId,
        consentedToSharing: newConsent,
      });
      toast.success(
        newConsent
          ? "Cross-organisation sharing enabled"
          : "Cross-organisation sharing disabled"
      );
    } catch {
      toast.error("Unable to update setting. Please try again.");
    } finally {
      setSavingField(null);
    }
  };

  const handleLinkFieldChange = async (
    linkId: Id<"guardianPlayerLinks">,
    field: "hasParentalResponsibility" | "canCollectFromTraining",
    newValue: boolean,
    label: string
  ) => {
    const key = `${linkId}-${field}`;
    setSavingField(key);
    try {
      await updateLink({ linkId, [field]: newValue });
      toast.success(newValue ? `${label} enabled` : `${label} disabled`);
    } catch {
      toast.error("Unable to update setting. Please try again.");
    } finally {
      setSavingField(null);
    }
  };

  const handleVisibilityChange = async (
    playerIdentityId: Id<"playerIdentities">,
    newValue: boolean
  ) => {
    if (!guardianIdentity) {
      return;
    }
    const key = `${playerIdentityId}-visibility`;
    setSavingField(key);
    try {
      await updateEnrollmentVisibility({
        guardianIdentityId: guardianIdentity._id,
        playerIdentityId,
        allowEnrollmentVisibility: newValue,
      });
      toast.success(
        newValue
          ? "Enrollment visibility enabled"
          : "Enrollment visibility hidden"
      );
    } catch {
      toast.error("Failed to update setting. Please try again.");
    } finally {
      setSavingField(null);
    }
  };

  const handleReclaimChild = async (
    playerIdentityId: Id<"playerIdentities">
  ) => {
    if (!guardianIdentity) {
      return;
    }
    const key = `reclaim-${playerIdentityId}`;
    setSavingField(key);
    try {
      const consentToSharing = reclaimConsentMap[playerIdentityId] ?? false;
      const result = await reclaimChild({
        guardianIdentityId: guardianIdentity._id,
        playerIdentityId,
        consentToSharing,
      });
      if (result.success) {
        toast.success("Child has been linked to your account");
        setReclaimConsentMap((prev) => {
          const updated = { ...prev };
          delete updated[playerIdentityId];
          return updated;
        });
      } else {
        toast.error(result.error || "Failed to reclaim child");
      }
    } catch {
      toast.error("Unable to reclaim child. Please try again.");
    } finally {
      setSavingField(null);
    }
  };

  if (!guardianIdentity) {
    return null;
  }

  const isLoading =
    guardianPlayerLinks === undefined || orgEnrollments === undefined;

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : orgGuardianLinks.length === 0 ? (
        <div className="py-6 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground text-sm">
            No children linked in this organisation
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orgGuardianLinks.map((link: any) => {
            const visibility = enrollmentVisibility?.find(
              (v: any) => v.playerIdentityId === link.player._id
            );
            const visibilityEnabled =
              visibility?.allowEnrollmentVisibility ?? true;

            const toggleRow = ({
              key,
              icon,
              labelText,
              description,
              checked,
              onChange,
              htmlFor,
            }: {
              key: string;
              icon: React.ReactNode;
              labelText: string;
              description: string;
              checked: boolean;
              onChange: (v: boolean) => void;
              htmlFor: string;
            }) => (
              <div className="flex items-center justify-between gap-4 p-3">
                <div className="flex flex-1 items-center gap-2">
                  {icon}
                  <div>
                    <Label className="text-sm" htmlFor={htmlFor}>
                      {labelText}
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      {description}
                    </p>
                  </div>
                </div>
                {savingField === key ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={checked}
                    id={htmlFor}
                    onCheckedChange={onChange}
                  />
                )}
              </div>
            );

            return (
              <div className="rounded-lg border p-4" key={link.player._id}>
                <div className="space-y-4">
                  {/* Child info */}
                  <div>
                    <h4 className="font-semibold">
                      {link.player.firstName} {link.player.lastName}
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      DOB: {link.player.dateOfBirth}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="outline">{link.link.relationship}</Badge>
                      {link.link.isPrimary && (
                        <Badge variant="default">Primary Contact</Badge>
                      )}
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="divide-y rounded-lg bg-muted/30">
                    {toggleRow({
                      key: `${link.player._id}-sharing`,
                      icon: (
                        <Users
                          className={`h-4 w-4 shrink-0 ${link.link.consentedToSharing ? "text-blue-600" : "text-gray-400"}`}
                        />
                      ),
                      labelText: "Cross-Organisation Sharing",
                      description:
                        "Allow other clubs to see your guardian relationship",
                      checked: link.link.consentedToSharing,
                      onChange: (checked) =>
                        handleConsentChange(link.player._id, checked),
                      htmlFor: `sharing-${link.player._id}`,
                    })}
                    {toggleRow({
                      key: `${link.player._id}-visibility`,
                      icon: visibilityEnabled ? (
                        <Eye className="h-4 w-4 shrink-0 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 shrink-0 text-gray-400" />
                      ),
                      labelText: "Enrollment Visibility",
                      description:
                        "Allow other clubs to see this child plays at multiple organisations",
                      checked: visibilityEnabled,
                      onChange: (checked) =>
                        handleVisibilityChange(link.player._id, checked),
                      htmlFor: `visibility-${link.player._id}`,
                    })}
                    {toggleRow({
                      key: `${link.link._id}-hasParentalResponsibility`,
                      icon: (
                        <ShieldCheck
                          className={`h-4 w-4 shrink-0 ${link.link.hasParentalResponsibility ? "text-purple-600" : "text-gray-400"}`}
                        />
                      ),
                      labelText: "Parental Responsibility",
                      description:
                        "You hold legal parental responsibility for this child",
                      checked: link.link.hasParentalResponsibility,
                      onChange: (checked) =>
                        handleLinkFieldChange(
                          link.link._id,
                          "hasParentalResponsibility",
                          checked,
                          "Parental responsibility"
                        ),
                      htmlFor: `parental-${link.link._id}`,
                    })}
                    {toggleRow({
                      key: `${link.link._id}-canCollectFromTraining`,
                      icon: (
                        <Car
                          className={`h-4 w-4 shrink-0 ${link.link.canCollectFromTraining ? "text-amber-600" : "text-gray-400"}`}
                        />
                      ),
                      labelText: "Can Collect from Training",
                      description:
                        "You are authorised to collect this child from training",
                      checked: link.link.canCollectFromTraining,
                      onChange: (checked) =>
                        handleLinkFieldChange(
                          link.link._id,
                          "canCollectFromTraining",
                          checked,
                          "Can collect from training"
                        ),
                      htmlFor: `collect-${link.link._id}`,
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Declined Children */}
      {declinedChildren && declinedChildren.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h4 className="mb-2 font-semibold text-amber-800 text-sm">
            Previously Declined Children
          </h4>
          <p className="mb-4 text-amber-700 text-sm">
            You previously declined to link these children. If this was a
            mistake, you can reclaim them below.
          </p>
          <div className="space-y-4">
            {declinedChildren.map((item: any) => {
              const isProcessing = savingField === `reclaim-${item.player._id}`;
              return (
                <div
                  className="rounded-lg border border-amber-300 bg-white p-4"
                  key={item.player._id}
                >
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold">
                        {item.player.firstName} {item.player.lastName}
                      </h4>
                      <p className="text-muted-foreground text-sm">
                        DOB: {item.player.dateOfBirth}
                      </p>
                      {item.organization && (
                        <p className="text-muted-foreground text-sm">
                          Organisation: {item.organization.name}
                        </p>
                      )}
                      <div className="mt-2">
                        <Badge variant="outline">
                          {item.link.relationship}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <input
                        checked={reclaimConsentMap[item.player._id] ?? false}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                        disabled={isProcessing}
                        id={`consent-${item.player._id}`}
                        onChange={(e) =>
                          setReclaimConsentMap((prev) => ({
                            ...prev,
                            [item.player._id]: e.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      <Label
                        className="text-sm"
                        htmlFor={`consent-${item.player._id}`}
                      >
                        Allow cross-organization sharing
                      </Label>
                    </div>
                    <Button
                      className="w-full"
                      disabled={isProcessing}
                      onClick={() => handleReclaimChild(item.player._id)}
                      variant="default"
                    >
                      {isProcessing && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Claim This Child
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600" />
        <div className="space-y-1">
          <h4 className="font-semibold text-blue-800 text-sm">
            About These Settings
          </h4>
          <p className="text-blue-700 text-sm">
            These settings control how your guardian relationship is shared
            across organisations and what permissions you hold for this child.
            Changes take effect immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
