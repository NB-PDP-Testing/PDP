"use client";

/**
 * DocumentList - Display uploaded documents for an injury
 * Phase 2 - Issue #261
 */

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Download,
  Eye,
  FileText,
  Lock,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Document {
  _id: Id<"injuryDocuments">;
  injuryId: Id<"playerInjuries">;
  storageId: Id<"_storage">;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: string;
  description?: string;
  isPrivate: boolean;
  uploadedBy: string;
  uploadedByName: string;
  uploadedByRole: string;
  createdAt: number;
}

interface DocumentListProps {
  injuryId: Id<"playerInjuries">;
  userId: string;
  canDelete?: boolean;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  medical_report: "Medical Report",
  clearance_form: "Clearance Form",
  xray_scan: "X-Ray / Scan",
  therapy_notes: "Therapy Notes",
  insurance_form: "Insurance Form",
  other: "Other",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

export function DocumentList({
  injuryId,
  userId,
  canDelete = true,
}: DocumentListProps) {
  const [deleteId, setDeleteId] = useState<Id<"injuryDocuments"> | null>(null);

  const documents = useQuery(api.models.injuryDocuments.getDocuments, {
    injuryId,
    userId,
  });

  const deleteDocument = useMutation(api.models.injuryDocuments.deleteDocument);

  const handleDownload = async (doc: Document) => {
    try {
      // Get fresh download URL using authenticated API route
      // Note: userId is determined server-side from session, not passed by client
      const response = await fetch(
        `/api/injury-document-url?documentId=${doc._id}`
      );
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please log in to download documents");
        }
        throw new Error("Failed to get download URL");
      }
      const { downloadUrl } = await response.json();

      // Open in new tab for viewing/downloading
      window.open(downloadUrl, "_blank");
    } catch (error) {
      console.error("Download error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to download document"
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteId) {
      return;
    }

    try {
      await deleteDocument({ documentId: deleteId, userId });
      toast.success("Document deleted");
      setDeleteId(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    }
  };

  if (!documents) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documents</CardTitle>
          <CardDescription>
            {documents.length} document{documents.length !== 1 ? "s" : ""}{" "}
            uploaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground text-sm">
              No documents uploaded yet
            </p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li
                  className="flex items-center gap-3 rounded-lg border p-3"
                  key={doc._id}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-sm">
                        {doc.fileName}
                      </p>
                      {doc.isPrivate && (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                      <Badge className="text-xs" variant="outline">
                        {DOCUMENT_TYPE_LABELS[doc.documentType] ||
                          doc.documentType}
                      </Badge>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>|</span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                    {doc.description && (
                      <p className="mt-1 truncate text-muted-foreground text-xs italic">
                        {doc.description}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="h-8 w-8" size="icon" variant="ghost">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload(doc)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(doc)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      {canDelete && doc.uploadedBy === userId && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(doc._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog onOpenChange={() => setDeleteId(null)} open={!!deleteId}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
