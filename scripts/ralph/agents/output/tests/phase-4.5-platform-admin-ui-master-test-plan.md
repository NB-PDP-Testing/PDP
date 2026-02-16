# Phase 4.5: Platform Admin UI & Monitoring - Master Test Plan

> Created: 2026-02-16
> Phase: phase-4.5-platform-admin-ui
> Status: ✅ Implementation Complete - Testing In Progress

## Overview

This document provides comprehensive manual testing instructions for all Phase 4.5 features related to federation connector management, monitoring, and analytics for platform administrators.

**Test Environment Requirements:**
- Platform staff user account with isPlatformStaff flag set
- Test organization(s) with federation connectors configured
- Dev server running on localhost:3000
- Test data seeded (use phase4TestSeed action if needed)

**Phase 4.5 Coverage:**
- 8 user stories (US-P4.5-001 through US-P4.5-008)
- 4 main feature areas: Connector Management, Sync Monitoring, Health Dashboard, Analytics

---

## Feature Area 1: Connector Management

### US-P4.5-001: Connector List Page

**Route:** `/platform/connectors`

**Prerequisites:**
- Log in as platform staff user
- Navigate to Platform Admin section

**Test Cases:**

#### TC-001-01: Page Structure and Layout
1. Navigate to `/platform/connectors`
2. Verify page title displays "Federation Connectors"
3. Verify "Create Connector" button appears at top right
4. Verify DataTable component renders with correct columns:
   - Name
   - Federation Code
   - Status
   - Connected Orgs
   - Last Sync
   - Health
   - Actions

**Expected:** Page loads with blue gradient header, white content card, and properly formatted table

#### TC-001-02: Status Badges
1. Create or view connectors with different statuses (active, inactive, error)
2. Verify status badges display correct colors:
   - Active: green badge
   - Inactive: yellow badge
   - Error: red badge

**Expected:** Status badges use correct color coding and are easily distinguishable

#### TC-001-03: Health Display
1. View connectors with different health metrics
2. Verify health badge displays uptime percentage
3. Verify color coding:
   - Green: >95% uptime
   - Yellow: 80-95% uptime
   - Red: <80% uptime

**Expected:** Health badges accurately reflect connector uptime with appropriate color coding

#### TC-001-04: Connected Organizations Display
1. View connector with multiple connected organizations
2. Hover over "Connected Orgs" count
3. Verify tooltip appears with list of organization names

**Expected:** Tooltip displays all connected organization names

#### TC-001-05: Last Sync Display
1. View connectors with various last sync times
2. Verify relative time format:
   - Recent: "2 hours ago", "5 minutes ago"
   - Never synced: "Never"

**Expected:** Last sync time displays in user-friendly relative format

#### TC-001-06: Table Sorting
1. Click column headers to sort by:
   - Name (alphabetical)
   - Status (alphabetical)
   - Last Sync (chronological)
   - Health (numerical)
2. Verify sort direction indicator appears
3. Verify data reorders correctly

**Expected:** Clicking column headers sorts table data appropriately

#### TC-001-07: Status Filtering
1. Use status filter dropdown
2. Select "All", "Active", "Inactive", "Error"
3. Verify table shows only connectors matching selected status

**Expected:** Filter dropdown correctly filters table rows by status

#### TC-001-08: Search Functionality
1. Enter connector name in search bar
2. Verify table filters to show matching connectors
3. Clear search, enter federation code
4. Verify table filters by federation code

**Expected:** Search bar filters by both name and federation code

#### TC-001-09: Action Buttons
1. Verify each row has action buttons:
   - Edit button
   - Test Connection button
   - Delete button
2. Click each button and verify it performs expected action

**Expected:** Action buttons are visible and functional

#### TC-001-10: Empty State
1. Remove all connectors (or use clean database)
2. Navigate to connector list
3. Verify empty state message displays:
   "No connectors configured. Create one to get started."

**Expected:** Empty state appears when no connectors exist

#### TC-001-11: Mobile Responsiveness
1. Resize browser to <768px width (mobile viewport)
2. Verify table transforms to card list layout
3. Verify all data remains accessible
4. Verify buttons remain clickable

**Expected:** Mobile view shows stacked cards instead of table

---

### US-P4.5-002: Connector Creation/Edit Form

**Routes:**
- Create: `/platform/connectors/create`
- Edit: `/platform/connectors/[connectorId]/edit`

**Test Cases:**

#### TC-002-01: Create Form Access
1. From connector list, click "Create Connector" button
2. Verify navigation to `/platform/connectors/create`
3. Verify form renders with all required fields

**Expected:** Create form loads successfully

#### TC-002-02: Basic Form Fields
1. Verify form displays:
   - Name field (required)
   - Federation Code field (required, unique)
   - Status dropdown (active/inactive)
