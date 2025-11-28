import { UserCheck, UserX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function RejectedUsersSection({
  rejectedUsers,
  isLoading,
}: {
  rejectedUsers?: Array<{
    _id: string;
    firstName?: string;
    name?: string;
    lastName?: string;
    email?: string;
  }>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!rejectedUsers || rejectedUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <UserCheck className="mb-3 h-12 w-12 text-muted-foreground/50" />
        <p className="font-medium text-muted-foreground">No rejected users</p>
        <p className="text-muted-foreground text-sm">
          All users have been processed appropriately
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rejectedUsers
        .slice(0, 5)
        .map(
          (user: {
            _id: string;
            firstName?: string;
            name?: string;
            lastName?: string;
            email?: string;
          }) => (
            <div
              className="flex items-center justify-between rounded-lg border p-3"
              key={user._id}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                  <UserX className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="font-medium">
                    {user.firstName || user.name} {user.lastName || ""}
                  </p>
                  <p className="text-muted-foreground text-sm">{user.email}</p>
                </div>
              </div>
              <span className="rounded-full bg-red-500/10 px-2 py-1 font-medium text-red-600 text-xs">
                Rejected
              </span>
            </div>
          )
        )}
    </div>
  );
}
