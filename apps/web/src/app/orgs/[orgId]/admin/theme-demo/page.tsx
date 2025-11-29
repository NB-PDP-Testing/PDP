"use client";

import { CheckCircle, Heart, Palette, Star, Zap } from "lucide-react";
import { OrgThemedButton } from "@/components/org-themed-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOrgTheme } from "@/hooks/use-org-theme";
import { StatCard } from "../stat-card";

export default function ThemeDemoPage() {
  const { theme, org } = useOrgTheme();

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Theme Preview</h1>
        <p className="mt-2 text-muted-foreground">
          See how your organization's colors are applied throughout the
          interface
        </p>
      </div>

      {/* Color Palette */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Organization Color Palette
          </CardTitle>
          <CardDescription>
            {org?.name || "Your organization"}'s brand colors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <div
                className="h-24 rounded-lg border-2 shadow-sm"
                style={{ backgroundColor: theme.primary }}
              />
              <div>
                <p className="font-medium text-sm">Primary Color</p>
                <p className="font-mono text-muted-foreground text-xs">
                  {theme.primary}
                </p>
                <p className="font-mono text-muted-foreground text-xs">
                  rgb({theme.primaryRgb})
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div
                className="h-24 rounded-lg border-2 shadow-sm"
                style={{ backgroundColor: theme.secondary }}
              />
              <div>
                <p className="font-medium text-sm">Secondary Color</p>
                <p className="font-mono text-muted-foreground text-xs">
                  {theme.secondary}
                </p>
                <p className="font-mono text-muted-foreground text-xs">
                  rgb({theme.secondaryRgb})
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div
                className="h-24 rounded-lg border-2 shadow-sm"
                style={{ backgroundColor: theme.tertiary }}
              />
              <div>
                <p className="font-medium text-sm">Tertiary Color</p>
                <p className="font-mono text-muted-foreground text-xs">
                  {theme.tertiary}
                </p>
                <p className="font-mono text-muted-foreground text-xs">
                  rgb({theme.tertiaryRgb})
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Themed Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Themed Buttons</CardTitle>
          <CardDescription>
            Buttons that adapt to your organization's colors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Primary Buttons</Label>
            <div className="flex flex-wrap gap-2">
              <OrgThemedButton size="sm" variant="primary">
                <Star className="h-4 w-4" />
                Small Primary
              </OrgThemedButton>
              <OrgThemedButton size="md" variant="primary">
                <Heart className="h-4 w-4" />
                Medium Primary
              </OrgThemedButton>
              <OrgThemedButton size="lg" variant="primary">
                <Zap className="h-4 w-4" />
                Large Primary
              </OrgThemedButton>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Secondary & Tertiary</Label>
            <div className="flex flex-wrap gap-2">
              <OrgThemedButton variant="secondary">
                <CheckCircle className="h-4 w-4" />
                Secondary Action
              </OrgThemedButton>
              <OrgThemedButton variant="tertiary">
                <Star className="h-4 w-4" />
                Tertiary Action
              </OrgThemedButton>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Outlined Buttons</Label>
            <div className="flex flex-wrap gap-2">
              <OrgThemedButton variant="outline">
                Outlined Primary
              </OrgThemedButton>
              <OrgThemedButton disabled variant="outline">
                Disabled
              </OrgThemedButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Themed Stat Cards</CardTitle>
          <CardDescription>
            Dashboard statistics using organization colors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              description="Uses primary color"
              icon={Star}
              title="Primary Stat"
              value={125}
              variant="default"
            />
            <StatCard
              description="Uses secondary color"
              icon={Heart}
              title="Secondary Stat"
              value={89}
              variant="secondary"
            />
            <StatCard
              description="Uses tertiary color"
              icon={Zap}
              title="Tertiary Stat"
              value={42}
              variant="tertiary"
            />
          </div>
        </CardContent>
      </Card>

      {/* Badges & Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Themed Badges</CardTitle>
          <CardDescription>Status indicators with org colors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge
              style={{
                backgroundColor: theme.primary,
                color: "white",
              }}
            >
              Primary Badge
            </Badge>
            <Badge
              style={{
                backgroundColor: theme.secondary,
                color: "white",
              }}
            >
              Secondary Badge
            </Badge>
            <Badge
              style={{
                backgroundColor: theme.tertiary,
                color: "white",
              }}
            >
              Tertiary Badge
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              style={{
                backgroundColor: "rgb(var(--org-primary-rgb) / 0.1)",
                color: theme.primary,
              }}
            >
              Light Primary
            </Badge>
            <Badge
              style={{
                backgroundColor: "rgb(var(--org-secondary-rgb) / 0.1)",
                color: theme.secondary,
              }}
            >
              Light Secondary
            </Badge>
            <Badge
              style={{
                backgroundColor: "rgb(var(--org-tertiary-rgb) / 0.1)",
                color: theme.tertiary,
              }}
            >
              Light Tertiary
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Backgrounds */}
      <Card>
        <CardHeader>
          <CardTitle>Themed Backgrounds</CardTitle>
          <CardDescription>
            Panels and sections with organization branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: theme.primary,
              color: "white",
            }}
          >
            <h3 className="mb-2 font-bold text-xl">Primary Background</h3>
            <p className="text-white/90">
              Full primary color background with white text
            </p>
          </div>

          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: "rgb(var(--org-primary-rgb) / 0.1)",
              borderLeft: `4px solid ${theme.primary}`,
            }}
          >
            <h3
              className="mb-2 font-bold text-xl"
              style={{ color: theme.primary }}
            >
              Light Primary Background
            </h3>
            <p className="text-muted-foreground">
              Subtle primary color with accent border
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: "rgb(var(--org-secondary-rgb) / 0.1)",
                borderColor: theme.secondary,
                borderWidth: "1px",
              }}
            >
              <p className="font-medium" style={{ color: theme.secondary }}>
                Secondary Accent
              </p>
            </div>
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: "rgb(var(--org-tertiary-rgb) / 0.1)",
                borderColor: theme.tertiary,
                borderWidth: "1px",
              }}
            >
              <p className="font-medium" style={{ color: theme.tertiary }}>
                Tertiary Accent
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 font-medium text-sm">{children}</p>;
}
