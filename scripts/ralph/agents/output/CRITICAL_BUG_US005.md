# 🔥🔥🔥 CRITICAL BUG - MUST FIX IMMEDIATELY 🔥🔥🔥

## US-005 TabNotificationProvider is BROKEN

**File**: `apps/web/src/providers/tab-notification-provider.tsx`

**Current Code (WRONG)**:
```typescript
const unreadCount = useQuery(
  api.models.coachParentSummaries.getParentUnreadCount,
  { organizationId: orgId }
);
```

**This will CRASH for coaches/admins!** The query expects parent-only access.

**REQUIRED FIX**:
```typescript
import { useSession } from "@/lib/auth-client";

export function TabNotificationProvider({ children, orgId }: TabNotificationProviderProps) {
  const session = useSession();
  const isParent = session.data?.user?.currentMembership?.activeFunctionalRole === 'parent';
  
  const unreadCount = useQuery(
    api.models.coachParentSummaries.getParentUnreadCount,
    isParent ? { organizationId: orgId } : "skip"
  );
  
  useTabNotification(unreadCount ?? 0);
  return <>{children}</>;
}
```

**STOP working on new stories and FIX THIS NOW!**
