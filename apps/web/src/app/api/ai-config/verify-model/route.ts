import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ai-config/verify-model
 *
 * Verifies a model is available by making a real inference call where possible:
 * - Anthropic: POST /v1/messages with max_tokens: 1
 * - OpenAI audio/transcription models (id contains "transcribe" or "whisper"):
 *   GET /v1/models/{id} (can't do chat completions)
 * - All other OpenAI models: POST /v1/chat/completions with max_tokens: 1
 *
 * Real inference calls surface meaningful errors (e.g. "model not found",
 * "deprecated") rather than just whether the model-info record exists.
 *
 * Used by the platform admin UI "Test All Models" button.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, modelId } = body as {
      provider: "anthropic" | "openai" | "openrouter";
      modelId: string;
    };

    if (!(provider && modelId)) {
      return NextResponse.json(
        { error: "provider and modelId are required" },
        { status: 400 }
      );
    }

    if (provider === "anthropic") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json({
          success: false,
          errorMessage: "ANTHROPIC_API_KEY not configured in Next.js env",
        });
      }

      // Real inference call — proves the model actually works
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });

      if (response.ok) {
        return NextResponse.json({ success: true });
      }

      const errorBody = await response.json().catch(() => ({}));
      const errorMessage =
        (errorBody as { error?: { message?: string } }).error?.message ??
        `HTTP ${response.status}: model not found or inaccessible`;
      return NextResponse.json({ success: false, errorMessage });
    }

    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({
          success: false,
          errorMessage: "OPENAI_API_KEY not configured in Next.js env",
        });
      }

      const isAudioModel =
        modelId.includes("transcribe") || modelId.includes("whisper");

      if (isAudioModel) {
        // Audio/transcription models can't do chat completions — fall back to model-info
        const response = await fetch(
          `https://api.openai.com/v1/models/${encodeURIComponent(modelId)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          }
        );

        if (response.ok) {
          return NextResponse.json({ success: true });
        }

        const errorBody = await response.json().catch(() => ({}));
        const errorMessage =
          (errorBody as { error?: { message?: string } }).error?.message ??
          `HTTP ${response.status}: model not found or inaccessible`;
        return NextResponse.json({ success: false, errorMessage });
      }

      // All other OpenAI models — real inference call
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: modelId,
            max_tokens: 1,
            messages: [{ role: "user", content: "hi" }],
          }),
        }
      );

      if (response.ok) {
        return NextResponse.json({ success: true });
      }

      const errorBody = await response.json().catch(() => ({}));
      const errorMessage =
        (errorBody as { error?: { message?: string } }).error?.message ??
        `HTTP ${response.status}: model not found or inaccessible`;
      return NextResponse.json({ success: false, errorMessage });
    }

    return NextResponse.json(
      { error: `Provider "${provider}" not supported for verification` },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
