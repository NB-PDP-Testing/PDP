"use client";

import { Player } from "@remotion/player";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PDPCommercial } from "@/remotion/compositions/PDPCommercial";
import {
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  VIDEO_FPS,
  DURATION_IN_FRAMES,
} from "@/remotion/constants";

export default function VideoPreviewPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] to-[#0F1F35]">
      {/* Header */}
      <header className="border-white/10 border-b bg-white/5 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link
            href="/demo"
            className="flex items-center gap-2 text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Demo
          </Link>
          <h1 className="font-bold text-white text-xl">
            PlayerARC Video Preview
          </h1>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-12">
        {/* Video Player */}
        <div className="mb-8 overflow-hidden rounded-2xl bg-black shadow-2xl">
          <Player
            component={PDPCommercial}
            durationInFrames={DURATION_IN_FRAMES}
            fps={VIDEO_FPS}
            compositionWidth={VIDEO_WIDTH}
            compositionHeight={VIDEO_HEIGHT}
            style={{
              width: "100%",
              aspectRatio: `${VIDEO_WIDTH} / ${VIDEO_HEIGHT}`,
            }}
            controls
            autoPlay={false}
            loop
          />
        </div>

        {/* Info Section */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="mb-4 font-bold text-2xl text-white">
            PlayerARC Overview Commercial
          </h2>
          <p className="mb-6 text-white/70">
            A 15-second promotional video showcasing the key features of
            PlayerARC - the player development platform that transforms youth
            sports programs.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-white/5 p-4">
              <div className="mb-1 font-medium text-[#27AE60]">Duration</div>
              <div className="text-white">15 seconds</div>
            </div>
            <div className="rounded-lg bg-white/5 p-4">
              <div className="mb-1 font-medium text-[#27AE60]">Resolution</div>
              <div className="text-white">1920 x 1080 (Full HD)</div>
            </div>
            <div className="rounded-lg bg-white/5 p-4">
              <div className="mb-1 font-medium text-[#27AE60]">Frame Rate</div>
              <div className="text-white">30 FPS</div>
            </div>
          </div>

          <div className="mt-6 border-white/10 border-t pt-6">
            <h3 className="mb-3 font-semibold text-lg text-white">Scenes</h3>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#27AE60] font-bold text-sm text-white">
                  1
                </span>
                <span>
                  <strong className="text-white">Intro (0-3s):</strong> Logo
                  reveal with tagline
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#27AE60] font-bold text-sm text-white">
                  2
                </span>
                <span>
                  <strong className="text-white">Features (3-9s):</strong> Key
                  platform features
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#27AE60] font-bold text-sm text-white">
                  3
                </span>
                <span>
                  <strong className="text-white">Benefits (9-13s):</strong> Core
                  value propositions
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#27AE60] font-bold text-sm text-white">
                  4
                </span>
                <span>
                  <strong className="text-white">CTA (13-15s):</strong> Call to
                  action
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Render Instructions */}
        <div className="mt-8 rounded-xl border border-[#F39C12]/30 bg-[#F39C12]/10 p-6">
          <h3 className="mb-3 font-semibold text-[#F39C12] text-lg">
            Render to MP4
          </h3>
          <p className="mb-4 text-white/80">
            To export this video as an MP4 file, run the following command:
          </p>
          <code className="block rounded-lg bg-black/50 p-4 font-mono text-sm text-white">
            npx remotion render src/remotion/Root.tsx PDPCommercial
            out/commercial.mp4
          </code>
        </div>
      </main>
    </div>
  );
}
