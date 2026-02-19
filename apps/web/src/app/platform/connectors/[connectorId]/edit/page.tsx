"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import type { Id } from "@pdp/backend/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { ChevronDown, Loader2, TestTube2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ConnectionTestDialog } from "@/components/connectors/connection-test-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type AuthType = "oauth2" | "api_key" | "basic";
type ConflictStrategy = "federation_wins" | "local_wins" | "merge";

type ConnectorFormData = {
  name: string;
  federationCode: string;
  status: "active" | "inactive";
  authType: AuthType;
  // OAuth fields
  oauth_clientId?: string;
  oauth_clientSecret?: string;
  oauth_authUrl?: string;
  oauth_tokenUrl?: string;
  // API Key fields
  apikey_key?: string;
  apikey_headerName?: string;
  // Basic Auth fields
  basic_username?: string;
  basic_password?: string;
  // Endpoints
  membershipListUrl: string;
  memberDetailUrl?: string;
  webhookSecret?: string;
  // Sync config
  syncEnabled: boolean;
  cronSchedule: string;
  conflictStrategy: ConflictStrategy;
  templateId: string;
};

export default function EditConnectorPage() {
  const params = useParams();
  const router = useRouter();
  const connectorId = params.connectorId as Id<"federationConnectors">;

  const [authType, setAuthType] = useState<AuthType>("api_key");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentialsChanged, setCredentialsChanged] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<ConnectorFormData>({
    defaultValues: {
      status: "active",
      authType: "api_key",
      apikey_headerName: "X-API-Key",
      syncEnabled: true,
      cronSchedule: "0 2 * * *",
      conflictStrategy: "federation_wins",
    },
  });

  // Fetch existing connector data
  const connector = useQuery(api.models.federationConnectors.getConnector, {
    connectorId,
  });

  // Fetch available import templates
  const templates = useQuery(api.models.importTemplates.listTemplates, {
    scope: "platform",
  });

  const updateConnector = useMutation(
    api.models.federationConnectors.updateConnector
  );
  const updateCredentials = useAction(
    api.models.federationConnectors.updateConnectorCredentials
  );

  const syncEnabled = watch("syncEnabled");

  // Pre-populate form with existing data
  useEffect(() => {
    if (connector) {
      setAuthType(connector.authType);
      reset({
        name: connector.name,
        federationCode: connector.federationCode,
        status: (connector.status === "error"
          ? "inactive"
          : connector.status) as "active" | "inactive",
        authType: connector.authType,
        membershipListUrl: connector.endpoints.membershipList,
        memberDetailUrl: connector.endpoints.memberDetail || "",
        webhookSecret: connector.endpoints.webhookSecret || "",
        syncEnabled: connector.syncConfig.enabled,
        cronSchedule: connector.syncConfig.schedule || "0 2 * * *",
        conflictStrategy: connector.syncConfig
          .conflictStrategy as ConflictStrategy,
        templateId: connector.templateId,
        apikey_headerName: "X-API-Key", // Default, not stored
      });
    }
  }, [connector, reset]);

  const onSubmit = async (data: ConnectorFormData) => {
    setIsSubmitting(true);

    try {
      // Validate URLs
      const urls = [data.membershipListUrl, data.memberDetailUrl].filter(
        Boolean
      ) as string[];
      for (const url of urls) {
        if (!url.startsWith("https://")) {
          toast.error("All URLs must be HTTPS endpoints");
          setIsSubmitting(false);
          return;
        }
      }

      // Update basic connector info (always)
      await updateConnector({
        connectorId,
        name: data.name,
        endpoints: {
          membershipList: data.membershipListUrl,
          memberDetail: data.memberDetailUrl || undefined,
          webhookSecret: data.webhookSecret || undefined,
        },
        syncConfig: {
          enabled: data.syncEnabled,
          schedule: data.syncEnabled ? data.cronSchedule : undefined,
          conflictStrategy: data.conflictStrategy,
        },
        templateId: data.templateId as unknown as Id<"importTemplates">,
      });

      // Update credentials only if changed
      if (credentialsChanged) {
        // Build credentials object based on auth type
        let credentials: Record<string, string> = {};
        if (data.authType === "oauth2") {
          if (
            !(
              data.oauth_clientId &&
              data.oauth_clientSecret &&
              data.oauth_authUrl &&
              data.oauth_tokenUrl
            )
          ) {
            toast.error(
              "All OAuth 2.0 fields are required to update credentials"
            );
            setIsSubmitting(false);
            return;
          }
          credentials = {
            clientId: data.oauth_clientId,
            clientSecret: data.oauth_clientSecret,
            authorizationUrl: data.oauth_authUrl,
            tokenUrl: data.oauth_tokenUrl,
          };
        } else if (data.authType === "api_key") {
          if (!data.apikey_key) {
            toast.error("API key is required to update credentials");
            setIsSubmitting(false);
            return;
          }
          credentials = {
            apiKey: data.apikey_key,
            headerName: data.apikey_headerName || "X-API-Key",
          };
        } else if (data.authType === "basic") {
          if (!(data.basic_username && data.basic_password)) {
            toast.error(
              "Username and password are required to update credentials"
            );
            setIsSubmitting(false);
            return;
          }
          credentials = {
            username: data.basic_username,
            password: data.basic_password,
          };
        }

        await updateCredentials({
          connectorId,
          credentials: credentials as unknown,
        });
      }

      toast.success("Connector updated successfully");
      router.push("/platform/connectors");
    } catch (error) {
      console.error("Failed to update connector:", error);
      toast.error(
        `Failed to save connector: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Track if any credential field changes
  const handleCredentialChange = () => {
    if (!credentialsChanged) {
      setCredentialsChanged(true);
    }
  };

  if (connector === undefined || templates === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (connector === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Connector not found</p>
          <Button asChild className="mt-4">
            <Link href="/platform/connectors">Back to Connectors</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1E3A5F] via-[#1E3A5F] to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Link href="/platform/connectors">
              <Button className="text-white/80" size="sm" variant="ghost">
                <ChevronDown className="mr-1 h-4 w-4 rotate-90" />
                Back to Connectors
              </Button>
            </Link>
          </div>
          <h1 className="mb-4 font-bold text-4xl text-white tracking-tight">
            Edit Connector
          </h1>
          <p className="text-lg text-white/80">
            Update connection settings for {connector.name}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Connector Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., GAA Foireann"
                    {...register("name", { required: "Name is required" })}
                  />
                  {errors.name && (
                    <p className="text-destructive text-sm">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="federationCode">
                    Federation Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    disabled
                    id="federationCode"
                    {...register("federationCode")}
                    className="bg-muted"
                  />
                  <p className="text-muted-foreground text-sm">
                    Federation code cannot be changed after creation.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    defaultValue={connector.status}
                    onValueChange={(value: "active" | "inactive") =>
                      setValue("status", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Authentication */}
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="authType">
                    Auth Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    defaultValue={connector.authType}
                    onValueChange={(value: AuthType) => {
                      setAuthType(value);
                      setValue("authType", value);
                      handleCredentialChange();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api_key">API Key</SelectItem>
                      <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <p className="text-muted-foreground text-sm">
                  Credentials are never shown for security. Enter new
                  credentials below only if you want to update them.
                </p>

                {/* OAuth 2.0 Fields */}
                {authType === "oauth2" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="oauth_clientId">Client ID</Label>
                      <Input
                        id="oauth_clientId"
                        placeholder="Enter new client ID (if updating)"
                        {...register("oauth_clientId")}
                        onChange={() => {
                          handleCredentialChange();
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="oauth_clientSecret">Client Secret</Label>
                      <Input
                        id="oauth_clientSecret"
                        placeholder="Enter new client secret (if updating)"
                        type="password"
                        {...register("oauth_clientSecret")}
                        onChange={() => {
                          handleCredentialChange();
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="oauth_authUrl">Authorization URL</Label>
                      <Input
                        id="oauth_authUrl"
                        placeholder="https://..."
                        {...register("oauth_authUrl")}
                        onChange={() => {
                          handleCredentialChange();
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="oauth_tokenUrl">Token URL</Label>
                      <Input
                        id="oauth_tokenUrl"
                        placeholder="https://..."
                        {...register("oauth_tokenUrl")}
                        onChange={() => {
                          handleCredentialChange();
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* API Key Fields */}
                {authType === "api_key" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="apikey_key">API Key</Label>
                      <Input
                        id="apikey_key"
                        placeholder="Enter new API key (if updating)"
                        type="password"
                        {...register("apikey_key")}
                        onChange={() => {
                          handleCredentialChange();
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apikey_headerName">Header Name</Label>
                      <Input
                        id="apikey_headerName"
                        placeholder="X-API-Key"
                        {...register("apikey_headerName")}
                        onChange={() => {
                          handleCredentialChange();
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Basic Auth Fields */}
                {authType === "basic" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="basic_username">Username</Label>
                      <Input
                        id="basic_username"
                        placeholder="Enter new username (if updating)"
                        {...register("basic_username")}
                        onChange={() => {
                          handleCredentialChange();
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="basic_password">Password</Label>
                      <Input
                        id="basic_password"
                        placeholder="Enter new password (if updating)"
                        type="password"
                        {...register("basic_password")}
                        onChange={() => {
                          handleCredentialChange();
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Endpoints */}
            <Card>
              <CardHeader>
                <CardTitle>API Endpoints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="membershipListUrl">
                    Membership List URL{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="membershipListUrl"
                    placeholder="https://api.federation.com/members"
                    {...register("membershipListUrl", {
                      required: "Membership list URL is required",
                    })}
                  />
                  {errors.membershipListUrl && (
                    <p className="text-destructive text-sm">
                      {errors.membershipListUrl.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memberDetailUrl">Member Detail URL</Label>
                  <Input
                    id="memberDetailUrl"
                    placeholder="https://api.federation.com/members/{id}"
                    {...register("memberDetailUrl")}
                  />
                  <p className="text-muted-foreground text-sm">
                    Optional. Use {"{id}"} as placeholder for member ID.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookSecret">Webhook Secret</Label>
                  <Input
                    id="webhookSecret"
                    placeholder="Optional webhook secret"
                    type="password"
                    {...register("webhookSecret")}
                  />
                  <p className="text-muted-foreground text-sm">
                    For verifying webhook push notifications from the
                    federation.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sync Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Sync Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={syncEnabled}
                    id="syncEnabled"
                    onCheckedChange={(checked: boolean) =>
                      setValue("syncEnabled", checked)
                    }
                  />
                  <Label className="cursor-pointer" htmlFor="syncEnabled">
                    Enable Scheduled Sync
                  </Label>
                </div>

                {syncEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="cronSchedule">Cron Schedule</Label>
                    <Input
                      id="cronSchedule"
                      placeholder="0 2 * * *"
                      {...register("cronSchedule")}
                    />
                    <p className="text-muted-foreground text-sm">
                      Default: 0 2 * * * (daily at 2 AM UTC)
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="conflictStrategy">Conflict Strategy</Label>
                  <Select
                    defaultValue={connector.syncConfig.conflictStrategy}
                    onValueChange={(value: ConflictStrategy) =>
                      setValue("conflictStrategy", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="federation_wins">
                        Federation Wins
                      </SelectItem>
                      <SelectItem value="local_wins">Local Wins</SelectItem>
                      <SelectItem value="merge">Merge</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-sm">
                    How to resolve conflicts when data differs between local and
                    federation.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="templateId">
                    Import Template <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    defaultValue={connector.templateId}
                    onValueChange={(value) => setValue("templateId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template._id} value={template._id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.templateId && (
                    <p className="text-destructive text-sm">
                      Template is required
                    </p>
                  )}
                  <p className="text-muted-foreground text-sm">
                    Default import template for mapping federation data.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" disabled={isSubmitting} type="submit">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Connector"
                )}
              </Button>
              <Button
                className="flex-1"
                disabled={isSubmitting}
                onClick={() => setTestDialogOpen(true)}
                type="button"
                variant="secondary"
              >
                <TestTube2 className="mr-2 h-4 w-4" />
                Test Connection
              </Button>
              <Button
                className="flex-1"
                disabled={isSubmitting}
                onClick={() => router.push("/platform/connectors")}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>

        {/* Connection Test Dialog */}
        {connector && (
          <ConnectionTestDialog
            connectorId={connectorId}
            connectorName={connector.name}
            onOpenChange={setTestDialogOpen}
            open={testDialogOpen}
          />
        )}
      </div>
    </div>
  );
}
