## WhatsApp Voice Notes - Testing Documentation

### Test Files Location

| Type | File Path | Count |
|------|-----------|-------|
| **UAT Test Plan** | `docs/testing/whatsapp-voice-notes-uat.md` | 52 scenarios |
| **Unit Tests** | `packages/backend/convex/__tests__/whatsapp-voice-notes.test.ts` | 104 tests |
| **Response Messages Ref** | `docs/archive/features/WHATSAPP_RESPONSE_MESSAGES.md` | 15 messages |

### UAT Test Categories (52 Scenarios)

| Category | Test Count | Coverage |
|----------|------------|----------|
| Phone Number Matching | 4 | Normalization, linking, unregistered |
| Multi-Org Detection | 14 | All 6 detection strategies |
| Team ID/Name Fix | 3 | Issue #315 regression tests |
| Org Selection | 4 | Numeric and name selection |
| Session Memory | 3 | 2-hour timeout behavior |
| Pending Messages | 3 | 24-hour expiry behavior |
| Message Types | 3 | Text, audio, unsupported |
| Trust Auto-Apply | 6 | Trust levels 0-3, sensitive categories |
| Response Messages | 8 | All WhatsApp reply formats |
| Error Handling | 4 | Credentials, download, creation failures |

### Unit Test Categories (104 Tests)

| Category | Test Count | Coverage |
|----------|------------|----------|
| Phone Number Normalization | 7 | +prefix, spaces, dashes, WhatsApp prefix |
| Age Group Extraction | 17 | u12, under-12, twelves, seniors patterns |
| Sport Extraction | 14 | Soccer, GAA, hurling, 10 sports total |
| Org Selection Parsing | 10 | Numeric, name match, edge cases |
| Session Timeout | 5 | 2-hour expiry logic |
| Pending Message Expiry | 4 | 24-hour expiry logic |
| Trust-Based Categorization | 26 | All trust levels, all categories |
| Sport Matching | 8 | Aliases, cross-matching |
| Message Type Detection | 5 | Text, audio, image, video, document |
| Category Formatting | 8 | Display labels |

### Running the Tests

```bash
# Run unit tests
cd packages/backend
npx vitest run convex/__tests__/whatsapp-voice-notes.test.ts

# Expected output: 104 tests passing
```

### Key Test Scenarios

**Multi-Org Detection (Priority Order):**
1. Single org → use immediately
2. Explicit mention (`Grange:`, `@St. Mary's`)
3. Team name match
4. Age group match (`u12`, `under-14`)
5. Sport match (`soccer`, `hurling`)
6. Player/coach name match
7. Session memory (2-hour)
8. Ask for clarification

**Trust-Based Auto-Apply:**
- Trust 0-1: All insights need review
- Trust 2+: Safe categories auto-apply
- Trust 3: Also queues parent notifications
- Sensitive (injury, behavior): NEVER auto-apply

**Issue #315 Regression:**
- `coachAssignment.teams` can contain names OR IDs
- System now handles both correctly
- Tests cover: names only, IDs only, mixed

---
**Commit**: Session work (January 24, 2026)
