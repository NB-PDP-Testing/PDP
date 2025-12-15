"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Eye,
  Globe,
  Heart,
  Palette,
  Save,
  Star,
  Trash2,
  Zap,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { OrgThemedButton } from "@/components/org-themed-button";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { useOrgTheme } from "@/hooks/use-org-theme";
import { authClient } from "@/lib/auth-client";
import { StatCard } from "../stat-card";

// Default colors for preview when no color is set
const DEFAULT_COLORS = {
  primary: "#16a34a",
  secondary: "#0ea5e9",
  tertiary: "#f59e0b",
};

// Regex patterns - defined at module level for performance
const HEX_COLOR_REGEX = /^#[0-9A-F]{6}$/i;
// Allow typing with or without # prefix, will be normalized
const HEX_INPUT_REGEX = /^#?[0-9A-F]{0,6}$/i;
const HEX_RGB_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

// Helper to sanitize color values
const sanitizeColor = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

// Helper to parse org colors array
const parseOrgColors = (orgColors: string[] | undefined): string[] => {
  const colors = orgColors || [];
  return [
    colors[0] && typeof colors[0] === "string" ? colors[0].trim() : "",
    colors[1] && typeof colors[1] === "string" ? colors[1].trim() : "",
    colors[2] && typeof colors[2] === "string" ? colors[2].trim() : "",
  ];
};

