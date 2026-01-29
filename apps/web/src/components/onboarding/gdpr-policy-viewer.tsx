"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

type GdprPolicyViewerProps = {
  summary: string;
  fullText: string;
};

/**
 * GdprPolicyViewer - Displays GDPR policy with expandable full text
 *
 * Shows the summary always visible, with an expandable section
 * for the full policy text in a scrollable area.
 */
export function GdprPolicyViewer({ summary, fullText }: GdprPolicyViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Summary - always visible */}
      <div className="text-muted-foreground text-sm">
        <p>{summary}</p>
      </div>

      {/* Collapsible full policy */}
      <Collapsible onOpenChange={setIsOpen} open={isOpen}>
        <CollapsibleTrigger asChild>
          <Button
            className="w-full justify-between"
            size="sm"
            variant="outline"
          >
            <span>
              {isOpen ? "Hide Full Policy" : "View Full Privacy Policy"}
            </span>
            {isOpen ? (
              <ChevronUp className="ml-2 size-4" />
            ) : (
              <ChevronDown className="ml-2 size-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4">
          <ScrollArea className="h-[300px] rounded-md border p-4">
            <PolicyContent content={fullText} />
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * PolicyContent - Renders the policy text with basic markdown-like formatting
 * Uses dangerouslySetInnerHTML to avoid React key issues with static content.
 * This is safe because the content comes from our backend, not user input.
 */
function PolicyContent({ content }: { content: string }) {
  // Convert markdown-like syntax to HTML
  const htmlContent = content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return '<div class="h-2"></div>';
      }

      // H1 heading
      if (trimmed.startsWith("# ")) {
        return `<h1 class="mt-4 mb-2 font-bold text-lg">${escapeHtml(trimmed.slice(2))}</h1>`;
      }

      // H2 heading
      if (trimmed.startsWith("## ")) {
        return `<h2 class="mt-4 mb-2 font-semibold text-base">${escapeHtml(trimmed.slice(3))}</h2>`;
      }

      // H3 heading
      if (trimmed.startsWith("### ")) {
        return `<h3 class="mt-3 mb-1 font-semibold text-sm">${escapeHtml(trimmed.slice(4))}</h3>`;
      }

      // Bullet point
      if (trimmed.startsWith("- ")) {
        const bulletContent = formatBold(escapeHtml(trimmed.slice(2)));
        return `<div class="my-1 ml-4 flex gap-2"><span class="text-muted-foreground">•</span><span class="text-sm">${bulletContent}</span></div>`;
      }

      // Horizontal rule
      if (trimmed === "---") {
        return '<hr class="my-4 border-border" />';
      }

      // Italic text (full line starting with *)
      if (trimmed.startsWith("*") && trimmed.endsWith("*")) {
        return `<p class="my-1 text-muted-foreground text-sm italic">${escapeHtml(trimmed.slice(1, -1))}</p>`;
      }

      // Regular paragraph
      return `<p class="my-1 text-sm">${formatBold(escapeHtml(trimmed))}</p>`;
    })
    .join("");

  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is from our backend, not user input
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Format bold text (**text** -> <strong>text</strong>)
 */
function formatBold(text: string): string {
  return text.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong class="font-semibold">$1</strong>'
  );
}