2. Attempt to submit empty form
3. Verify validation errors appear

**Expected:** Required field validation works correctly

#### TC-002-03: OAuth 2.0 Authentication Setup
1. Select "OAuth 2.0" from Auth Type dropdown
2. Verify OAuth-specific fields appear:
   - Client ID
   - Client Secret
   - Authorization URL
   - Token URL
3. Verify other auth type fields are hidden

**Expected:** OAuth fields display conditionally based on auth type selection

#### TC-002-04: API Key Authentication Setup
1. Select "API Key" from Auth Type dropdown
2. Verify API Key fields appear:
   - API Key field
   - Header Name field (default: "X-API-Key")
3. Verify other auth type fields are hidden

**Expected:** API Key fields display with correct defaults

#### TC-002-05: Basic Auth Setup
1. Select "Basic Auth" from Auth Type dropdown
2. Verify Basic Auth fields appear:
   - Username
   - Password
3. Verify other auth type fields are hidden

**Expected:** Basic Auth fields display correctly

#### TC-002-06: Endpoints Configuration
1. Verify Endpoints section displays:
   - Membership List URL (required)
   - Member Detail URL (optional)
   - Webhook Secret (optional)
2. Verify required field validation

**Expected:** Endpoint fields appear with correct validation

#### TC-002-07: Sync Configuration
1. Verify Sync Config section displays:
   - Enable Scheduled Sync (checkbox)
   - Cron Schedule (default: "0 2 * * *")
   - Conflict Strategy dropdown (federation_wins, local_wins, merge)
2. Toggle scheduled sync checkbox
3. Verify cron schedule field enables/disables appropriately

**Expected:** Sync configuration fields work as expected

#### TC-002-08: Template Selection
1. Verify Template dropdown displays available import templates
2. Select a template
3. Verify selection is saved

**Expected:** Template dropdown allows selecting default import template

#### TC-002-09: Federation Code Validation
1. Enter invalid federation code (e.g., "Test-Code!", "TEST CODE")
2. Attempt to submit form
3. Verify validation error: "Must match pattern [a-z0-9_]+"

**Expected:** Federation code validation enforces lowercase alphanumeric with underscores only

#### TC-002-10: Cron Schedule Validation
1. Enter invalid cron expression (e.g., "invalid")
2. Attempt to submit form
3. Verify validation error appears

**Expected:** Cron schedule validation catches invalid expressions

#### TC-002-11: URL Validation
1. Enter invalid URLs (e.g., "not-a-url", "http://insecure.com")
2. Attempt to submit form
3. Verify validation error requires HTTPS endpoints

**Expected:** URL validation enforces HTTPS protocol

#### TC-002-12: Successful Connector Creation
1. Fill all required fields with valid data
2. Click "Save" button
3. Verify success toast: "Connector created successfully"
4. Verify redirect to connector list
5. Verify new connector appears in table

**Expected:** Valid form submission creates connector and shows success message

#### TC-002-13: Edit Existing Connector
1. From connector list, click "Edit" button on existing connector
2. Verify form pre-populates with connector data
3. Modify some fields
4. Click "Save" button
5. Verify success toast: "Connector updated successfully"
6. Verify changes are saved

**Expected:** Edit form allows updating connector configuration

#### TC-002-14: Error Handling
1. Attempt to create connector with duplicate federation code
2. Verify error toast: "Failed to save connector: [error]"

**Expected:** Error messages display clearly when save fails

#### TC-002-15: Cancel Button
1. Fill out form partially
2. Click "Cancel" button
3. Verify return to connector list
4. Verify data is not saved

**Expected:** Cancel button returns to list without saving

#### TC-002-16: Credential Security
1. Create connector with OAuth or API Key credentials
2. Edit connector
3. Verify credentials are masked/hidden in edit form
4. Verify backend stores credentials encrypted

**Expected:** Credentials are not exposed in plain text

---

### US-P4.5-003: OAuth 2.0 Setup Wizard

**Route:** `/platform/connectors/[connectorId]/oauth-setup`

**Prerequisites:**
- Connector configured with OAuth 2.0 auth type
- Authorization and Token URLs configured

**Test Cases:**

#### TC-003-01: OAuth Setup Page Access
1. From connector edit page, click "Setup OAuth" button
2. Verify navigation to `/platform/connectors/[connectorId]/oauth-setup`
3. Verify page displays connector info and OAuth endpoints

**Expected:** OAuth setup page loads with connector details

#### TC-003-02: Step 1 - Display OAuth Info
1. View OAuth setup page
2. Verify Step 1 displays:
   - Connector name
   - Authorization URL
   - Token URL
   - "Start Authorization" button

**Expected:** OAuth configuration details are clearly displayed

