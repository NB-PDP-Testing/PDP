"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Save, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
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
import { authClient } from "@/lib/auth-client";

type Organization = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  colors?: string[];
};

export default function OrgSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");

  // Check user's role
  const userRole = useQuery(api.models.organizations.getUserOrgRole, {
    organizationId: orgId,
  });
  const deleteOrganization = useMutation(
    api.models.organizations.deleteOrganization
  );

  useEffect(() => {
    const loadOrg = async () => {
      try {
        const { data } = await authClient.organization.getFullOrganization({
          query: {
            organizationId: orgId,
          },
        });
        if (data) {
          const orgData = data as Organization;
          setOrg(orgData);
          setName(orgData.name);
          setLogo(orgData.logo || "");
        }
      } catch (error) {
        console.error("Error loading organization:", error);
        toast.error("Failed to load organization");
      } finally {
        setLoading(false);
      }
    };
    loadOrg();
  }, [orgId]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setSaving(true);
    try {
      await authClient.organization.update({
        organizationId: orgId,
        data: {
          name,
          logo: logo || undefined,
        },
      });
      toast.success("Organization updated successfully");
      setOrg((prev) => (prev ? { ...prev, name, logo } : null));
    } catch (error) {
      console.error("Error updating organization:", error);
      toast.error("Failed to update organization");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== org?.name) {
      toast.error("Organization name doesn't match");
      return;
    }

    setDeleting(true);
    try {
      await deleteOrganization({ organizationId: orgId });
      toast.success("Organization deleted successfully");
      router.push("/orgs");
    } catch (error) {
      console.error("Error deleting organization:", error);
      toast.error((error as Error)?.message || "Failed to delete organization");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Organization not found</div>
      </div>
    );
  }

  const isOwner = userRole?.isOwner ?? false;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">
          Organization Settings
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage your organization's details and settings
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>
            Update your organization's basic information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              disabled={saving}
              id="name"
              onChange={(e) => setName(e.target.value)}
              placeholder="My Sports Club"
              value={name}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <Input disabled id="slug" readOnly value={org.slug} />
            <p className="text-muted-foreground text-xs">
              The slug cannot be changed after creation
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Logo URL</Label>
            <Input
              disabled={saving}
              id="logo"
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://example.com/logo.png"
              type="url"
              value={logo}
            />
          </div>

          <Button disabled={saving} onClick={handleSave}>
            {saving ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-pulse" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone - Only for owners */}
      {isOwner && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex-1">
                <h3 className="font-semibold">Delete Organization</h3>
                <p className="mt-1 text-muted-foreground text-sm">
                  Permanently delete this organization and all associated data.
                  This action cannot be undone.
                </p>
              </div>
              <Button
                onClick={() => setDeleteDialogOpen(true)}
                size="sm"
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isOwner && userRole && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm">
              Only organization owners can access sensitive settings like
              deletion.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Organization
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              organization <strong>{org.name}</strong> and remove all associated
              data including teams, members, and players.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <strong>{org.name}</strong> to confirm
              </Label>
              <Input
                id="confirm"
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={org.name}
                value={deleteConfirmText}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirmText("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={deleteConfirmText !== org.name || deleting}
              onClick={handleDelete}
              variant="destructive"
            >
              {deleting ? (
                <>
                  <Trash2 className="mr-2 h-4 w-4 animate-pulse" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Organization
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
