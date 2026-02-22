import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { fetchQuery } from "convex/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/auth-server";

/**
 * API Route to get injury document download URL
 * Route: /api/injury-document-url
 *
 * This is needed because we can't use useQuery on-demand (it's reactive),
 * so we use fetchQuery on the server side instead.
 *
 * Security: This route verifies authentication server-side using the session
 * token from cookies. The authenticated user's ID is used for access control
 * rather than trusting any client-provided userId.
 */

export async function GET(request: NextRequest) {
  try {
    // Verify authentication server-side
    const token = await getToken();
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - not logged in" },
        { status: 401 }
      );
    }

    // Get the authenticated user from Convex
    const currentUser = await fetchQuery(
      api.models.users.getCurrentUser,
      {},
      { token }
    );

    if (!currentUser?._id) {
      return NextResponse.json(
        { error: "Unauthorized - invalid session" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    // Fetch the download URL from Convex using the authenticated user's ID
    const downloadUrl = await fetchQuery(
      api.models.injuryDocuments.getDownloadUrl,
      {
        documentId: documentId as Id<"injuryDocuments">,
        userId: currentUser._id, // Use authenticated user ID, not client-provided
      },
      { token }
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
