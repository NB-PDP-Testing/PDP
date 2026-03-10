"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Check,
  Download,
  Droplet,
  Edit,
  ExternalLink,
  FileText,
  Heart,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Pill,
  Plus,
  Share2,
  Shield,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import {
  downloadPDF,
  generateMedicalCardPDF,
  type MedicalCardPDFData,
  previewPDF,
  shareViaEmail,
  shareViaNative,
  shareViaWhatsApp,
} from "@/lib/pdf-generator";

// ─── Medical Form ────────────────────────────────────────────────────────────

function MedicalForm({
  profile,
  playerName,
  playerIdentityId,
  ageGroup,
  sport,
  orgId,
  onClose,
  onSave,
}: {
  profile: any;
  playerName: string;
  playerIdentityId: Id<"playerIdentities">;
  ageGroup: string;
  sport: string;
  orgId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    bloodType: profile?.bloodType || "",
    allergies: profile?.allergies || [],
    medications: profile?.medications || [],
    conditions: profile?.conditions || [],
    doctorName: profile?.doctorName || "",
    doctorPhone: profile?.doctorPhone || "",
    emergencyContact1Name: profile?.emergencyContact1Name || "",
    emergencyContact1Phone: profile?.emergencyContact1Phone || "",
    emergencyContact2Name: profile?.emergencyContact2Name || "",
    emergencyContact2Phone: profile?.emergencyContact2Phone || "",
    lastMedicalCheck: profile?.lastMedicalCheck || "",
    insuranceCovered: profile?.insuranceCovered ?? false,
    notes: profile?.notes || "",
  });

  const [newAllergy, setNewAllergy] = useState("");
  const [newMedication, setNewMedication] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const upsertProfile = useMutation(
    api.models.medicalProfiles.upsertForIdentity
  );

  const handleAddItem = (
    field: "allergies" | "medications" | "conditions",
    value: string
  ) => {
    if (!value.trim()) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], value.trim()],
    }));
  };

  const handleRemoveItem = (
    field: "allergies" | "medications" | "conditions",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((item: string) => item !== value),
    }));
  };

  const handleSubmit = async () => {
    if (!(formData.emergencyContact1Name && formData.emergencyContact1Phone)) {
      toast.error("Emergency contact is required");
      return;
    }
    setIsSaving(true);
    try {
      await upsertProfile({
        playerIdentityId,
        organizationId: orgId,
        ageGroup,
        sport,
        ...formData,
      });
      toast.success(
        profile ? "Medical profile updated" : "Medical profile created"
      );
      onSave();
    } catch (error) {
      toast.error("Failed to save medical profile", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            {profile ? "Update" : "Add"} Medical Info: {playerName}
          </DialogTitle>
          <DialogDescription>
            Keep your medical information up to date for your safety
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Emergency Contacts */}
          <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="font-semibold text-red-800">
              Emergency Contacts (Required)
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Primary Contact Name *</Label>
                <Input
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact1Name: e.target.value,
                    })
                  }
                  placeholder="e.g., Spouse, Parent"
                  value={formData.emergencyContact1Name}
                />
              </div>
              <div className="space-y-2">
                <Label>Primary Contact Phone *</Label>
                <Input
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact1Phone: e.target.value,
                    })
                  }
                  placeholder="e.g., 087 123 4567"
                  value={formData.emergencyContact1Phone}
                />
              </div>
              <div className="space-y-2">
                <Label>Secondary Contact Name</Label>
                <Input
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact2Name: e.target.value,
                    })
                  }
                  placeholder="e.g., Sibling, Friend"
                  value={formData.emergencyContact2Name}
                />
              </div>
              <div className="space-y-2">
                <Label>Secondary Contact Phone</Label>
                <Input
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact2Phone: e.target.value,
                    })
                  }
                  placeholder="e.g., 086 987 6543"
                  value={formData.emergencyContact2Phone}
                />
              </div>
            </div>
          </div>

          {/* Basic Medical Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Blood Type</Label>
              <Select
                onValueChange={(value) =>
                  setFormData({ ...formData, bloodType: value })
                }
                value={formData.bloodType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select blood type" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "A+",
                    "A-",
                    "B+",
                    "B-",
                    "AB+",
                    "AB-",
                    "O+",
                    "O-",
                    "Unknown",
                  ].map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Insurance Covered</Label>
              <Select
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    insuranceCovered: value === "yes",
                  })
                }
                value={formData.insuranceCovered ? "yes" : "no"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes - Covered</SelectItem>
                  <SelectItem value="no">No - Not Covered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Family Doctor Name</Label>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, doctorName: e.target.value })
                }
                placeholder="e.g., Dr. Mary O'Brien"
                value={formData.doctorName}
              />
            </div>
            <div className="space-y-2">
              <Label>Doctor Phone</Label>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, doctorPhone: e.target.value })
                }
                placeholder="e.g., 01 234 5678"
                value={formData.doctorPhone}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Last Medical Check</Label>
              <Input
                onChange={(e) =>
                  setFormData({ ...formData, lastMedicalCheck: e.target.value })
                }
                placeholder="e.g., January 2025"
                value={formData.lastMedicalCheck}
              />
            </div>
          </div>

          {/* Allergies */}
          <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
            <h3 className="font-semibold text-orange-800">Allergies</h3>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                onChange={(e) => setNewAllergy(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddItem("allergies", newAllergy);
                    setNewAllergy("");
                  }
                }}
                placeholder="Add allergy..."
                value={newAllergy}
              />
              <Button
                onClick={() => {
                  handleAddItem("allergies", newAllergy);
                  setNewAllergy("");
                }}
                size="sm"
                type="button"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.allergies.map((allergy: string) => (
                <Badge className="bg-orange-200 text-orange-800" key={allergy}>
                  {allergy}
                  <button
                    className="ml-1"
                    onClick={() => handleRemoveItem("allergies", allergy)}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Medications */}
          <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="font-semibold text-blue-800">Current Medications</h3>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                onChange={(e) => setNewMedication(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddItem("medications", newMedication);
                    setNewMedication("");
                  }
                }}
                placeholder="Add medication..."
                value={newMedication}
              />
              <Button
                onClick={() => {
                  handleAddItem("medications", newMedication);
                  setNewMedication("");
                }}
                size="sm"
                type="button"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.medications.map((med: string) => (
                <Badge className="bg-blue-200 text-blue-800" key={med}>
                  {med}
                  <button
                    className="ml-1"
                    onClick={() => handleRemoveItem("medications", med)}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Medical Conditions */}
          <div className="space-y-3 rounded-lg border border-purple-200 bg-purple-50 p-4">
            <h3 className="font-semibold text-purple-800">
              Medical Conditions
            </h3>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                onChange={(e) => setNewCondition(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddItem("conditions", newCondition);
                    setNewCondition("");
                  }
                }}
                placeholder="e.g., Asthma, Diabetes..."
                value={newCondition}
              />
              <Button
                onClick={() => {
                  handleAddItem("conditions", newCondition);
                  setNewCondition("");
                }}
                size="sm"
                type="button"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.conditions.map((condition: string) => (
                <Badge
                  className="bg-purple-200 text-purple-800"
                  key={condition}
                >
                  {condition}
                  <button
                    className="ml-1"
                    onClick={() => handleRemoveItem("conditions", condition)}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Any other information coaches should know..."
              rows={3}
              value={formData.notes}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={isSaving} onClick={handleSubmit}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Save Medical Info
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Medical Share Modal ─────────────────────────────────────────────────────

function MedicalShareModal({
  open,
  onOpenChange,
  pdfData,
  playerName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfData: MedicalCardPDFData;
  playerName: string;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [emailAddress, setEmailAddress] = useState("");

  const generatePDF = useCallback(async () => {
    setIsGenerating(true);
    try {
      const bytes = await generateMedicalCardPDF(pdfData);
      setPdfBytes(bytes);
      setPreviewUrl(previewPDF(bytes));
    } catch (error) {
      toast.error("Failed to generate PDF", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [pdfData]);

  useEffect(() => {
    if (open && !pdfBytes) {
      generatePDF();
    }
  }, [open, generatePDF, pdfBytes]);

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl]
  );

  const filename = `${playerName.replace(/\s+/g, "_")}_Medical_Card.pdf`;

  const handleDownload = useCallback(() => {
    if (!pdfBytes) {
      return;
    }
    downloadPDF(pdfBytes, filename);
    toast.success("Medical card PDF downloaded");
  }, [pdfBytes, filename]);

  const handlePreview = useCallback(() => {
    if (previewUrl) {
      window.open(previewUrl, "_blank");
    }
  }, [previewUrl]);

  const handleWhatsApp = useCallback(async () => {
    if (!pdfBytes) {
      toast.error("PDF not ready yet");
      return;
    }
    try {
      const result = await shareViaWhatsApp(
        pdfBytes,
        `${playerName}_Medical_Card`
      );
      if (result.method === "native") {
        if (result.shared) {
          toast.success("Shared via WhatsApp");
        }
      } else {
        toast.info("PDF downloaded", {
          description: "WhatsApp opened — please attach the downloaded PDF",
        });
      }
    } catch {
      toast.error("Share failed", {
        description: "Please download the PDF and share manually",
      });
    }
  }, [pdfBytes, playerName]);

  const handleEmail = useCallback(async () => {
    if (!pdfBytes) {
      toast.error("PDF not ready yet");
      return;
    }
    try {
      await shareViaEmail(pdfBytes, `${playerName}_Medical_Card`);
      toast.success("Share opened");
    } catch {
      if (emailAddress) {
        const subject = encodeURIComponent(
          `Medical Information Card — ${playerName}`
        );
        const body = encodeURIComponent(
          `Please find attached the Medical Information Card for ${playerName}.`
        );
        window.location.href = `mailto:${emailAddress}?subject=${subject}&body=${body}`;
      }
    }
  }, [pdfBytes, playerName, emailAddress]);

  const handleNativeShare = useCallback(async () => {
    if (!pdfBytes) {
      toast.error("PDF not ready yet");
      return;
    }
    try {
      await shareViaNative(pdfBytes, `${playerName}_Medical_Card`);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error("Share failed. Try downloading and sharing manually.");
      }
    }
  }, [pdfBytes, playerName]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Medical Card
          </DialogTitle>
          <DialogDescription>
            Share {playerName}&apos;s medical information card as a PDF
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto">
          <div className="space-y-6">
            {/* PDF preview row */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
                    <FileText className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium">{filename}</p>
                    <p className="text-muted-foreground text-sm">
                      {isGenerating ? "Generating..." : "Ready to share"}
                    </p>
                  </div>
                </div>
                {isGenerating ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Badge className="bg-green-100 text-green-700">Ready</Badge>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  className="flex-1"
                  disabled={isGenerating || !pdfBytes}
                  onClick={handleDownload}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button
                  disabled={isGenerating || !previewUrl}
                  onClick={handlePreview}
                  variant="outline"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              </div>
            </div>

            <Separator />

            {/* Share options */}
            <div className="space-y-4">
              <h3 className="font-semibold">Share Options</h3>

              {typeof navigator !== "undefined" && "share" in navigator && (
                <Button
                  className="w-full justify-start"
                  disabled={isGenerating || !pdfBytes}
                  onClick={handleNativeShare}
                  variant="outline"
                >
                  <Share2 className="mr-3 h-4 w-4" />
                  Share via device...
                </Button>
              )}

              <div className="space-y-2">
                <Label>Share via Email</Label>
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="Enter email address"
                    type="email"
                    value={emailAddress}
                  />
                  <Button
                    disabled={!emailAddress}
                    onClick={handleEmail}
                    variant="outline"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </Button>
                </div>
              </div>

              <Button
                className="w-full justify-start bg-green-600 text-white hover:bg-green-700"
                disabled={isGenerating || !pdfBytes}
                onClick={handleWhatsApp}
              >
                <MessageCircle className="mr-3 h-4 w-4" />
                Share via WhatsApp
                <span className="ml-auto text-green-200 text-xs">
                  includes PDF
                </span>
              </Button>
            </div>

            {/* Info */}
            <div className="rounded-lg bg-red-50 p-4 text-red-800 text-sm">
              <p className="font-medium">
                🏥 What's included in the Medical Card:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-red-700">
                <li>Blood type (prominently displayed)</li>
                <li>Emergency contacts (ICE)</li>
                <li>Family doctor details</li>
                <li>Allergies, medications & conditions</li>
                <li>Insurance status</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page Content ─────────────────────────────────────────────────────────────

function MedicalPageContent() {
  const params = useParams();
  const orgId = params.orgId as string;

  const { data: session } = authClient.useSession();
  const { data: activeOrganization } = authClient.useActiveOrganization();

  const userEmail = session?.user?.email;

  const playerIdentity = useQuery(
    api.models.playerIdentities.findPlayerByEmail,
    userEmail ? { email: userEmail.toLowerCase() } : "skip"
  );

  const enrollments = useQuery(
    api.models.orgPlayerEnrollments.getEnrollmentsForPlayer,
    playerIdentity?._id
      ? { playerIdentityId: playerIdentity._id as Id<"playerIdentities"> }
      : "skip"
  );
  const enrollment = enrollments?.find((e) => e.organizationId === orgId);

  const medicalProfile = useQuery(
    api.models.medicalProfiles.getByPlayerIdentityId,
    playerIdentity?._id
      ? {
          playerIdentityId: playerIdentity._id as Id<"playerIdentities">,
          organizationId: orgId,
        }
      : "skip"
  );

  const [showEditForm, setShowEditForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const hasProfile = !!medicalProfile;
  const profile = medicalProfile as any;

  const hasAllergies = (profile?.allergies?.length ?? 0) > 0;
  const hasMedications = (profile?.medications?.length ?? 0) > 0;
  const hasConditions = (profile?.conditions?.length ?? 0) > 0;

  const pdfData = useMemo<MedicalCardPDFData | null>(() => {
    if (!playerIdentity) {
      return null;
    }
    return {
      playerName: `${playerIdentity.firstName} ${playerIdentity.lastName}`,
      dateOfBirth: playerIdentity.dateOfBirth,
      organization: activeOrganization?.name,
      bloodType: profile?.bloodType,
      allergies: profile?.allergies ?? [],
      medications: profile?.medications ?? [],
      conditions: profile?.conditions ?? [],
      emergencyContact1Name: profile?.emergencyContact1Name,
      emergencyContact1Phone: profile?.emergencyContact1Phone,
      emergencyContact2Name: profile?.emergencyContact2Name,
      emergencyContact2Phone: profile?.emergencyContact2Phone,
      doctorName: profile?.doctorName,
      doctorPhone: profile?.doctorPhone,
      insuranceCovered: profile?.insuranceCovered,
      lastMedicalCheck: profile?.lastMedicalCheck,
      notes: profile?.notes,
    };
  }, [playerIdentity, activeOrganization, profile]);

  if (playerIdentity === undefined || medicalProfile === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!playerIdentity) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Player Profile Not Linked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Your account hasn&apos;t been linked to a player profile yet.
            Contact your club administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  const playerName = `${playerIdentity.firstName} ${playerIdentity.lastName}`;
  const ageGroup = (enrollment as any)?.ageGroup ?? "adult";
  const sport = profile?.sport ?? "general";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 p-6 text-white shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Heart className="h-8 w-8 shrink-0" />
            <div>
              <h1 className="font-bold text-2xl">Medical Information</h1>
              <p className="mt-1 text-red-100">{playerName}</p>
              {activeOrganization && (
                <p className="text-red-200 text-sm">
                  {activeOrganization.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              className="border-white/30 bg-white/20 text-white hover:bg-white/30"
              onClick={() => setShowEditForm(true)}
              size="sm"
              variant="outline"
            >
              {hasProfile ? (
                <>
                  <Edit className="mr-1.5 h-4 w-4" />
                  Update
                </>
              ) : (
                <>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Info
                </>
              )}
            </Button>
            <Button
              className="border-white/30 bg-white/20 text-white hover:bg-white/30"
              disabled={!hasProfile}
              onClick={() => setShowShareModal(true)}
              size="sm"
              variant="outline"
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Medical card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            My Medical Profile
            {hasProfile ? (
              <Badge className="ml-auto bg-green-100 text-green-700">
                <Check className="mr-1 h-3 w-3" />
                Complete
              </Badge>
            ) : (
              <Badge className="ml-auto bg-red-100 text-red-700">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Incomplete
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasProfile && profile ? (
            <div
              className={`rounded-lg border p-4 ${
                hasAllergies || hasConditions
                  ? "border-amber-200 bg-amber-50/50"
                  : "border-green-200 bg-green-50/50"
              }`}
            >
              {/* Player header */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-semibold">{playerName}</p>
                  {playerIdentity.dateOfBirth && (
                    <p className="text-muted-foreground text-xs">
                      {new Date(playerIdentity.dateOfBirth).toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* 3-icon summary row */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-white p-3 text-center">
                  <Droplet className="mx-auto h-6 w-6 text-red-500" />
                  <p className="mt-1 font-bold text-red-600 text-sm">
                    {profile.bloodType || "—"}
                  </p>
                  <p className="text-muted-foreground text-xs">Blood Type</p>
                </div>
                <div className="rounded-lg border bg-white p-3 text-center">
                  <Pill className="mx-auto h-6 w-6 text-blue-500" />
                  <p className="mt-1 font-bold text-blue-600 text-sm">
                    {profile.medications?.length || 0}
                  </p>
                  <p className="text-muted-foreground text-xs">Medications</p>
                </div>
                <div className="rounded-lg border bg-white p-3 text-center">
                  <AlertTriangle className="mx-auto h-6 w-6 text-orange-500" />
                  <p className="mt-1 font-bold text-orange-600 text-sm">
                    {profile.allergies?.length || 0}
                  </p>
                  <p className="text-muted-foreground text-xs">Allergies</p>
                </div>
              </div>

              {/* Medications */}
              {hasMedications && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {profile.medications.map((med: string) => (
                    <Badge className="bg-blue-100 text-blue-700" key={med}>
                      {med}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Allergies */}
              {hasAllergies && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {profile.allergies.map((a: string) => (
                    <Badge className="bg-orange-100 text-orange-700" key={a}>
                      {a}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Conditions */}
              {hasConditions && (
                <div className="mb-3 rounded border border-purple-200 bg-purple-50 p-2">
                  <p className="mb-1 font-medium text-purple-700 text-xs">
                    Conditions:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {profile.conditions.map((c: string) => (
                      <Badge className="bg-purple-200 text-purple-800" key={c}>
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* ICE & Doctor */}
              <div className="space-y-1.5 border-t pt-3 text-sm">
                {profile.emergencyContact1Phone && (
                  <div className="flex items-start gap-1.5">
                    <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    <div>
                      <span className="font-semibold text-red-700">ICE: </span>
                      <span className="text-gray-700">
                        {profile.emergencyContact1Name || "Primary"}
                      </span>
                      <span className="ml-1 font-mono text-gray-600">
                        {profile.emergencyContact1Phone}
                      </span>
                    </div>
                  </div>
                )}
                {profile.emergencyContact2Phone && (
                  <div className="ml-5 flex items-start gap-1.5">
                    <span className="text-gray-500 text-xs">2nd:</span>
                    <span className="text-gray-700 text-xs">
                      {profile.emergencyContact2Name}
                    </span>
                    <span className="font-mono text-gray-600 text-xs">
                      {profile.emergencyContact2Phone}
                    </span>
                  </div>
                )}
                {(profile.doctorName || profile.doctorPhone) && (
                  <div className="flex items-start gap-1.5">
                    <Stethoscope className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                    <div>
                      <span className="font-semibold text-blue-700">Dr: </span>
                      {profile.doctorName && (
                        <span className="text-gray-700">
                          {profile.doctorName}
                        </span>
                      )}
                      {profile.doctorPhone && (
                        <span className="ml-1 font-mono text-gray-600">
                          {profile.doctorPhone}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {profile.insuranceCovered !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                    <span className="text-gray-600 text-xs">
                      Insurance:{" "}
                      <span
                        className={
                          profile.insuranceCovered
                            ? "font-semibold text-green-700"
                            : "text-gray-500"
                        }
                      >
                        {profile.insuranceCovered ? "Covered" : "Not covered"}
                      </span>
                    </span>
                  </div>
                )}
                {profile.lastMedicalCheck && (
                  <p className="text-gray-500 text-xs">
                    Last check: {profile.lastMedicalCheck}
                  </p>
                )}
                {!(hasAllergies || hasMedications || hasConditions) && (
                  <p className="text-center text-green-600 text-xs">
                    No medications, allergies or conditions recorded
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-red-200 border-dashed bg-red-50 p-8 text-center">
              <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
              <p className="mb-1 font-semibold text-red-700">
                No medical profile yet
              </p>
              <p className="mb-4 text-red-600 text-sm">
                Add your medical information so coaches can keep you safe during
                training and matches.
              </p>
              <Button onClick={() => setShowEditForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Medical Info
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info banner */}
      <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4">
        <Shield className="h-5 w-5 shrink-0 text-blue-600" />
        <p className="text-blue-700 text-sm">
          Your medical information is shared with coaches only for safety
          purposes during training and matches. Use the Share button to send
          your medical card as a PDF to anyone who needs it.
        </p>
      </div>

      {/* Edit dialog */}
      {showEditForm && (
        <MedicalForm
          ageGroup={ageGroup}
          onClose={() => setShowEditForm(false)}
          onSave={() => setShowEditForm(false)}
          orgId={orgId}
          playerIdentityId={playerIdentity._id as Id<"playerIdentities">}
          playerName={playerName}
          profile={profile}
          sport={sport}
        />
      )}

      {/* Share modal */}
      {pdfData && (
        <MedicalShareModal
          onOpenChange={setShowShareModal}
          open={showShareModal}
          pdfData={pdfData}
          playerName={playerName}
        />
      )}
    </div>
  );
}

export default function PlayerMedicalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <MedicalPageContent />
    </Suspense>
  );
}
