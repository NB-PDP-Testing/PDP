import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { fetchQuery } from "convex/nextjs";
import { type NextRequest, NextResponse } from "next/server";

/**
 * API Route to get injury document download URL
 * Route: /api/injury-document-url
 *
 * This is needed because we can't use useQuery on-demand (it's reactive),
 * so we use fetchQuery on the server side instead.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");
    const userId = searchParams.get("userId");

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Fetch the download URL from Convex
    const downloadUrl = await fetchQuery(
      api.models.injuryDocuments.getDownloadUrl,
      {
        documentId: documentId as Id<"injuryDocuments">,
        userId,
      }
    );

    if (!downloadUrl) {
      return NextResponse.json(
        { error: "Document not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error("Error fetching document URL:", error);
    return NextResponse.json(
      { error: "Failed to get document URL" },
      { status: 500 }
    );
  }
}
