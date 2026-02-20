# ADR-VNM-027: Real-Time Update and Toast Notification Pattern

**Date:** 2026-02-17
**Status:** Accepted
**Context:** Phase M8, Story US-VNM-014

## Context and Problem Statement

The alerts page (US-VNM-014) needs real-time alert detection with toast notifications for new critical alerts. The PRD specifies: "Wire toast notifications for new alerts (real-time via useQuery)". Need a pattern that detects NEW alerts appearing in the Convex reactive query without false positives on initial load.

## Decision Drivers

- Convex `useQuery` is inherently real-time (subscriptions)
- Must distinguish initial load from new alerts arriving
- Must not toast on page load (only on NEW alerts while page is open)
- Toast library is sonner (already installed)
- Must not toast repeatedly for same alert

## Decision Outcome

### Pattern: useRef to track previous alert count + useEffect

```typescript
function AlertsPage() {
  const user = useCurrentUser();
  const isPlatformStaff = user?.isPlatformStaff === true;

  const activeAlerts = useQuery(
    api.models.voicePipelineAlerts.getActiveAlerts,
    isPlatformStaff ? {} : "skip"
  );

  // Track previous count to detect new alerts
  const prevAlertCount = useRef<number | null>(null);
  const initialLoadComplete = useRef(false);

  useEffect(() => {
    if (activeAlerts === undefined) return; // Still loading

    // Mark initial load as complete (don't toast on first render)
    if (!initialLoadComplete.current) {
      initialLoadComplete.current = true;
      prevAlertCount.current = activeAlerts.length;
      return;
    }

    // Detect new alerts
    if (prevAlertCount.current !== null && activeAlerts.length > prevAlertCount.current) {
      const newAlerts = activeAlerts.slice(0, activeAlerts.length - prevAlertCount.current);
      for (const alert of newAlerts) {
        if (alert.severity === "critical") {
          toast.error("Critical Pipeline Alert", {
            description: alert.message,
            duration: 10000, // Show for 10 seconds
          });
        } else if (alert.severity === "high") {
          toast.warning("Pipeline Alert", {
            description: alert.message,
            duration: 5000,
          });
        }
      }
    }

    prevAlertCount.current = activeAlerts.length;
  }, [activeAlerts]);
}
```

### Why useRef Instead of useState

- `useRef` does not trigger re-render when updated
- `prevAlertCount` is bookkeeping state, not display state
- `initialLoadComplete` flag prevents toast on page load
- Avoids render loops that `useState` + `useEffect` can cause

### Alternative Considered: Separate "new alerts since" Query

Could add a timestamp-based query: "alerts created after page load time". Rejected because:
- Adds an extra query subscription per page view
- Current pattern is simpler and works with existing data
- Alert volume is low (< 10 active at any time)

## Applicability

- **M8 Alerts Page:** Primary use case
- **M5 Overview (future):** Could add alert badge/toast to overview page
- **Layout tab badge:** Could show unread alert count on "Alerts" tab

## Implementation Notes

1. Import `toast` from `sonner` (already available in project)
2. Critical alerts: `toast.error()` with 10s duration
3. High alerts: `toast.warning()` with 5s duration
4. Medium/low alerts: no toast (visible in table only)
5. When user acknowledges an alert, count decreases -- this should NOT trigger toast
6. The `prevAlertCount.current` approach handles acknowledges correctly (count goes down, not up)