#### TC-003-03: Start Authorization Flow
1. Click "Start Authorization" button
2. Verify backend calls startOAuthFlow action
3. Verify authorization URL opens in new tab/window
4. Verify original page shows "Waiting for authorization..."

**Expected:** New window opens with federation's authorization page

#### TC-003-04: Complete Authorization (Success)
1. In authorization window, grant permissions
2. Verify redirect to `/platform/connectors/oauth-callback`
3. Verify callback page extracts code and state params
4. Verify backend calls completeOAuthFlow action
5. Verify loading spinner: "Completing authorization..."
6. Verify success message: "OAuth setup complete! Access token obtained and stored."
7. Verify redirect to connector edit page

**Expected:** OAuth flow completes successfully and token is stored

#### TC-003-05: CSRF Protection
1. During authorization, modify state parameter in callback URL
2. Attempt to complete flow
3. Verify error message about invalid state parameter

**Expected:** State parameter validation prevents CSRF attacks

#### TC-003-06: Authorization Error Handling
1. In authorization window, deny permissions
2. Verify error is displayed
3. Verify "Retry" button appears
4. Click "Retry" to restart flow

**Expected:** Authorization errors are handled gracefully with retry option

#### TC-003-07: Token Expiration Handling
1. Complete OAuth setup successfully
2. Wait for token to expire (or manually expire in backend)
3. Test connection
4. Verify error indicates token expired
5. Verify option to re-authorize

**Expected:** Expired tokens are detected and user can re-authorize

---

### US-P4.5-004: Connection Test Functionality

**Access Points:**
- Connector edit page: "Test Connection" button
- Connector list page: "Test Connection" in Actions column

**Test Cases:**

#### TC-004-01: Test Connection from Edit Page
1. On connector edit page, click "Test Connection" button
2. Verify dialog appears: "Testing connection to [ConnectorName]..."
3. Wait for test to complete
4. Verify result displays in dialog

**Expected:** Connection test runs from edit page

#### TC-004-02: Test Connection from List Page
1. On connector list, click "Test Connection" in Actions column
2. Verify dialog appears with connector name
3. Wait for test to complete
4. Verify result displays

**Expected:** Connection test runs from list page

#### TC-004-03: Successful Connection Test (OAuth)
1. Configure connector with valid OAuth credentials
2. Run connection test
3. Verify success message: "✓ Connection successful! Response time: XXXms"
4. Verify green checkmark icon
5. Verify response time is displayed

**Expected:** Successful OAuth connection shows green success message with timing

#### TC-004-04: Successful Connection Test (API Key)
1. Configure connector with valid API Key
2. Run connection test
3. Verify success message with response time

**Expected:** Successful API Key connection works correctly

#### TC-004-05: Successful Connection Test (Basic Auth)
1. Configure connector with valid Basic Auth credentials
2. Run connection test
3. Verify success message with response time

**Expected:** Successful Basic Auth connection works correctly

#### TC-004-06: Failed Test - Invalid Credentials (401)
1. Configure connector with invalid credentials
2. Run connection test
3. Verify error message: "✗ Connection failed: Invalid credentials (401)"
4. Verify red X icon
5. Verify "Retry" button appears

**Expected:** 401 error displays with helpful message

#### TC-004-07: Failed Test - Not Found (404)
1. Configure connector with incorrect endpoint URL
2. Run connection test
3. Verify error message: "✗ Connection failed: Not found (404)"

**Expected:** 404 error displays clearly

#### TC-004-08: Failed Test - Rate Limit (429)
1. Trigger rate limit on federation API (or simulate)
2. Run connection test
3. Verify error message: "✗ Connection failed: Rate limit (429)"

**Expected:** Rate limit error is displayed

#### TC-004-09: Failed Test - Timeout
1. Configure connector with slow/unresponsive endpoint
2. Run connection test
3. Verify timeout error after reasonable wait time

**Expected:** Timeout is handled gracefully

#### TC-004-10: Failed Test - Network Error
1. Disconnect from network (or simulate network failure)
2. Run connection test
3. Verify network error message

**Expected:** Network errors are caught and displayed

#### TC-004-11: Retry Button
1. Perform failed connection test
2. Click "Retry" button
3. Verify test runs again

**Expected:** Retry button re-runs the connection test

#### TC-004-12: Close Dialog
1. Perform connection test (success or failure)
2. Click "Close" button
3. Verify dialog closes
4. Verify return to previous page state

**Expected:** Close button dismisses dialog

---

## Feature Area 2: Sync Monitoring

### US-P4.5-005: Sync Logs Viewer

**Route:** `/platform/connectors/logs`

**Test Cases:**

