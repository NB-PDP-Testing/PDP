"use client";

import { Clock, Mail, MailQuestion, RefreshCw, Timer, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

// Format relative time for display
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  const absDiff = Math.abs(diff);

  const minutes = Math.floor(absDiff / (1000 * 60));
  const hours = Math.floor(absDiff / (1000 * 60 * 60));
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));

  if (diff > 0) {
    // Future
    if (days > 0) {
      return `in ${days} day${days > 1 ? "s" : ""}`;
    }
    if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? "s" : ""}`;
    }
    return `in ${minutes} minute${minutes > 1 ? "s" : ""}`;
  }
  // Past
  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
}

export type Invitation = {
  _id: string;
  email: string;
  role?: string | null;
  expiresAt: number;
  createdAt?: number;
};

export type InvitationStatus = "active" | "expiring_soon" | "expired";

export type InvitationCardProps = {
  invitation: Invitation;
  isSelected: boolean;
  statusType: InvitationStatus;
  onSelect: (id: string) => void;
  onResend?: (id: string) => void;
  onCancel?: (id: string) => void;
  disabled?: boolean;
};

/**
 * InvitationCard - Displays an invitation with actions based on status
 *
 * Actions by status:
 * - active: Cancel only
 * - expiring_soon: Resend, Cancel
 * - expired: Resend only
 */
export function InvitationCard({
  invitation,
  isSelected,
  statusType,
  onSelect,
  onResend,
  onCancel,
  disabled = false,
}: InvitationCardProps) {
  const expiresAt = invitation.expiresAt;
  const now = Date.now();
  const isExpired = expiresAt < now;

  // Format role for display
  const formatRole = (role?: string | null) => {
    if (!role) {
      return "member";
    }
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Get role badge variant based on role
  const getRoleVariant = (
    role?: string | null
  ): "default" | "secondary" | "outline" => {
    switch (role) {
      case "owner":
      case "admin":
        return "default";
      case "coach":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card className={isSelected ? "border-primary" : ""}>
      <CardContent className="flex items-center gap-4 p-4">
        <Checkbox
          checked={isSelected}
          disabled={disabled}
          onCheckedChange={() => onSelect(invitation._id)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <span className="truncate font-medium">{invitation.email}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
            <Badge variant={getRoleVariant(invitation.role)}>
              {formatRole(invitation.role)}
            </Badge>
            <span className="flex items-center gap-1">
              <Timer className="size-3" />
              {isExpired ? "Expired" : "Expires"}{" "}
              {formatRelativeTime(expiresAt)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {statusType === "expired" ? (
            <Button
              disabled={disabled}
              onClick={() => onResend?.(invitation._id)}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="mr-1 size-4" />
              Resend
            </Button>
          ) : statusType === "expiring_soon" ? (
            <>
              <Button
                disabled={disabled}
                onClick={() => onResend?.(invitation._id)}
                size="sm"
                variant="outline"
              >
                <RefreshCw className="mr-1 size-4" />
                Resend
              </Button>
              <Button
                disabled={disabled}
                onClick={() => onCancel?.(invitation._id)}
                size="sm"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
            </>
          ) : (
            <Button
              disabled={disabled}
              onClick={() => onCancel?.(invitation._id)}
              size="sm"
              variant="ghost"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Request types
export type InvitationRequest = {
  _id: string;
  userEmail: string;
  requestedAt: number;
  requestNumber: number;
  originalInvitation?: {
    email: string;
    role?: string | null;
  } | null;
};

export type RequestCardProps = {
  request: InvitationRequest;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onApprove?: (id: string) => void;
  onDeny?: (id: string) => void;
  disabled?: boolean;
};

/**
 * RequestCard - Displays an invitation re-send request
 */
export function RequestCard({
  request,
  isSelected,
  onSelect,
  onApprove,
  onDeny,
  disabled = false,
}: RequestCardProps) {
  return (
    <Card className={isSelected ? "border-primary" : ""}>
      <CardContent className="flex items-center gap-4 p-4">
        <Checkbox
          checked={isSelected}
          disabled={disabled}
          onCheckedChange={() => onSelect(request._id)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <MailQuestion className="size-4 text-muted-foreground" />
            <span className="truncate font-medium">{request.userEmail}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
            <Badge variant="secondary">Request #{request.requestNumber}</Badge>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatRelativeTime(request.requestedAt)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={disabled}
            onClick={() => onApprove?.(request._id)}
            size="sm"
            variant="outline"
          >
            Approve
          </Button>
          <Button
            disabled={disabled}
            onClick={() => onDeny?.(request._id)}
            size="sm"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
