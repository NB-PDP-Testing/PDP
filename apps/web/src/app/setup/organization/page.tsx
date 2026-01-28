"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Loader2,
  XCircle,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PDPLogo } from "@/components/pdp-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function SetupOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logo, setLogo] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  const currentUser = useQuery(api.models.users.getCurrentUser);
  const availableSports = useQuery(api.models.referenceData.getSports, {});
  const _updateOrganizationColors = useMutation(
    api.models.organizations.updateOrganizationColors
  );
  const updateOrganizationSports = useMutation(
    api.models.organizations.updateOrganizationSports
  );
  const updateSetupStep = useMutation(api.models.setup.updateSetupStep);

  // Redirect if not authenticated or not platform staff
  useEffect(() => {
    if (currentUser === null) {
      router.push("/login");
    } else if (currentUser && !currentUser.isPlatformStaff) {
      router.push("/orgs/current");
    }
  }, [currentUser, router]);

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

    if (selectedSports.length === 0) {
      toast.error("Please select at least one sport for this organization");
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
        // Save supported sports (required)
        try {
          await updateOrganizationSports({
            organizationId: data.id,
            supportedSports: selectedSports,
          });
        } catch (sportsError) {
          console.error("Failed to save supported sports:", sportsError);
          toast.error(
            "Organization created, but sports could not be saved. Please update them in settings."
          );
        }

        // Update setup step to invite
        await updateSetupStep({ step: "invite" });

        toast.success(`Organization "${name}" created successfully!`);
        router.push(
          `/setup/invite?orgId=${encodeURIComponent(data.id)}&orgName=${encodeURIComponent(name)}` as Route
        );
      }
    } catch (error: unknown) {
      console.error("Error creating organization:", error);
      toast.error((error as Error)?.message || "Failed to create organization");
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 px-4 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <PDPLogo size="lg" />
          </div>
          <h1 className="font-bold text-4xl tracking-tight">
            Create Your First Organization
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Let's set up your sports club or organization
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center gap-2">
          <div
            className="h-2 w-20 rounded-full"
            style={{ backgroundColor: "var(--pdp-green)" }}
          />
          <div
            className="h-2 w-20 rounded-full"
            style={{ backgroundColor: "var(--pdp-navy)" }}
          />
          <div className="h-2 w-20 rounded-full bg-muted" />
        </div>

        {/* Form Card */}
        <div className="space-y-6 rounded-lg border bg-card p-8 shadow-lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Organization Name <span className="text-destructive">*</span>
              </Label>
              <Input
                disabled={loading}
                id="name"
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., St. Francis Football Club"
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
                  placeholder="e.g., st-francis-fc"
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
              <p className="text-muted-foreground text-xs">
                You can add a logo now or later in settings
              </p>
              {logo && (
                <div className="mt-2 flex items-center gap-3 rounded-lg border bg-muted/30 p-2">
                  <span className="truncate text-muted-foreground text-xs">
                    {logo}
                  </span>
                </div>
              )}
            </div>

            {/* Supported Sports Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>
                    Supported Sports <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Select at least one sport your organization supports
                  </p>
                </div>
                {selectedSports.length > 0 && (
                  <Button
                    onClick={() => {
                      setSelectedSports([]);
                      toast.success("Sports cleared");
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {/* Warning if no sports available */}
              {(!availableSports || availableSports.length === 0) && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                  <div className="space-y-1">
                    <p className="font-medium text-destructive text-sm">
                      Required Reference Data Missing
                    </p>
                    <p className="text-destructive/90 text-xs">
                      Cannot create organization without sports data. Please
                      contact support.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                {availableSports?.map((sport) => (
                  <label
                    className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3 hover:bg-muted/50"
                    htmlFor={`sport-${sport.code}`}
                    key={sport.code}
                  >
                    <input
                      checked={selectedSports.includes(sport.code)}
                      className="h-4 w-4"
                      disabled={loading}
                      id={`sport-${sport.code}`}
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
                <div className="flex flex-wrap gap-2">
                  <span className="text-muted-foreground text-sm">
                    Selected:
                  </span>
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
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                className="flex-1 text-white"
                disabled={
                  loading ||
                  !name ||
                  !slug ||
                  slugAvailable === false ||
                  checkingSlug ||
                  !availableSports ||
                  availableSports.length === 0 ||
                  selectedSports.length === 0
                }
                style={{
                  backgroundColor: "var(--pdp-navy)",
                }}
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
                    Continue →
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            You can customize colors, add social links, and more later in
            settings
          </p>
        </div>
      </div>
    </div>
  );
}