#### TC-005-01: Page Structure
1. Navigate to `/platform/connectors/logs`
2. Verify page title: "Federation Sync Logs"
3. Verify DataTable component renders
4. Verify filter controls are visible

**Expected:** Logs page loads with proper structure

#### TC-005-02: Table Columns
1. View sync logs table
2. Verify columns display:
   - Timestamp
   - Connector
   - Organization
   - Type
   - Status
   - Duration
   - Stats
   - Actions

**Expected:** All required columns are present

#### TC-005-03: Type Badges
1. View logs with different types
2. Verify type badge colors:
   - Scheduled: blue badge
   - Manual: purple badge
   - Webhook: green badge

**Expected:** Type badges use correct color coding

#### TC-005-04: Status Badges
1. View logs with different statuses
2. Verify status badge colors:
   - Completed: green badge
   - Failed: red badge
   - Running: yellow badge

**Expected:** Status badges clearly indicate sync outcome

#### TC-005-05: Duration Formatting
1. View logs with various durations
2. Verify format: "X min Y sec" (e.g., "2 min 34 sec")

**Expected:** Duration displays in readable format

#### TC-005-06: Stats Display
1. View log with sync statistics
2. Verify stats format: "Created: X, Updated: Y, Conflicts: Z"

**Expected:** Stats summarize sync results clearly

#### TC-005-07: View Details Action
1. Click "View Details" button in Actions column
2. Verify modal/dialog opens with detailed log information

**Expected:** View Details opens sync log details modal

#### TC-005-08: Filter by Connector
1. Open connector filter dropdown
2. Verify "All Connectors" option appears
3. Verify individual connectors are listed
4. Select specific connector
5. Verify table shows only logs for that connector

**Expected:** Connector filter works correctly

#### TC-005-09: Filter by Status
1. Open status filter dropdown
2. Verify options: All, Completed, Failed, Running
3. Select "Failed"
4. Verify table shows only failed syncs

**Expected:** Status filter correctly filters logs

#### TC-005-10: Filter by Date Range
1. Open date range picker
2. Select "Last 7 days"
3. Verify table shows only logs from last 7 days
4. Select "Last 30 days"
5. Verify table updates
6. Select "Custom range" and choose specific dates
7. Verify custom range works

**Expected:** Date range picker filters logs by time period

#### TC-005-11: Search by Organization
1. Enter organization name in search bar
2. Verify table filters to show only logs for that organization
3. Clear search
4. Verify all logs reappear

**Expected:** Search filters by organization name

#### TC-005-12: Sort by Timestamp
1. Verify default sort is newest first
2. Click Timestamp column header
3. Verify sort reverses to oldest first
4. Click again to return to newest first

**Expected:** Timestamp sorting works in both directions

#### TC-005-13: Pagination
1. Create more than 50 sync logs
2. Navigate to logs page
3. Verify only 50 logs display per page
4. Verify pagination controls appear
5. Navigate to page 2
6. Verify next 50 logs display

**Expected:** Pagination shows 50 logs per page

#### TC-005-14: Empty State
1. Clear all filters
2. Remove all sync logs (or use clean database)
3. Verify empty state message:
   "No sync logs found. Try adjusting filters."

**Expected:** Empty state appears when no logs match filters

#### TC-005-15: Mobile Responsiveness
1. Resize browser to <768px width
2. Verify table transforms to card list
3. Verify all information remains accessible

**Expected:** Mobile view uses card layout

---

### US-P4.5-006: Sync Log Details Modal

**Access:** Click "View Details" button in sync logs table

**Test Cases:**

#### TC-006-01: Modal Structure
1. From sync logs, click "View Details"
2. Verify modal opens
3. Verify modal title format: "Sync Details - [Organization] - [Timestamp]"
4. Verify modal displays all sections

**Expected:** Modal opens with proper structure and title

#### TC-006-02: Metadata Section
1. View sync details modal
2. Verify Metadata section displays:
   - Sync ID (for support reference)
   - Connector name and type
   - Organization name
   - Sync type (scheduled/manual/webhook)
   - Started at timestamp
   - Completed at timestamp
   - Duration
   - Status badge

**Expected:** All metadata fields are visible and accurate

#### TC-006-03: Stats Section
1. View sync details modal
2. Verify Stats section displays:
   - Players created count
   - Players updated count
   - Players skipped count
   - Conflicts detected count
   - Conflicts resolved count
   - Errors encountered count

**Expected:** Stats provide complete sync summary

#### TC-006-04: Conflicts Section (No Conflicts)
1. View sync with no conflicts
2. Verify Conflicts section shows: "No conflicts detected"

**Expected:** No conflicts state is clearly indicated

#### TC-006-05: Conflicts Section (With Conflicts)
1. View sync with conflicts
2. Verify Conflicts section displays expandable list
3. Expand a conflict entry
4. Verify conflict details show:
   - Player Name
   - Field name that conflicted
   - Federation Value
   - Local Value
   - Resolved Value
   - Resolution Strategy used

