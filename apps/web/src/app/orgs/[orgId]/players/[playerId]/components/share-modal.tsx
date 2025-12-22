"use client";

import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  downloadPDF,
  generatePassportPDF,
  type PassportPDFData,
  previewPDF,
} from "@/lib/pdf-generator";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerData: PassportPDFData;
  playerName: string;
}

export function ShareModal({
  open,
  onOpenChange,
  playerData,
  playerName,
}: ShareModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [emailAddress, setEmailAddress] = useState("");
  const [copied, setCopied] = useState(false);

  // Generate PDF when modal opens
  useEffect(() => {
    if (open && !pdfBytes) {
      generatePDF();
    }
  }, [open]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const bytes = await generatePassportPDF(playerData);
      setPdfBytes(bytes);
      const url = previewPDF(bytes);
      setPreviewUrl(url);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = useCallback(() => {
    if (!pdfBytes) return;
    
    const filename = `${playerName.replace(/\s+/g, "_")}_Passport_${new Date().toISOString().split("T")[0]}.pdf`;
    downloadPDF(pdfBytes, filename);
    toast.success("PDF downloaded successfully");
  }, [pdfBytes, playerName]);

  const handlePreviewInNewTab = useCallback(() => {
    if (!previewUrl) return;
    window.open(previewUrl, "_blank");
  }, [previewUrl]);

  const handleEmailShare = useCallback(() => {
    if (!emailAddress) {
      toast.error("Please enter an email address");
      return;
    }
    
    const subject = encodeURIComponent(`Player Development Passport - ${playerName}`);
    const body = encodeURIComponent(
      `Hi,\n\nPlease find attached the Player Development Passport for ${playerName}.\n\n` +
      `This document contains:\n` +
      `- Player Information\n` +
      `- Skill Ratings\n` +
      `- Development Goals\n` +
      `- Coach Feedback\n\n` +
      `Best regards`
    );
    
    // Open default email client
    window.location.href = `mailto:${emailAddress}?subject=${subject}&body=${body}`;
    
    toast.info("Email client opened", {
      description: "Please attach the downloaded PDF to your email",
    });
  }, [emailAddress, playerName]);

  const handleWhatsAppShare = useCallback(() => {
    const text = encodeURIComponent(
      `📋 Player Development Passport\n\n` +
      `Player: ${playerName}\n` +
      `Generated: ${new Date().toLocaleDateString("en-IE")}\n\n` +
      `I've shared the development passport for ${playerName}. The PDF contains skill ratings, goals, and coach feedback.`
    );
    
    // WhatsApp Web/Mobile URL
    const whatsappUrl = `https://wa.me/?text=${text}`;
    window.open(whatsappUrl, "_blank");
    
    toast.info("WhatsApp opened", {
      description: "Don't forget to attach the PDF after downloading",
    });
  }, [playerName]);

  const handleCopyLink = useCallback(() => {
    // Copy current page URL
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleNativeShare = useCallback(async () => {
    if (!pdfBytes) return;

    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        // Convert Uint8Array to Blob first, then to File
        const buffer = new ArrayBuffer(pdfBytes.length);
        const view = new Uint8Array(buffer);
        view.set(pdfBytes);
        const blob = new Blob([buffer], { type: "application/pdf" });
        const file = new File(
          [blob],
          `${playerName.replace(/\s+/g, "_")}_Passport.pdf`,
          { type: "application/pdf" }
        );

        await navigator.share({
          title: `Player Passport - ${playerName}`,
          text: `Player Development Passport for ${playerName}`,
          files: [file],
        });
        toast.success("Shared successfully");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Share failed:", error);
          toast.error("Share failed. Try downloading and sharing manually.");
        }
      }
    } else {
      toast.info("Native sharing not supported", {
        description: "Please use download and share via email or WhatsApp",
      });
    }
  }, [pdfBytes, playerName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Player Passport
          </DialogTitle>
          <DialogDescription>
            Download or share {playerName}'s development passport
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* PDF Preview */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
                  <FileText className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">{playerName}_Passport.pdf</p>
                  <p className="text-muted-foreground text-sm">
                    {isGenerating ? "Generating..." : "Ready to download"}
                  </p>
                </div>
              </div>
              
              {isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Badge className="bg-green-100 text-green-700">Ready</Badge>
              )}
            </div>

            {/* Preview/Download buttons */}
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
                onClick={handlePreviewInNewTab}
                variant="outline"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </div>
          </div>

          <Separator />

          {/* Share Options */}
          <div className="space-y-4">
            <h3 className="font-semibold">Share Options</h3>

            {/* Native Share (if supported) */}
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

            {/* Email Share */}
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
                  onClick={handleEmailShare}
                  variant="outline"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Opens your email client. Download the PDF first to attach it.
              </p>
            </div>

            {/* WhatsApp Share */}
            <Button
              className="w-full justify-start bg-green-600 text-white hover:bg-green-700"
              onClick={handleWhatsAppShare}
            >
              <MessageCircle className="mr-3 h-4 w-4" />
              Share via WhatsApp
            </Button>

            {/* Copy Link */}
            <Button
              className="w-full justify-start"
              onClick={handleCopyLink}
              variant="outline"
            >
              {copied ? (
                <>
                  <Check className="mr-3 h-4 w-4 text-green-600" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-3 h-4 w-4" />
                  Copy Link to Passport Page
                </>
              )}
            </Button>
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-blue-50 p-4 text-blue-800 text-sm">
            <p className="font-medium">📋 What's included in the PDF:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-blue-700">
              <li>Player information (name, DOB, age group, sport)</li>
              <li>Current skill ratings with star system</li>
              <li>Development goals and progress</li>
              <li>Recent coach feedback and notes</li>
              <li>Medical summary (if applicable)</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
