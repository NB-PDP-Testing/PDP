"use client";

import { Lightbulb, Mic, Pencil, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function SuggestedPlayerPrompt({ color }: { color: string }) {
  const [showPrompt, setShowPrompt] = useState(true);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* Context */}
      <p className="text-center text-gray-500 text-xs">
        This appears when a coach opens &quot;New Insight&quot; — the exact
        moment of relevant action (BJ Fogg Tiny Habits model)
      </p>

      {/* Mocked "New Insight" header */}
      <Card className="overflow-hidden shadow-lg">
        <CardContent className="p-0">
          {/* Mock header bar */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: `${color}10` }}
          >
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4" style={{ color }} />
              <span className="font-medium text-gray-900 text-sm">
                New Insight
              </span>
            </div>
            <span className="text-gray-400 text-xs">Select player...</span>
          </div>

          {/* Suggested player banner */}
          {showPrompt && (
            <div className="border-blue-100 border-b bg-blue-50/50 px-4 py-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <div>
                    <p className="text-gray-700 text-sm">
                      While you&apos;re here...
                    </p>
                    <p className="mt-0.5 text-gray-600 text-sm">
                      You haven&apos;t noted anything about{" "}
                      <span className="font-semibold">Ava Lawlor</span> since
                      Jan 12.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        className="h-7 gap-1 text-xs"
                        size="sm"
                        style={{
                          backgroundColor: color,
                          color: "white",
                        }}
                      >
                        <Mic className="h-3 w-3" />
                        Quick note?
                      </Button>
                      <Button
                        className="h-7 text-gray-500 text-xs"
                        onClick={() => setShowPrompt(false)}
                        size="sm"
                        variant="ghost"
                      >
                        Not now
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  className="h-5 w-5"
                  onClick={() => setShowPrompt(false)}
                  size="icon"
                  variant="ghost"
                >
                  <X className="h-3 w-3 text-gray-400" />
                </Button>
              </div>
            </div>
          )}

          {/* Mock content area */}
          <div className="space-y-3 p-4">
            <div className="h-10 rounded-lg border border-gray-200 border-dashed bg-gray-50" />
            <div className="h-24 rounded-lg border border-gray-200 border-dashed bg-gray-50" />
          </div>
        </CardContent>
      </Card>

      {/* Reset button */}
      {!showPrompt && (
        <div className="text-center">
          <Button
            onClick={() => setShowPrompt(true)}
            size="sm"
            variant="outline"
          >
            Reset demo
          </Button>
        </div>
      )}

      {/* Research backing */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="py-3">
          <div className="space-y-1 text-gray-500 text-xs">
            <p>
              <span className="font-medium">BJ Fogg Tiny Habits:</span> Prompt
              at moment of action + extremely easy + minimal motivation =
              behavior change
            </p>
            <p>
              <span className="font-medium">KNVB (Dutch FA):</span> Rated
              &quot;cueing differences&quot; as highest viability intervention
              (5.8/9)
            </p>
            <p>
              <span className="font-medium">ClassDojo:</span> Random student
              picker increased engagement equity by 40%
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