**Expected:** Conflict details are comprehensive and clear

#### TC-006-06: Conflict Color Coding
1. View conflict list with different resolution types
2. Verify color coding:
   - Green: No conflict (values matched)
   - Yellow: Merged values
   - Red: One value overwrote the other

**Expected:** Color coding helps identify resolution type at a glance

#### TC-006-07: Errors Section (No Errors)
1. View sync with no errors
2. Verify Errors section shows: "No errors encountered"

**Expected:** No errors state is displayed

#### TC-006-08: Errors Section (With Errors)
1. View sync with errors
2. Verify Errors section displays scrollable error list
3. Verify each error shows:
   - Row number
   - Player name (if available)
   - Error message
   - Timestamp (if available)

**Expected:** Errors are listed with helpful context

#### TC-006-09: Export Details Button
1. Click "Export Details" button
2. Verify JSON report downloads
3. Open downloaded file
4. Verify it contains complete sync details

**Expected:** Export provides downloadable JSON report

#### TC-006-10: Retry Sync Button (Failed Sync)
1. View details for failed sync
2. Verify "Retry Sync" button appears
3. Click "Retry Sync"
4. Verify confirmation prompt (if any)
5. Verify sync is re-triggered

**Expected:** Retry button allows re-running failed syncs

#### TC-006-11: Retry Sync Button (Successful Sync)
1. View details for successful sync
2. Verify "Retry Sync" button is not shown (or disabled)

**Expected:** Cannot retry already successful syncs

#### TC-006-12: Close Modal
1. Click "Close" button or X icon
2. Verify modal closes
3. Verify return to sync logs page

**Expected:** Close button dismisses modal

---

## Feature Area 3: Health Dashboard

### US-P4.5-007: Connector Health Dashboard

**Route:** `/platform/connectors/dashboard`

**Test Cases:**

#### TC-007-01: Page Structure
1. Navigate to `/platform/connectors/dashboard`
2. Verify page title: "Federation Connector Dashboard"
3. Verify page layout includes:
   - Summary cards at top
   - Sync trend chart
   - Connector health table
   - Recent errors panel
   - Action buttons

**Expected:** Dashboard loads with all sections visible

#### TC-007-02: Total Connectors Card
1. View "Total Connectors" summary card
2. Verify card displays:
   - Total count
   - Breakdown by status: "X active, Y inactive, Z error"
3. Verify counts match actual connector data

**Expected:** Total Connectors card shows accurate counts

#### TC-007-03: Total Organizations Connected Card
1. View "Total Organizations Connected" card
2. Verify card displays unique organization count
3. Verify count matches number of organizations with connectors

**Expected:** Organization count is accurate

#### TC-007-04: Syncs Last 24h Card
1. View "Syncs Last 24h" card
2. Verify card displays:
   - Total sync count for last 24 hours
   - Breakdown: "X completed vs Y failed"
3. Create test syncs and verify counts update

**Expected:** 24-hour sync stats are accurate

#### TC-007-05: API Cost This Month Card
1. View "API Cost This Month" card
2. Verify card displays estimated cost
3. Verify cost calculation is reasonable based on usage

**Expected:** Cost estimate is displayed

#### TC-007-06: Sync Trend Chart Structure
1. View sync trend chart
2. Verify chart displays using recharts library
3. Verify X-axis shows dates (last 30 days)
4. Verify Y-axis shows sync count
5. Verify legend identifies lines

**Expected:** Chart renders with proper axes and labels

#### TC-007-07: Sync Trend Chart Data
1. View sync trend chart lines
2. Verify two lines display:
   - Successful syncs (green)
   - Failed syncs (red)
3. Hover over data points
4. Verify tooltips show date and count

**Expected:** Chart accurately represents sync trends over 30 days

#### TC-007-08: Connector Health Table
1. View connector health mini-table
2. Verify table shows top 5 connectors sorted by health (worst first)
3. Verify columns:
   - Connector name
   - Uptime %
   - Last Error
   - Actions

**Expected:** Health table displays 5 worst-performing connectors

#### TC-007-09: Health Table Red Highlight
1. Create or view connector with <80% uptime
2. Verify row is highlighted in red
3. Create or view connector with >80% uptime
4. Verify row is not highlighted

**Expected:** Low-uptime connectors are visually highlighted

#### TC-007-10: Recent Errors Panel
1. View Recent Errors panel
2. Verify last 10 sync errors are listed
3. Verify each error shows:
   - Connector name
   - Timestamp
   - Error message preview
4. Click an error
5. Verify navigation to full sync log details

**Expected:** Recent errors provide quick access to problem syncs

