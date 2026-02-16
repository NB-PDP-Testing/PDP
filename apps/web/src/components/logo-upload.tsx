"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Building2, Loader2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type LogoUploadProps = {
  /** Organization ID for upload permissions. When undefined, uses creation-mode upload (no org required). */
  organizationId?: string;
  /** Current logo URL or storage ID URL */
  currentLogo?: string | null;
  /** Callback when logo upload completes */
  onUploadComplete: (url: string) => void;
  /** Callback when URL is manually entered */
  onUrlChange?: (url: string) => void;
  /** Show URL input fallback */
  showUrlFallback?: boolean;
  /** Disabled state */
  disabled?: boolean;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_DIMENSION = 512; // Max width/height in pixels

/**
 * Logo Upload Component
 *
 * Features:
 * - Drag-and-drop file upload
 * - Click to browse
 * - Auto-resize to max 512x512px
 * - File validation (PNG/JPG, max 5MB)
 * - Real-time preview
 * - URL fallback option
 */
export function LogoUpload({
  organizationId,
  currentLogo,
  onUploadComplete,
  onUrlChange,
  showUrlFallback = true,
  disabled = false,
}: LogoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentLogo || null);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preview when currentLogo prop changes externally
  // (e.g. scraped logo applied on the create page)
  useEffect(() => {
    setPreview(currentLogo || null);
  }, [currentLogo]);

  // Convex mutations — org-scoped (settings page)
  const generateUploadUrl = useMutation(
    api.models.organizations.generateLogoUploadUrl
  );
  const saveLogoMutation = useMutation(
    api.models.organizations.saveUploadedLogo
  );
  // Convex mutations — creation mode (no org yet)
  const generateUploadUrlForCreation = useMutation(
    api.models.organizations.generateLogoUploadUrlForCreation
  );
  const getStorageUrl = useMutation(api.models.organizations.getStorageUrl);

  /**
   * Resize image to max dimensions while preserving aspect ratio
   */
  const resizeImage = useCallback((file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions preserving aspect ratio
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Could not convert image to blob"));
            }
          },
          file.type,
          0.9 // Quality
        );
      };

      img.onerror = () => reject(new Error("Could not load image"));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  /**
   * Validate file type and size
   */
  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Please upload a PNG or JPG image";
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }

    return null;
  }, []);

  /**
   * Handle file upload
   */
  const handleFileUpload = useCallback(
    async (file: File) => {
      // Validate
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      setIsUploading(true);

      try {
        // Resize image
        const resizedBlob = await resizeImage(file);

        // Create temporary preview
        const tempPreviewUrl = URL.createObjectURL(resizedBlob);
        setPreview(tempPreviewUrl);

        // Step 1: Get upload URL from Convex
        // Use org-scoped mutation when editing an existing org,
        // or creation-mode mutation when creating a new org (no orgId yet)
        const uploadUrl = organizationId
          ? await generateUploadUrl({ organizationId })
          : await generateUploadUrlForCreation({});

        // Step 2: Upload to Convex storage
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: resizedBlob,
        });

        if (!uploadResponse.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = (await uploadResponse.json()) as {
          storageId: Id<"_storage">;
        };

        // Step 3: Get the public URL
        // When org exists, save to org and get URL back.
        // In creation mode, just convert storageId to a public URL.
        const finalUrl = organizationId
          ? await saveLogoMutation({ organizationId, storageId })
          : await getStorageUrl({ storageId });

        if (!finalUrl) {
          throw new Error("Could not generate URL for uploaded logo");
        }

        // Step 4: Update preview with the URL returned from the backend
        setPreview(finalUrl);
        onUploadComplete(finalUrl);

        toast.success("Logo uploaded successfully");
      } catch (err) {
        console.error("Upload error:", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to upload logo"
        );
      } finally {
        setIsUploading(false);
      }
    },
    [
      validateFile,
      resizeImage,
      onUploadComplete,
      generateUploadUrl,
      generateUploadUrlForCreation,
      saveLogoMutation,
      getStorageUrl,
      organizationId,
    ]
  );

  /**
   * Handle drag events
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [handleFileUpload]
  );

  /**
   * Handle click to browse
   */
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Handle keyboard interaction for accessibility
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled || isUploading) {
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [disabled, isUploading]
  );

  /**
   * Handle remove logo
   */
  const handleRemove = useCallback(() => {
    setPreview(null);
    setUrlInput("");
    onUploadComplete("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onUploadComplete]);

  /**
   * Handle URL input
   */
  const handleUrlSubmit = useCallback(() => {
    if (!urlInput.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    try {
      new URL(urlInput); // Validate URL format
      setPreview(urlInput);
      onUrlChange?.(urlInput);
      onUploadComplete(urlInput);
      toast.success("Logo URL updated");
    } catch {
      toast.error("Please enter a valid URL");
    }
  }, [urlInput, onUrlChange, onUploadComplete]);

  return (
    <div className="space-y-4">
      {/* Preview */}
      {preview && (
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24 overflow-hidden rounded-lg border bg-muted">
            <img
              alt="Logo preview"
              className="h-full w-full object-contain p-2"
              src={preview}
            />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Current Logo</p>
            <p className="text-muted-foreground text-xs">
              {preview.startsWith("blob:") ? "Uploaded file" : "External URL"}
            </p>
          </div>
          <Button
            disabled={disabled || isUploading}
            onClick={handleRemove}
            size="sm"
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Drag-drop zone */}
      {/* biome-ignore lint/a11y/useSemanticElements: div required for drag-and-drop functionality */}
      <div
        aria-label="Upload logo"
        className={cn(
          "relative overflow-hidden rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/20",
          disabled && "cursor-not-allowed opacity-50",
          !(disabled || isUploading) && "cursor-pointer hover:border-primary/50"
        )}
        onClick={disabled || isUploading ? undefined : handleClick}
        onDragEnter={disabled ? undefined : handleDragEnter}
        onDragLeave={disabled ? undefined : handleDragLeave}
        onDragOver={disabled ? undefined : handleDragOver}
        onDrop={disabled ? undefined : handleDrop}
        onKeyDown={disabled || isUploading ? undefined : handleKeyDown}
        role="button"
        tabIndex={disabled || isUploading ? -1 : 0}
      >
        <input
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          disabled={disabled}
          onChange={handleFileInputChange}
          ref={fileInputRef}
          type="file"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="font-medium text-sm">Uploading logo...</p>
            <p className="text-muted-foreground text-xs">
              Resizing and optimizing...
            </p>
          </div>
        ) : preview ? (
          <div className="flex flex-col items-center gap-2">
            <Building2 className="h-12 w-12 text-muted-foreground" />
            <p className="font-medium text-sm">Upload a new logo</p>
            <p className="text-muted-foreground text-xs">
              Drag and drop, or click to browse
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="font-medium text-sm">Drag and drop your logo here</p>
            <p className="text-muted-foreground text-xs">
              or click to browse files
            </p>
          </div>
        )}

        <p className="mt-4 text-muted-foreground text-xs">
          PNG or JPG • Max 5MB • Recommended: 512x512px
        </p>
      </div>

      {/* URL fallback */}
      {showUrlFallback && (
        <>
          <Separator className="my-4" />
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Or provide a URL</Label>
            <div className="flex gap-2">
              <Input
                disabled={disabled || isUploading}
                id="logoUrl"
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
                value={urlInput}
              />
              <Button
                disabled={disabled || isUploading || !urlInput.trim()}
                onClick={handleUrlSubmit}
                type="button"
                variant="outline"
              >
                Use URL
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Paste a link to an image hosted elsewhere
            </p>
          </div>
        </>
      )}
    </div>
  );
}
