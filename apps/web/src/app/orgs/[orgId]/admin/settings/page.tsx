"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Crown,
  ExternalLink,
  Globe,
  HelpCircle,
  RotateCcw,
  Save,
  Share2,
  Shield,
  Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogoUpload } from "@/components/logo-upload";
import { DensityToggle } from "@/components/polish/density-toggle";
import { MyRolesSection } from "@/components/settings/my-roles-section";
import { NotificationPreferences } from "@/components/settings/notification-preferences";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { authClient } from "@/lib/auth-client";
import { WellnessDispatchSection } from "./wellness-dispatch-section";

type Organization = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  colors?: string[];
};

export default function OrgSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const { data: session } = authClient.useSession();

  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletionReason, setDeletionReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  // Form state
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");

  // Social links state
  const [website, setWebsite] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [savingSocial, setSavingSocial] = useState(false);

  // Supported sports state
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [savingSports, setSavingSports] = useState(false);

  // Sharing contact settings state
  const [sharingContactMode, setSharingContactMode] = useState<
    "direct" | "enquiry" | ""
  >("");
  const [sharingContactName, setSharingContactName] = useState("");
  const [sharingContactEmail, setSharingContactEmail] = useState("");
  const [sharingContactPhone, setSharingContactPhone] = useState("");
  const [savingSharingContact, setSavingSharingContact] = useState(false);

  // Owner transfer state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string | null>(null);
  const [transferConfirmText, setTransferConfirmText] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Help & onboarding state
  const [restartOnboardingDialogOpen, setRestartOnboardingDialogOpen] =
    useState(false);
  const [helpContentOpen, setHelpContentOpen] = useState(false);
  const [isResettingOnboarding, setIsResettingOnboarding] = useState(false);

  // Mutation for resetting onboarding
  const resetOnboarding = useMutation(api.models.setup.resetOnboarding);

  // Apply org theme CSS variables
  useOrgTheme();

  // Check user's role
  const userRole = useQuery(api.models.organizations.getUserOrgRole, {
    organizationId: orgId,
  });
  const updateOrganizationSocialLinks = useMutation(
    api.models.organizations.updateOrganizationSocialLinks
  );
  const updateOrganizationSports = useMutation(
    api.models.organizations.updateOrganizationSports
  );
  const updateOrganizationSharingContact = useMutation(
    api.models.organizations.updateOrganizationSharingContact
  );
  const updateOrganizationLogo = useMutation(
    api.models.organizations.updateOrganizationLogo
  );

  // Query for org data including social links and supported sports
  const orgData = useQuery(api.models.organizations.getOrganization, {
    organizationId: orgId,
  });

  // Query for available sports
  const availableSports = useQuery(api.models.referenceData.getSports, {});

  // Deletion request queries and mutations
  const deletionRequest = useQuery(
    api.models.organizations.getDeletionRequest,
    {
      organizationId: orgId,
    }
  );
  const requestDeletion = useMutation(
    api.models.organizations.requestOrganizationDeletion
  );
  const cancelDeletionRequest = useMutation(
    api.models.organizations.cancelDeletionRequest
  );

  // Owner management queries and mutations
  const currentOwner = useQuery(api.models.members.getCurrentOwner, {
    organizationId: orgId,
  });
  const members = useQuery(api.models.members.getMembersByOrganization, {
    organizationId: orgId,
  });
  const transferOwnership = useMutation(api.models.members.transferOwnership);

  // Wellness reminder config queries and mutations (US-P4-009)
  const wellnessOrgConfig = useQuery(
    api.models.playerHealthChecks.getWellnessOrgConfig,
    { organizationId: orgId }
  );
  const updateWellnessConfig = useMutation(
    api.models.playerHealthChecks.updateWellnessOrgConfig
  );

  // Wellness reminder local state (controlled form)
  const [wellnessRemindersEnabled, setWellnessRemindersEnabled] =
    useState(false);
  const [wellnessReminderFrequency, setWellnessReminderFrequency] = useState<
    "daily" | "match_day_only" | "training_day_only"
  >("daily");
  const [wellnessReminderType, setWellnessReminderType] = useState<
    "in_app" | "email" | "both"
  >("in_app");
  const [wellnessLowScoreAlertsEnabled, setWellnessLowScoreAlertsEnabled] =
    useState(false);
  const [wellnessLowScoreThreshold, setWellnessLowScoreThreshold] =
    useState("2.0");
  const [savingWellnessConfig, setSavingWellnessConfig] = useState(false);

  useEffect(() => {
    const loadOrg = async () => {
      try {
        const { data } = await authClient.organization.getFullOrganization({
          query: { organizationId: orgId },
        });
        if (data) {
          const fetchedOrg = data as Organization;
          setOrg(fetchedOrg);
          setName(fetchedOrg.name);
          setLogo(fetchedOrg.logo || "");
        }
      } catch (error) {
        console.error("Error loading organization:", error);
        toast.error("Failed to load organization");
      } finally {
        setLoading(false);
      }
    };
    loadOrg();
  }, [orgId]);

  // Populate wellness config state from Convex query
  useEffect(() => {
    if (wellnessOrgConfig) {
      setWellnessRemindersEnabled(wellnessOrgConfig.remindersEnabled);
      setWellnessReminderFrequency(wellnessOrgConfig.reminderFrequency);
      setWellnessReminderType(wellnessOrgConfig.reminderType);
      setWellnessLowScoreAlertsEnabled(wellnessOrgConfig.lowScoreAlertsEnabled);
      setWellnessLowScoreThreshold(
        wellnessOrgConfig.lowScoreThreshold.toString()
      );
    }
  }, [wellnessOrgConfig]);

  // Populate social links, supported sports, and sharing contact from Convex query
  useEffect(() => {
    if (orgData) {
      setWebsite(orgData.website || "");
      setSocialFacebook(orgData.socialLinks?.facebook || "");
      setSocialTwitter(orgData.socialLinks?.twitter || "");
      setSocialInstagram(orgData.socialLinks?.instagram || "");
      setSocialLinkedin(orgData.socialLinks?.linkedin || "");
      setSelectedSports(orgData.supportedSports || []);
      setSharingContactMode(
        orgData.sharingContactMode === "none"
          ? ""
          : (orgData.sharingContactMode as "direct" | "enquiry" | "") || ""
      );
      setSharingContactName(orgData.sharingContactName || "");
      setSharingContactEmail(orgData.sharingContactEmail || "");
      setSharingContactPhone(orgData.sharingContactPhone || "");
    }
  }, [orgData]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setSaving(true);
    try {
      // Update name via Better Auth client
      await authClient.organization.update({
        organizationId: orgId,
        data: {
          name,
        },
      });

      // Update logo via dedicated Convex mutation
      // This properly handles clearing (empty string → null)
      await updateOrganizationLogo({
        organizationId: orgId,
        logo: logo || null,
      });

      toast.success("Organization updated successfully");
      setOrg((prev) => (prev ? { ...prev, name, logo } : null));
    } catch (error) {
      console.error("Error updating organization:", error);
      toast.error("Failed to update organization");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSocialLinks = async () => {
    setSavingSocial(true);
    try {
      await updateOrganizationSocialLinks({
        organizationId: orgId,
        website: website.trim() || null,
        socialLinks: {
          facebook: socialFacebook.trim() || null,
          twitter: socialTwitter.trim() || null,
          instagram: socialInstagram.trim() || null,
          linkedin: socialLinkedin.trim() || null,
        },
      });
      toast.success("Social links updated successfully!");
    } catch (error) {
      console.error("Error updating social links:", error);
      toast.error((error as Error)?.message || "Failed to update social links");
    } finally {
      setSavingSocial(false);
    }
  };

  const handleSaveSports = async () => {
    setSavingSports(true);
    try {
      await updateOrganizationSports({
        organizationId: orgId,
        supportedSports: selectedSports,
      });
      toast.success("Supported sports updated successfully!");
    } catch (error) {
      console.error("Error updating supported sports:", error);
      toast.error(
        (error as Error)?.message || "Failed to update supported sports"
      );
    } finally {
      setSavingSports(false);
    }
  };

  const handleSaveSharingContact = async () => {
    // Validate based on mode
    if (
      sharingContactMode === "direct" &&
      !(sharingContactEmail || sharingContactPhone)
    ) {
      toast.error(
        "Please provide at least an email or phone number for direct contact"
      );
      return;
    }
    // No validation needed for enquiry mode - it's all internal

    setSavingSharingContact(true);
    try {
      // WORKAROUND: CI environment incorrectly infers 'form' type despite all source files having 'enquiry'
      // Root cause under investigation. Using @ts-expect-error to unblock deployment.
      // TODO: Investigate why CI type inference differs from local environment
      const mode: "direct" | "enquiry" | null = (sharingContactMode ||
        null) as unknown as "direct" | "enquiry" | null;
      await updateOrganizationSharingContact({
        organizationId: orgId,
        sharingContactMode: mode,
        sharingContactName: sharingContactName.trim() || null,
        sharingContactEmail: sharingContactEmail.trim() || null,
        sharingContactPhone: sharingContactPhone.trim() || null,
      });
      toast.success("Sharing contact settings updated successfully!");
    } catch (error) {
      console.error("Error updating sharing contact settings:", error);
      toast.error(
        (error as Error)?.message || "Failed to update sharing contact settings"
      );
    } finally {
      setSavingSharingContact(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (deleteConfirmText !== org?.name) {
      toast.error("Organization name doesn't match");
      return;
    }

    if (!deletionReason.trim()) {
      toast.error("Please provide a reason for deletion");
      return;
    }

    setDeleting(true);
    try {
      await requestDeletion({
        organizationId: orgId,
        reason: deletionReason.trim(),
      });
      toast.success(
        "Deletion request submitted. Platform staff will review your request."
      );
      setDeleteDialogOpen(false);
      setDeleteConfirmText("");
      setDeletionReason("");
    } catch (error) {
      console.error("Error requesting deletion:", error);
      toast.error(
        (error as Error)?.message || "Failed to submit deletion request"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDeletionRequest = async () => {
    if (!deletionRequest?._id) {
      return;
    }

    setCancelling(true);
    try {
      await cancelDeletionRequest({ requestId: deletionRequest._id });
      toast.success("Deletion request cancelled");
    } catch (error) {
      console.error("Error cancelling deletion request:", error);
      toast.error(
        (error as Error)?.message || "Failed to cancel deletion request"
      );
    } finally {
      setCancelling(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) {
      toast.error("Please select a new owner");
      return;
    }

    if (transferConfirmText !== "TRANSFER") {
      toast.error('Please type "TRANSFER" to confirm');
      return;
    }

    setTransferring(true);
    try {
      const result = await transferOwnership({
        organizationId: orgId,
        newOwnerUserId: selectedNewOwner,
      });
      toast.success(
        `Ownership transferred to ${result.newOwnerEmail}. You are now an admin.`
      );
      setTransferDialogOpen(false);
      setSelectedNewOwner(null);
      setTransferConfirmText("");
      // Refresh the page to update role-based UI
      router.refresh();
    } catch (error) {
      console.error("Error transferring ownership:", error);
      toast.error((error as Error)?.message || "Failed to transfer ownership");
    } finally {
      setTransferring(false);
    }
  };

  // Get eligible members for ownership transfer (exclude current owner)
  const eligibleNewOwners = members?.filter(
    (member: any) => member.role !== "owner" && member.user
  );

  const handleSaveWellnessConfig = async () => {
    const threshold = Number.parseFloat(wellnessLowScoreThreshold);
    if (Number.isNaN(threshold) || threshold < 1 || threshold > 5) {
      toast.error("Threshold must be between 1 and 5");
      return;
    }
    setSavingWellnessConfig(true);
    try {
      await updateWellnessConfig({
        organizationId: orgId,
        updatedBy: session?.user?.id ?? orgId,
        remindersEnabled: wellnessRemindersEnabled,
        reminderFrequency: wellnessReminderFrequency,
        reminderType: wellnessReminderType,
        lowScoreAlertsEnabled: wellnessLowScoreAlertsEnabled,
        lowScoreThreshold: threshold,
      });
      toast.success("Wellness reminder settings saved");
    } catch {
      toast.error("Failed to save wellness settings");
    } finally {
      setSavingWellnessConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Organization not found</div>
      </div>
    );
  }

  const isOwner = userRole?.isOwner ?? false;
  const isAdmin = userRole?.role === "admin" || userRole?.role === "owner";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">
          Organization Settings
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage your organization's details, branding, and theme
        </p>
      </div>

      <MyRolesSection />

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>
            Update your organization's basic information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              aria-required="true"
              disabled={saving}
              id="name"
              onChange={(e) => setName(e.target.value)}
              placeholder="My Sports Club"
              required
              value={name}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <Input disabled id="slug" readOnly value={org.slug} />
            <p className="text-muted-foreground text-xs">
              The slug cannot be changed after creation
            </p>
          </div>

          <div className="space-y-2" data-testid="logo-upload">
            <Label>Organization Logo</Label>
            <LogoUpload
              currentLogo={logo}
              disabled={saving}
              onUploadComplete={(url) => {
                setLogo(url);
                setOrg((prev) => (prev ? { ...prev, logo: url } : null));
              }}
              onUrlChange={(url) => setLogo(url)}
              organizationId={orgId}
              showUrlFallback={true}
            />
            <p className="text-muted-foreground text-xs">
              Upload a PNG or JPG logo (max 5MB, recommended 512x512px) or
              provide a URL
            </p>
          </div>

          <Button data-testid="edit-org" disabled={saving} onClick={handleSave}>
            {saving ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-pulse" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Display Preferences - Available to all users */}
      <Card>
        <CardHeader>
          <CardTitle>Display Preferences</CardTitle>
          <CardDescription>
            Customize how information is displayed throughout the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="mb-3 font-medium text-sm">Information Density</h4>
              <p className="mb-3 text-muted-foreground text-sm">
                Choose how compact or spacious you want the interface to be
              </p>
              <DensityToggle />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <NotificationPreferences />

      {/* Help & Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Help & Support
          </CardTitle>
          <CardDescription>
            Get help with using the platform and access onboarding resources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              data-testid="help-button"
              onClick={() => setHelpContentOpen(true)}
              variant="outline"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              View Help Guide
            </Button>
            <Button
              data-testid="restart-onboarding"
              onClick={() => setRestartOnboardingDialogOpen(true)}
              variant="outline"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restart Onboarding
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help Content Dialog */}
      <Dialog onOpenChange={setHelpContentOpen} open={helpContentOpen}>
        <DialogContent data-testid="help-content">
          <DialogHeader>
            <DialogTitle>Getting Started Guide</DialogTitle>
            <DialogDescription>
              Quick tips for using the platform effectively
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4" data-testid="tour">
            <div className="space-y-2">
              <h4 className="font-medium">Managing Your Organization</h4>
              <p className="text-muted-foreground text-sm">
                Use the admin navigation to access teams, players, and settings.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Adding Teams</h4>
              <p className="text-muted-foreground text-sm">
                Navigate to Teams in the admin menu to create and manage your
                teams.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Enrolling Players</h4>
              <p className="text-muted-foreground text-sm">
                Go to Players to add new players and assign them to teams.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Need More Help?</h4>
              <p className="text-muted-foreground text-sm">
                Contact support at support@playerarc.com for additional
                assistance.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setHelpContentOpen(false)}>Got It</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restart Onboarding Confirmation Dialog */}
      <Dialog
        onOpenChange={setRestartOnboardingDialogOpen}
        open={restartOnboardingDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Restart Onboarding?
            </DialogTitle>
            <DialogDescription>
              This will show the onboarding wizard again. Your existing data and
              settings will not be affected.
            </DialogDescription>
          </DialogHeader>
          <div
            className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3"
            role="alertdialog"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="text-amber-700">
                The onboarding wizard will guide you through the platform
                features again. This is helpful if you need a refresher.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={isResettingOnboarding}
              onClick={() => setRestartOnboardingDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isResettingOnboarding}
              onClick={async () => {
                setIsResettingOnboarding(true);
                try {
                  const result = await resetOnboarding();
                  if (result.success) {
                    toast.success(
                      "Onboarding has been reset. Redirecting to setup..."
                    );
                    setRestartOnboardingDialogOpen(false);
                    // Redirect to setup wizard after a brief delay
                    setTimeout(() => {
                      router.push("/setup" as any);
                    }, 1000);
                  }
                } catch (error) {
                  console.error("Failed to reset onboarding:", error);
                  toast.error("Failed to reset onboarding. Please try again.");
                } finally {
                  setIsResettingOnboarding(false);
                }
              }}
            >
              {isResettingOnboarding ? "Resetting..." : "Restart Onboarding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Website & Social Links - Only for owners and admins */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Website & Social Links
            </CardTitle>
            <CardDescription>
              Add your organization's website and social media profiles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                disabled={savingSocial}
                id="website"
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.yourclub.com"
                type="url"
                value={website}
              />
            </div>

            {/* Social Links */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  disabled={savingSocial}
                  id="facebook"
                  onChange={(e) => setSocialFacebook(e.target.value)}
                  placeholder="https://facebook.com/yourclub"
                  type="url"
                  value={socialFacebook}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter / X</Label>
                <Input
                  disabled={savingSocial}
                  id="twitter"
                  onChange={(e) => setSocialTwitter(e.target.value)}
                  placeholder="https://twitter.com/yourclub"
                  type="url"
                  value={socialTwitter}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  disabled={savingSocial}
                  id="instagram"
                  onChange={(e) => setSocialInstagram(e.target.value)}
                  placeholder="https://instagram.com/yourclub"
                  type="url"
                  value={socialInstagram}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  disabled={savingSocial}
                  id="linkedin"
                  onChange={(e) => setSocialLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/company/yourclub"
                  type="url"
                  value={socialLinkedin}
                />
              </div>
            </div>

            {/* Preview Links */}
            {(website ||
              socialFacebook ||
              socialTwitter ||
              socialInstagram ||
              socialLinkedin) && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <Label className="mb-3 block text-sm">Current Links</Label>
                <div className="flex flex-wrap gap-2">
                  {website && (
                    <a
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-primary text-xs hover:bg-primary/20"
                      href={website}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Globe className="h-3 w-3" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {socialFacebook && (
                    <a
                      className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 text-blue-600 text-xs hover:bg-blue-500/20"
                      href={socialFacebook}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Facebook
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {socialTwitter && (
                    <a
                      className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-1 text-sky-600 text-xs hover:bg-sky-500/20"
                      href={socialTwitter}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Twitter/X
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {socialInstagram && (
                    <a
                      className="inline-flex items-center gap-1 rounded-md bg-pink-500/10 px-2 py-1 text-pink-600 text-xs hover:bg-pink-500/20"
                      href={socialInstagram}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Instagram
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {socialLinkedin && (
                    <a
                      className="inline-flex items-center gap-1 rounded-md bg-blue-700/10 px-2 py-1 text-blue-700 text-xs hover:bg-blue-700/20"
                      href={socialLinkedin}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      LinkedIn
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            <Button
              disabled={savingSocial}
              onClick={handleSaveSocialLinks}
              type="button"
            >
              {savingSocial ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Save Social Links
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Supported Sports - Only for owners and admins */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Supported Sports
            </CardTitle>
            <CardDescription>
              Select the sports your organization supports. Teams will default
              to these sports when created.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {availableSports?.map((sport) => (
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3 hover:bg-muted/50"
                  htmlFor={`settings-sport-${sport.code}`}
                  key={sport.code}
                >
                  <input
                    checked={selectedSports.includes(sport.code)}
                    className="h-4 w-4"
                    disabled={savingSports}
                    id={`settings-sport-${sport.code}`}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSports([...selectedSports, sport.code]);
                      } else {
                        setSelectedSports(
                          selectedSports.filter((s) => s !== sport.code)
                        );
                      }
                    }}
                    type="checkbox"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{sport.name}</div>
                    {sport.governingBody && (
                      <div className="text-muted-foreground text-xs">
                        {sport.governingBody}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {selectedSports.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <Label className="mb-3 block text-sm">Selected Sports</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedSports.map((sportCode) => {
                    const sport = availableSports?.find(
                      (s) => s.code === sportCode
                    );
                    return (
                      <Badge key={sportCode} variant="secondary">
                        {sport?.name || sportCode}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              disabled={savingSports}
              onClick={handleSaveSports}
              type="button"
            >
              {savingSports ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Save Supported Sports
                </>
              )}
            </Button>

            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
              <p className="text-blue-900 text-sm">
                Teams created in this organization will automatically default to
                the first selected sport.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sharing Contact Settings - Only for owners and admins */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Sharing Contact Settings
            </CardTitle>
            <CardDescription>
              Configure public contact information displayed on shared player
              passports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Contact Mode Selection */}
            <div className="space-y-3">
              <Label>Contact Method</Label>
              <RadioGroup
                disabled={savingSharingContact}
                onValueChange={(value) =>
                  setSharingContactMode(value as "direct" | "enquiry" | "")
                }
                value={sharingContactMode}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="mode-none" value="" />
                  <Label
                    className="cursor-pointer font-normal"
                    htmlFor="mode-none"
                  >
                    No public contact (default)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="mode-direct" value="direct" />
                  <Label
                    className="cursor-pointer font-normal"
                    htmlFor="mode-direct"
                  >
                    Direct contact (name, email, phone)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="mode-enquiry" value="enquiry" />
                  <Label
                    className="cursor-pointer font-normal"
                    htmlFor="mode-enquiry"
                  >
                    Enquiry system (managed by admins)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Direct Contact Fields */}
            {sharingContactMode === "direct" && (
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <p className="text-muted-foreground text-sm">
                  Provide at least an email or phone number for other
                  organizations to contact you.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Contact Name (Optional)</Label>
                  <Input
                    disabled={savingSharingContact}
                    id="contact-name"
                    onChange={(e) => setSharingContactName(e.target.value)}
                    placeholder="e.g., John Smith"
                    value={sharingContactName}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      disabled={savingSharingContact}
                      id="contact-email"
                      onChange={(e) => setSharingContactEmail(e.target.value)}
                      placeholder="contact@yourclub.com"
                      type="email"
                      value={sharingContactEmail}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">Phone</Label>
                    <Input
                      disabled={savingSharingContact}
                      id="contact-phone"
                      onChange={(e) => setSharingContactPhone(e.target.value)}
                      placeholder="+1 555-0100"
                      type="tel"
                      value={sharingContactPhone}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Enquiry System Info */}
            {sharingContactMode === "enquiry" && (
              <div className="space-y-4 rounded-lg border bg-blue-50 p-4">
                <p className="font-medium text-sm">Enquiry System</p>
                <p className="text-muted-foreground text-sm">
                  Coaches from other organizations will be able to submit
                  enquiries about shared players. Enquiries will appear in your
                  admin enquiry queue for review and response.
                </p>
              </div>
            )}

            <Button
              disabled={savingSharingContact}
              onClick={handleSaveSharingContact}
              type="button"
            >
              {savingSharingContact ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Save Sharing Contact
                </>
              )}
            </Button>

            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
              <p className="text-blue-900 text-sm">
                This contact information will be displayed to coaches viewing
                shared player passports from other organizations.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wellness Reminders — Only for admins (US-P4-009) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Wellness Reminders
            </CardTitle>
            <CardDescription>
              Configure daily wellness check-in reminders and low-score alerts
              for your players.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Master toggle */}
            <div className="flex min-h-[44px] items-center gap-3 rounded-lg border px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">Enable Reminders</p>
                <p className="text-muted-foreground text-xs">
                  Send daily check-in reminders to players who have not
                  submitted that day
                </p>
              </div>
              <Switch
                aria-label="Enable wellness reminders"
                checked={wellnessRemindersEnabled}
                onCheckedChange={setWellnessRemindersEnabled}
              />
            </div>

            {wellnessRemindersEnabled && (
              <div className="space-y-4 pl-2">
                {/* Frequency */}
                <div className="space-y-2">
                  <Label>Reminder Frequency</Label>
                  <Select
                    onValueChange={(v) =>
                      setWellnessReminderFrequency(
                        v as "daily" | "match_day_only" | "training_day_only"
                      )
                    }
                    value={wellnessReminderFrequency}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Every Day</SelectItem>
                      <SelectItem value="match_day_only">
                        Match Days Only
                      </SelectItem>
                      <SelectItem value="training_day_only">
                        Training Days Only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reminder type */}
                <div className="space-y-2">
                  <Label>Reminder Type</Label>
                  <Select
                    onValueChange={(v) =>
                      setWellnessReminderType(v as "in_app" | "email" | "both")
                    }
                    value={wellnessReminderType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_app">In-App Only</SelectItem>
                      <SelectItem value="email">Email Only</SelectItem>
                      <SelectItem value="both">In-App + Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Low-score alerts */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex min-h-[44px] items-center gap-3 rounded-lg border px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">Low Score Alerts</p>
                  <p className="text-muted-foreground text-xs">
                    Alert admins and medical staff when a player&apos;s wellness
                    score falls below the threshold. Coaches do not receive
                    these alerts.
                  </p>
                </div>
                <Switch
                  aria-label="Enable low score alerts"
                  checked={wellnessLowScoreAlertsEnabled}
                  onCheckedChange={setWellnessLowScoreAlertsEnabled}
                />
              </div>

              {wellnessLowScoreAlertsEnabled && (
                <div className="space-y-2 pl-2">
                  <Label htmlFor="wellness-threshold">
                    Score Threshold (1–5)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-24"
                      id="wellness-threshold"
                      max="5"
                      min="1"
                      onChange={(e) =>
                        setWellnessLowScoreThreshold(e.target.value)
                      }
                      placeholder="2.0"
                      step="0.1"
                      type="number"
                      value={wellnessLowScoreThreshold}
                    />
                    <span className="text-muted-foreground text-sm">
                      Alert when average score ≤ this value
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                disabled={savingWellnessConfig}
                onClick={handleSaveWellnessConfig}
              >
                <Save className="mr-2 h-4 w-4" />
                {savingWellnessConfig ? "Saving..." : "Save Wellness Settings"}
              </Button>
            </div>

            {/* WhatsApp/SMS push notification dispatch (US-P8-006) */}
            <WellnessDispatchSection
              organizationId={orgId}
              userId={session?.user?.id ?? ""}
            />
          </CardContent>
        </Card>
      )}

      {!isAdmin && userRole && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm">
              Only organization owners and admins can update social links and
              other organization settings.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Owner Management - Only for owners */}
      {isOwner && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Owner Management
            </CardTitle>
            <CardDescription>
              View and manage organization ownership. The owner has full control
              over all settings and can transfer ownership to another member.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Owner Display */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <Label className="mb-3 block text-sm">Current Owner</Label>
              {currentOwner ? (
                <div className="flex items-center gap-3">
                  {currentOwner.userImage ? (
                    <img
                      alt={currentOwner.userName || "Owner"}
                      className="h-10 w-10 rounded-full object-cover"
                      src={currentOwner.userImage}
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <Crown className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {currentOwner.userName || "Unknown"}
                    </p>
                    <p className="truncate text-muted-foreground text-sm">
                      {currentOwner.userEmail}
                    </p>
                  </div>
                  <Badge className="ml-auto bg-amber-100 text-amber-700">
                    <Crown className="mr-1 h-3 w-3" />
                    Owner
                  </Badge>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Loading owner information...
                </p>
              )}
            </div>

            {/* Transfer Ownership Section */}
            <div className="flex items-start justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex-1">
                <h3 className="font-semibold">Transfer Ownership</h3>
                <p className="mt-1 text-muted-foreground text-sm">
                  Transfer organization ownership to another member. You will
                  become an admin after the transfer.
                </p>
              </div>
              <Button
                disabled={!eligibleNewOwners || eligibleNewOwners.length === 0}
                onClick={() => setTransferDialogOpen(true)}
                size="sm"
                variant="outline"
              >
                <Shield className="mr-2 h-4 w-4" />
                Transfer
              </Button>
            </div>

            {eligibleNewOwners && eligibleNewOwners.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No other members available for ownership transfer. Invite
                members first.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Danger Zone - Only for owners */}
      {isOwner && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show pending/rejected deletion request status */}
            {deletionRequest &&
              (deletionRequest.status === "pending" ||
                deletionRequest.status === "rejected") && (
                <div
                  className={`rounded-lg border p-4 ${
                    deletionRequest.status === "pending"
                      ? "border-yellow-500/30 bg-yellow-500/10"
                      : "border-red-500/30 bg-red-500/10"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold">
                        {deletionRequest.status === "pending" ? (
                          <>
                            <Clock className="h-4 w-4 text-yellow-600" />
                            Deletion Request Pending
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            Deletion Request Rejected
                          </>
                        )}
                      </h3>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {deletionRequest.status === "pending"
                          ? "Your deletion request is awaiting platform staff review."
                          : `Your request was rejected: ${deletionRequest.rejectionReason}`}
                      </p>
                      <p className="mt-2 text-muted-foreground text-xs">
                        Requested on{" "}
                        {new Date(
                          deletionRequest.requestedAt
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    {deletionRequest.status === "pending" && (
                      <Button
                        disabled={cancelling}
                        onClick={handleCancelDeletionRequest}
                        size="sm"
                        variant="outline"
                      >
                        {cancelling ? "Cancelling..." : "Cancel Request"}
                      </Button>
                    )}
                  </div>
                </div>
              )}

            {/* Show delete button only if no pending request */}
            {(!deletionRequest ||
              deletionRequest.status === "rejected" ||
              deletionRequest.status === "cancelled") && (
              <div className="flex items-start justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex-1">
                  <h3 className="font-semibold">
                    Request Organization Deletion
                  </h3>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Submit a request to delete this organization. A platform
                    administrator will review and approve the deletion. All
                    associated data will be permanently removed.
                  </p>
                </div>
                <Button
                  onClick={() => setDeleteDialogOpen(true)}
                  size="sm"
                  variant="destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Request Deletion
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isOwner && userRole && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm">
              Only organization owners can access sensitive settings like
              deletion.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Request Organization Deletion
            </DialogTitle>
            <DialogDescription>
              Your deletion request will be reviewed by platform staff before
              execution. Once approved, the organization{" "}
              <strong>{org.name}</strong> and all associated data will be
              permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                Why do you want to delete this organization?
              </Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="reason"
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="e.g., Organization is no longer active, merging with another org, etc."
                value={deletionReason}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <strong>{org.name}</strong> to confirm
              </Label>
              <Input
                id="confirm"
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={org.name}
                value={deleteConfirmText}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirmText("");
                setDeletionReason("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                deleteConfirmText !== org.name ||
                !deletionReason.trim() ||
                deleting
              }
              onClick={handleRequestDeletion}
              variant="destructive"
            >
              {deleting ? (
                <>
                  <Trash2 className="mr-2 h-4 w-4 animate-pulse" />
                  Submitting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Submit Deletion Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog onOpenChange={setTransferDialogOpen} open={transferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Crown className="h-5 w-5" />
              Transfer Ownership
            </DialogTitle>
            <DialogDescription>
              This action will transfer full ownership of{" "}
              <strong>{org.name}</strong> to another member. You will become an
              admin after the transfer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Warning Alert */}
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="text-sm">
                <p className="font-medium text-amber-700">Warning</p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-amber-600">
                  <li>The new owner will have full control</li>
                  <li>You will be demoted to admin role</li>
                  <li>This action cannot be easily reversed</li>
                </ul>
              </div>
            </div>

            {/* Member Selection */}
            <div className="space-y-2">
              <Label>Select New Owner</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-2">
                {eligibleNewOwners?.map((member: any) => (
                  <button
                    className={`flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors ${
                      selectedNewOwner === member.userId
                        ? "bg-amber-100 ring-2 ring-amber-500"
                        : "hover:bg-muted"
                    }`}
                    key={member.userId}
                    onClick={() => setSelectedNewOwner(member.userId)}
                    type="button"
                  >
                    {member.user?.image ? (
                      <img
                        alt={member.user.name || "Member"}
                        className="h-8 w-8 rounded-full object-cover"
                        src={member.user.image}
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <span className="font-medium text-sm">
                          {(member.user?.name || member.user?.email || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate font-medium text-sm">
                        {member.user?.name || "Unknown"}
                      </p>
                      <p className="truncate text-muted-foreground text-xs">
                        {member.user?.email}
                      </p>
                    </div>
                    <Badge className="text-xs" variant="outline">
                      {member.role}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Confirmation Input */}
            {selectedNewOwner && (
              <div className="space-y-2">
                <Label htmlFor="transfer-confirm">
                  Type <strong>TRANSFER</strong> to confirm
                </Label>
                <Input
                  id="transfer-confirm"
                  onChange={(e) =>
                    setTransferConfirmText(e.target.value.toUpperCase())
                  }
                  placeholder="TRANSFER"
                  value={transferConfirmText}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setTransferDialogOpen(false);
                setSelectedNewOwner(null);
                setTransferConfirmText("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              disabled={
                !selectedNewOwner ||
                transferConfirmText !== "TRANSFER" ||
                transferring
              }
              onClick={handleTransferOwnership}
            >
              {transferring ? (
                <>
                  <Crown className="mr-2 h-4 w-4 animate-pulse" />
                  Transferring...
                </>
              ) : (
                <>
                  <Crown className="mr-2 h-4 w-4" />
                  Transfer Ownership
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