#### TC-007-11: View All Logs Button
1. Click "View All Logs" button
2. Verify navigation to `/platform/connectors/logs`

**Expected:** Button links to sync logs page

#### TC-007-12: Manage Connectors Button
1. Click "Manage Connectors" button
2. Verify navigation to `/platform/connectors`

**Expected:** Button links to connector list page

#### TC-007-13: Auto-Refresh
1. View dashboard
2. Note "Last updated" timestamp
3. Wait 60 seconds
4. Verify timestamp updates to "just now" or new time
5. Verify data refreshes automatically

**Expected:** Dashboard auto-refreshes every 60 seconds

#### TC-007-14: Mobile Responsiveness
1. Resize browser to <768px width
2. Verify summary cards stack vertically
3. Verify chart is horizontally scrollable if needed
4. Verify health table remains accessible
5. Verify action buttons remain clickable

**Expected:** Mobile layout is usable

---

## Feature Area 4: Analytics & Cost Monitoring

### US-P4.5-008: Analytics and Cost Monitoring

**Route:** `/platform/connectors/analytics`

**Test Cases:**

#### TC-008-01: Page Structure
1. Navigate to `/platform/connectors/analytics`
2. Verify page title: "Federation Analytics"
3. Verify page includes:
   - Time range selector
   - Sync volume chart
   - API cost chart
   - Cache hit rate chart
   - Connector performance table
   - Organization leaderboard
   - Export button
   - Filter controls

**Expected:** Analytics page loads with all components

#### TC-008-02: Time Range Selector
1. View time range selector
2. Verify options available:
   - Last 7 days
   - Last 30 days
   - Last 90 days
   - Custom
3. Select "Last 7 days"
4. Verify all charts update to show 7-day data
5. Select "Last 30 days"
6. Verify charts update to 30-day data
7. Select "Custom" and choose specific date range
8. Verify custom range is applied

**Expected:** Time range selector updates all visualizations

#### TC-008-03: Sync Volume Chart Structure
1. View Sync Volume chart
2. Verify it's a bar chart grouped by day
3. Verify X-axis shows dates
4. Verify Y-axis shows sync counts
5. Verify stacked bars with legend

**Expected:** Bar chart displays correctly

#### TC-008-04: Sync Volume Chart Data
1. View stacked bars in Sync Volume chart
2. Verify bar colors represent:
   - Scheduled syncs: blue
   - Manual syncs: purple
   - Webhook syncs: green
3. Hover over bars
4. Verify tooltip shows breakdown by type

**Expected:** Sync volume chart accurately represents sync types over time

#### TC-008-05: API Cost Chart
1. View API Cost chart
2. Verify it's a line chart
3. Verify X-axis shows dates
4. Verify Y-axis shows cost estimates
5. Hover over data points
6. Verify tooltip shows:
   - Date
   - Total cost
   - Breakdown: Claude API calls, other costs

**Expected:** Cost chart shows daily cost trends with breakdown

#### TC-008-06: Cache Hit Rate Chart
1. View Cache Hit Rate chart
2. Verify it's a pie chart
3. Verify chart shows:
   - Cached AI mappings (portion)
   - Uncached AI mappings (portion)
4. Verify percentages are displayed
5. Verify "cache savings" amount displays: "$X saved this month"

**Expected:** Pie chart visualizes cache effectiveness

#### TC-008-07: Connector Performance Table
1. View Connector Performance table
2. Verify columns:
   - Connector name
   - Avg Sync Duration
   - Success Rate
   - API Cost
3. Verify table is sortable by any column
4. Click column headers to sort
5. Verify data reorders correctly

**Expected:** Performance table provides sortable connector metrics

#### TC-008-08: Slow Sync Highlighting
1. Create or view connector with avg sync duration >5 minutes
2. Verify row is highlighted in yellow
3. View connector with duration <5 minutes
4. Verify row is not highlighted

**Expected:** Slow connectors are visually highlighted

#### TC-008-09: Organization Leaderboard
1. View Organization Leaderboard section
2. Verify it shows top 10 organizations by sync count
3. Verify each entry shows:
   - Organization name
   - Sync count
4. Verify list is sorted by count (highest first)

**Expected:** Leaderboard identifies most active organizations

#### TC-008-10: Filter by Connector
1. Open connector filter dropdown
2. Select specific connector
3. Verify all charts and tables update to show only that connector's data
4. Select "All Connectors"
5. Verify full data set is restored

**Expected:** Connector filter narrows analytics scope

#### TC-008-11: Filter by Organization
1. Open organization filter dropdown
2. Select specific organization
3. Verify all charts and tables update to show only that organization's data
4. Clear filter
5. Verify full data set is restored

**Expected:** Organization filter narrows analytics scope

