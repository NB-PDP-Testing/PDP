# Blog Post Format Guide

## Where to Add New Posts

**File:** `apps/web/src/data/blog-posts.ts`

**Location:** Add new posts inside the `blogPosts` array, **before the closing bracket** `];` (around line 2094)

## Required Format

Each blog post must follow this TypeScript object structure:

```typescript
{
  slug: "unique-url-slug",
  title: "Post Title Here",
  excerpt: "Short description (1-2 sentences) that appears in listings",
  content: `# Markdown Content Here
  
Full article content in Markdown format...

## Headings
- Bullet points
- More content
`,
  date: "YYYY-MM-DD", // Format: "2025-01-21" (use future dates for new posts)
  category: "Research" | "Player Development" | "Technology" | "Well-being" | "Multi-Sport Benefits",
  image: "https://images.unsplash.com/photo-XXXXX?auto=format&fit=crop&q=80&w=800", // Or "/blog-images/filename.jpg"
  author: "PDP Research Team", // Or specific author name
  readTime: 8, // Estimated minutes to read
  tags: [
    "tag1",
    "tag2",
    "tag3",
    // 3-5 relevant tags
  ],
},
```

## Example Post Structure

```typescript
{
  slug: "example-new-post",
  title: "Example: New Research Findings",
  excerpt:
    "This is a brief summary that appears in blog listings and search results. Keep it to 1-2 sentences.",
  content: `# Example: New Research Findings

## Introduction

Your full article content goes here in Markdown format.

### Subheadings Work Too

- Bullet points
- More content
- **Bold text** for emphasis

## Conclusion

Wrap up your article here.
`,
  date: "2025-01-21", // Use a date after the most recent post
  category: "Research",
  image: "https://images.unsplash.com/photo-1234567890?auto=format&fit=crop&q=80&w=800",
  author: "PDP Research Team",
  readTime: 10,
  tags: [
    "research",
    "youth sports",
    "player development",
    "statistics",
  ],
},
```

## Important Notes

### 1. **Slug Format**
- Must be unique (no duplicates)
- Use lowercase, hyphens for spaces
- Example: `"age-appropriate-training-guidelines"`

### 2. **Date Format**
- Use `"YYYY-MM-DD"` format
- For new posts, use dates **after** the most recent existing post
- Current most recent: Check the last post in the array
- Example: `"2025-01-21"`, `"2025-01-22"`, etc.

### 3. **Category**
- Must be one of these exact values:
  - `"Research"`
  - `"Player Development"`
  - `"Technology"`
  - `"Well-being"` (note the hyphen)
  - `"Multi-Sport Benefits"`

### 4. **Image**
- Use Unsplash URLs: `"https://images.unsplash.com/photo-XXXXX?auto=format&fit=crop&q=80&w=800"`
- Or local images: `"/blog-images/filename.jpg"`
- Images must be relevant to the post content

### 5. **Content (Markdown)**
- Use Markdown syntax
- Headings: `# H1`, `## H2`, `### H3`
- Bold: `**text**`
- Lists: `- item` or `1. item`
- Links: `[text](url)`
- Code blocks: Use triple backticks

### 6. **Tags**
- 3-5 relevant tags
- Lowercase, descriptive
- Examples: `"youth sports"`, `"coach-parent communication"`, `"burnout prevention"`

### 7. **Read Time**
- Estimate based on word count
- Roughly 200-250 words per minute
- Round to nearest whole number

## Format for Perplexity

When asking Perplexity to generate posts, request:

**"Generate blog posts in this exact JSON format:"**

```json
{
  "slug": "unique-url-slug",
  "title": "Post Title",
  "excerpt": "1-2 sentence summary",
  "content": "# Markdown content here...",
  "date": "2025-01-21",
  "category": "Research",
  "image": "Unsplash URL or description",
  "author": "PDP Research Team",
  "readTime": 8,
  "tags": ["tag1", "tag2", "tag3"]
}
```

Then convert the JSON to TypeScript format (remove quotes from keys, ensure proper formatting).

## Adding Posts to the File

1. Open `apps/web/src/data/blog-posts.ts`
2. Find the last post in the `blogPosts` array (before line 2094)
3. Add a comma after the last post's closing brace `},`
4. Paste your new post object
5. Ensure proper comma placement (comma after each post except the last)
6. Save the file

## Verification Checklist

- [ ] Slug is unique
- [ ] Date is after the most recent post
- [ ] Category matches one of the allowed values exactly
- [ ] Image URL is valid or local path exists
- [ ] Content is valid Markdown
- [ ] Tags are lowercase and relevant
- [ ] Read time is reasonable
- [ ] Comma placement is correct (comma after each post)
- [ ] No syntax errors

## Current Post Count

Check the `blogPosts` array length to see how many posts exist. New posts will automatically appear in:
- Blog listing page (`/blog`)
- Blog detail pages
- Related posts sections
- Category filters
- "View All Research" section

