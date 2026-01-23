# Archive: Content Documentation

**Last Updated**: January 21, 2026
**Document Count**: 3 files
**Retention Policy**: Varies by document type (see below)

---

## Purpose

This directory contains archived content-related documentation including UI copy, messaging, email templates, and content guidelines. Active content lives in the application codebase.

**What's Here**: Historical content guidelines, messaging strategy, email template archives
**What's NOT Here**: Active UI copy (in application code), current email templates (in codebase)

---

## Retention Policy

### Content Guidelines: RETAIN (365 days)
Content guidelines and style guides retained for at least 1 year.

**Retention Criteria**:
- Documents content strategy or messaging approach
- Provides guidelines for consistent content creation
- Referenced by content creators or developers

**After 365 days**: Review for permanent retention or update
- KEEP if: Still actively referenced or part of brand guidelines
- UPDATE if: Content strategy has evolved
- DELETE if: Superseded by updated guidelines

---

### Email Template Archives: DELETE AFTER 180 DAYS
Archived email templates deleted 180 days after supersession.

**Rationale**:
- Templates superseded by updated versions in codebase
- Historical templates rarely needed for reference
- Active templates are the source of truth

**Exception**: Retain if template represents significant design milestone or A/B test baseline.

---

### Messaging Strategy: RETAIN (365 days)
Messaging strategy documents retained for at least 1 year.

**Retention Criteria**:
- Documents strategic approach to user communication
- Defines voice, tone, and messaging principles
- Referenced for maintaining consistency

**After 365 days**: Review for permanent retention (likely part of brand guidelines)

---

## Usage Guidelines

### For Developers
**Looking for current UI copy?** Check application code (components, pages) for active content.

**Looking for email templates?** Check codebase email/notification directories for current templates.

**Need messaging guidance?** This directory may contain content guidelines and messaging strategy documents.

### For Content Creators
**Creating new content?** Check this directory for any style guides or messaging strategy documents.

**Updating email templates?** Archive old versions here before deploying new versions (with 180-day retention).

### For AI Assistants (Claude Code)
**When creating content docs**:
1. Include: voice/tone guidelines, messaging principles, template structure
2. Omit: Actual production content (that lives in code)
3. Focus on: Strategy and guidelines, not specific copy

**Retention guidance**:
- Guidelines & strategy → RETAIN 365 days (reference value)
- Archived templates → DELETE after 180 days (superseded)
- Content audits → DELETE after 90 days (tactical analysis)

---

## Directory Structure

This small directory (3 files) likely contains:
- Content guidelines or style guide
- Email template archives
- Messaging strategy documentation

**Note**: Exact contents should be reviewed to determine specific retention policies for each file.

---

## Related Documentation

### Active Content (Not Archived)
- Application code (UI copy in components)
- Email notification templates (in codebase)
- Marketing website content (separate repository)

### Brand Guidelines (If Separate)
- Logo usage and brand identity
- Color palette and design system
- Typography and visual style

---

## Review Schedule

**Next Review**: April 21, 2026 (Quarterly)

**Review Criteria**:
1. Are any email template archives >180 days old? → DELETE if superseded
2. Are any content guidelines >365 days old? → UPDATE or DELETE if outdated
3. Are any messaging strategy docs >365 days old? → Review for permanent retention

**Review Owner**: System Architect / Content Lead

---

## Questions?

**Why archive content if it's in the code?**
- Preserves historical context for content strategy decisions
- Documents messaging evolution over time
- Provides reference for A/B testing or content experiments

**Should I create docs for every content update?**
- NO - routine copy changes don't need documentation
- YES - significant messaging strategy changes or template redesigns
- YES - A/B test results or content audits

**What's the difference between archived content and active content?**
- Active content → In application code, user-facing, current
- Archived content → Historical reference, superseded versions, strategy docs

---

**Archive Created**: Pre-2026 (exact date unknown)
**Last Cleanup**: Not yet performed (first cleanup scheduled April 21, 2026)
**Next Cleanup**: April 21, 2026
