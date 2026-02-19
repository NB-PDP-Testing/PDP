# PlayerARC - Phase 4.5: Platform Admin UI & Monitoring

> Auto-generated documentation - Last updated: 2026-02-16 11:38

## Status

- **Branch**: `ralph/phase-4.5-platform-admin-ui`
- **Progress**: 5 / 8 stories complete
- **Phase Status**: 🔄 In Progress

## Completed Features

### US-P4.5-001: Create connector list page

As a platform admin, I need to view all federation connectors with their status, health, and connected organizations.

**Acceptance Criteria:**
- Create apps/web/src/app/platform-admin/connectors/page.tsx
- Page title: 'Federation Connectors'
- Use DataTable component to display connectors
- Table columns: Name, Federation Code, Status, Connected Orgs, Last Sync, Health, Actions
- Status badge: green (active), yellow (inactive), red (error)
- Health badge: uptime % (green >95%, yellow 80-95%, red <80%)
- Connected Orgs column shows count with tooltip listing org names
- Last Sync column shows relative time: '2 hours ago' or 'Never'
- Actions column: Edit button, Test Connection button, Delete button
- Add 'Create Connector' button at top right
- Table sortable by Name, Status, Last Sync, Health
- Table filterable by Status: All, Active, Inactive, Error
- Search bar filters by name or federation code
- Empty state if no connectors: 'No connectors configured. Create one to get started.'
- Mobile responsive: table becomes card list on <768px
- Run npx ultracite fix

### US-P4.5-002: Create connector creation/edit form

As a platform admin, I need to create new federation connectors and edit existing ones including setting up authentication.

**Acceptance Criteria:**
- Create apps/web/src/app/platform-admin/connectors/create/page.tsx
- Create apps/web/src/app/platform-admin/connectors/[connectorId]/edit/page.tsx
- Form fields: Name (required), Federation Code (required, unique), Status (active/inactive)
- Auth Type dropdown: OAuth 2.0, API Key, Basic Auth
- If OAuth 2.0 selected, show: Client ID, Client Secret, Authorization URL, Token URL
- If API Key selected, show: API Key field, Header Name (default: X-API-Key)
- If Basic Auth selected, show: Username, Password
- Endpoints section: Membership List URL (required), Member Detail URL (optional), Webhook Secret (optional)
- Sync Config section: Enable Scheduled Sync (checkbox), Cron Schedule (text input, default: '0 2 * * *'), Conflict Strategy (dropdown: federation_wins, local_wins, merge)
- Template dropdown: select default import template for this connector
- Validate: federation code matches pattern [a-z0-9_]+
- Validate: cron schedule is valid expression
- Validate: URLs are valid HTTPS endpoints
- On save, call createConnector or updateConnector mutation
- Show toast on success: 'Connector created/updated successfully'
- Show toast on error: 'Failed to save connector: [error]'
- Credentials are encrypted before storage (handled by backend)
- Cancel button returns to connector list
- Run npx ultracite fix and npm run check-types

### US-P4.5-003: Implement OAuth 2.0 setup wizard

As a platform admin, I need to complete OAuth 2.0 authorization flow with a federation API to obtain and store access tokens.

**Acceptance Criteria:**
- Create apps/web/src/app/platform-admin/connectors/[connectorId]/oauth-setup/page.tsx
- Step 1: Display connector info and OAuth endpoints
- Show 'Start Authorization' button
- On click, call startOAuthFlow action to get authorization URL
- Open authorization URL in new window/tab
- Step 2: User authorizes in federation system
- Callback URL: /platform-admin/connectors/oauth-callback
- Callback page extracts code and state from URL params
- Call completeOAuthFlow action with code and state
- Show loading spinner: 'Completing authorization...'
- Step 3: Display success or error
- On success, show: 'OAuth setup complete! Access token obtained and stored.'
- On error, show error message and 'Retry' button
- Validate state parameter matches to prevent CSRF attacks
- After success, redirect to connector edit page
- Run npx ultracite fix

### US-P4.5-004: Add connection test functionality

As a platform admin, I need to test a connector's API credentials to verify they work before saving or after troubleshooting.

