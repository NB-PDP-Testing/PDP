"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Palette, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getContrastColor, getWCAGCompliance } from "@/lib/color-utils";

// PlayerARC brand defaults
const BRAND_DEFAULTS = {
  primary: "#1E3A5F",
  secondary: "#22C55E",
  tertiary: "#F59E0B",
};

const HEX_COLOR_REGEX = /^#[0-9A-F]{6}$/i;
const HEX_RGB_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

function hexToRgb(hex: string): string {
  const result = HEX_RGB_REGEX.exec(hex);
  if (!result) {
    return "0, 0, 0";
  }
  return `${Number.parseInt(result[1], 16)}, ${Number.parseInt(result[2], 16)}, ${Number.parseInt(result[3], 16)}`;
}

function ColorSwatch({
  label,
  description,
  value,
  onChange,
  saving,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  saving: boolean;
}) {
  const displayColor = HEX_COLOR_REGEX.test(value)
    ? value
    : BRAND_DEFAULTS.primary;
  const compliance = getWCAGCompliance("#ffffff", displayColor);
  const contrastColor = getContrastColor(displayColor);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 font-medium text-sm">
        <div
          className="h-4 w-4 rounded-full border shadow-sm"
          style={{ backgroundColor: displayColor }}
        />
        {label}
      </Label>
      <p className="text-muted-foreground text-xs">{description}</p>
      <div className="flex gap-2">
        <input
          aria-label={`${label} colour picker`}
          className="h-10 w-10 cursor-pointer rounded border"
          disabled={saving}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          type="color"
          value={displayColor}
        />
        <Input
          className="flex-1 font-mono text-sm uppercase"
          disabled={saving}
          maxLength={7}
          onChange={(e) => {
            const raw = e.target.value.toUpperCase().replace(/[^#0-9A-F]/g, "");
            const val = raw.startsWith("#")
              ? raw.slice(0, 7)
              : `#${raw.slice(0, 6)}`;
            onChange(e.target.value === "" ? "" : val);
          }}
          placeholder="#RRGGBB"
          value={value}
        />
      </div>
      {/* Live preview chip */}
      <div
        className="flex items-center gap-2 rounded-md px-3 py-2 font-medium text-sm"
        style={{
          backgroundColor: displayColor,
          color: contrastColor,
        }}
      >
        <span>Preview</span>
        <span className="ml-auto text-xs opacity-80">
          {compliance.level === "AAA" || compliance.level === "AA"
            ? `${compliance.level} ✓`
            : `${compliance.ratio.toFixed(1)}:1`}
        </span>
      </div>
    </div>
  );
}

export default function PlatformBrandingPage() {
  const branding = useQuery(api.models.platformBranding.getPlatformBranding);
  const updateBranding = useMutation(
    api.models.platformBranding.updatePlatformBranding
  );

  const [primary, setPrimary] = useState(BRAND_DEFAULTS.primary);
  const [secondary, setSecondary] = useState(BRAND_DEFAULTS.secondary);
  const [tertiary, setTertiary] = useState(BRAND_DEFAULTS.tertiary);
  const [saving, setSaving] = useState(false);

  // Initialise from DB once loaded
  useEffect(() => {
    if (branding) {
      setPrimary(branding.primaryColor);
      setSecondary(branding.secondaryColor);
      setTertiary(branding.tertiaryColor);
    }
  }, [branding]);

  const handleSave = async () => {
    for (const [label, value] of [
      ["Primary", primary],
      ["Secondary", secondary],
      ["Tertiary", tertiary],
    ] as [string, string][]) {
      if (!HEX_COLOR_REGEX.test(value)) {
        toast.error(`Invalid ${label} colour: "${value}". Use #RRGGBB format.`);
        return;
      }
    }

    setSaving(true);
    try {
      await updateBranding({
        primaryColor: primary.toUpperCase(),
        secondaryColor: secondary.toUpperCase(),
        tertiaryColor: tertiary.toUpperCase(),
      });
      toast.success("Platform branding updated. Changes apply immediately.");
    } catch (error) {
      toast.error((error as Error)?.message || "Failed to update branding");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrimary(BRAND_DEFAULTS.primary);
    setSecondary(BRAND_DEFAULTS.secondary);
    setTertiary(BRAND_DEFAULTS.tertiary);
  };

  const previewPrimary = HEX_COLOR_REGEX.test(primary)
    ? primary
    : BRAND_DEFAULTS.primary;
  const previewSecondary = HEX_COLOR_REGEX.test(secondary)
    ? secondary
    : BRAND_DEFAULTS.secondary;
  const previewTertiary = HEX_COLOR_REGEX.test(tertiary)
    ? tertiary
    : BRAND_DEFAULTS.tertiary;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-white">
          <Link
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white"
            href="/platform"
          >
            <ArrowLeft className="h-4 w-4" />
            Platform
          </Link>
          <div className="flex items-center gap-3">
            <Palette className="h-8 w-8" />
            <div>
              <h1 className="font-bold text-3xl">Platform Branding</h1>
              <p className="mt-1 text-white/80">
                Set the three brand colours displayed across all organisations
                on the platform.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Colour Pickers */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Colours</CardTitle>
              <CardDescription>
                These colours apply platform-wide. Individual organisations
                cannot override them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ColorSwatch
                description="Main action colour — buttons, highlights, active states"
                label="Primary"
                onChange={setPrimary}
                saving={saving}
                value={primary}
              />
              <ColorSwatch
                description="Structural colour — headers, nav, backgrounds"
                label="Secondary"
                onChange={setSecondary}
                saving={saving}
                value={secondary}
              />
              <ColorSwatch
                description="Accent colour — badges, tags, callouts"
                label="Tertiary"
                onChange={setTertiary}
                saving={saving}
                value={tertiary}
              />
            </CardContent>
          </Card>

          {/* Combined preview */}
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                How these colours appear together across the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className="rounded-lg p-4 text-white"
                style={{ backgroundColor: previewSecondary }}
              >
                <p className="font-semibold text-sm">Header / Navigation</p>
                <p className="mt-1 text-xs opacity-80">
                  Secondary colour — used for page headers and structural
                  elements.
                </p>
                <div className="mt-3 flex gap-2">
                  <span
                    className="rounded px-3 py-1 font-medium text-sm"
                    style={{
                      backgroundColor: previewPrimary,
                      color: getContrastColor(previewPrimary),
                    }}
                  >
                    Primary Action
                  </span>
                  <span
                    className="rounded px-3 py-1 font-medium text-sm"
                    style={{
                      backgroundColor: previewTertiary,
                      color: getContrastColor(previewTertiary),
                    }}
                  >
                    Tertiary Accent
                  </span>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="font-semibold text-sm">Card / Content Area</p>
                <p className="mt-1 text-muted-foreground text-xs">
                  Neutral background with brand-coloured accents.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  {[
                    { color: previewPrimary, label: "Primary" },
                    { color: previewSecondary, label: "Secondary" },
                    { color: previewTertiary, label: "Tertiary" },
                  ].map(({ color, label }) => (
                    <div className="flex items-center gap-1.5" key={label}>
                      <div
                        className="h-5 w-5 rounded-full border shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs">{label}</span>
                      <span
                        className="rounded-full px-1.5 py-0.5 text-xs"
                        style={{
                          backgroundColor: color,
                          color: getContrastColor(color),
                        }}
                      >
                        {hexToRgb(color)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow">
            <Button
              disabled={saving}
              onClick={handleReset}
              type="button"
              variant="outline"
            >
              Reset to PlayerARC Defaults
            </Button>
            <Button disabled={saving} onClick={handleSave} type="button">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save Brand Colours"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
