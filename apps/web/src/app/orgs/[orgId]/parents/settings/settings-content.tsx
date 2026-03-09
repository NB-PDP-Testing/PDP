"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { MyRolesSection } from "@/components/settings/my-roles-section";
import { GuardianSettingsPrivacy } from "../components/guardian-settings-privacy";
import { GuardianSettingsProfile } from "../components/guardian-settings-profile";

type SettingsContentProps = {
  orgId: string;
};

function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <button
        className="flex w-full items-center justify-between p-4 text-left font-semibold text-base"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        {title}
        {open ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      {open && <div className="border-t p-4">{children}</div>}
    </div>
  );
}

export function SettingsContent({ orgId }: SettingsContentProps) {
  return (
    <div className="space-y-4">
      <CollapsibleSection title="Your Profile">
        <GuardianSettingsProfile orgId={orgId} />
      </CollapsibleSection>

      <CollapsibleSection title="My Roles">
        <MyRolesSection bare />
      </CollapsibleSection>

      <CollapsibleSection title="Children & Privacy">
        <GuardianSettingsPrivacy orgId={orgId} />
      </CollapsibleSection>
    </div>
  );
}
