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
  Globe,
  Loader2,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
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

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logo, setLogo] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<{
    logo: string | null;
    colors: string[];
  } | null>(null);

  // Use Convex query to get user with custom fields
  const user = useCurrentUser();
  const scrapeWebsite = useAction(api.models.organizationScraper.scrapeWebsite);
  const updateOrganizationColors = useMutation(
    api.models.organizations.updateOrganizationColors
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

      if (result.logo) {
        setLogo(result.logo);
        toast.success("Logo and colors extracted successfully!");
      } else {
        toast.warning("Logo not found, but colors may have been extracted");
      }

      if (result.colors.length > 0) {
        setColors(result.colors);
      }
    } catch (error) {
      console.error("Error scraping website:", error);
      toast.error("Failed to scrape website. Please try again.");
    } finally {
      setScraping(false);
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
      setColors(scrapedData.colors);
      toast.success("Colors applied");
    }
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
        // Colors might need to be set via metadata or update after creation
        metadata: colors.length > 0 ? { colors } : undefined,
      });

      if (error) {
        toast.error(error.message || "Failed to create organization");
        setLoading(false);
        return;
      }

      if (data?.id) {
        // If colors were provided, update the organization with colors
        // Better Auth might support colors directly, but if not, we'll update via mutation
        if (colors.length > 0) {
          try {
            await authClient.organization.update({
              organizationId: data.id,
              data: {
                // Try passing colors directly - Better Auth should support custom fields
                colors: colors as unknown as string[],
              } as unknown as { name?: string; logo?: string },
            });
          } catch (updateError) {
            // If direct update fails, colors might need to be set differently
            console.warn(
              "Could not set colors directly, may need backend update:",
              updateError
            );
          }
        }

        toast.success(`Organization "${name}" created successfully!`);
        // Redirect to the new organization's admin page
        router.push(`/orgs/${data.id}/admin`);
      }
    } catch (error: unknown) {
      console.error("Error creating organization:", error);
      toast.error((error as Error)?.message || "Failed to create organization");
      setLoading(false);
    }
  };

  return (
    <>
      <Authenticated>
        {user === undefined ? (
          <div className="flex min-h-screen items-center justify-center">
            <Loader />
          </div>
        ) : user?.isPlatformStaff ? (
          <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">
                      Create Organization
                    </CardTitle>
                    <CardDescription>
                      Set up your sports club organization
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

                  {/* Website URL for Auto-Detection */}
                  <div className="space-y-2">
                    <Label htmlFor="websiteUrl">
                      Organization Website (Optional)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        disabled={loading || scraping}
                        id="websiteUrl"
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleScrapeWebsite();
                          }
                        }}
                        placeholder="https://example.com"
                        type="url"
                        value={websiteUrl}
                      />
                      <Button
                        disabled={loading || scraping || !websiteUrl.trim()}
                        onClick={handleScrapeWebsite}
                        type="button"
                        variant="outline"
                      >
                        {scraping ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Scraping...
                          </>
                        ) : (
                          <>
                            <Globe className="mr-2 h-4 w-4" />
                            Extract
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Enter your organization's website URL to automatically
                      extract logo and colors
                    </p>
                  </div>

                  {/* Scraped Results Preview */}
                  {scrapedData && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">
                          Extracted Data
                        </span>
                      </div>

                      {/* Logo Preview */}
                      {scrapedData.logo && (
                        <div className="mb-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Logo</Label>
                            <Button
                              onClick={useScrapedLogo}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              Use This
                            </Button>
                          </div>
                          <div className="flex items-center gap-3 rounded border bg-white p-2">
                            <img
                              alt="Extracted logo"
                              className="h-12 w-12 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                              src={scrapedData.logo}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-muted-foreground text-xs">
                                {scrapedData.logo}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Colors Preview */}
                      {scrapedData.colors.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Colors</Label>
                            <Button
                              onClick={useScrapedColors}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              Use These
                            </Button>
                          </div>
                          <div className="flex gap-2 rounded border bg-white p-3">
                            {scrapedData.colors.map((color, index) => {
                              const labels = [
                                "Primary",
                                "Secondary",
                                "Tertiary",
                              ];
                              return (
                                <div
                                  className="flex flex-col items-center gap-1"
                                  key={index}
                                >
                                  <div
                                    className="h-12 w-12 rounded border-2 border-gray-200"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                  />
                                  <span className="font-medium text-xs">
                                    {labels[index] || `Color ${index + 1}`}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    {color}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
                    <p className="text-muted-foreground text-xs">
                      URL to your organization's logo image
                    </p>
                  </div>

                  {/* Colors Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Organization Colors</Label>
                      {colors.some((c) => c) && (
                        <Button
                          onClick={() => {
                            setColors([]);
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
                    <p className="text-muted-foreground text-xs">
                      Select up to 3 colors for your organization's branding
                    </p>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {/* Primary Color */}
                      <div className="space-y-2">
                        <Label className="text-sm">
                          Primary Color{" "}
                          {colors[0] && (
                            <span className="text-muted-foreground text-xs">
                              (Main)
                            </span>
                          )}
                        </Label>
                        <div className="flex gap-2">
                          <input
                            className="h-12 w-12 cursor-pointer rounded border-2 border-gray-200"
                            disabled={loading}
                            onChange={(e) => {
                              const newColors = [...colors];
                              newColors[0] = e.target.value.toUpperCase();
                              setColors(newColors);
                            }}
                            type="color"
                            value={colors[0] || "#16a34a"}
                          />
                          <div className="flex-1">
                            <Input
                              disabled={loading}
                              onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                if (/^#[0-9A-F]{0,6}$/i.test(value)) {
                                  const newColors = [...colors];
                                  newColors[0] = value;
                                  setColors(newColors);
                                }
                              }}
                              placeholder="#16a34a"
                              value={colors[0] || ""}
                            />
                            {colors[0] && (
                              <p className="mt-1 text-muted-foreground text-xs">
                                {colors[0]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Secondary Color */}
                      <div className="space-y-2">
                        <Label className="text-sm">
                          Secondary Color{" "}
                          {colors[1] && (
                            <span className="text-muted-foreground text-xs">
                              (Optional)
                            </span>
                          )}
                        </Label>
                        <div className="flex gap-2">
                          <input
                            className="h-12 w-12 cursor-pointer rounded border-2 border-gray-200"
                            disabled={loading}
                            onChange={(e) => {
                              const newColors = [...colors];
                              newColors[1] = e.target.value.toUpperCase();
                              setColors(newColors);
                            }}
                            type="color"
                            value={colors[1] || "#0ea5e9"}
                          />
                          <div className="flex-1">
                            <Input
                              disabled={loading}
                              onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                if (/^#[0-9A-F]{0,6}$/i.test(value)) {
                                  const newColors = [...colors];
                                  newColors[1] = value;
                                  setColors(newColors);
                                }
                              }}
                              placeholder="#0ea5e9"
                              value={colors[1] || ""}
                            />
                            {colors[1] && (
                              <p className="mt-1 text-muted-foreground text-xs">
                                {colors[1]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Tertiary Color */}
                      <div className="space-y-2">
                        <Label className="text-sm">
                          Tertiary Color{" "}
                          {colors[2] && (
                            <span className="text-muted-foreground text-xs">
                              (Optional)
                            </span>
                          )}
                        </Label>
                        <div className="flex gap-2">
                          <input
                            className="h-12 w-12 cursor-pointer rounded border-2 border-gray-200"
                            disabled={loading}
                            onChange={(e) => {
                              const newColors = [...colors];
                              newColors[2] = e.target.value.toUpperCase();
                              setColors(newColors);
                            }}
                            type="color"
                            value={colors[2] || "#f59e0b"}
                          />
                          <div className="flex-1">
                            <Input
                              disabled={loading}
                              onChange={(e) => {
                                const value = e.target.value.toUpperCase();
                                if (/^#[0-9A-F]{0,6}$/i.test(value)) {
                                  const newColors = [...colors];
                                  newColors[2] = value;
                                  setColors(newColors);
                                }
                              }}
                              placeholder="#f59e0b"
                              value={colors[2] || ""}
                            />
                            {colors[2] && (
                              <p className="mt-1 text-muted-foreground text-xs">
                                {colors[2]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Color Preview */}
                    {colors.some((c) => c) && (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <Label className="mb-2 block text-sm">
                          Color Preview
                        </Label>
                        <div className="flex gap-2">
                          {colors
                            .filter((c) => c)
                            .map((color, index) => {
                              const labels = [
                                "Primary",
                                "Secondary",
                                "Tertiary",
                              ];
                              return (
                                <div
                                  className="flex flex-1 flex-col items-center gap-2 rounded-lg bg-white p-3"
                                  key={index}
                                >
                                  <div
                                    className="h-16 w-16 rounded-lg border-2 shadow-sm"
                                    style={{
                                      backgroundColor: color,
                                      borderColor: color,
                                    }}
                                    title={color}
                                  />
                                  <span className="font-medium text-xs">
                                    {labels[index]}
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
                      className="flex-1"
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
                      <Button
                        disabled={loading}
                        type="button"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </Link>
                  </div>
                </form>

                {/* Info Box */}
                <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                    <div className="text-sm">
                      <p className="mb-1 font-medium text-blue-900">
                        What happens next?
                      </p>
                      <ul className="space-y-1 text-blue-800">
                        <li>
                          • You'll be the organization owner with full access
                        </li>
                        <li>• You can invite coaches, admins, and parents</li>
                        <li>• You can create teams and manage players</li>
                        <li>
                          • Your organization will have its own dedicated space
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <ShieldAlert className="h-8 w-8 text-red-600" />
                </div>
                <CardTitle className="text-2xl">Access Denied</CardTitle>
                <CardDescription>
                  Only platform staff can create organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/orgs">
                  <Button className="w-full">Back to Organizations</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </Authenticated>

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