#### TC-008-12: Export Analytics (CSV)
1. Click "Export" button
2. Select "CSV" format (if options available)
3. Verify CSV file downloads
4. Open CSV file
5. Verify it contains:
   - Summary statistics
   - Sync volume data
   - Cost data
   - Performance metrics

**Expected:** CSV export provides comprehensive data

#### TC-008-13: Export Analytics (JSON)
1. Click "Export" button
2. Select "JSON" format (if options available)
3. Verify JSON file downloads
4. Open JSON file
5. Verify it contains structured analytics data

**Expected:** JSON export provides machine-readable data

#### TC-008-14: Mobile Responsiveness
1. Resize browser to <768px width
2. Verify charts stack vertically
3. Verify charts are scrollable horizontally if needed
4. Verify tables remain accessible
5. Verify filter controls remain usable

**Expected:** Mobile layout maintains usability

---

## Cross-Feature Testing

### Navigation Between Pages

#### TC-NAV-01: Platform Admin Menu
1. Log in as platform staff user
2. Navigate to Platform section
3. Verify navigation menu includes links to:
   - Connectors (list)
   - Dashboard
   - Logs
   - Analytics
4. Click each link and verify correct page loads

**Expected:** All platform admin pages are accessible from navigation

#### TC-NAV-02: Breadcrumb Navigation
1. Navigate to deep page (e.g., connector edit)
2. Verify breadcrumb trail displays
3. Click breadcrumb links to navigate back
4. Verify each link works correctly

**Expected:** Breadcrumbs allow easy navigation

#### TC-NAV-03: Back Button Behavior
1. Navigate through multiple pages
2. Use browser back button
3. Verify pages navigate backward correctly
4. Verify page state is maintained (filters, etc.)

**Expected:** Browser back/forward buttons work as expected

---

## Performance Testing

#### TC-PERF-01: Page Load Times
1. Clear cache
2. Navigate to each main page
3. Measure time to interactive
4. Verify all pages load within 3 seconds

**Expected:** Pages load quickly

#### TC-PERF-02: Large Data Set Handling
1. Create 100+ connectors
2. Create 1000+ sync logs
3. Navigate to list pages
4. Verify pages remain responsive
5. Verify pagination prevents performance issues

**Expected:** App handles large data sets without slowdown

#### TC-PERF-03: Chart Rendering Performance
1. Load analytics page with 90 days of data
2. Verify charts render smoothly
3. Change time range multiple times
4. Verify no lag or freezing

**Expected:** Charts render efficiently

---

## Security Testing

#### TC-SEC-01: Platform Staff Access Control
1. Log in as non-platform-staff user (regular org member)
2. Attempt to navigate to `/platform/connectors`
3. Verify access is denied or redirect occurs
4. Verify error message displays

**Expected:** Non-platform staff cannot access platform admin features

#### TC-SEC-02: Credential Security
1. Create connector with OAuth credentials
2. View connector in edit form
3. Verify credentials are masked/not visible in plain text
4. Inspect network requests
5. Verify credentials are not transmitted unencrypted

**Expected:** Credentials are always encrypted/protected

#### TC-SEC-03: SQL Injection Prevention
1. In search fields, enter SQL injection attempts (e.g., "'; DROP TABLE;--")
2. Verify input is sanitized
3. Verify no database errors or unexpected behavior

**Expected:** App is protected against SQL injection

#### TC-SEC-04: XSS Prevention
1. In text fields, enter JavaScript code (e.g., "<script>alert('XSS')</script>")
2. Save and view data
3. Verify script does not execute
4. Verify content is properly escaped

**Expected:** App is protected against XSS attacks

---

## Regression Testing

#### TC-REG-01: Existing Features Unaffected
1. Test core platform features unrelated to Phase 4.5:
   - Organization management
   - Team management
   - Player enrollment
   - User management
2. Verify no regressions introduced

**Expected:** Phase 4.5 changes don't break existing features

#### TC-REG-02: Database Migrations
1. If schema changes were made, verify migrations ran successfully
2. Check for any data loss or corruption
3. Verify indexes are properly created

**Expected:** Database changes applied cleanly

---

## Browser Compatibility

#### TC-COMPAT-01: Chrome/Edge
1. Run all test cases in Chrome/Edge
2. Verify full functionality

**Expected:** All features work in Chrome/Edge

#### TC-COMPAT-02: Firefox
1. Run all test cases in Firefox
2. Verify full functionality
3. Note any browser-specific issues

**Expected:** All features work in Firefox

#### TC-COMPAT-03: Safari
1. Run all test cases in Safari (desktop)
2. Verify full functionality
3. Note any browser-specific issues

**Expected:** All features work in Safari

