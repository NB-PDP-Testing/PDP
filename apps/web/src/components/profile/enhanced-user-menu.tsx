"use client";

import {
  Bell,
  Brain,
  Check,
  ChevronDown,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { ResponsiveDialog } from "@/components/interactions";
import { AlertsDialog } from "@/components/profile/alerts-dialog";
import { CoachSettingsDialog } from "@/components/profile/coach-settings-dialog";
import { PreferencesDialog } from "@/components/profile/preferences-dialog";
import { ProfileSettingsDialog } from "@/components/profile/profile-settings-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCurrentUser } from "@/hooks/use-current-user";
import { UXAnalyticsEvents } from "@/hooks/use-ux-feature-flags";
import { useAnalytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useMembershipContext } from "@/providers/membership-provider";

/**
 * Enhanced User Profile Menu
 *
 * Consolidates UserMenu + ModeToggle into a single enhanced profile button.
 * Uses ResponsiveDialog for optimal mobile experience (bottom sheet).
 *
 * Features:
 * - Avatar button trigger (h-10 for header alignment)
 * - ResponsiveDialog: Desktop dropdown (360px), Mobile bottom sheet
 * - Theme selector with grid layout (Light/Dark/System)
 * - Quick actions (Profile/Coach AI/Settings/Alerts)
 * - Coach AI button only shows for users with coach role in any organization
 * - Sign out button
 * - WCAG 2.2 AA compliant
 * - Mobile-optimized touch targets (p-2 on mobile, p-1.5 on desktop)
 *
 * Alignment: Matches OrgRoleSwitcher pattern for consistency
 * Industry patterns: Linear, Notion, GitHub all consolidate theme in profile menu
 */
export function EnhancedUserMenu() {
  const router = useRouter();
  const user = useCurrentUser();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { track } = useAnalytics();
  const [open, setOpen] = useState(false);

  // Dialog state for settings pages
  const [profileOpen, setProfileOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [coachSettingsOpen, setCoachSettingsOpen] = useState(false);

  // Get memberships from context (shared across header components)
  // Performance: Uses MembershipProvider to avoid duplicate queries
  const { memberships: userOrganizations } = useMembershipContext();

  // Check if user is a coach in any organization
  const isCoachAnywhere =
    userOrganizations?.some((org) => org.functionalRoles?.includes("coach")) ??
    false;

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!user?.name) {
      return "U";
    }
    const nameParts = user.name.split(" ");
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return nameParts[0][0].toUpperCase();
  };

  // Get theme icon and color (flat design matching site aesthetic)
  const getThemeIcon = () => {
    if (resolvedTheme === "dark") {
      return { icon: Moon, color: "text-blue-600" };
    }
    if (theme === "system") {
      return { icon: Monitor, color: "text-purple-600" };
    }
    // Light theme (default)
    return { icon: Sun, color: "text-yellow-600" };
  };

  const themeIcon = getThemeIcon();
  const _ThemeIcon = themeIcon.icon;

  // Handle theme change with analytics
  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    track(UXAnalyticsEvents.ENHANCED_USER_MENU_THEME_CHANGED, {
      from: theme || "system",
      to: newTheme,
    });
  };

  // Handle dropdown open/close with analytics
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      track(UXAnalyticsEvents.ENHANCED_USER_MENU_OPENED, {
        currentTheme: resolvedTheme || "system",
      });
    }
  };

  // Handle sign out
  const handleSignOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
        },
      },
    });
  };

  // Trigger button (extracted for ResponsiveDialog)
  const triggerButton = (
    <Button
      aria-expanded={open}
      aria-haspopup="menu"
      aria-label={`User profile: ${user?.name || "User"}. Click for menu.`}
      className="flex h-10 items-center gap-1 px-2"
      size="sm"
      variant="outline"
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage
          alt={user?.name || "User"}
          src={user?.image || undefined}
        />
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {getInitials()}
        </AvatarFallback>
      </Avatar>

      {/* Chevron */}
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "h-3 w-3 flex-shrink-0 transition-transform duration-200",
          open && "rotate-180"
        )}
      />
    </Button>
  );

  return (
    <>
      <ResponsiveDialog
        contentClassName="sm:w-[360px]"
        onOpenChange={handleOpenChange}
        open={open}
        title="Profile & Settings"
        trigger={triggerButton}
      >
        <div className="space-y-0">
          {/* Profile Header */}
          <div className="p-4 pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  alt={user?.name || "User"}
                  src={user?.image || undefined}
                />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate font-semibold text-sm">{user?.name}</p>
                <p className="truncate text-muted-foreground text-sm">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Theme Selector Section - Compact */}
          <div className="border-b p-3 sm:p-2.5">
            <p className="mb-2 font-medium text-muted-foreground text-xs uppercase sm:mb-1.5 sm:text-[10px]">
              Theme
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-1.5">
              {/* Light Theme */}
              <button
                aria-checked={theme === "light"}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md border-2 p-2 transition-colors sm:gap-0.5 sm:p-1.5",
                  "hover:bg-accent hover:text-accent-foreground",
                  theme === "light"
                    ? "border-primary bg-primary/10"
                    : "border-muted"
                )}
                onClick={() => handleThemeChange("light")}
                role="menuitemradio"
                type="button"
              >
                <Sun aria-hidden="true" className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="text-xs sm:text-[10px]">Light</span>
                {theme === "light" && (
                  <Check
                    aria-hidden="true"
                    className="h-3 w-3 text-primary sm:h-2.5 sm:w-2.5"
                  />
                )}
              </button>

              {/* Dark Theme */}
              <button
                aria-checked={theme === "dark"}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md border-2 p-2 transition-colors sm:gap-0.5 sm:p-1.5",
                  "hover:bg-accent hover:text-accent-foreground",
                  theme === "dark"
                    ? "border-primary bg-primary/10"
                    : "border-muted"
                )}
                onClick={() => handleThemeChange("dark")}
                role="menuitemradio"
                type="button"
              >
                <Moon
                  aria-hidden="true"
                  className="h-4 w-4 sm:h-3.5 sm:w-3.5"
                />
                <span className="text-xs sm:text-[10px]">Dark</span>
                {theme === "dark" && (
                  <Check
                    aria-hidden="true"
                    className="h-3 w-3 text-primary sm:h-2.5 sm:w-2.5"
                  />
                )}
              </button>

              {/* System Theme */}
              <button
                aria-checked={theme === "system"}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md border-2 p-2 transition-colors sm:gap-0.5 sm:p-1.5",
                  "hover:bg-accent hover:text-accent-foreground",
                  theme === "system"
                    ? "border-primary bg-primary/10"
                    : "border-muted"
                )}
                onClick={() => handleThemeChange("system")}
                role="menuitemradio"
                type="button"
              >
                <Monitor
                  aria-hidden="true"
                  className="h-4 w-4 sm:h-3.5 sm:w-3.5"
                />
                <span className="text-xs sm:text-[10px]">System</span>
                {theme === "system" && (
                  <Check
                    aria-hidden="true"
                    className="h-3 w-3 text-primary sm:h-2.5 sm:w-2.5"
                  />
                )}
              </button>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="p-3">
            <div
              className={cn(
                "grid gap-2",
                isCoachAnywhere ? "grid-cols-4" : "grid-cols-3"
              )}
            >
              <button
                className="flex flex-col items-center gap-1 rounded p-2 hover:bg-accent"
                onClick={() => {
                  setOpen(false);
                  setProfileOpen(true);
                }}
                type="button"
              >
                <User aria-hidden="true" className="h-5 w-5" />
                <span className="text-[10px]">Profile</span>
              </button>
              {isCoachAnywhere && (
                <button
                  className="flex flex-col items-center gap-1 rounded p-2 hover:bg-accent"
                  onClick={() => {
                    setOpen(false);
                    setCoachSettingsOpen(true);
                  }}
                  type="button"
                >
                  <Brain aria-hidden="true" className="h-5 w-5" />
                  <span className="text-[10px]">Coach AI</span>
                </button>
              )}
              <button
                className="flex flex-col items-center gap-1 rounded p-2 hover:bg-accent"
                onClick={() => {
                  setOpen(false);
                  setPreferencesOpen(true);
                }}
                type="button"
              >
                <Settings aria-hidden="true" className="h-5 w-5" />
                <span className="text-[10px]">Settings</span>
              </button>
              <button
                className="flex flex-col items-center gap-1 rounded p-2 hover:bg-accent"
                onClick={() => {
                  setOpen(false);
                  setAlertsOpen(true);
                }}
                type="button"
              >
                <Bell aria-hidden="true" className="h-5 w-5" />
                <span className="text-[10px]">Alerts</span>
              </button>
            </div>

            <Separator className="my-2" />

            {/* Sign Out */}
            <button
              className="flex w-full items-center gap-2 rounded-md p-2 text-destructive transition-colors hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none"
              onClick={handleSignOut}
              type="button"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Settings Dialog Components */}
      <ProfileSettingsDialog onOpenChange={setProfileOpen} open={profileOpen} />
      <PreferencesDialog
        onOpenChange={setPreferencesOpen}
        open={preferencesOpen}
      />
      <AlertsDialog onOpenChange={setAlertsOpen} open={alertsOpen} />
      <CoachSettingsDialog
        onOpenChange={setCoachSettingsOpen}
        open={coachSettingsOpen}
      />
    </>
  );
}