**Acceptance Criteria:**
- Add 'Test Connection' button to connector edit page
- Add 'Test Connection' button to connector list (Actions column)
- On click, show dialog: 'Testing connection to [ConnectorName]...'
- Create testConnection action: makes simple API call to federation endpoint
- For OAuth: call membership list endpoint with 1 result
- For API Key: call membership list endpoint with 1 result
- For Basic Auth: call membership list endpoint with 1 result
- Action returns: { success: boolean, message: string, responseTime: number }
- Display result in dialog:
-   - Success: '✓ Connection successful! Response time: 234ms'
-   - Failure: '✗ Connection failed: [error message]'
- Common errors: Invalid credentials (401), Not found (404), Rate limit (429), Timeout, Network error
- Show 'Retry' button on failure
- Close button returns to previous page
- Run npx ultracite fix and npm run check-types

### US-P4.5-005: Create sync logs viewer

As a platform admin, I need to view detailed sync logs with filtering and search to troubleshoot sync issues.

**Acceptance Criteria:**
- Create apps/web/src/app/platform-admin/connectors/logs/page.tsx
- Page title: 'Federation Sync Logs'
- Use DataTable to display sync history from syncHistory table
- Table columns: Timestamp, Connector, Organization, Type, Status, Duration, Stats, Actions
- Type badge: scheduled (blue), manual (purple), webhook (green)
- Status badge: completed (green), failed (red), running (yellow)
- Duration column: 'X min Y sec'
- Stats column: 'Created: X, Updated: Y, Conflicts: Z'
- Actions column: 'View Details' button
- Filter by connector dropdown (All Connectors or specific)
- Filter by status dropdown (All, Completed, Failed, Running)
- Filter by date range picker (Last 7 days, Last 30 days, Custom range)
- Search bar filters by organization name
- Sort by Timestamp (default: newest first)
- Pagination: 50 logs per page
- Empty state if no logs: 'No sync logs found. Try adjusting filters.'
- Mobile responsive: table becomes card list on <768px
- Run npx ultracite fix


## Implementation Notes

### Key Patterns & Learnings

**Patterns discovered:**
- Platform admin pages use `/platform/` path, NOT `/platform-admin/`
- Consistent design pattern: blue gradient header, white content cards
- Status filter passes `undefined` (not `"all"`) to listConnectors query
- Mobile responsiveness handled via hidden classes: `hidden md:block` and `md:hidden`
- Tooltips need TooltipProvider wrapper for each Tooltip component
- Must add block statements `{ return X; }` for if/return patterns (linting requirement)
- Must add default case to switch statements even if all cases covered
- The `healthData` query was initially fetching for first connector only - removed in favor of calculating uptime from connector data directly
--
- React Hook Form's register() pattern for form fields

**Gotchas encountered:**
- Must add block statements `{ return X; }` for if/return patterns (linting requirement)
- Must add default case to switch statements even if all cases covered
- The `healthData` query was initially fetching for first connector only - removed in favor of calculating uptime from connector data directly
- date-fns already installed (version 4.1.0)
- shadcn/ui tooltip component already exists
- formatDistanceToNow requires timestamp in milliseconds
--
- Pre-commit hook blocks commits with lint errors (must fix before committing)
- Complex submit functions trigger noExcessiveCognitiveComplexity warning
- Fragments with single children are considered useless (remove them)

### Files Changed

- apps/web/src/app/platform/connectors/page.tsx (+448 lines, new file)
- apps/web/src/app/platform/page.tsx (+15, -1) - Added connector link
- ✅ Convex codegen: passed
- ✅ Linting: passed (npx ultracite fix)
- ✅ Pre-commit hooks: passed
- ⏭️ Browser verification: N/A (list page only, no data in dev yet)
- Platform admin pages use `/platform/` path, NOT `/platform-admin/`
- Consistent design pattern: blue gradient header, white content cards
- Status filter passes `undefined` (not `"all"`) to listConnectors query
- Mobile responsiveness handled via hidden classes: `hidden md:block` and `md:hidden`
- Tooltips need TooltipProvider wrapper for each Tooltip component
- Must add block statements `{ return X; }` for if/return patterns (linting requirement)
--
- apps/web/src/app/platform/connectors/create/page.tsx (+586 lines, new file)
- ✅ Convex codegen: passed


## Key Files


---
*Documentation auto-generated by Ralph Documenter Agent*
