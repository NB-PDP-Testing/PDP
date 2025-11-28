"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import {
  AlertCircle,
  Building2,
  CheckCircle,
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
import { authClient } from "@/lib/auth-client";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logo, setLogo] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [user, setUser] = useState<unknown>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Load current user and check if they're platform staff
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data } = await authClient.getSession();
        setUser(data?.user || null);

        // Redirect if not platform staff
        if (!(data?.user as { isPlatformStaff?: boolean })?.isPlatformStaff) {
          toast.error("Only platform staff can create organizations");
          router.push("/orgs");
        }
      } catch (error) {
        console.error("Error loading user:", error);
        router.push("/orgs");
      } finally {
        setLoadingUser(false);
      }
    };
    loadUser();
  }, [router]);

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
        {loadingUser ? (
          <div className="flex min-h-screen items-center justify-center">
            <Loader />
          </div>
        ) : (user as { isPlatformStaff?: boolean })?.isPlatformStaff ===
          true ? (
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
            <Link href="/dashboard">
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
