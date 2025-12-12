# Marketing Site Branding Update Guide

## Quick Reference: PDP → PlayerArc Changes

To rebrand from "PDP" (Player Development Passport) to "PlayerArc", you'll need to edit the following files:

---

## 📍 PRIMARY FILES TO EDIT

### 1. **Site Metadata** (SEO & Browser Tab)
**File:** `apps/web/src/app/layout.tsx`
- Line 17: `title: "PDP - Player Development Passport"`
- Line 19: Description text

**Change to:**
```typescript
title: "PlayerArc - Youth Sports Development Platform",
description: "PlayerArc - A comprehensive digital ecosystem where parents and coaches collaborate to support and manage a child's sporting development.",
```

---

### 2. **Hero Section** (Main Landing Page)
**File:** `apps/web/src/components/landing/hero-section.tsx`
- Line 22: `alt="PDP Logo"` 
- Line 40: "PDP is the digital passport..."

**Change to:**
```tsx
alt="PlayerArc Logo"
...
PlayerArc is the digital passport that travels with players...
```

---

### 3. **Header/Navigation**
**File:** `apps/web/src/components/landing/floating-header.tsx`
- Line 66: `alt="PDP Logo"`
- Line 86: `{isScrolled ? "PDP" : "Player Development Portal"}`
- Line 88: `<span className="sm:hidden">PDP</span>`

**Change to:**
```tsx
alt="PlayerArc Logo"
...
{isScrolled ? "PlayerArc" : "PlayerArc"}
...
<span className="sm:hidden">PlayerArc</span>
```

---

### 4. **Footer**
**File:** `apps/web/src/components/landing/landing-footer.tsx`
- Line 62: "Player Development Passport"
- Line 67: "Player Development Passport — keeping young athletes..."
- Line 159: "© ... Player Development Passport..."

**Change to:**
```tsx
PlayerArc
...
PlayerArc — keeping young athletes engaged, healthy, and in love with their sport.
...
© {new Date().getFullYear()} PlayerArc. As many as possible, for as long as possible.
```

---

### 5. **Solution Section**
**File:** `apps/web/src/components/landing/solution-section.tsx`
- Line 70: `alt="Player Development Passport"`

**Search for any other references and update**

---

### 6. **Other Landing Components**
Check these files for "PDP" or "Player Development Passport":
- `apps/web/src/components/landing/sports-showcase.tsx`
- `apps/web/src/components/landing/final-cta-section.tsx`
- `apps/web/src/components/landing/testimonials-section.tsx`

---

## 📝 BLOG CONTENT

### 7. **Blog Posts Data**
**File:** `apps/web/src/data/blog-posts.ts`

Search for "Player Development Passport" and "PDP" throughout this file and replace with "PlayerArc"

Key lines to update:
- Line 973: "Player Development Passport approach"
- Line 1093: "The Player Development Passport directly tackles..."
- Line 1349: "The Player Development Passport addresses..."
- Line 1665: "The Player Development Passport includes..."

---

## 🔐 AUTH PAGES (Optional - if you want consistency)

### 8. **Sign-In Form**
**File:** `apps/web/src/components/sign-in-form.tsx`
- Line 118: "Player Development Passport System"
- Line 138: "Player Development Passport (PDP) is..."

### 9. **Sign-Up Form**
**File:** `apps/web/src/components/sign-up-form.tsx`
- Line 105: "Player Development Passport System"
- Line 125: "Player Development Passport (PDP) is..."

---

## 🖼️ LOGO FILES

### 10. **Update Logo Files** (if needed)

Current logo paths referenced:
- `/logos-landing/PDP-Logo-OffWhiteOrbit_GreenHuman.png`
- `/logos-landing/PDP-Logo-NavyOrbit_GreenHuman.png`
- `/logos/icon.png`

**Location:** `apps/web/public/logos-landing/`

Options:
1. Keep existing PDP logo files (they're just filenames)
2. Create new PlayerArc logo files and update references
3. Rename files to `PlayerArc-Logo-*` and update all image src references

---

## 🔍 SEARCH & REPLACE STRATEGY

### Method 1: Manual Find & Replace
1. Open each file listed above
2. Use CMD+F (Mac) or CTRL+F (Windows) to find:
   - "PDP"
   - "Player Development Passport"
   - "Player Development Portal"
3. Replace with appropriate PlayerArc text

### Method 2: Global Find & Replace (Be Careful!)
```bash
# From the project root
cd apps/web

# Find all instances (check first!)
grep -r "PDP" src/

# Find "Player Development Passport"
grep -r "Player Development Passport" src/
```

**⚠️ WARNING:** Global find/replace can break things! Recommended to:
1. Commit current changes to git first
2. Do manual replacements in the key files listed above
3. Test the site after each major file change

---

## ✅ TESTING CHECKLIST

After making changes, verify:

- [ ] Browser tab title shows "PlayerArc"
- [ ] Logo alt text is correct
- [ ] Header navigation shows "PlayerArc"
- [ ] Hero section mentions "PlayerArc"
- [ ] Footer copyright mentions "PlayerArc"
- [ ] No broken references to "PDP" in visible text
- [ ] Login/signup pages updated (if desired)
- [ ] Blog posts updated (if desired)
- [ ] All images load correctly
- [ ] No console errors

---

## 🚀 DEPLOYMENT

After updating:

```bash
# From project root
npm run build

# Check for build errors
# Deploy to Vercel or your hosting platform
```

---

## 📊 PRIORITY ORDER

1. **CRITICAL** (Visible on landing page):
   - layout.tsx (metadata)
   - hero-section.tsx
   - floating-header.tsx
   - landing-footer.tsx

2. **HIGH** (User-facing):
   - solution-section.tsx
   - Other landing components

3. **MEDIUM** (Content):
   - blog-posts.ts

4. **LOW** (Internal/Auth pages):
   - sign-in-form.tsx
   - sign-up-form.tsx

---

## 💡 ADDITIONAL CONSIDERATIONS

### Transitional Messaging
If you want to maintain some connection to "PDP", consider:
- "PlayerArc (formerly PDP)"
- "PlayerArc - Your Player Development Platform"
- Keep "Player Development Passport" as a tagline

### SEO Impact
Changing the brand name will affect:
- Search engine rankings (temporary)
- Existing bookmarks
- Social media shares
- Backlinks

Consider:
- 301 redirects if changing domain
- Updating social media profiles
- Notifying existing users
- Press release about rebrand

---

## 🎨 SUGGESTED TAGLINES

Since "PlayerArc" doesn't immediately convey the concept, consider adding a tagline:

- "PlayerArc - The Digital Passport for Youth Sports"
- "PlayerArc - Track Every Step of Their Journey"
- "PlayerArc - Youth Sports Development Platform"
- "PlayerArc - Where Young Athletes Thrive"

Update in:
- `floating-header.tsx` (line 86)
- `hero-section.tsx` (main description)
- `layout.tsx` (metadata description)

