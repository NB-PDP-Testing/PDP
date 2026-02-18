# ADR-VNM-018: SVG Pipeline Flow Graph Architecture

**Date:** 2026-02-17
**Status:** Accepted
**Context:** Phase M5, Story US-VNM-008

## Context and Problem Statement

The dashboard needs a visual representation of the 5-stage voice pipeline (Ingestion -> Transcription -> Claims -> Resolution -> Drafts) showing real-time counts per stage and color-coding for health status. The key decisions are: SVG vs Canvas vs HTML/CSS, static vs interactive, and how to handle responsive orientation change.

## Decision Drivers

- PRD specifies SVG with `viewBox="0 0 1200 300"` and `className="w-full h-auto"`
- Must show real-time counts from counter data
- Color-coding: green (normal), yellow (latency), red (failures)
- Responsive: horizontal on desktop/tablet, vertical on mobile
- No external charting libraries (CSS-based visualizations only per MAIN_CONTEXT.md)
- Future M8 requirement: click stage to navigate to pipeline detail

## Considered Options

### Option 1: Inline SVG with React Components

**Approach:** Render SVG directly in JSX using React components. Stage boxes are `<rect>` elements, labels are `<text>` elements, arrows are `<path>` or `<line>` elements. Color is computed from props.

**Pros:**
- Full React integration (props drive color, count, labels)
- No external dependencies
- SSR-compatible (inline SVG renders as HTML)
- Accessible (can add ARIA labels)
- Future-proof for click handlers (M8)

**Cons:**
- Manual SVG coordinate math
- Two variants needed (horizontal + vertical)

**Complexity:** Medium
**Performance:** Excellent (no library overhead)

### Option 2: HTML/CSS Flexbox with Styled Divs

**Approach:** Use HTML divs styled as boxes with CSS flexbox for layout, CSS arrows between stages.

**Pros:**
- Easier responsive layout (flexbox handles orientation)
- Standard DOM elements (easy styling)
- Single component for both orientations

**Cons:**
- CSS arrows are fragile and limited
- Less precise control over arrow positioning
- Less visually polished than SVG

**Complexity:** Low
**Performance:** Good

### Option 3: Canvas API

**Approach:** Use HTML `<canvas>` element with JavaScript drawing.

**Pros:**
- High performance for complex visualizations

**Cons:**
- Not SSR-compatible
- Not accessible
- Requires imperative drawing code
- Overkill for 5 boxes and 4 arrows

**Complexity:** High
**Performance:** Overkill

## Decision Outcome

**Chosen Option:** Option 1 -- Inline SVG with React Components

**Rationale:**
The PRD explicitly specifies SVG. Inline SVG in React provides the best combination of visual quality, React integration (dynamic colors/counts from props), accessibility, and future interactivity (click-to-navigate in M8). The coordination math is straightforward for 5 evenly-spaced boxes.

## Implementation Notes

### SVG Architecture

Two SVG variants rendered conditionally via Tailwind `hidden`/`block` classes:

**Desktop/Tablet (horizontal):**
- ViewBox: `0 0 1200 300`
- 5 rounded rectangles at x positions: 20, 250, 480, 710, 940 (each 200px wide, 100px tall)
- 4 arrow paths connecting stages
- Labels: stage name (top), count (center), status indicator (bottom)

**Mobile (vertical):**
- ViewBox: `0 0 300 900`
- 5 rounded rectangles at y positions: 20, 190, 360, 530, 700 (each 260px wide, 130px tall)
- 4 arrow paths connecting stages vertically
- Labels: same content, larger font

### Stage Configuration

```typescript
const PIPELINE_STAGES = [
  {
    id: "ingestion",
    label: "Ingestion",
    counterKey: "artifactsReceived1h",
    failKey: null, // Ingestion doesn't fail independently
  },
  {
    id: "transcription",
    label: "Transcription",
    counterKey: "transcriptionsCompleted1h",
    failKey: "artifactsFailed1h",
  },
  {
    id: "claims",
    label: "Claims",
    counterKey: "claimsExtracted1h",
    failKey: null,
  },
  {
    id: "resolution",
    label: "Resolution",
    counterKey: "entitiesResolved1h",
    failKey: null,
  },
  {
    id: "drafts",
    label: "Drafts",
    counterKey: "draftsGenerated1h",
    failKey: null,
  },
] as const;
```

### Color Logic

```typescript
function getStageColor(count: number, failCount: number): string {
  if (failCount > 0) return "#ef4444"; // Red: failures detected
  if (count === 0) return "#6b7280";   // Gray: no activity
  return "#22c55e";                     // Green: normal operation
}
```

For latency-based coloring (future enhancement with snapshot data):
- Green: latency <= baseline average
- Yellow: latency > baseline average (> 1.5x)
- Red: latency > 2x baseline OR failures detected

### Accessibility

```tsx
<svg
  viewBox="0 0 1200 300"
  className="w-full h-auto"
  role="img"
  aria-label="Voice pipeline flow showing 5 stages with real-time processing counts"
>
  <title>Pipeline Flow Graph</title>
  {/* Stage elements with aria-label on each group */}
</svg>
```

### Arrow Path Template

```tsx
// Horizontal arrow between stages
<path
  d={`M ${x1 + stageWidth} ${centerY} L ${x2} ${centerY}`}
  stroke="#94a3b8"
  strokeWidth="2"
  fill="none"
  markerEnd="url(#arrowhead)"
/>

// Arrowhead marker definition
<defs>
  <marker
    id="arrowhead"
    markerWidth="10"
    markerHeight="7"
    refX="10"
    refY="3.5"
    orient="auto"
  >
    <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
  </marker>
</defs>
```

### Click Handler (Prepared for M8)

```tsx
<g
  className="cursor-pointer"
  onClick={() => {
    // M8: router.push(`/platform/voice-monitoring/pipeline?stage=${stage.id}`)
    // M5: No-op, but structure supports future navigation
  }}
  role="button"
  tabIndex={0}
  aria-label={`${stage.label}: ${count} processed`}
>
  <rect ... />
  <text ...>{stage.label}</text>
  <text ...>{count}</text>
</g>
```

### Skeleton Loader

```tsx
function PipelineFlowGraphSkeleton() {
  return (
    <div className="flex items-center justify-center gap-4 py-8">
      {[1, 2, 3, 4, 5].map(i => (
        <Skeleton key={i} className="h-20 w-36 rounded-lg" />
      ))}
    </div>
  );
}
```

## Consequences

**Positive:**
- Clean SVG rendering with React props
- Accessible (ARIA labels, keyboard navigation)
- Future-proof for M8 click-to-navigate
- No external dependencies
- Responsive via CSS hidden/block toggle

**Negative:**
- Two SVG variants in DOM (one hidden, negligible overhead)
- Manual coordinate math for positioning

**Risks:**
- Text overflow at 375px width. Mitigation: Use abbreviated labels in vertical variant if needed.
- SVG not rendering in some email clients. Not relevant (dashboard is web-only).

## References

- PRD SVG spec: `scripts/ralph/prds/voice-monitor-harness/phases/PHASE_M5.json` (svgStructure)
- Counter data shape: `packages/backend/convex/models/voicePipelineMetrics.ts` getRealTimeMetrics
- No external charting: `scripts/ralph/prds/voice-monitor-harness/context/MAIN_CONTEXT.md`
