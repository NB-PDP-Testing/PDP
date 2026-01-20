"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AlertCircle, Clock, Mail, MessageSquare, Phone } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnquiryDetailModal } from "./components/enquiry-detail-modal";

type EnquiryQueueViewProps = {
  organizationId: string;
};

type Enquiry = {
  _id: Id<"passportEnquiries">;
  _creationTime: number;
  playerIdentityId: Id<"playerIdentities">;
  playerName: string;
  sourceOrgId: string;
  sourceOrgName: string;
  sourceUserId: string;
  sourceUserName: string;
  sourceUserEmail: string;
  targetOrgId: string;
  targetOrgName: string;
  subject: string;
  message: string;
  contactPreference: "email" | "phone";
  status: "open" | "processing" | "closed";
  closedAt?: number;
  closedBy?: string;
  closedByName?: string;
  resolution?: string;
  createdAt: number;
  updatedAt: number;
};

export function EnquiryQueueView({ organizationId }: EnquiryQueueViewProps) {
  const [statusFilter, setStatusFilter] = useState<
    "open" | "processing" | "closed" | undefined
  >(undefined);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get all enquiries or filtered by status
  const enquiries = useQuery(api.models.passportEnquiries.getEnquiriesForOrg, {
    organizationId,
    status: statusFilter,
  });

  // Get counts for each status
  const openCount =
    useQuery(api.models.passportEnquiries.getEnquiriesForOrg, {
      organizationId,
      status: "open",
    })?.length ?? 0;

  const processingCount =
    useQuery(api.models.passportEnquiries.getEnquiriesForOrg, {
      organizationId,
      status: "processing",
    })?.length ?? 0;

  const closedCount =
    useQuery(api.models.passportEnquiries.getEnquiriesForOrg, {
      organizationId,
      status: "closed",
    })?.length ?? 0;

  const handleEnquiryClick = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setIsModalOpen(true);
  };

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const getStatusBadge = (status: "open" | "processing" | "closed") => {
    switch (status) {
      case "open":
        return (
          <Badge className="bg-amber-600" variant="default">
            Open
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-600" variant="default">
            Processing
          </Badge>
        );
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (enquiries === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-green-600 border-b-2" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-2xl">Passport Enquiries</h1>
          <p className="text-muted-foreground">
            Manage enquiries from coaches at other organizations
          </p>
        </div>

        <Tabs
          defaultValue="all"
          onValueChange={(value) => {
            if (value === "all") {
              setStatusFilter(undefined);
            } else {
              setStatusFilter(value as "open" | "processing" | "closed");
            }
          }}
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All
              {enquiries.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {enquiries.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="open">
              Open
              {openCount > 0 && (
                <Badge className="ml-2 bg-amber-600">{openCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="processing">
              Processing
              {processingCount > 0 && (
                <Badge className="ml-2 bg-blue-600">{processingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="closed">
              Closed
              {closedCount > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {closedCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-4" value="all">
            {enquiries.length === 0 ? (
              <div className="py-8 text-center">
                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-gray-600 text-sm">
                  No enquiries yet. Coaches from other organizations can send
                  enquiries about shared players.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {enquiries.map((enquiry) => (
                  <Card
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    key={enquiry._id}
                    onClick={() => handleEnquiryClick(enquiry)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <h3 className="font-semibold">{enquiry.subject}</h3>
                            {getStatusBadge(enquiry.status)}
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-700">
                              <span className="font-medium">Player:</span>{" "}
                              {enquiry.playerName}
                            </p>
                            <p className="text-gray-700">
                              <span className="font-medium">From:</span>{" "}
                              {enquiry.sourceUserName} at{" "}
                              {enquiry.sourceOrgName}
                            </p>
                            <div className="flex items-center gap-4 text-gray-600">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(enquiry.createdAt)}
                              </div>
                              <div className="flex items-center gap-1">
                                {enquiry.contactPreference === "email" ? (
                                  <>
                                    <Mail className="h-3 w-3" />
                                    Email
                                  </>
                                ) : (
                                  <>
                                    <Phone className="h-3 w-3" />
                                    Phone
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleEnquiryClick(enquiry)}
                          size="sm"
                          variant="outline"
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent className="mt-4" value="open">
            {openCount === 0 ? (
              <div className="py-8 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-gray-600 text-sm">No open enquiries</p>
              </div>
            ) : (
              <div className="space-y-3">
                {enquiries
                  .filter((e) => e.status === "open")
                  .map((enquiry) => (
                    <Card
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      key={enquiry._id}
                      onClick={() => handleEnquiryClick(enquiry)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <h3 className="font-semibold">
                                {enquiry.subject}
                              </h3>
                              {getStatusBadge(enquiry.status)}
                            </div>
                            <div className="space-y-1 text-sm">
                              <p className="text-gray-700">
                                <span className="font-medium">Player:</span>{" "}
                                {enquiry.playerName}
                              </p>
                              <p className="text-gray-700">
                                <span className="font-medium">From:</span>{" "}
                                {enquiry.sourceUserName} at{" "}
                                {enquiry.sourceOrgName}
                              </p>
                              <div className="flex items-center gap-4 text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(enquiry.createdAt)}
                                </div>
                                <div className="flex items-center gap-1">
                                  {enquiry.contactPreference === "email" ? (
                                    <>
                                      <Mail className="h-3 w-3" />
                                      Email
                                    </>
                                  ) : (
                                    <>
                                      <Phone className="h-3 w-3" />
                                      Phone
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleEnquiryClick(enquiry)}
                            size="sm"
                            variant="outline"
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent className="mt-4" value="processing">
            {processingCount === 0 ? (
              <div className="py-8 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-gray-600 text-sm">
                  No enquiries being processed
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {enquiries
                  .filter((e) => e.status === "processing")
                  .map((enquiry) => (
                    <Card
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      key={enquiry._id}
                      onClick={() => handleEnquiryClick(enquiry)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <h3 className="font-semibold">
                                {enquiry.subject}
                              </h3>
                              {getStatusBadge(enquiry.status)}
                            </div>
                            <div className="space-y-1 text-sm">
                              <p className="text-gray-700">
                                <span className="font-medium">Player:</span>{" "}
                                {enquiry.playerName}
                              </p>
                              <p className="text-gray-700">
                                <span className="font-medium">From:</span>{" "}
                                {enquiry.sourceUserName} at{" "}
                                {enquiry.sourceOrgName}
                              </p>
                              <div className="flex items-center gap-4 text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(enquiry.createdAt)}
                                </div>
                                <div className="flex items-center gap-1">
                                  {enquiry.contactPreference === "email" ? (
                                    <>
                                      <Mail className="h-3 w-3" />
                                      Email
                                    </>
                                  ) : (
                                    <>
                                      <Phone className="h-3 w-3" />
                                      Phone
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleEnquiryClick(enquiry)}
                            size="sm"
                            variant="outline"
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent className="mt-4" value="closed">
            {closedCount === 0 ? (
              <div className="py-8 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-gray-600 text-sm">No closed enquiries</p>
              </div>
            ) : (
              <div className="space-y-3">
                {enquiries
                  .filter((e) => e.status === "closed")
                  .map((enquiry) => (
                    <Card
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      key={enquiry._id}
                      onClick={() => handleEnquiryClick(enquiry)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <h3 className="font-semibold">
                                {enquiry.subject}
                              </h3>
                              {getStatusBadge(enquiry.status)}
                            </div>
                            <div className="space-y-1 text-sm">
                              <p className="text-gray-700">
                                <span className="font-medium">Player:</span>{" "}
                                {enquiry.playerName}
                              </p>
                              <p className="text-gray-700">
                                <span className="font-medium">From:</span>{" "}
                                {enquiry.sourceUserName} at{" "}
                                {enquiry.sourceOrgName}
                              </p>
                              <div className="flex items-center gap-4 text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Closed{" "}
                                  {enquiry.closedAt &&
                                    formatDate(enquiry.closedAt)}
                                </div>
                                {enquiry.closedByName && (
                                  <p className="text-gray-600">
                                    by {enquiry.closedByName}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleEnquiryClick(enquiry)}
                            size="sm"
                            variant="outline"
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedEnquiry && (
        <EnquiryDetailModal
          enquiry={selectedEnquiry}
          onOpenChange={setIsModalOpen}
          open={isModalOpen}
        />
      )}
    </>
  );
}
