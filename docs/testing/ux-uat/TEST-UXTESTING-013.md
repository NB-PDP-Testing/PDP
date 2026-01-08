# TEST-UXTESTING-013: Phase 13 - Performance

## Test Objective
Verify performance optimizations including lazy loading, Web Vitals, deferred rendering, and resource hints.

## Prerequisites
- [ ] Development environment running (`npm run dev`)
- [ ] Feature flags enabled in PostHog:
  - `ux_lazy_components` = true
  - `ux_web_vitals` = true
  - `ux_deferred_render` = true
  - `ux_resource_hints` = true
- [ ] Chrome DevTools Performance panel
- [ ] Lighthouse CLI or DevTools

## Test Steps

### Step 1: Web Vitals Baseline
Run initial Lighthouse audit:

```bash
npx lighthouse http://localhost:3000 --view
```

**Target Metrics:**
| Metric | Target | Actual |
|--------|--------|--------|
| LCP (Largest Contentful Paint) | < 2.5s | ___s |
| FID (First Input Delay) | < 100ms | ___ms |
| CLS (Cumulative Layout Shift) | < 0.1 | ___ |
| FCP (First Contentful Paint) | < 1.8s | ___s |
| TTFB (Time to First Byte) | < 800ms | ___ms |
| Performance Score | > 90 | ___ |

### Step 2: Lazy Loading Components
**Enable:** `ux_lazy_components` = true

1. Open DevTools > Network
2. Navigate to a page with lazy components
3. Scroll down to trigger lazy loads

**Verification:**
- [ ] Initial page load has fewer JS chunks
- [ ] Components load only when visible
- [ ] Placeholder/skeleton shows while loading
- [ ] No layout shift when component loads
- [ ] Network shows additional chunks on scroll

### Step 3: Component Preloading
Test preload on hover:

1. Hover over a navigation link
2. Check Network for preload activity

**Verification:**
- [ ] Components preload on hover
- [ ] No visible delay when clicking
- [ ] Network shows prefetch requests
- [ ] Actual navigation is fast

### Step 4: Lazy Images
**Enable:** `ux_lazy_components` = true

1. Navigate to a page with many images
2. Scroll slowly through the page

**Verification:**
- [ ] Images above fold load immediately
- [ ] Images below fold load on scroll
- [ ] Placeholder shows before load
- [ ] No layout shift on image load
- [ ] `loading="lazy"` in img tags

### Step 5: Deferred Rendering
**Enable:** `ux_deferred_render` = true

1. Navigate to dashboard
2. Check rendering order in Performance tab

**Verification:**
- [ ] Critical content renders first
- [ ] Non-critical widgets render later
- [ ] User can interact immediately
- [ ] No blocking of main thread

### Step 6: Idle Rendering
Check components that render during idle:

1. Open DevTools > Performance
2. Record page load
3. Look for idle callback usage

**Verification:**
- [ ] Heavy components defer to idle
- [ ] Main thread not blocked
- [ ] requestIdleCallback used
- [ ] Smooth initial render

### Step 7: Resource Hints
**Enable:** `ux_resource_hints` = true

1. Check page source or DevTools > Elements
2. Look in `<head>` for resource hints

**Verification:**
- [ ] `<link rel="preconnect">` for API domain
- [ ] `<link rel="dns-prefetch">` for CDN
- [ ] `<link rel="prefetch">` for likely next pages
- [ ] Hints load early in document

### Step 8: Long Task Monitoring
Enable long task tracking:

1. Open DevTools > Performance
2. Record user interaction
3. Check for long tasks (> 50ms)

**Verification:**
- [ ] No long tasks > 100ms during interaction
- [ ] Input responsiveness maintained
- [ ] Scroll is smooth (60fps)
- [ ] Long tasks logged to analytics

### Step 9: Bundle Size Analysis
Run bundle analyzer:

```bash
cd apps/web
ANALYZE=true npm run build
```

**Verification:**
- [ ] Main bundle < 200KB gzipped
- [ ] No duplicate dependencies
- [ ] Large libs are code-split
- [ ] Tree shaking working

### Step 10: Performance on Slow Connection
Test with throttling:

1. DevTools > Network > Slow 3G
2. Navigate through app

**Verification:**
- [ ] App still usable on slow connection
- [ ] Critical content loads first
- [ ] Loading indicators show
- [ ] No timeout errors

## Performance Measurement Script
```javascript
// Log Web Vitals to console
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.value}`);
  }
}).observe({ type: 'web-vitals', buffered: true });

// Check for long tasks
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn(`Long task: ${entry.duration}ms`);
    }
  }
}).observe({ type: 'longtask' });
```

## Lighthouse Audit Commands
```bash
# Full audit
npx lighthouse http://localhost:3000 --view

# Performance only
npx lighthouse http://localhost:3000 --only-categories=performance --view

# Mobile simulation
npx lighthouse http://localhost:3000 --emulated-form-factor=mobile --view

# JSON output for CI
npx lighthouse http://localhost:3000 --output=json --output-path=./report.json
```

## Verification Checklist
- [ ] Lighthouse Performance > 90
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Lazy loading works
- [ ] Preloading works
- [ ] Images lazy load
- [ ] Deferred rendering works
- [ ] Resource hints present
- [ ] No long tasks > 100ms
- [ ] Bundle size acceptable
- [ ] Works on slow connection

## Analytics Events to Verify
Check PostHog for these events:
- [ ] `WEB_VITALS_REPORTED` with metrics
- [ ] `LAZY_COMPONENT_LOADED` with component name
- [ ] `LONG_TASK_DETECTED` with duration
- [ ] `RESOURCE_PRELOADED` with URL
- [ ] `PERFORMANCE_MARK` with mark name

## Devices Tested
| Device | Connection | Score | Result |
|--------|------------|-------|--------|
| Desktop | Fast | ___ | ⬜ Pass / ⬜ Fail |
| Desktop | Slow 3G | ___ | ⬜ Pass / ⬜ Fail |
| Mobile (emulated) | 4G | ___ | ⬜ Pass / ⬜ Fail |
| Mobile (emulated) | 3G | ___ | ⬜ Pass / ⬜ Fail |

## Test Result
- [ ] **PASS** - Lighthouse > 90, all metrics green
- [ ] **FAIL** - Issues found (document below)

## Performance Issues Found
<!-- Document any performance issues -->
| Issue | Metric Impact | Priority |
|-------|--------------|----------|
| | | |

## Sign-off
- **Tester:** 
- **Date:** 
- **Build/Commit:**