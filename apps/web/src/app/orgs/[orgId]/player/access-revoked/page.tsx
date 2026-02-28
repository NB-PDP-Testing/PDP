"use client";

import { LockKeyhole } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AccessRevokedPage() {
  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center p-4 md:p-8">
      <Card className="max-w-md border-amber-200">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <LockKeyhole className="h-7 w-7 text-amber-600" />
          </div>
          <CardTitle className="text-xl">Access Revoked</CardTitle>
          <CardDescription className="mt-2 text-base">
            Your access to this player account has been revoked. Contact your
            parent or guardian to restore access.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground text-sm">
            If you think this is a mistake, ask your parent or guardian to
            update your access settings in the parent portal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
