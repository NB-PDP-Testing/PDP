"use client";

/**
 * DocumentUpload - Upload medical documents for injuries
 * Phase 2 - Issue #261
 */

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { FileUp, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type DocumentType =
  | "medical_report"
  | "clearance_form"
  | "xray_scan"
  | "therapy_notes"
  | "insurance_form"
  | "other";

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "medical_report", label: "Medical Report" },
  { value: "clearance_form", label: "Clearance Form" },
  { value: "xray_scan", label: "X-Ray / Scan" },
  { value: "therapy_notes", label: "Therapy Notes" },
  { value: "insurance_form", label: "Insurance Form" },
  { value: "other", label: "Other" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

interface DocumentUploadProps {
  injuryId: Id<"playerInjuries">;
  uploadedBy: string;
  uploadedByName: string;
  uploadedByRole: "guardian" | "coach" | "admin";
  onUploadComplete?: () => void;
}

export function DocumentUpload({
  injuryId,
  uploadedBy,
  uploadedByName,
  uploadedByRole,
  onUploadComplete,
}: DocumentUploadProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("other");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const generateUploadUrl = useAction(
    api.models.injuryDocuments.generateUploadUrl
  );
  const saveDocument = useMutation(api.models.injuryDocuments.saveDocument);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("File too large", {
        description: "Maximum file size is 10MB",
      });
      return;
    }

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      toast.error("Invalid file type", {
        description: "Please upload a PDF, image, or Word document",
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = useCallback(async () => {
    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file to Convex storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await response.json();

      // Save document metadata
      await saveDocument({
        injuryId,
        storageId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        documentType,
        description: description || undefined,
        isPrivate,
        uploadedBy,
        uploadedByName,
        uploadedByRole,
      });

      toast.success("Document uploaded", {
        description: `${file.name} has been uploaded successfully`,
      });

      // Reset form
      setFile(null);
      setDocumentType("other");
      setDescription("");
      setIsPrivate(false);
      setOpen(false);
      onUploadComplete?.();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed", {
        description: "Please try again",
      });
    } finally {
      setIsUploading(false);
    }
  }, [
    file,
    generateUploadUrl,
    saveDocument,
    injuryId,
    documentType,
    description,
    isPrivate,
    uploadedBy,
    uploadedByName,
    uploadedByRole,
    onUploadComplete,
  ]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FileUp className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Medical Document</DialogTitle>
          <DialogDescription>
            Upload medical reports, clearance forms, or other documents
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              disabled={isUploading}
              id="file"
              onChange={handleFileChange}
              type="file"
            />
            <p className="text-muted-foreground text-xs">
              PDF, images, or Word documents up to 10MB
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentType">Document Type</Label>
            <Select
              disabled={isUploading}
              onValueChange={(value) => setDocumentType(value as DocumentType)}
              value={documentType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              disabled={isUploading}
              id="description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Doctor's note from Dr. Smith"
              rows={2}
              value={description}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="font-medium" htmlFor="private">
                Private Document
              </Label>
              <p className="text-muted-foreground text-xs">
                Only you can view private documents
              </p>
            </div>
            <Switch
              checked={isPrivate}
              disabled={isUploading}
              id="private"
              onCheckedChange={setIsPrivate}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={isUploading}
            onClick={() => setOpen(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={!file || isUploading} onClick={handleUpload}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FileUp className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
