"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Edit,
  GripVertical,
  Loader2,
  Phone,
  Plus,
  Shield,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface EmergencyContactsSectionProps {
  playerIdentityId: Id<"playerIdentities">;
  isEditable: boolean; // Only true for adult players viewing their own profile
  playerType: "youth" | "adult";
}

const RELATIONSHIP_OPTIONS = [
  { value: "spouse", label: "Spouse/Partner" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "child", label: "Adult Child" },
  { value: "friend", label: "Friend" },
  { value: "colleague", label: "Colleague" },
  { value: "neighbor", label: "Neighbor" },
  { value: "other", label: "Other" },
];

interface ContactFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  relationship: string;
  notes: string;
}

const emptyFormData: ContactFormData = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  relationship: "",
  notes: "",
};

export function EmergencyContactsSection({
  playerIdentityId,
  isEditable,
  playerType,
}: EmergencyContactsSectionProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [formData, setFormData] = useState<ContactFormData>(emptyFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Query contacts
  const contacts = useQuery(api.models.emergencyContacts.getForPlayer, {
    playerIdentityId,
  });

  // Mutations
  const createContact = useMutation(api.models.emergencyContacts.create);
  const updateContact = useMutation(api.models.emergencyContacts.update);
  const removeContact = useMutation(api.models.emergencyContacts.remove);
  const updatePriority = useMutation(api.models.emergencyContacts.updatePriority);

  // Handle form submission
  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.relationship) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      if (editingContact) {
        await updateContact({
          contactId: editingContact._id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email || undefined,
          relationship: formData.relationship,
          notes: formData.notes || undefined,
        });
        toast.success("Contact updated");
      } else {
        await createContact({
          playerIdentityId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email || undefined,
          relationship: formData.relationship,
          priority: (contacts?.length || 0) + 1,
          notes: formData.notes || undefined,
        });
        toast.success("Contact added");
      }
      setIsAddDialogOpen(false);
      setEditingContact(null);
      setFormData(emptyFormData);
    } catch (error) {
      toast.error("Failed to save contact", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (contactId: Id<"playerEmergencyContacts">) => {
    setDeletingId(contactId);
    try {
      await removeContact({ contactId });
      toast.success("Contact removed");
    } catch (error) {
      toast.error("Failed to remove contact");
    } finally {
      setDeletingId(null);
    }
  };

  // Handle priority change
  const handleMovePriority = async (contactId: Id<"playerEmergencyContacts">, direction: "up" | "down") => {
    const contact = contacts?.find((c) => c._id === contactId);
    if (!contact) return;

    const newPriority = direction === "up" ? contact.priority - 1 : contact.priority + 1;
    if (newPriority < 1 || newPriority > (contacts?.length || 0)) return;

    try {
      await updatePriority({ contactId, newPriority });
    } catch (error) {
      toast.error("Failed to reorder contact");
    }
  };

  // Open edit dialog
  const openEditDialog = (contact: any) => {
    setEditingContact(contact);
    setFormData({
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      email: contact.email || "",
      relationship: contact.relationship,
      notes: contact.notes || "",
    });
    setIsAddDialogOpen(true);
  };

  // Loading state
  if (contacts === undefined) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Youth players don't manage their own emergency contacts
  if (playerType === "youth" && !isEditable) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-6 text-center">
          <Shield className="mx-auto h-8 w-8 text-blue-500" />
          <p className="mt-2 font-medium text-blue-800">
            Emergency Contacts Managed by Guardian
          </p>
          <p className="text-blue-700 text-sm">
            For youth players, emergency contacts are managed through guardian profiles.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-red-500" />
              Emergency Contacts
            </CardTitle>
            <CardDescription>
              {isEditable
                ? "Manage your emergency contacts. Priority 1 will be called first."
                : "Emergency contacts for this player"}
            </CardDescription>
          </div>
          {isEditable && (
            <Button
              onClick={() => {
                setEditingContact(null);
                setFormData(emptyFormData);
                setIsAddDialogOpen(true);
              }}
              size="sm"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Contact
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-red-200 bg-red-50 py-8 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
            <p className="mt-2 font-medium text-red-800">No Emergency Contacts</p>
            <p className="text-red-700 text-sm">
              {isEditable
                ? "Add at least one emergency contact for your safety."
                : "This player has no emergency contacts set up."}
            </p>
            {isEditable && (
              <Button
                className="mt-4"
                onClick={() => {
                  setEditingContact(null);
                  setFormData(emptyFormData);
                  setIsAddDialogOpen(true);
                }}
                variant="destructive"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Emergency Contact
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <div
                key={contact._id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  contact.priority <= 2 ? "border-red-200 bg-red-50" : "bg-white"
                }`}
              >
                {/* Priority indicator */}
                <div className="flex flex-col items-center gap-1">
                  {isEditable && index > 0 && (
                    <button
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => handleMovePriority(contact._id, "up")}
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                  )}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                      contact.priority === 1
                        ? "bg-red-600 text-white"
                        : contact.priority === 2
                          ? "bg-orange-500 text-white"
                          : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {contact.priority}
                  </div>
                  {isEditable && index < contacts.length - 1 && (
                    <button
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => handleMovePriority(contact._id, "down")}
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Contact info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {contact.firstName} {contact.lastName}
                    </p>
                    {contact.priority <= 2 && (
                      <Badge className="bg-red-100 text-red-700 text-xs">ICE</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm capitalize">
                    {contact.relationship}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                    <a
                      className="flex items-center gap-1 font-mono text-red-600 hover:underline"
                      href={`tel:${contact.phone}`}
                    >
                      <Phone className="h-3 w-3" />
                      {contact.phone}
                    </a>
                    {contact.email && (
                      <a
                        className="text-blue-600 hover:underline"
                        href={`mailto:${contact.email}`}
                      >
                        {contact.email}
                      </a>
                    )}
                  </div>
                  {contact.notes && (
                    <p className="mt-1 text-muted-foreground text-xs">{contact.notes}</p>
                  )}
                </div>

                {/* Actions */}
                {isEditable && (
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => openEditDialog(contact)}
                      size="icon"
                      variant="ghost"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      disabled={deletingId === contact._id}
                      onClick={() => handleDelete(contact._id)}
                      size="icon"
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      {deletingId === contact._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Contact Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingContact(null);
            setFormData(emptyFormData);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Edit Emergency Contact" : "Add Emergency Contact"}
            </DialogTitle>
            <DialogDescription>
              {editingContact
                ? "Update the contact information below."
                : "Add someone who can be contacted in case of an emergency."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  value={formData.firstName}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Smith"
                  value={formData.lastName}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Relationship *</Label>
              <Select
                onValueChange={(value) => setFormData({ ...formData, relationship: value })}
                value={formData.relationship}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="087 123 4567"
                type="tel"
                value={formData.phone}
              />
            </div>

            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.smith@email.com"
                type="email"
                value={formData.email}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g., Best time to call, alternative contact methods..."
                rows={2}
                value={formData.notes}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setIsAddDialogOpen(false);
                setEditingContact(null);
                setFormData(emptyFormData);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSaving} onClick={handleSubmit}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingContact ? "Update Contact" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