// Convert hex to RGB for preview
const hexToRgb = (hex: string): string => {
  const result = HEX_RGB_REGEX.exec(hex);
  if (!result) {
    return "0, 0, 0";
  }
  return `${Number.parseInt(result[1], 16)}, ${Number.parseInt(result[2], 16)}, ${Number.parseInt(result[3], 16)}`;
};

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

  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [colors, setColors] = useState<string[]>(["", "", ""]);
  const [savingColors, setSavingColors] = useState(false);

  // Social links state
  const [website, setWebsite] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [savingSocial, setSavingSocial] = useState(false);

  // Get current theme for live preview
  const { theme } = useOrgTheme();

  // Check user's role
  const userRole = useQuery(api.models.organizations.getUserOrgRole, {
    organizationId: orgId,
  });
  const deleteOrganization = useMutation(
    api.models.organizations.deleteOrganization
  );
  const updateOrganizationColors = useMutation(
    api.models.organizations.updateOrganizationColors
  );
  const updateOrganizationSocialLinks = useMutation(
    api.models.organizations.updateOrganizationSocialLinks
  );

  // Query for org data including social links
  const orgData = useQuery(api.models.organizations.getOrganization, {
    organizationId: orgId,
  });

  useEffect(() => {
    const loadOrg = async () => {
      try {
        const { data } = await authClient.organization.getFullOrganization({
          query: { organizationId: orgId },
        });
        if (data) {
          const orgData = data as Organization;
          setOrg(orgData);
          setName(orgData.name);
          setLogo(orgData.logo || "");
          setColors(parseOrgColors(orgData.colors));
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

  // Populate social links from Convex query
  useEffect(() => {
    if (orgData) {
      setWebsite(orgData.website || "");
      setSocialFacebook(orgData.socialLinks?.facebook || "");
      setSocialTwitter(orgData.socialLinks?.twitter || "");
      setSocialInstagram(orgData.socialLinks?.instagram || "");
      setSocialLinkedin(orgData.socialLinks?.linkedin || "");
    }
  }, [orgData]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setSaving(true);
    try {
      await authClient.organization.update({
        organizationId: orgId,
        data: {
          name,
          logo: logo || undefined,
        },
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

  const handleSaveColors = async () => {
    const colorNames = ["Primary", "Secondary", "Tertiary"];
    const validatedColors: string[] = ["", "", ""];

    // Validate each color
    for (let i = 0; i < 3; i++) {
      const color = sanitizeColor(colors[i]);
      if (!color) {
        validatedColors[i] = "";
        continue;
      }
      if (!HEX_COLOR_REGEX.test(color)) {
        toast.error(
          `Invalid ${colorNames[i]} color: "${colors[i]}". Must be a valid hex color (e.g., #FF5733)`
        );
        return;
      }
      validatedColors[i] = color.toUpperCase();
    }

    // Require at least one color
    if (!validatedColors.some((c) => c !== "")) {
      toast.error("Please enter at least one valid hex color code");
      return;
    }

    setSavingColors(true);
    try {
      await updateOrganizationColors({
        organizationId: orgId,
        colors: validatedColors,
      });
      toast.success("Colors updated successfully! Theme applied.");
      setColors(validatedColors);
      setOrg((prev) => (prev ? { ...prev, colors: validatedColors } : null));
    } catch (error) {
      console.error("Error updating colors:", error);
      toast.error((error as Error)?.message || "Failed to update colors");
    } finally {
      setSavingColors(false);
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

  const handleDelete = async () => {
    if (deleteConfirmText !== org?.name) {
      toast.error("Organization name doesn't match");
      return;
    }

    setDeleting(true);
    try {
      await deleteOrganization({ organizationId: orgId });
      toast.success("Organization deleted successfully");
      router.push("/orgs");
    } catch (error) {
      console.error("Error deleting organization:", error);
      toast.error((error as Error)?.message || "Failed to delete organization");
      setDeleting(false);
    }
  };

  // Get preview colors (use form values or defaults)
  const defaults = [
    DEFAULT_COLORS.primary,
    DEFAULT_COLORS.secondary,
    DEFAULT_COLORS.tertiary,
  ];
  const getPreviewColor = (index: number) => {
    const color = colors[index]?.trim();
    return color && HEX_COLOR_REGEX.test(color) ? color : defaults[index];
  };

  const previewPrimary = getPreviewColor(0);
  const previewSecondary = getPreviewColor(1);
  const previewTertiary = getPreviewColor(2);

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
              disabled={saving}
              id="name"
              onChange={(e) => setName(e.target.value)}
              placeholder="My Sports Club"
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

          <div className="space-y-2">
            <Label htmlFor="logo">Logo URL</Label>
            <Input
              disabled={saving}
              id="logo"
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://example.com/logo.png"
              type="url"
              value={logo}
            />
          </div>

          <Button disabled={saving} onClick={handleSave}>
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

      {/* Theme & Colors - Only for owners and admins */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme & Brand Colors
            </CardTitle>
            <CardDescription>
              Customize your organization's brand colors. These colors are
              applied throughout the interface including headers, buttons,
              badges, and stat cards.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Color Inputs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Organization Colors</Label>
                {colors.some((c) => c) && (
                  <Button
                    onClick={() => {
                      setColors(["", "", ""]);
                      toast.success("Colors cleared - defaults will be used");
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Reset to Defaults
                  </Button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {/* Primary Color */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <div
                      className="h-3 w-3 rounded-full border"
                      style={{ backgroundColor: previewPrimary }}
                    />
                    Primary Color
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Main brand color for headers and primary actions
                  </p>
                  <div className="flex gap-2">
                    <input
                      className="h-10 w-10 cursor-pointer rounded border"
                      disabled={savingColors}
                      onChange={(e) => {
                        const newColors = [...colors];
                        newColors[0] = e.target.value.toUpperCase();
                        setColors(newColors);
                      }}
                      type="color"
                      value={colors[0] || DEFAULT_COLORS.primary}
                    />
                    <Input
                      className="flex-1 font-mono text-sm"
                      disabled={savingColors}
                      onChange={(e) => {
                        // Allow free typing - just normalize to uppercase
                        // Strip any non-hex characters except #
                        const raw = e.target.value.toUpperCase();
                        const cleaned = raw.replace(/[^#0-9A-F]/g, "");
                        // Ensure # prefix and limit to 7 chars (#XXXXXX)
                        let value = cleaned.startsWith("#")
                          ? cleaned.slice(0, 7)
                          : "#" + cleaned.slice(0, 6);
                        // Allow empty
                        if (raw === "") value = "";
                        const newColors = [...colors];
                        newColors[0] = value;
                        setColors(newColors);
                      }}
                      placeholder={DEFAULT_COLORS.primary}
                      value={colors[0]}
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <div
                      className="h-3 w-3 rounded-full border"
                      style={{ backgroundColor: previewSecondary }}
                    />
                    Secondary Color
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Accent color for secondary elements
                  </p>
                  <div className="flex gap-2">
                    <input
                      className="h-10 w-10 cursor-pointer rounded border"
                      disabled={savingColors}
                      onChange={(e) => {
                        const newColors = [...colors];
                        newColors[1] = e.target.value.toUpperCase();
                        setColors(newColors);
                      }}
                      type="color"
                      value={colors[1] || DEFAULT_COLORS.secondary}
                    />
                    <Input
                      className="flex-1 font-mono text-sm"
                      disabled={savingColors}
                      onChange={(e) => {
                        // Allow free typing - just normalize to uppercase
                        // Strip any non-hex characters except #
                        const raw = e.target.value.toUpperCase();
                        const cleaned = raw.replace(/[^#0-9A-F]/g, "");
                        // Ensure # prefix and limit to 7 chars (#XXXXXX)
                        let value = cleaned.startsWith("#")
                          ? cleaned.slice(0, 7)
                          : "#" + cleaned.slice(0, 6);
                        // Allow empty
                        if (raw === "") value = "";
                        const newColors = [...colors];
                        newColors[1] = value;
                        setColors(newColors);
                      }}
                      placeholder={DEFAULT_COLORS.secondary}
                      value={colors[1]}
                    />
                  </div>
                </div>

                {/* Tertiary Color */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <div
                      className="h-3 w-3 rounded-full border"
                      style={{ backgroundColor: previewTertiary }}
                    />
                    Tertiary Color
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Additional accent for highlights
                  </p>
                  <div className="flex gap-2">
                    <input
                      className="h-10 w-10 cursor-pointer rounded border"
                      disabled={savingColors}
                      onChange={(e) => {
                        const newColors = [...colors];
                        newColors[2] = e.target.value.toUpperCase();
                        setColors(newColors);
                      }}
                      type="color"
                      value={colors[2] || DEFAULT_COLORS.tertiary}
                    />
                    <Input
                      className="flex-1 font-mono text-sm"
                      disabled={savingColors}
                      onChange={(e) => {
                        // Allow free typing - just normalize to uppercase
                        // Strip any non-hex characters except #
                        const raw = e.target.value.toUpperCase();
                        const cleaned = raw.replace(/[^#0-9A-F]/g, "");
                        // Ensure # prefix and limit to 7 chars (#XXXXXX)
                        let value = cleaned.startsWith("#")
                          ? cleaned.slice(0, 7)
                          : "#" + cleaned.slice(0, 6);
                        // Allow empty
                        if (raw === "") value = "";
                        const newColors = [...colors];
                        newColors[2] = value;
                        setColors(newColors);
                      }}
                      placeholder={DEFAULT_COLORS.tertiary}
                      value={colors[2]}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Color Palette Preview */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <Label className="mb-3 block text-sm">Color Palette</Label>
              <div className="flex gap-3">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="h-16 w-16 rounded-lg shadow-sm"
                    style={{ backgroundColor: previewPrimary }}
                  />
                  <span className="font-mono text-muted-foreground text-xs">
                    {previewPrimary}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="h-16 w-16 rounded-lg shadow-sm"
                    style={{ backgroundColor: previewSecondary }}
                  />
                  <span className="font-mono text-muted-foreground text-xs">
                    {previewSecondary}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="h-16 w-16 rounded-lg shadow-sm"
                    style={{ backgroundColor: previewTertiary }}
                  />
                  <span className="font-mono text-muted-foreground text-xs">
                    {previewTertiary}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Preview Section */}
            <Collapsible onOpenChange={setPreviewOpen} open={previewOpen}>
              <CollapsibleTrigger asChild>
                <Button className="w-full" variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  {previewOpen ? "Hide" : "Show"} Theme Preview
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                {/* Preview uses current saved theme from useOrgTheme */}
                <div className="rounded-lg border p-4">
                  <p className="mb-3 font-medium text-sm">Buttons</p>
                  <div className="flex flex-wrap gap-2">
                    <OrgThemedButton size="sm" variant="primary">
                      <Star className="h-4 w-4" />
                      Primary
                    </OrgThemedButton>
                    <OrgThemedButton size="sm" variant="secondary">
                      <Heart className="h-4 w-4" />
                      Secondary
                    </OrgThemedButton>
                    <OrgThemedButton size="sm" variant="tertiary">
                      <Zap className="h-4 w-4" />
                      Tertiary
                    </OrgThemedButton>
                    <OrgThemedButton size="sm" variant="outline">
                      Outline
                    </OrgThemedButton>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="mb-3 font-medium text-sm">Stat Cards</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard
                      description="Primary"
                      icon={Star}
                      title="Members"
                      value={125}
                      variant="primary"
                    />
                    <StatCard
                      description="Secondary"
                      icon={Heart}
                      title="Teams"
                      value={12}
                      variant="secondary"
                    />
                    <StatCard
                      description="Tertiary"
                      icon={Zap}
                      title="Players"
                      value={89}
                      variant="tertiary"
                    />
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="mb-3 font-medium text-sm">Badges</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      style={{
                        backgroundColor: theme.primary,
                        color: "white",
                      }}
                    >
                      Primary
                    </Badge>
                    <Badge
                      style={{
                        backgroundColor: theme.secondary,
                        color: "white",
                      }}
                    >
                      Secondary
                    </Badge>
                    <Badge
                      style={{
                        backgroundColor: theme.tertiary,
                        color: "white",
                      }}
                    >
                      Tertiary
                    </Badge>
                    <Badge
                      style={{
                        backgroundColor: `rgb(${hexToRgb(theme.primary)} / 0.1)`,
                        color: theme.primary,
                      }}
                    >
                      Light Primary
                    </Badge>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="mb-3 font-medium text-sm">Backgrounds</p>
                  <div
                    className="rounded-lg p-4"
                    style={{
                      backgroundColor: theme.primary,
                      color: "white",
                    }}
                  >
                    <p className="font-medium">Primary Background</p>
                    <p className="text-sm opacity-90">
                      Used for headers and prominent sections
                    </p>
                  </div>
                </div>

                <p className="text-center text-muted-foreground text-xs">
                  Preview shows currently saved colors. Save new colors to see
                  updates.
                </p>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex items-center gap-3">
              <Button
                disabled={savingColors}
                onClick={handleSaveColors}
                type="button"
              >
                {savingColors ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-pulse" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Save Colors
                  </>
                )}
              </Button>
              <p className="text-muted-foreground text-xs">
                Colors apply immediately across all org pages
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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

      {!isAdmin && userRole && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm">
              Only organization owners and admins can update theme colors and
              social links.
            </p>
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
            <div className="flex items-start justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex-1">
                <h3 className="font-semibold">Delete Organization</h3>
                <p className="mt-1 text-muted-foreground text-sm">
                  Permanently delete this organization and all associated data.
                  This action cannot be undone.
                </p>
              </div>
              <Button
                onClick={() => setDeleteDialogOpen(true)}
                size="sm"
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
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
              Delete Organization
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              organization <strong>{org.name}</strong> and remove all associated
              data including teams, members, and players.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={deleteConfirmText !== org.name || deleting}
              onClick={handleDelete}
              variant="destructive"
            >
              {deleting ? (
                <>
                  <Trash2 className="mr-2 h-4 w-4 animate-pulse" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Organization
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
