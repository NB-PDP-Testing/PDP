"use client";

import { AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function InvalidLinkView() {
  return (
    <div className="flex min-h-[60svh] items-center justify-center">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Invalid Link</CardTitle>
          <CardDescription>
            This review link is invalid or no longer exists. Please check the
            link from your WhatsApp message.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground text-sm">
            If you need a new review link, send a voice note in your WhatsApp
            chat and a fresh link will be included in the response.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
