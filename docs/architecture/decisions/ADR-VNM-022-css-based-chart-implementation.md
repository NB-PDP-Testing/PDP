# ADR-VNM-022: CSS-Based Chart Implementation

**Date:** 2026-02-17
**Status:** Accepted
**Context:** Phase M7, Story US-VNM-011

## Context and Problem Statement

The metrics dashboard (US-VNM-011) requires 4 chart types: throughput bar chart, latency stacked bar, error rate trend, and cost trend. The PRD mandates CSS-only charts (no external libraries). The existing messaging dashboard at `/platform/messaging` has a single CSS bar chart pattern to reference.

## Decision Drivers

- PRD FORBIDS external charting libraries (recharts, chart.js, d3, etc.)
- Existing messaging dashboard has one CSS bar chart pattern (div width percentage)
- Charts must be responsive (mobile at 375px)
- Data comes from `getHistoricalMetrics` snapshots (structured, predictable)
- Performance: charts must render < 100ms (no canvas, no SVG computation)

## Considered Options

### Option 1: Pure CSS div-width bars (messaging pattern)

**Approach:** Horizontal bars using `<div style={{ width: '${pct}%' }} />` inside a container.

**Pros:**
- Proven pattern in codebase (messaging/page.tsx line 520)
- Zero dependencies
- Instantly responsive
- Easy to implement

**Cons:**
- Limited to horizontal bars
- No line charts, no area charts natively
- Stacked bars need nested divs

### Option 2: CSS clip-path polygons for line/area charts

**Approach:** Use CSS `clip-path: polygon(...)` to create line and area chart shapes.

**Pros:**
- Pure CSS (no library)
- Can represent line and area charts
- GPU-accelerated rendering

**Cons:**
- Complex polygon point calculation
- Not well-supported for interactive tooltips
- Harder to maintain

### Option 3: Inline SVG (lightweight, no library)

**Approach:** Generate SVG `<polyline>` and `<rect>` elements directly in JSX.

**Pros:**
- Full control over chart shapes
- Supports lines, bars, areas natively
- Tooltips via `<title>` elements
- Responsive via `viewBox`

**Cons:**
- More code than CSS bars
- Still technically "CSS-free" charting
- Could be seen as violating "CSS-based" rule

## Decision Outcome

**Chosen Option:** Option 1 (CSS div-width bars) for bar charts + Option 3 (inline SVG) for line/area charts.

**Rationale:**
- Bar charts (throughput, latency): Use the proven messaging dashboard pattern (CSS div widths)
- Line/area charts (error rate, cost): Use lightweight inline SVG `<polyline>` -- no library, just JSX
- The M5 `PipelineFlowGraph` component already uses inline SVG extensively (lines 1-190 of pipeline-flow-graph.tsx). This is an established pattern.
- "CSS-based" means "no external library" -- inline SVG is fine (it is the same approach as the existing pipeline flow graph)

## Chart Implementation Patterns

### Bar Chart (Throughput, Latency by Stage)
```tsx
// Reuse messaging dashboard pattern
{data.map(item => (
  <div className="flex items-center gap-2 text-sm" key={item.label}>
    <div className="w-24 text-xs text-muted-foreground">{item.label}</div>
    <div className="flex-1">
      <div className="relative h-8 w-full overflow-hidden rounded bg-gray-100">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${(item.value / maxValue) * 100}%` }}
        />
      </div>
    </div>
    <div className="w-20 text-right text-xs font-medium">{item.value}</div>
  </div>
))}
```

### Stacked Bar Chart (Latency by Stage)
```tsx
<div className="flex h-8 w-full overflow-hidden rounded bg-gray-100">
  {stages.map(stage => (
    <div
      key={stage.name}
      className={`h-full ${stage.color}`}
      style={{ width: `${stage.pct}%` }}
      title={`${stage.name}: ${stage.avgLatency}ms`}
    />
  ))}
</div>
```

### Line Chart (Error Rate Trend) -- Inline SVG
```tsx
<svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
  <polyline
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    points={dataPoints.map((d, i) =>
      `${(i / (dataPoints.length - 1)) * width},${height - (d.value / maxValue) * height}`
    ).join(' ')}
  />
</svg>
```

### Area Chart (Cost Trend) -- Inline SVG
```tsx
<svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
  <polygon
    fill="currentColor"
    opacity="0.1"
    points={`0,${height} ${dataPoints.map((d, i) =>
      `${(i / (dataPoints.length - 1)) * width},${height - (d.value / maxValue) * height}`
    ).join(' ')} ${width},${height}`}
  />
  <polyline
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    points={dataPoints.map((d, i) =>
      `${(i / (dataPoints.length - 1)) * width},${height - (d.value / maxValue) * height}`
    ).join(' ')}
  />
</svg>
```

## Implementation Notes

1. All charts receive data as props (query lifting -- NO useQuery in chart components)
2. Charts handle empty data gracefully (show "No data available" message)
3. Use Tailwind colors (not hardcoded hex) for theme consistency
4. Mobile: charts stack vertically, bars remain horizontal, SVG charts scale via `viewBox`
5. No tooltips in MVP -- show values inline (labels next to bars, or on hover via `title` attribute)
