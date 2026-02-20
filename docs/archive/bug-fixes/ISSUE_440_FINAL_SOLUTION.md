# Issue #440: Offline Indicator Fix - Final Solution

## Problem Summary

The offline indicator was showing false warnings even when:
- Internet connection was working
- PlayerARC site was fully functional
- Convex backend was connected

## Root Causes Discovered

### 1. Browser API Unreliability
`navigator.onLine` was returning `false` incorrectly in some browsers (Chrome/Firefox) while Safari worked fine. This is a known browser API limitation that doesn't reflect actual internet connectivity.

### 2. Incorrect Convex Connection State Access
Initial attempts to access Convex connection state via internal APIs (`convex?.sync?.connectionState?.()?.state`) returned `undefined` because:
- The internal API path was incorrect or unavailable
- Not the documented way to access connection state

## Solution Evolution

### Attempt 1: Hybrid navigator.onLine + Convex (Failed)
```typescript
const connected = browserOnline && convexConnected; // AND logic
```
**Problem:** `navigator.onLine` false positives caused offline warnings

### Attempt 2: Prioritize Convex with Browser Fallback (Failed)
```typescript
if (convex === "Connected") → online
if (convex === undefined) → use navigator.onLine
```
**Problem:** `connectionState` always returned `undefined`, fell back to broken `navigator.onLine`

### Attempt 3: HealthCheck Query (Works but not best practice)
```typescript
const healthCheck = useQuery(api.healthCheck.get);
const connected = healthCheck !== undefined;
```
**Problem:** Extra query overhead, not the documented Convex way

### ✅ Final Solution: Official Convex Connection State API

Used the proper Convex API as documented:

```typescript
import { useConvex } from "convex/react";

export function useOnlineStatus() {
  const convex = useConvex();
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!convex) {
      return;
    }

    // Official Convex API - subscribe to connection state changes
    const unsubscribe = convex.subscribeToConnectionState((state) => {
      const connected = state.isWebSocketConnected;

      // Track reconnection for "back online" message
      if (connected && !isOnline) {
        setWasOffline(true);
        setTimeout(() => setWasOffline(false), 5000);
      }

      setIsOnline(connected);
    });

    // Get initial state
    const initialState = convex.connectionState();
    setIsOnline(initialState.isWebSocketConnected);

    return () => unsubscribe();
  }, [convex, isOnline]);

  return { isOnline, wasOffline };
}
```

## Why This Works

1. **Uses Official API**: `client.subscribeToConnectionState()` as documented by Convex
2. **Real-time Updates**: Callback fires whenever connection state changes
3. **Checks WebSocket**: `state.isWebSocketConnected` directly reflects backend connectivity
4. **Ignores navigator.onLine**: No reliance on unreliable browser API
5. **No Query Overhead**: Doesn't waste resources with connectivity-check queries

## Implementation Details

### File Modified
- `apps/web/src/components/polish/offline-indicator.tsx`

### Key API Methods Used
- `convex.connectionState()` - Get current connection state
- `convex.subscribeToConnectionState(callback)` - Subscribe to state changes
- `state.isWebSocketConnected` - Boolean indicating WebSocket connection status

### Browser Compatibility
- ✅ Works in Chrome (where navigator.onLine fails)
- ✅ Works in Firefox
- ✅ Works in Safari
- ✅ Consistent behavior across all browsers

## Testing

### Test Cases
1. **Normal usage**: No false offline warnings with working internet ✅
2. **WiFi toggle**: Turn WiFi off → shows offline ✅
3. **Airplane mode**: Enable airplane mode → shows offline ✅
4. **Convex backend down**: Backend unreachable → shows offline ✅
5. **Reconnection**: Shows "You're back online!" message briefly ✅

### Console Verification
Open browser console and look for:
```javascript
[Offline Indicator v5 - Official API] {
  connectionState: {...},
  isWebSocketConnected: true,
  timestamp: "..."
}
```

If `isWebSocketConnected: true`, the app is properly connected.

## Documentation References

- [Convex ConvexReactClient API](https://docs.convex.dev/api/classes/react.ConvexReactClient)
- [Convex React Client Guide](https://docs.convex.dev/client/react)
- [Implementing Presence with Convex](https://stack.convex.dev/presence-with-convex)

## Commits

1. `56b497f8` - Initial hybrid approach (navigator.onLine + Convex)
2. `6f862bb8` - Tried Convex-only with fallback logic
3. `3e81fc00` - Option 2: Prioritize Convex with browser fallback
4. `457b1f7f` - Added verbose debug logging
5. `00cd384d` - Assumed online when connectionState undefined
6. `54525878` - Tried healthCheck query approach
7. `19120c9f` - **Final solution: Official Convex subscribeToConnectionState API**

## Related

- PR #441 - Initial fix attempt
- Branch: Multiple iterations on `main`
- Issue: #440

## Lessons Learned

1. **Always check official documentation first** - Using internal APIs leads to brittleness
2. **Browser APIs can be unreliable** - `navigator.onLine` has known false positive issues
3. **Test across browsers** - Safari worked while Chrome failed with same code
4. **Ask "is this best practice?"** - Led to discovering the proper Convex API
5. **Debug with version markers** - Helped confirm which code version was running

## Date

2026-02-04

## Status

✅ **RESOLVED** - Using official Convex connection state API
