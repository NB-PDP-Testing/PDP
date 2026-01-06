# Blog Post Detail Page & Research Content Engagement Plan

## Current State

### Existing Features
- ✅ Blog post detail page at `/blog/[slug]`
- ✅ Blog listing page at `/blog` with search and category filters
- ✅ Related posts section (shows 3 recent posts)
- ✅ Basic navigation (back to blog)
- ✅ Markdown content rendering
- ✅ Meta information (date, read time, author, tags)

### Current Limitations
- Related posts are just "recent" - not truly related by category/tags
- No category-specific navigation
- No "View All Research" section at bottom
- No way to browse by category from detail page
- Limited engagement options

## Proposed Enhancements

### 1. Enhanced Related Posts Section
**Location:** After article content, before "View All Research"

**Features:**
- Show posts from the **same category** first
- Then show posts with **shared tags**
- Limit to 3-4 posts total
- Better visual presentation with excerpts

**Implementation:**
```typescript
// New helper function needed
export function getRelatedPosts(
  currentPost: BlogPost,
  limit = 3
): BlogPost[] {
  // 1. Get posts from same category (excluding current)
  const sameCategory = blogPosts
    .filter(p => p.category === currentPost.category && p.slug !== currentPost.slug)
    .slice(0, limit);
  
  // 2. If not enough, add posts with shared tags
  if (sameCategory.length < limit) {
    const sharedTags = blogPosts
      .filter(p => 
        p.slug !== currentPost.slug && 
        !sameCategory.some(sp => sp.slug === p.slug) &&
        p.tags.some(tag => currentPost.tags.includes(tag))
      )
      .slice(0, limit - sameCategory.length);
    
    return [...sameCategory, ...sharedTags];
  }
  
  return sameCategory;
}
```

### 2. "More in [Category]" Section
**Location:** After related posts

**Features:**
- Show all posts in the same category (excluding current post)
- Grid layout (3 columns on desktop)
- "View All [Category]" button linking to `/blog?category=[category]`
- Category badge/header

**Example:**
```
More in Research
[Grid of Research posts]
[View All Research Posts →]
```

### 3. "View All Research" CTA Section
**Location:** At the very bottom of the page

**Features:**
- Prominent call-out box
- Featured research posts (maybe 6-8 posts)
- Organized by category tabs or sections
- "Explore All Research" button linking to `/blog`
- Statistics: "X research articles available"

**Design:**
- Similar to landing page blog section
- But more comprehensive
- Maybe show category breakdown

### 4. Category Navigation
**Location:** Sidebar or after article content

**Features:**
- Quick links to browse by category
- Show post count per category
- Active category highlighted

### 5. Post Navigation (Next/Previous)
**Location:** After article content, before related posts

**Features:**
- Previous post (same category if possible)
- Next post (same category if possible)
- Or chronological navigation
- Show thumbnail + title

## User Flow

### Current Flow
1. User clicks post from landing page or blog listing
2. Reads article
3. Sees 3 "related" posts (just recent)
4. Can go back to blog listing

### Enhanced Flow
1. User clicks post from landing page or blog listing
2. Reads article
3. **Sees "More in [Category]" section** - can explore category
4. **Sees truly related posts** (same category + shared tags)
5. **Sees category navigation** - can browse other categories
6. **Sees "View All Research" section** at bottom with:
   - Featured research posts
   - Category breakdown
   - Statistics
   - CTA to explore all research
7. Can navigate to:
   - Related posts
   - Category pages
   - Full blog listing
   - Next/previous posts

## Implementation Plan

### Phase 1: Core Enhancements
1. ✅ Add `getRelatedPosts()` helper function
2. ✅ Update related posts section to use new function
3. ✅ Add "More in [Category]" section
4. ✅ Add "View All Research" CTA section at bottom

### Phase 2: Navigation Enhancements
5. ✅ Add next/previous post navigation
6. ✅ Add category quick links
7. ✅ Improve back navigation (remember filters?)

### Phase 3: Polish
8. ✅ Add loading states
9. ✅ Add smooth scroll to sections
10. ✅ Optimize images
11. ✅ Add reading progress indicator (optional)

## Component Structure

```
/blog/[slug]/page.tsx
├── Header Image (existing)
├── Back Button (existing)
├── Article Content (existing)
├── Post Navigation (NEW)
│   ├── Previous Post
│   └── Next Post
├── Related Posts (ENHANCED)
│   └── Same category + shared tags
├── More in [Category] (NEW)
│   └── Grid of category posts
│   └── View All [Category] button
└── View All Research CTA (NEW)
    ├── Featured Research Posts
    ├── Category Breakdown
    ├── Statistics
    └── Explore All Research button
```

## Data Requirements

### New Helper Functions Needed
1. `getRelatedPosts(currentPost, limit)` - Related by category + tags
2. `getPostsByCategory(category)` - Already exists ✅
3. `getNextPost(currentPost)` - Next chronological post
4. `getPreviousPost(currentPost)` - Previous chronological post
5. `getCategoryStats()` - Post counts per category

## Design Considerations

### "View All Research" Section
- Should be prominent but not overwhelming
- Use similar styling to landing page blog section
- Maybe use a gradient background
- Include statistics: "12 Research Articles • 5 Categories"
- Show featured posts in grid (2x3 or 3x2)

### Category Navigation
- Could be a sidebar on desktop
- Or horizontal tabs below article
- Show post counts: "Research (5)" "Player Development (3)"

### Related Posts
- Keep current card design
- Add excerpt preview
- Show category badge
- Hover effects

## Content Strategy

### For 8-10 Additional Posts
**Suggested Categories Distribution:**
- Research: 3-4 posts
- Player Development: 2-3 posts
- Technology: 1-2 posts
- Well-being: 1-2 posts
- Multi-Sport Benefits: 1 post

**Topics to Consider:**
- Age-appropriate training guidelines
- Parent-coach partnership best practices
- Technology ROI case studies
- Mental health in youth sports
- Long-term athlete development frameworks
- Injury prevention strategies
- Performance analytics deep-dive
- Multi-sport scheduling strategies

## Next Steps

1. **Review this plan** - Confirm approach
2. **Implement Phase 1** - Core enhancements
3. **Add new posts** - When Perplexity generates them
4. **Test user flow** - Ensure smooth navigation
5. **Polish and optimize** - Performance and UX

