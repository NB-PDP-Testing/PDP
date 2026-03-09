"use client";

import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useGuardianChildrenInOrg } from "@/hooks/use-guardian-identity";
import { authClient } from "@/lib/auth-client";
import { getCountryName } from "@/lib/constants/address-data";

type Props = { orgId: string };

export function GuardianSettingsProfile({ orgId }: Props) {
  const { data: session } = authClient.useSession();
  const { guardianIdentity } = useGuardianChildrenInOrg(
    orgId,
    session?.user?.email
  );

  if (!guardianIdentity) {
    return (
      <p className="text-muted-foreground text-sm">
        No guardian profile found.
      </p>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Name:</span>
        <span className="font-medium">
          {guardianIdentity.firstName} {guardianIdentity.lastName}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Email:</span>
        <span className="font-medium">{guardianIdentity.email}</span>
      </div>
      {guardianIdentity.phone && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Phone:</span>
          <span className="font-medium">{guardianIdentity.phone}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Verification:</span>
        <Badge variant="secondary">
          {guardianIdentity.verificationStatus === "email_verified"
            ? "Email Verified"
            : guardianIdentity.verificationStatus === "id_verified"
              ? "ID Verified"
              : "Unverified"}
        </Badge>
      </div>
      {(guardianIdentity.address ||
        guardianIdentity.address2 ||
        guardianIdentity.town ||
        guardianIdentity.county ||
        guardianIdentity.postcode ||
        guardianIdentity.country) && (
        <div className="mt-4 border-t pt-4">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="font-medium text-sm">Address</span>
          </div>
          <div className="text-sm">
            {(guardianIdentity.address || guardianIdentity.address2) && (
              <div className="font-medium">
                {guardianIdentity.address}
                {guardianIdentity.address && guardianIdentity.address2 && ", "}
                {guardianIdentity.address2}
              </div>
            )}
            {(guardianIdentity.town || guardianIdentity.postcode) && (
              <div>
                {guardianIdentity.town}
                {guardianIdentity.town && guardianIdentity.postcode && ", "}
                {guardianIdentity.postcode}
              </div>
            )}
            {(guardianIdentity.county || guardianIdentity.country) && (
              <div>
                {guardianIdentity.county}
                {guardianIdentity.county && guardianIdentity.country && ", "}
                {getCountryName(guardianIdentity.country) ||
                  guardianIdentity.country}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