#### TC-COMPAT-04: Mobile Browsers
1. Run critical test cases on mobile browsers:
   - iOS Safari
   - Android Chrome
2. Verify mobile-responsive features work

**Expected:** Mobile experience is functional

---

## Accessibility Testing

#### TC-A11Y-01: Keyboard Navigation
1. Use Tab key to navigate through pages
2. Verify all interactive elements are focusable
3. Verify focus indicators are visible
4. Use Enter/Space to activate buttons
5. Verify actions work without mouse

**Expected:** All features are keyboard accessible

#### TC-A11Y-02: Screen Reader Compatibility
1. Use screen reader (NVDA, JAWS, VoiceOver)
2. Navigate through pages
3. Verify content is announced clearly
4. Verify form labels are associated with inputs
5. Verify status messages are announced

**Expected:** Content is accessible to screen readers

#### TC-A11Y-03: Color Contrast
1. Use contrast checker tool
2. Verify all text meets WCAG AA contrast ratios
3. Verify status badges are distinguishable beyond color alone

**Expected:** Color contrast meets accessibility standards

#### TC-A11Y-04: Alternative Text
1. Inspect all images and icons
2. Verify alt text or aria-labels are present
3. Verify alt text is descriptive

**Expected:** Visual elements have text alternatives

---

## Test Data Setup

### Required Test Data

To fully test Phase 4.5 features, ensure the following test data exists:

1. **Platform Staff User:**
   - User account with `isPlatformStaff: true`

2. **Test Organizations:**
   - At least 3 organizations for testing multi-org scenarios

3. **Test Connectors:**
   - Active connector with OAuth authentication
   - Active connector with API Key authentication
   - Active connector with Basic Auth authentication
   - Inactive connector
   - Connector in error state
   - Connector with high uptime (>95%)
   - Connector with low uptime (<80%)

4. **Sync History:**
   - Completed syncs (various dates)
   - Failed syncs (various error types)
   - Running sync (if possible)
   - Syncs of all types: scheduled, manual, webhook
   - Syncs with conflicts
   - Syncs with errors
   - Syncs with various durations

5. **Test Data Cleanup:**
   - Use `phase4TestCleanup` mutation to clean test data after testing

### Test Data Seed Script

Use the Phase 4 test data seed script to generate test data:

```bash
# Seed test data
npx -w packages/backend convex run actions/phase4TestSeed.ts

# Clean up test data
npx -w packages/backend convex run models/phase4TestCleanup.ts
```

---

## Test Sign-Off

### Test Execution Summary

| Feature Area | Total Tests | Passed | Failed | Skipped | Notes |
|--------------|-------------|--------|--------|---------|-------|
| Connector Management | 48 | | | | |
| Sync Monitoring | 34 | | | | |
| Health Dashboard | 14 | | | | |
| Analytics & Cost | 14 | | | | |
| Cross-Feature | 3 | | | | |
| Performance | 3 | | | | |
| Security | 4 | | | | |
| Regression | 2 | | | | |
| Browser Compatibility | 4 | | | | |
| Accessibility | 4 | | | | |
| **TOTAL** | **130** | | | | |

### Known Issues

_(Document any known issues discovered during testing)_

### Sign-Off

- **Tested By:** _______________________________
- **Date:** _______________________________
- **Environment:** _______________________________
- **Build/Commit:** _______________________________
- **Status:** ☐ Approved for Production  ☐ Needs Fixes  ☐ Blocked

---

## Appendix

### Test Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Platform Staff | (TBD) | (TBD) | isPlatformStaff: true |
| Org Admin | (TBD) | (TBD) | For testing org isolation |

### API Endpoints Reference

| Backend Function | Purpose |
|------------------|---------|
| `listConnectors` | Get all connectors with filtering |
| `getConnector` | Get single connector details |
| `createConnector` | Create new connector |
| `updateConnector` | Update existing connector |
| `deleteConnector` | Delete connector |
| `testConnection` | Test connector API credentials |
| `startOAuthFlow` | Initiate OAuth authorization |
| `completeOAuthFlow` | Complete OAuth and store token |
| `listSyncLogs` | Get sync history with filtering |
| `getSyncLogDetails` | Get detailed sync log |
| `getDashboardStats` | Get dashboard summary stats |
| `getSyncTrends` | Get 30-day sync trends |
| `getConnectorHealth` | Get connector health metrics |
| `getAnalytics` | Get analytics data for charts |

### Related Documentation

- Phase 4.5 PRD: `/docs/features/phase-4.5-platform-admin-ui.md`
- Backend Schema: `/packages/backend/convex/schema.ts`
- Frontend Routes: `/apps/web/src/app/platform/connectors/`

---

*Test Plan Version: 1.0*
*Last Updated: 2026-02-16*
*Created by: Test Plan Generator*
