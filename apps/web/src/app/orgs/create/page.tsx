"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useAction,
  useMutation,
} from "convex/react";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  ExternalLink,
  Globe,
  Loader2,
  Palette,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";

// Regex patterns at module level for performance
const HEX_COLOR_REGEX = /^#[0-9A-F]{6}$/i;
// Allow typing with or without # prefix, will be normalized
const HEX_INPUT_REGEX = /^#?[0-9A-F]{0,6}$/i;

// Default colors
const DEFAULT_COLORS = {
  primary: "#16a34a",
  secondary: "#0ea5e9",
  tertiary: "#f59e0b",
};

type ScrapedData = {
  logo: string | null;
  colors: string[];
  name: string | null;
  description: string | null;
  socialLinks: {
    facebook: string | null;
    twitter: string | null;
    instagram: string | null;
    linkedin: string | null;
  };
  colorSource: string;
};

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logo, setLogo] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [colors, setColors] = useState<string[]>(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);

  // Use Convex query to get user with custom fields
  const user = useCurrentUser();
  const scrapeWebsite = useAction(api.models.organizationScraper.scrapeWebsite);
  const updateOrganizationColors = useMutation(
    api.models.organizations.updateOrganizationColors
  );
  const updateOrganizationSocialLinks = useMutation(
    api.models.organizations.updateOrganizationSocialLinks
  );

  // Redirect if not platform staff
  useEffect(() => {
    if (user !== undefined && !user?.isPlatformStaff) {
      toast.error("Only platform staff can create organizations");
      router.push("/orgs");
    }
  }, [user, router]);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlug(name)) {
      const newSlug = generateSlug(value);
      setSlug(newSlug);
      if (newSlug) {
        checkSlugAvailability(newSlug);
      }
    }
  };

  const generateSlug = (input: string) =>
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const checkSlugAvailability = async (slugToCheck: string) => {
    if (!slugToCheck) {
      setSlugAvailable(null);
      return;
    }

    setCheckingSlug(true);
    try {
      const { data } = await authClient.organization.checkSlug({
        slug: slugToCheck,
      });
      setSlugAvailable(data?.status ?? null);
    } catch (error) {
      console.error("Error checking slug:", error);
      setSlugAvailable(null);
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSlugChange = (value: string) => {
    const cleanSlug = generateSlug(value);
    setSlug(cleanSlug);
    checkSlugAvailability(cleanSlug);
  };

  const handleScrapeWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast.error("Please enter a website URL");
      return;
    }

    setScraping(true);
    try {
      const result = await scrapeWebsite({ url: websiteUrl });
      setScrapedData(result);

      // Count what was extracted
      const extracted: string[] = [];
      if (result.name) {
        extracted.push("name");
      }
      if (result.logo) {
        extracted.push("logo");
      }
      if (result.colors.length > 0) {
        extracted.push(`${result.colors.length} colors`);
      }
      if (result.description) {
        extracted.push("description");
      }

      const socialCount = Object.values(result.socialLinks).filter(
        Boolean
      ).length;
      if (socialCount > 0) {
        extracted.push(`${socialCount} social links`);
      }

      if (extracted.length > 0) {
        toast.success(`Extracted: ${extracted.join(", ")}`);
      } else {
        toast.warning("No data could be extracted from this website");
      }
    } catch (error) {
      console.error("Error scraping website:", error);
      toast.error("Failed to scrape website. Please try again.");
    } finally {
      setScraping(false);
    }
  };

  const useScrapedName = () => {
    if (scrapedData?.name) {
      handleNameChange(scrapedData.name);
      toast.success("Organization name applied");
    }
  };

  const useScrapedLogo = () => {
    if (scrapedData?.logo) {
      setLogo(scrapedData.logo);
      toast.success("Logo applied");
    }
  };

  const useScrapedColors = () => {
    if (scrapedData?.colors && scrapedData.colors.length > 0) {
      // Ensure we have exactly 3 positions
      const newColors = ["", "", ""];
      scrapedData.colors.forEach((color, index) => {
        if (index < 3) {
          newColors[index] = color;
        }
      });
      setColors(newColors);
      toast.success("Colors applied");
    }
  };

  const useAllScrapedData = () => {
    if (scrapedData?.name) {
      handleNameChange(scrapedData.name);
    }
    if (scrapedData?.logo) {
      setLogo(scrapedData.logo);
    }
    if (scrapedData?.colors && scrapedData.colors.length > 0) {
      const newColors = ["", "", ""];
      scrapedData.colors.forEach((color, index) => {
        if (index < 3) {
          newColors[index] = color;
        }
      });
      setColors(newColors);
    }
    toast.success("All extracted data applied");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!(name && slug)) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (slugAvailable === false) {
      toast.error("This slug is already taken. Please choose another.");
      return;
    }

    setLoading(true);
    try {
      // Create organization using Better Auth client API
      const { data, error } = await authClient.organization.create({
        name,
        slug,
        logo: logo || undefined,
      });

      if (error) {
        toast.error(error.message || "Failed to create organization");
        setLoading(false);
        return;
      }

      if (data?.id) {
        // If colors were provided, save them using the mutation
        const validColors = colors.filter((c) => c && HEX_COLOR_REGEX.test(c));

        if (validColors.length > 0) {
          // Ensure we send exactly 3 positions
          const colorsToSave = [
            colors[0] && HEX_COLOR_REGEX.test(colors[0]) ? colors[0] : "",
            colors[1] && HEX_COLOR_REGEX.test(colors[1]) ? colors[1] : "",
            colors[2] && HEX_COLOR_REGEX.test(colors[2]) ? colors[2] : "",
          ];

          try {
            await updateOrganizationColors({
              organizationId: data.id,
              colors: colorsToSave,
            });
          } catch (colorError) {
            console.error("Failed to save organization colors:", colorError);
            toast.warning(
              "Organization created, but colors could not be saved. You can update them in settings."
            );
          }
        }

        // Save social links and website if scraped
        if (scrapedData) {
          const hasSocialLinks = Object.values(scrapedData.socialLinks).some(
            Boolean
          );
          const hasWebsite = websiteUrl.trim();

          if (hasSocialLinks || hasWebsite) {
            try {
              await updateOrganizationSocialLinks({
                organizationId: data.id,
                website: hasWebsite ? websiteUrl.trim() : null,
                socialLinks: {
                  facebook: scrapedData.socialLinks.facebook || null,
                  twitter: scrapedData.socialLinks.twitter || null,
                  instagram: scrapedData.socialLinks.instagram || null,
                  linkedin: scrapedData.socialLinks.linkedin || null,
                },
              });
            } catch (socialError) {
              console.error("Failed to save social links:", socialError);
              // Don't show warning for social links - not critical
            }
          }
        }

        toast.success(`Organization "${name}" created successfully!`);
        router.push(`/orgs/${data.id}/admin`);
      }
    } catch (error: unknown) {
      console.error("Error creating organization:", error);
      toast.error((error as Error)?.message || "Failed to create organization");
      setLoading(false);
    }
  };

  // Get preview color with fallback
  const getPreviewColor = (index: number): string => {
    const color = colors[index]?.trim();
    if (color && HEX_COLOR_REGEX.test(color)) {
      return color;
    }
    const defaults = [
      DEFAULT_COLORS.primary,
      DEFAULT_COLORS.secondary,
      DEFAULT_COLORS.tertiary,
    ];
    return defaults[index];
  };

  const renderContent = () => {
    if (user === undefined) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <Loader />
        </div>
      );
    }

    if (!user?.isPlatformStaff) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-2xl">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <ShieldAlert className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-2xl text-[#1E3A5F]">
                  Access Denied
                </CardTitle>
                <CardDescription>
                  Only platform staff can create organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/orgs">
                  <Button className="w-full bg-[#1E3A5F] hover:bg-[#1E3A5F]/90">
                    Back to Organizations
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          {/* PlayerARC Welcome Section */}
          <div className="mb-8 text-center text-white">
            <div className="mb-4 flex justify-center">
              <div className="relative h-16 w-16 sm:h-20 sm:w-20">
                <Image
                  alt="PlayerARC Logo"
                  className="object-contain drop-shadow-lg"
                  fill
                  priority
                  sizes="(max-width: 640px) 64px, 80px"
                  src="/logos-landing/PDP-Logo-OffWhiteOrbit_GreenHuman.png"
                />
              </div>
            </div>
            <h1 className="mb-2 font-bold text-3xl tracking-tight sm:text-4xl">
              Create New Organization
            </h1>
            <p className="mx-auto max-w-2xl text-base text-white/90 sm:text-lg">
              Set up a new sports club or organization on PlayerARC
            </p>
          </div>

          {/* Back Link */}
          <div className="mb-6">
            <Link
              className="flex items-center gap-1 text-sm text-white/80 hover:text-white"
              href="/orgs"
            >
              ← Back to organizations
            </Link>
          </div>

          {/* Website Auto-Import Card */}
          <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-blue-900 text-lg">
                    Quick Import from Website
                  </CardTitle>
                  <CardDescription>
                    Enter the organization's website to auto-extract name, logo,
                    and brand colors
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  disabled={loading || scraping}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleScrapeWebsite();
                    }
                  }}
                  placeholder="https://example-club.com"
                  type="url"
                  value={websiteUrl}
                />
                <Button
                  disabled={loading || scraping || !websiteUrl.trim()}
                  onClick={handleScrapeWebsite}
                  type="button"
                >
                  {scraping ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Extract Data
                    </>
                  )}
                </Button>
              </div>

              {/* Scraped Results */}
              {scrapedData && (
                <div className="space-y-4 rounded-lg border border-blue-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">
                        Data Extracted
                      </span>
                    </div>
                    <Button
                      onClick={useAllScrapedData}
                      size="sm"
                      type="button"
                      variant="default"
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      Use All
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Organization Name */}
                    {scrapedData.name && (
                      <div className="rounded-lg border bg-gray-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <Label className="text-gray-600 text-xs">
                            Organization Name
                          </Label>
                          <Button
                            onClick={useScrapedName}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            Use
                          </Button>
                        </div>
                        <p className="font-medium">{scrapedData.name}</p>
                      </div>
                    )}

                    {/* Logo */}
                    {scrapedData.logo && (
                      <div className="rounded-lg border bg-gray-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <Label className="text-gray-600 text-xs">Logo</Label>
                          <Button
                            onClick={useScrapedLogo}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            Use
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <img
                            alt="Extracted logo"
                            className="h-10 w-10 rounded object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                            src={scrapedData.logo}
                          />
                          <span className="truncate text-muted-foreground text-xs">
                            {scrapedData.logo.substring(0, 40)}...
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Colors */}
                  {scrapedData.colors.length > 0 && (
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <Label className="text-gray-600 text-xs">
                          Brand Colors
                        </Label>
                        <Button
                          onClick={useScrapedColors}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          Use
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        {scrapedData.colors.map((color, index) => {
                          const labels = ["Primary", "Secondary", "Tertiary"];
                          return (
                            <div
                              className="flex flex-col items-center gap-1"
                              key={color}
                            >
                              <div
                                className="h-10 w-10 rounded-lg border shadow-sm"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                              <span className="text-muted-foreground text-xs">
                                {labels[index]}
                              </span>
                              <span className="font-mono text-muted-foreground text-xs">
                                {color}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {scrapedData.colorSource && (
                        <p className="mt-2 text-amber-700 text-xs">
                          Source: {scrapedData.colorSource}
                        </p>
                      )}
                    </div>
                  )}

                  {/* No colors found message */}
                  {scrapedData.colors.length === 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-amber-800 text-xs">
                        <strong>No brand colors found in CSS.</strong> The club
                        colors may be defined in logo images. Please set colors
                        manually based on the club's badge/logo.
                      </p>
                    </div>
                  )}

                  {/* Social Links */}
                  {Object.values(scrapedData.socialLinks).some(Boolean) && (
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <Label className="mb-2 block text-gray-600 text-xs">
                        Social Media Found
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {scrapedData.socialLinks.facebook && (
                          <a
                            className="inline-flex items-center gap-1 text-blue-600 text-xs hover:underline"
                            href={scrapedData.socialLinks.facebook}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Facebook
                          </a>
                        )}
                        {scrapedData.socialLinks.twitter && (
                          <a
                            className="inline-flex items-center gap-1 text-blue-600 text-xs hover:underline"
                            href={scrapedData.socialLinks.twitter}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Twitter/X
                          </a>
                        )}
                        {scrapedData.socialLinks.instagram && (
                          <a
                            className="inline-flex items-center gap-1 text-blue-600 text-xs hover:underline"
                            href={scrapedData.socialLinks.instagram}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Instagram
                          </a>
                        )}
                        {scrapedData.socialLinks.linkedin && (
                          <a
                            className="inline-flex items-center gap-1 text-blue-600 text-xs hover:underline"
                            href={scrapedData.socialLinks.linkedin}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            <ExternalLink className="h-3 w-3" />
                            LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {scrapedData.description && (
                    <div className="rounded-lg border bg-gray-50 p-3">
                      <Label className="mb-2 block text-gray-600 text-xs">
                        Description
                      </Label>
                      <p className="line-clamp-2 text-muted-foreground text-sm">
                        {scrapedData.description}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1E3A5F]/10">
                  <Building2 className="h-6 w-6 text-[#1E3A5F]" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-[#1E3A5F]">
                    Organization Details
                  </CardTitle>
                  <CardDescription>
                    Configure your organization's basic information and branding
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Organization Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Organization Name{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    disabled={loading}
                    id="name"
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Grange Rugby Football Club"
                    required
                    value={name}
                  />
                  <p className="text-muted-foreground text-xs">
                    The full name of your sports club or organization
                  </p>
                </div>

                {/* Slug */}
                <div className="space-y-2">
                  <Label htmlFor="slug">
                    URL Slug <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      className={
                        slugAvailable === false
                          ? "border-destructive focus-visible:ring-destructive"
                          : slugAvailable === true
                            ? "border-green-500 focus-visible:ring-green-500"
                            : ""
                      }
                      disabled={loading}
                      id="slug"
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="e.g., grange-rfc"
                      required
                      value={slug}
                    />
                    {checkingSlug && (
                      <div className="-translate-y-1/2 absolute top-1/2 right-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!checkingSlug && slug && slugAvailable === true && (
                      <div className="-translate-y-1/2 absolute top-1/2 right-3">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                    {!checkingSlug && slug && slugAvailable === false && (
                      <div className="-translate-y-1/2 absolute top-1/2 right-3">
                        <XCircle className="h-4 w-4 text-destructive" />
                      </div>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Used in your organization's URL. Only lowercase letters,
                    numbers, and hyphens.
                  </p>
                  {slugAvailable === false && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4" />
                      This slug is already taken
                    </div>
                  )}
                  {slugAvailable === true && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      This slug is available
                    </div>
                  )}
                </div>

                {/* Logo URL (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo URL (Optional)</Label>
                  <Input
                    disabled={loading}
                    id="logo"
                    onChange={(e) => setLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    type="url"
                    value={logo}
                  />
                  {logo && (
                    <div className="mt-2 flex items-center gap-3 rounded-lg border bg-muted/30 p-2">
                      <img
                        alt="Logo preview"
                        className="h-10 w-10 rounded object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                        src={logo}
                      />
                      <span className="truncate text-muted-foreground text-xs">
                        {logo}
                      </span>
                    </div>
                  )}
                </div>

                {/* Colors Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-muted-foreground" />
                      <Label>Organization Colors</Label>
                    </div>
                    {colors.some((c) => c) && (
                      <Button
                        onClick={() => {
                          setColors(["", "", ""]);
                          toast.success("Colors cleared");
                        }}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {/* Primary Color */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm">
                        <div
                          className="h-3 w-3 rounded-full border"
                          style={{ backgroundColor: getPreviewColor(0) }}
                        />
                        Primary
                      </Label>
                      <div className="flex gap-2">
                        <input
                          className="h-10 w-10 cursor-pointer rounded border"
                          disabled={loading}
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
                          disabled={loading}
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
                          style={{ backgroundColor: getPreviewColor(1) }}
                        />
                        Secondary
                      </Label>
                      <div className="flex gap-2">
                        <input
                          className="h-10 w-10 cursor-pointer rounded border"
                          disabled={loading}
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
                          disabled={loading}
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
                          style={{ backgroundColor: getPreviewColor(2) }}
                        />
                        Tertiary
                      </Label>
                      <div className="flex gap-2">
                        <input
                          className="h-10 w-10 cursor-pointer rounded border"
                          disabled={loading}
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
                          disabled={loading}
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

                  {/* Color Preview */}
                  {colors.some((c) => c && HEX_COLOR_REGEX.test(c)) && (
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <Label className="mb-3 block text-sm">
                        Theme Preview
                      </Label>
                      <div className="flex gap-3">
                        {[0, 1, 2].map((index) => {
                          const labels = ["Primary", "Secondary", "Tertiary"];
                          const color = getPreviewColor(index);
                          const hasColor =
                            colors[index] &&
                            HEX_COLOR_REGEX.test(colors[index]);
                          return (
                            <div
                              className="flex flex-col items-center gap-2"
                              key={labels[index]}
                            >
                              <div
                                className="h-14 w-14 rounded-lg shadow-sm"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-xs">
                                {labels[index]}
                                {!hasColor && (
                                  <Badge
                                    className="ml-1 px-1 py-0"
                                    variant="outline"
                                  >
                                    default
                                  </Badge>
                                )}
                              </span>
                              <span className="font-mono text-muted-foreground text-xs">
                                {color}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1 bg-[#22c55e] hover:bg-[#16a34a]"
                    disabled={
                      loading ||
                      !name ||
                      !slug ||
                      slugAvailable === false ||
                      checkingSlug
                    }
                    type="submit"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Building2 className="mr-2 h-4 w-4" />
                        Create Organization
                      </>
                    )}
                  </Button>
                  <Link href="/orgs">
                    <Button disabled={loading} type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Info Box */}
          <Card className="mt-6 border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <div className="text-sm">
                  <p className="mb-1 font-medium text-blue-900">
                    What happens next?
                  </p>
                  <ul className="space-y-1 text-blue-800">
                    <li>• You'll be the organization owner with full access</li>
                    <li>
                      • Your theme colors will be applied across all pages
                    </li>
                    <li>• You can invite coaches, admins, and parents</li>
                    <li>• You can create teams and manage players</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <>
      <Authenticated>{renderContent()}</Authenticated>

      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center">
          <div className="space-y-4 text-center">
            <h1 className="font-bold text-2xl">Authentication Required</h1>
            <p className="text-muted-foreground">
              Please sign in to create an organization.
            </p>
            <Link href="/">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </Unauthenticated>

      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Loader />
        </div>
      </AuthLoading>
    </>
  );
}
