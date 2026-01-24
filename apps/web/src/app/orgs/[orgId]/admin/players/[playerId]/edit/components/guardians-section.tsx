"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Loader2,
  Mail,
  Phone,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddGuardianModal } from "./add-guardian-modal";

type Props = {
  playerIdentityId: Id<"playerIdentities">;
  organizationId: string;
  canManage: boolean;
  playerName?: string;
};

type GuardianData = {
  link: {
    _id: Id<"guardianPlayerLinks">;
    relationship: string;
    isPrimary: boolean;
    acknowledgedByParentAt?: number;
    declinedByUserId?: string;
  };
  guardian: {
    _id: Id<"guardianIdentities">;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
};

export function GuardiansSection({
  playerIdentityId,
  organizationId,
  canManage,
  playerName,
}: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingGuardian, setDeletingGuardian] = useState<GuardianData | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch guardians for this player
  const guardians = useQuery(
    api.models.guardianPlayerLinks.getGuardiansForPlayer,
    {
      playerIdentityId,
    }
  ) as GuardianData[] | undefined;

  // Delete mutation
  const deleteGuardianLink = useMutation(
    api.models.guardianPlayerLinks.deleteGuardianPlayerLink
  );

  const handleDelete = async () => {
    if (!deletingGuardian) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteGuardianLink({ linkId: deletingGuardian.link._id });
      toast.success(
        `${deletingGuardian.guardian.firstName} ${deletingGuardian.guardian.lastName} has been removed as a guardian`
      );
      setDeletingGuardian(null);
    } catch (error) {
      console.error("Error deleting guardian:", error);
      toast.error("Failed to remove guardian. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatRelationship = (relationship: string) =>
    relationship.charAt(0).toUpperCase() + relationship.slice(1);

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "??";

  // Loading state
  if (guardians === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Parents & Guardians
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Parents & Guardians
              {guardians.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {guardians.length}
                </Badge>
              )}
            </CardTitle>
            {canManage && (
              <Button
                onClick={() => setShowAddModal(true)}
                size="sm"
                variant="outline"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Guardian
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {guardians.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">
                No guardians linked to this player
              </p>
              {canManage && (
                <Button
                  className="mt-4"
                  onClick={() => setShowAddModal(true)}
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Guardian
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {guardians.map((guardianData) => {
                const { link, guardian } = guardianData;
                const isPending = !(
                  link.acknowledgedByParentAt || link.declinedByUserId
                );
                const isDeclined = !!link.declinedByUserId;

                return (
                  <div
                    className={`rounded-lg bg-white p-4 shadow-md transition-shadow hover:shadow-lg ${
                      isDeclined ? "opacity-60" : ""
                    }`}
                    key={link._id}
                  >
                    {/* Guardian Header */}
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold text-sm text-white">
                          {getInitials(guardian.firstName, guardian.lastName)}
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-800">
                            {guardian.firstName} {guardian.lastName}
                          </h5>
                          <p className="text-gray-500 text-xs">
                            {formatRelationship(link.relationship)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {link.isPrimary && (
                          <Badge className="border-green-300 bg-green-100 text-green-700">
                            Primary
                          </Badge>
                        )}
                        {isPending && (
                          <Badge
                            className="border-orange-300 bg-orange-50 text-orange-700"
                            variant="outline"
                          >
                            Pending
                          </Badge>
                        )}
                        {isDeclined && (
                          <Badge
                            className="border-red-300 bg-red-50 text-red-700"
                            variant="outline"
                          >
                            Declined
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-2">
                      <a
                        className="flex items-center gap-2 text-gray-600 text-sm transition-colors hover:text-blue-600"
                        href={`mailto:${guardian.email}`}
                      >
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{guardian.email}</span>
                      </a>
                      {guardian.phone && (
                        <a
                          className="flex items-center gap-2 text-gray-600 text-sm transition-colors hover:text-blue-600"
                          href={`tel:${guardian.phone}`}
                        >
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{guardian.phone}</span>
                        </a>
                      )}
                    </div>

                    {/* Delete Button */}
                    {canManage && (
                      <div className="mt-4 border-t pt-3">
                        <Button
                          className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeletingGuardian(guardianData)}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Guardian
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Guardian Modal */}
      <AddGuardianModal
        existingGuardianCount={guardians.length}
        onOpenChange={setShowAddModal}
        open={showAddModal}
        organizationId={organizationId}
        playerIdentityId={playerIdentityId}
        playerName={playerName}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        onOpenChange={(open) => !open && setDeletingGuardian(null)}
        open={!!deletingGuardian}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Guardian</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {deletingGuardian?.guardian.firstName}{" "}
                {deletingGuardian?.guardian.lastName}
              </strong>{" "}
              as a guardian for this player?
              {deletingGuardian?.link.isPrimary && (
                <span className="mt-2 block text-orange-600">
                  This is the primary guardian. If removed, another guardian
                  will be automatically promoted to primary.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Guardian"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
