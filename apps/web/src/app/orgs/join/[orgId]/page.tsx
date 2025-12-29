"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import {
  Building2,
  Check,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Send,
  Shield,
  Trash2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FunctionalRole = "coach" | "parent" | "admin" | "player";

type ChildEntry = {
  name: string;
  age: string;
  team: string;
};

const SPORTS = ["GAA Football", "Soccer", "Rugby", "GAA Hurling"] as const;
const GENDERS = ["male", "female", "mixed"] as const;

export default function JoinOrganizationRequestPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  // Users can select multiple functional roles
  const [selectedRoles, setSelectedRoles] = useState<FunctionalRole[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Common field - phone (used by both parent and coach)
  const [phone, setPhone] = useState("");

  // Parent-specific fields
  const [address, setAddress] = useState("");
  const [children, setChildren] = useState<ChildEntry[]>([
    { name: "", age: "", team: "" },
  ]);

  // Coach-specific fields
  const [coachSport, setCoachSport] = useState("");
  const [coachGender, setCoachGender] = useState("");
  const [coachTeams, setCoachTeams] = useState("");
  const [coachAgeGroups, setCoachAgeGroups] = useState("");

  const createJoinRequest = useMutation(
    api.models.orgJoinRequests.createJoinRequest
  );

  const toggleRole = (role: FunctionalRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  // Helper function to infer Better Auth role from functional roles
  const inferBetterAuthRole = (
    functionalRoles: FunctionalRole[]
  ): "member" | "admin" =>
    functionalRoles.includes("admin") ? "admin" : "member";

  // Child management functions
  const addChild = () => {
    setChildren([...children, { name: "", age: "", team: "" }]);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const updateChild = (
    index: number,
    field: keyof ChildEntry,
    value: string
  ) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  // Check if parent fields are valid (at least one child with name)
  const isParentDataValid = () => {
    if (!selectedRoles.includes("parent")) return true;
    // At least one child must have a name
    return children.some((child) => child.name.trim().length > 0);
  };

  // Check if coach fields are valid
  const isCoachDataValid = () => {
    if (!selectedRoles.includes("coach")) return true;
    // Sport is required for coaches
    return coachSport.length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const betterAuthRole = inferBetterAuthRole(selectedRoles);

      // Filter children to only include those with names
      const validChildren = children.filter(
        (child) => child.name.trim().length > 0
      );

      await createJoinRequest({
        organizationId: orgId,
        requestedRole: betterAuthRole,
        requestedFunctionalRoles: selectedRoles,
        message: message || undefined,

        // Common field
        phone: phone || undefined,

        // Parent-specific fields
        address: selectedRoles.includes("parent")
          ? address || undefined
          : undefined,
        children:
          selectedRoles.includes("parent") && validChildren.length > 0
            ? JSON.stringify(
                validChildren.map((c) => ({
                  name: c.name.trim(),
                  age: c.age ? Number.parseInt(c.age, 10) : undefined,
                  team: c.team.trim() || undefined,
                }))
              )
            : undefined,

        // Coach-specific fields
        coachSport: selectedRoles.includes("coach")
          ? coachSport || undefined
          : undefined,
        coachGender: selectedRoles.includes("coach")
          ? coachGender || undefined
          : undefined,
        coachTeams: selectedRoles.includes("coach")
          ? coachTeams || undefined
          : undefined,
        coachAgeGroups: selectedRoles.includes("coach")
          ? coachAgeGroups || undefined
          : undefined,
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

  const canSubmit =
    selectedRoles.length > 0 && isParentDataValid() && isCoachDataValid();

  return (
    <div className="container mx-auto max-w-2xl space-y-6 py-8">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl tracking-tight">
          Request to Join Organization
        </h1>
        <p className="mt-2 text-muted-foreground">
          Select your role(s) and provide details to help with verification
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
            {/* Role Selection */}
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
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
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
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30"
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
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
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

                {/* Player Role (Adult) */}
                <button
                  className={`flex w-full cursor-pointer items-start gap-4 rounded-lg border p-4 text-left transition-colors ${
                    selectedRoles.includes("player")
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                      : "hover:bg-accent/50"
                  }`}
                  disabled={isSubmitting}
                  onClick={() => toggleRole("player")}
                  type="button"
                >
                  <div
                    className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                      selectedRoles.includes("player")
                        ? "border-orange-500 bg-orange-500 text-white"
                        : "border-input"
                    }`}
                  >
                    {selectedRoles.includes("player") && (
                      <Check className="h-3 w-3" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-600" />
                      <span className="font-medium">Player (Adult)</span>
                    </div>
                    <p className="mt-1 text-muted-foreground text-sm">
                      Access your own player passport, track your development,
                      and view your goals and assessments.
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

            {/* Phone Number - shown for parent or coach */}
            {(selectedRoles.includes("parent") ||
              selectedRoles.includes("coach")) && (
              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="mr-2 inline h-4 w-4" />
                  Mobile Number
                </Label>
                <Input
                  disabled={isSubmitting}
                  id="phone"
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., 07912 345678"
                  type="tel"
                  value={phone}
                />
                <p className="text-muted-foreground text-xs">
                  Helps verify your identity and for contact purposes
                </p>
              </div>
            )}

            {/* Parent-specific fields */}
            {selectedRoles.includes("parent") && (
              <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
                <h3 className="flex items-center gap-2 font-medium text-blue-800 dark:text-blue-200">
                  <UserCircle className="h-4 w-4" />
                  Parent Information
                </h3>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">
                    <MapPin className="mr-2 inline h-4 w-4" />
                    Home Address
                  </Label>
                  <Textarea
                    className="min-h-20"
                    disabled={isSubmitting}
                    id="address"
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your full address including postcode..."
                    value={address}
                  />
                  <p className="text-muted-foreground text-xs">
                    Used to help match you with your children in the system
                  </p>
                </div>

                {/* Children */}
                <div className="space-y-3">
                  <Label>
                    Your Children <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Add details about your children to help us match them to
                    their records
                  </p>

                  {children.map((child, index) => (
                    <div
                      className="flex items-start gap-2 rounded border bg-white p-3 dark:bg-gray-900"
                      key={index}
                    >
                      <div className="grid flex-1 grid-cols-3 gap-2">
                        <Input
                          disabled={isSubmitting}
                          onChange={(e) =>
                            updateChild(index, "name", e.target.value)
                          }
                          placeholder="Child's name *"
                          value={child.name}
                        />
                        <Input
                          disabled={isSubmitting}
                          max={18}
                          min={4}
                          onChange={(e) =>
                            updateChild(index, "age", e.target.value)
                          }
                          placeholder="Age"
                          type="number"
                          value={child.age}
                        />
                        <Input
                          disabled={isSubmitting}
                          onChange={(e) =>
                            updateChild(index, "team", e.target.value)
                          }
                          placeholder="Team (optional)"
                          value={child.team}
                        />
                      </div>
                      {children.length > 1 && (
                        <Button
                          className="shrink-0"
                          disabled={isSubmitting}
                          onClick={() => removeChild(index)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}

                  <Button
                    className="w-full"
                    disabled={isSubmitting}
                    onClick={addChild}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Another Child
                  </Button>
                </div>
              </div>
            )}

            {/* Coach-specific fields */}
            {selectedRoles.includes("coach") && (
              <div className="space-y-4 rounded-lg border border-green-200 bg-green-50/50 p-4 dark:border-green-800 dark:bg-green-950/20">
                <h3 className="flex items-center gap-2 font-medium text-green-800 dark:text-green-200">
                  <Users className="h-4 w-4" />
                  Coach Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Sport */}
                  <div className="space-y-2">
                    <Label htmlFor="coachSport">
                      Primary Sport <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      disabled={isSubmitting}
                      onValueChange={setCoachSport}
                      value={coachSport}
                    >
                      <SelectTrigger id="coachSport">
                        <SelectValue placeholder="Select sport" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPORTS.map((sport) => (
                          <SelectItem key={sport} value={sport}>
                            {sport}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <Label htmlFor="coachGender">Team Gender</Label>
                    <Select
                      disabled={isSubmitting}
                      onValueChange={setCoachGender}
                      value={coachGender}
                    >
                      <SelectTrigger id="coachGender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDERS.map((gender) => (
                          <SelectItem key={gender} value={gender}>
                            {gender}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Teams */}
                <div className="space-y-2">
                  <Label htmlFor="coachTeams">Teams (optional)</Label>
                  <Input
                    disabled={isSubmitting}
                    id="coachTeams"
                    onChange={(e) => setCoachTeams(e.target.value)}
                    placeholder="e.g., U12, U14 Boys, Senior"
                    value={coachTeams}
                  />
                  <p className="text-muted-foreground text-xs">
                    Comma-separated list of teams you coach or want to coach
                  </p>
                </div>

                {/* Age Groups */}
                <div className="space-y-2">
                  <Label htmlFor="coachAgeGroups">Age Groups (optional)</Label>
                  <Input
                    disabled={isSubmitting}
                    id="coachAgeGroups"
                    onChange={(e) => setCoachAgeGroups(e.target.value)}
                    placeholder="e.g., U10, U12, U14"
                    value={coachAgeGroups}
                  />
                  <p className="text-muted-foreground text-xs">
                    Comma-separated list of age groups you work with
                  </p>
                </div>
              </div>
            )}

            {/* Optional Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Additional Message (Optional)</Label>
              <Textarea
                className="min-h-20"
                disabled={isSubmitting}
                id="message"
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Any additional information you'd like to share..."
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
                disabled={isSubmitting || !canSubmit}
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
