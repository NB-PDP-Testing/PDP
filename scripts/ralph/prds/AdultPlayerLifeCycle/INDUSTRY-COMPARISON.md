# PlayerARC Adult Player Lifecycle — Industry Comparison & Best Practice Analysis

**Document purpose:** A phase-by-phase comparison of the PlayerARC Adult Player Lifecycle PRD against industry best practice and international standards. For each area, differences are identified with their pros and cons so that informed decisions can be made about future evolution.

**Reviewed PRDs:** Phases 1–8 (42 stories + Phase 8 dual-channel WhatsApp extension)
**Last updated:** 2026-02-25 — P1 Today screen added; P2 token claim identity verification added; P3 Irish name normalisation added; P4 5-core/3-optional dimension split added; P5 GDPR Art.20 export added; P6 deep industry review + all gaps closed (server-side guards, role-scoped notifications, deep link prompt, first-run onboarding, admin confirmed-flag pattern); P7 deep industry review + gaps closed (Ireland age-16 consent, separate audit table, child erasure right US-P7-008, no-profiling prohibition, session timeout); P8 deep industry review + gaps closed (GDPR Article 9 explicit consent phrasing for health data, WELLNESSSTOP confirmation phrasing, DPIA requirement, EU BSP requirement, wa_id pseudonymization)
**Reference platforms:** Hudl, Kitman Labs, Teamworks, Catapult, SportsEngine, FitrWoman / Orreco, Polar, Smartabase, Sportlyzer
**Standards consulted:** GDPR / UK GDPR, GDPR Article 9, GDPR Article 35 (DPIA), COPPA (US, updated Jan 2025), IOC Injury Surveillance guidelines, Meta WhatsApp Business policies, WhatsApp Business DPA, EU-US Data Privacy Framework, WCAG 2.1 AA

---

## Phase 1 — Player Portal Layout & Navigation

### What we're building
A sidebar-navigated multi-section portal (9 items) with a **"Today" priority first-screen** as the default landing (surfacing only the 2–3 most urgent items above the fold — wellness CTA, active injury alert, unread coach feedback), with the full profile content rendered below on the same scrollable page. ✅ *Updated to match industry best practice.*

### Industry standard
- **Hudl** and **Teamworks** provide role-dedicated dashboards with persistent top-bar role indicators. Navigation is contextual — the player sees only player-relevant data, never surfaces admin or coach controls.
- **Kitman Labs** uses a card-based "Today's View" as the default landing, surfacing the day's highest-priority actions (wellness, upcoming session, active injuries) above the fold.
- **Best practice** for sports apps is a **progressive disclosure** model: an "at-a-glance" overview with drill-down rather than a flat sidebar list. Studies consistently show that the first screen after login needs to answer "What do I need to do today?" before offering navigation depth.
- **WCAG 2.1 AA** requires keyboard-navigable sidebars and touch targets of ≥44×44px (which we specify for mobile).
- Major platforms offer **PWA or native app** for offline access and home-screen installation. Web-only portals have lower daily engagement rates.

### Differences

| Area | Our Approach | Industry Standard | Status |
|------|-------------|-------------------|--------|
| Landing screen | "Today" priority view above the fold; full profile below | "Today view" — only the 2–3 most urgent items; full content on drill-down | ✅ Resolved |
| Navigation depth | 9-item sidebar (4 bottom tabs on mobile) | 4–5 top-level items, deep hierarchy within each | Acceptable |
| Offline / install | None (web only) | PWA or native app for home-screen install and offline access | Open gap |
| Personalisation | Fixed 9-item layout | Customisable widget layout (drag-and-drop dashboards in Kitman Labs, Teamworks) | Future phase |
| Push notifications | Not included in Phase 1 | In-app push from portal (reminder, new feedback) is standard | Open gap |

### Pros of our approach
- **"Today" first-screen** now matches Kitman Labs and Teamworks — only actionable items shown at landing, full profile accessible by scrolling.
- **Conditional cards** (only render when relevant) prevent empty-state clutter — a clean experience for players with nothing urgent.
- **Mirrors the parent portal structure** — consistent UX lowers learning curve for users with multiple roles.

### Remaining gaps
- **No offline or installable experience** — daily wellness check-ins are a key retention driver; if the app isn't accessible when the player is at training (poor signal), engagement will drop.
- **Fixed layout** — 9 sidebar items is approaching the upper limit for comfortable mobile navigation. Industry research shows ≤5 bottom nav tabs as ideal ceiling; our 4-tab mobile bottom nav handles this adequately for now.

---

## Phase 2 — Youth-to-Adult Graduation Flow

### What we're building
Guardian-initiated invitation email (Resend) → player clicks token link → claims account → onboarding orchestrator → player portal. Admin manual override. 30-day token expiry.

### Industry standard
- **SportsEngine** separates youth and adult accounts entirely. A youth athlete's profile is a sub-profile under the parent's account and cannot be transferred — the athlete must create a new account at 18, losing all historical data. This is the most common approach, and it is widely criticised in the sports data community.
- **Hudl** allows club administrators to "transfer" player profiles between teams and age groups but does not have a guardian→player ownership transfer mechanism. History is maintained at the club level.
- **Sportlyzer** has no formalised graduation mechanism; age-category re-assignment is manual by admins.
- **FIFA's Football Data Ecosystem** maintains continuous player identity via national registration numbers that persist from youth to senior, with federation intermediaries managing transitions. This is the gold standard for professional contexts.
- Best practice from the **UK Sport and Recreation Alliance** recommends that organisations hold and maintain a single continuous athlete record from youth to senior, with a defined consent handover process at age 18.

### Differences

| Area | Our Approach | Industry Standard |
|------|-------------|-------------------|
| Record continuity | Full history preserved via `transitionToAdult` | Most platforms create a new adult record, losing youth history |
| Verification on claim | Token in URL (no identity check) | Enterprise: government ID check or federation number validation |
| Token delivery | Email only | Most platforms use email; some also offer in-app notification |
| Guardian involvement | Guardian initiates, but admin can bypass | Most platforms: admin-only transition, no guardian initiation option |
| Transition reversibility | Irreversible (stated in confirmation dialog) | Same industry-wide; no known platform allows reversal |

### Pros of our approach
- **Best-in-class record continuity** — preserving youth history into the adult record puts PlayerARC significantly ahead of SportsEngine and Sportlyzer.
- **Guardian agency** — giving the guardian the ability to send the invite (rather than requiring admin involvement) is more respectful of the family relationship and reduces admin burden.
- **Admin override** — the manual trigger for edge cases (unresponsive guardian) is practical and commonly requested by club admins.

### Resolved
- **Identity verification on claim** — a 6-digit PIN is sent via SMS to the mobile number on the playerIdentity record before `claimPlayerAccount` executes. Fallback to email OTP if no mobile is registered. 3-attempt lockout, 10-minute expiry, server-side replay prevention via `verificationPins.usedAt`. Admin "Transition Now" is exempt. ✅

### Remaining gaps
- **Email-only invite delivery** — if the player's email address is unknown at 18 (common in youth sport), the invite fails. The mobile number is now used for claim verification, but the initial invite email has no SMS fallback.
- **No federation record hook** — the transition is internal to the club only. No notification to a national federation or league.

---

## Phase 3 — Adult Import & Youth Record Matching

### What we're building
Multi-signal confidence matching algorithm (DOB + surname = HIGH, DOB + first name = MEDIUM, surname only = LOW, email boost) across all three entry points (manual, CSV, self-registration). Admin reviews and decides per match.

### Industry standard
- **Enterprise identity resolution** platforms (Salesforce Customer Data Platform, AWS Entity Resolution) use probabilistic scoring with configurable thresholds, phonetic matching (Soundex/Metaphone), and ML models trained on historical confirmed matches. They combine dozens of signals (name variations, address, phone, email, date of birth, national ID).
- **FIFA's TMS (Transfer Matching System)** uses national player registration numbers as the single authoritative identity anchor. Matching is deterministic, not probabilistic — there is no "confidence level", just a match or no match.
- **Kitman Labs** and **Catapult** both require a unique external athlete ID (often the federation/governing body ID) to prevent duplicates, rather than relying on name+DOB matching.
- The **GDPR right to rectification** means that if a wrong match is confirmed, the merged data must be reversible — something no platform in our review handles gracefully.

### Differences

| Area | Our Approach | Industry Standard |
|------|-------------|-------------------|
| Matching algorithm | Rule-based: DOB + surname/first name/email signals | Enterprise: probabilistic ML scoring with phonetic matching |
| Identity anchor | Name + DOB combination | External ID (federation number, national ID) as primary anchor |
| Name variation handling | Unicode NFD normalisation + O'/Mc/Mac prefix normalisation before all comparisons | Soundex, Metaphone, or Jaro-Winkler distance for name variants | ✅ Resolved |
| Match reversal | Not addressed | Enterprise platforms require an audit trail and reversal path | Open gap |
| Admin decision | Required for HIGH confidence matches | Some platforms auto-merge above a configured threshold (e.g., 95%) | Intentional — human review is safer |

### Pros of our approach
- **Irish name normalisation now built in** — `normaliseNameForMatching()` handles fadas (Séan→Sean), O' prefixes (O'Brien/OBrien/O Brien all match), and Mc/Mac variants (McCarthy/MacCarthy match). This covers the vast majority of Irish club name variants without requiring a probabilistic ML model.
- **Pragmatic for grassroots sport** — grassroots clubs do not have federation IDs for most players. Name+DOB is the most reliable available signal at this scale.
- **Human review for HIGH confidence** — blocking the merge behind an admin review for even HIGH confidence matches prevents automated data loss.
- **Lightweight and deterministic** — no ML model to train or maintain. Works well for organisations with 10–500 players.

### Remaining gaps
- **Scales poorly at very high volume** — scanning youth player identities with an in-memory scoring loop works for 500 players but will time out at 5,000+. A pre-indexed name/DOB approach would be needed for very large deployments.
- **No merge audit trail or reversal** — if an incorrect merge is confirmed by admin, there is no mechanism to undo it. GDPR Article 16 (right to rectification) requires a documented correction path.

---

## Phase 4 — Daily Player Wellness Check

### What we're building
8-dimension emoji-scale daily check-in (sleep, energy, food, water, mood, motivation, physical feeling, muscle recovery). Per-coach access consent. GDPR modal for cycle phase. Offline IndexedDB support. Aggregate-only coach view. Admin analytics.

### Industry standard
- **Kitman Labs** uses a validated subjective wellness questionnaire derived from sports science research (Hooper Index + Borg RPE scale). Their standard dimensions are: fatigue, sleep quality, stress, muscle soreness, and mood — 5 dimensions, not 8. They add session RPE after each training session, not daily.
- **Catapult** integrates objective wearable data (GPS, heart rate) with subjective wellness ratings; their check-in typically has 4–6 questions.
- **Polar** delivers wellness insights automatically from biometric data (HRV, sleep stages, recovery) with no manual entry required. This is the direction the industry is heading.
- **FitrWoman / Orreco** is the leading platform for female athlete cycle phase tracking. They use a medically validated 5-phase cycle model (which matches our implementation exactly) and require explicit, granular consent for all cycle-related data.
- The **IOC consensus statement on athlete monitoring** recommends session-RPE as the most evidence-based subjective wellness metric. Multi-dimension daily questionnaires are validated but response fatigue sets in after 5–7 items.
- Industry standard for **coach visibility**: coaches see aggregate load indicators, not individual dimension values — which matches our approach exactly. This is the consensus position from Kitman Labs, Catapult, and academic research.
- **GDPR Article 9 handling**: FitrWoman and Orreco both implement a double-opt-in for cycle data — the initial consent and then a secondary "confirm you understand" acknowledgement. We use a single modal.

### Differences

| Area | Our Approach | Industry Standard |
|------|-------------|-------------------|
| Number of dimensions | 8 (configurable down to 1) | 4–6 (most validated questionnaires use 5) |
| Session RPE | Not included | Standard in Kitman Labs, Catapult — asked after each training session |
| Wearable integration | None | Polar, Garmin, Apple Health, Oura Ring integration standard in enterprise |
| Coach visibility | Aggregate only, per-coach consent | Same — aggregate only. Our per-coach consent is more granular than most platforms |
| Cycle phase consent | Single GDPR modal, explicit checkbox | Double-opt-in with a confirmation screen in FitrWoman/Orreco |
| AI interpretation | Score interpretation text only | Kitman Labs uses AI to flag fatigue accumulation trends and injury risk scores |
| Response fatigue | 8 questions (potentially) | 4–6 questions to minimise abandonment |

### Pros of our approach
- **Per-coach consent model is ahead of the market** — no other platform in our review gives individual players the ability to approve/deny access per coach. Most platforms have an org-wide visibility setting. This is a meaningful privacy differentiator.
- **Offline IndexedDB support** is not available in any web-based wellness platform we reviewed. Kitman Labs and Catapult are native-app products. Our offline-first web approach is appropriate for grassroots clubs where players are unlikely to have premium native apps.
- **Configurable dimensions** mean the platform adapts to sport type (a swimmer doesn't need "muscle recovery" the same way a rugby player does).
- **GDPR cycle consent flow** is correctly implemented. The non-pre-ticked checkbox is a specific GDPR Article 7 requirement that many apps violate.

### Resolved
- **Question fatigue** — replaced 8 flat dimensions with a 5-core (always on) + 3-optional (off by default) model. The 5 core dimensions align directly with the validated Hooper Index (sleep, energy, mood, physical feeling, motivation). Optional dimensions (food intake, water intake, muscle recovery) are available for players who want them but do not burden the daily check-in by default. ✅

### Remaining gaps
- **No session RPE** — the most evidence-based single metric in sports science is still missing. This is a gap versus Kitman Labs and Catapult. Future consideration.
- **No wearable integration** — for clubs using Polar or Garmin, manual entry is redundant. Future phase.
- **Single-layer cycle consent** — FitrWoman uses a two-step confirmation. Low-priority UX refinement.

---

## Phase 5 — Full Player Portal Remaining Sections

### What we're building
My Progress (read-only passport ratings with trends), My Passport Sharing (player controls who sees passport), My Injuries (self-report + view history), Coach Feedback & AI Summaries (player sees `publicSummary` only, `privateInsight` never exposed).

### Industry standard
- **Hudl Assist / Focus** gives players video clips of their own performances linked directly to their profile — which is a form of "progress" that passport text ratings do not capture.
- **Kitman Labs** player view shows a visual "performance radar" (spider/radar chart across dimensions) rather than a list of numbers, making progress more visually compelling.
- **Passport sharing / data portability** is mandated by the **GDPR right to data portability (Article 20)**: data controllers must provide data in a machine-readable format (CSV or JSON) upon request. Our sharing model (toggle + org approval) is about selective sharing with other clubs, not raw data export. These are different obligations.
- **Injury self-reporting** in platforms like Teamworks goes through a triage system — a self-reported injury triggers a notification to the medical/physio staff for review, not just to the coach. Catapult has a dedicated injury reporting workflow with body-map visualisation.
- **Coach feedback privacy** — the `privateInsight` / `publicSummary` split we have is more sophisticated than most platforms. Teamworks and Hudl do not have a coach "private note vs shared summary" distinction. Our AI-generated `publicSummary` is distinctive in the market.

### Differences

| Area | Our Approach | Industry Standard |
|------|-------------|-------------------|
| Progress visualisation | List of ratings with trend arrows | Radar/spider chart (Kitman Labs, Catapult), video clips (Hudl) |
| Passport data portability | Sharing with other orgs via toggle | GDPR Article 20: machine-readable export (CSV/JSON) also required |
| Injury triage | Self-report goes to coach view | Professional platforms: self-report triggers medical staff notification first |
| Coach feedback privacy | Private insight / public AI summary split | Most platforms: no distinction — coach notes are either visible or not |
| Player notes on passport | Optional textarea | Most platforms: not available (players cannot annotate their own assessment) |

### Pros of our approach
- **Player notes on passport** is unique — no platform reviewed allows the player to add their own perspective to their coach-rated passport. This supports player agency and is valued in athlete-centred coaching frameworks.
- **privateInsight / publicSummary split** is a genuine innovation. The AI-generated middle layer means players receive thoughtful, appropriate feedback rather than raw coach stream-of-consciousness.
- **Player-controlled passport sharing** gives players more agency than most platforms, where sharing is entirely admin-controlled.

### Resolved
- **GDPR Article 20 export** — US-P5-005 added: "Download my data" button in player settings, JSON and CSV formats, all 9 data domains, consent-gated cycle phase, privateInsight excluded. ✅

### Remaining gaps
- **Injury self-report bypasses medical staff** — a player-reported "severe" injury appearing directly in a coach's list (rather than triggering a medical staff alert first) could delay appropriate medical response. An industry-standard triage step (notification to org medical contact when severity = "severe") should be added.
- **List-based progress view** — trend arrows next to numbers convey less insight than a radar chart showing the player's overall profile shape and how it has changed. This is a UX gap compared to Kitman Labs.

### Recommendation
Add a radar/spider chart as the primary progress visualisation (a `<RadarChart>` component exists in Recharts, which the project already uses). Keep the numerical list as the secondary view. This single change brings the UX to Kitman Labs parity.

---

## Phase 6 — Multi-Role UX

### What we're building
Extending the existing role switcher with: primary role setting (controls default dashboard on login), a persistent role context badge, ability to add the player role to an existing account, cross-role permission guard rails (self-assessment disabled, cross-role confirmation dialogs).

### Industry standard

**Multi-role account support:**
- **SportsEngine** does not support true multi-role single accounts. A coach who is also a parent has two separate accounts. Players are sub-profiles under the parent account with no independent identity until adulthood.
- **Teamworks** is one of the few platforms with genuine multi-role support. Single account, explicit "acting as" context visible in the top navigation bar, deliberate two-tap role switch. No automatic role selection — user always chooses. Widely referenced as the multi-role UX gold standard in sports.
- **Hudl** supports coaches who are also athletes at the club level but provides no unified dashboard; the user navigates between separate "spaces" without an explicit role-switching mechanism.
- **Catapult** and **Kitman Labs** are role-silo platforms — a user is assigned one functional role (coach, medical, analyst) and sees only the data relevant to that role. Cross-role single accounts are not supported.
- **Salesforce** (enterprise benchmark): the App Launcher model — each "role" is an "app" with its own navigation and views. Role context is always shown in the app bar. Admins can use "Run As" to simulate any role, which is a powerful support tool.
- **Microsoft 365** (enterprise benchmark): persistent "You are signed in as [role]" message bar in admin portals. Role is always explicit; the bar cannot be dismissed.
- **NetSuite** (enterprise benchmark): users have a default role set in preferences; system loads it on login. Users can switch mid-session from the top-right profile menu. No "ask every login" friction.

**Role context indicators:**
The industry has converged on three approaches. In order of effectiveness:
1. **Persistent header message bar** (Microsoft 365, Salesforce admin): cannot be missed. Best for infrequent role switching.
2. **Always-visible badge/chip in nav** (Teamworks): visible on every page. Best for frequent switching.
3. **Profile dropdown only** (most SaaS): role visible only when the user opens the menu. Insufficient for multi-role safety.

**Primary/default role:**
The industry consensus (NetSuite, Auth0, Microsoft Entra) is "set once, load automatically, user can change in settings." The "ask on every login" approach (Teamworks) is unusual and intentionally high-friction — designed for high-stakes roles (team manager, medical staff) where acting in the wrong context carries real risk. For a grassroots sports club context, loading the primary role automatically is the right trade-off.

**Backend enforcement of cross-role guards:**
The RBAC industry is unambiguous: UI-only permission enforcement is insufficient. Every API endpoint must independently verify the requesting user's role and permissions. "HTTP requests can be freely crafted by any HTTP client, bypassing UI" (OSO RBAC Guide). This applies to the self-assessment guard, the admin-editing-own-record guard, and any other cross-role boundary.

**Self-assessment prohibition:**
The International Coaching Federation Code of Ethics and sports governance literature (USA Gymnastics, Sport Law) treat coach self-assessment as a conflict of interest that must be prohibited at the organisational level — not just discouraged via UX. Best practice is an `assessor_id !== assessed_player_user_id` constraint at the API (or DB) level, not a UI disable. The guard should fire even if the coach has also been assigned the player role.

**Notifications in multi-role context:**
Enterprise SaaS platforms (Slack, Microsoft Teams, Salesforce) route notifications based on the user's active role context. When acting as "Player", the user should receive player-context notifications. When acting as "Coach", coach-context notifications. Notification preferences are per-role, not account-wide.

**Adding roles to existing accounts:**
Microsoft Entra, Okta, and similar IAM platforms use a self-service request + admin approval workflow for sensitive role additions (matching our approach). Admin-only assignment is reserved for elevated/privileged roles. Self-service without approval is reserved for low-risk roles. Our "request + admin approval" model for the player role is the correct pattern.

**Deep linking in multi-role context:**
When a user is in "Player" context and follows a link to a "Coach" page (e.g., a shared assessment link), the industry standard is to offer a role-switch prompt ("This page requires Coach role. Switch?") rather than a hard 403. This is the Branch deep-linking pattern, also implemented in Salesforce App Launcher. A silent automatic switch (without telling the user) is considered poor UX and a security anti-pattern.

**First-run experience for newly activated roles:**
SaaS onboarding research (Appcues, Userflow) shows that users who receive a new role mid-lifecycle need a brief contextual orientation — what is new, where to go, what they can now do. A bare "role approved" notification without any onboarding leads to abandonment of the new context.

### Differences

| Area | Our Approach | Industry Standard | Status |
|------|-------------|-------------------|--------|
| Multi-role UX | Role badge + switcher dropdown | Teamworks: "acting as" always explicit in top bar | ✅ Aligned |
| Context indicator placement | Badge in header/sidebar | Header message bar (Microsoft) or persistent badge (Teamworks) | ✅ Aligned |
| Role audit trail | Not included | Enterprise: every action tagged with active role context | Open gap |
| Primary role | Set in settings, loads on next login | Industry standard: auto-load primary role (NetSuite, Auth0) | ✅ Aligned |
| Self-assessment guard | UI disable with tooltip | API-level enforcement (`assessor_id !== player_user_id`) | Partially resolved (see below) |
| Admin-own-record guard | Confirmation dialog (UI only) | API-level warning/constraint | Open gap |
| Adding player role | Self-registration + admin approval | Admin approval standard (Entra, Okta) | ✅ Aligned |
| Notification routing | Not addressed | Route by active role context (enterprise standard) | Open gap |
| Deep link role context | Not addressed | Prompt to switch role, not hard 403 | Open gap |
| First-run for new role | "Your player role has been approved" notification | Role-specific guided first-use experience | Open gap |
| Mobile role switch | Role badge abbreviated | Confirmation tap to prevent accidental switches | Open gap |

### Pros of our approach
- **Role badge on every page** aligns with the Teamworks best practice — users cannot miss their current role context.
- **Add-player-role without creating a new account** is significantly better than the SportsEngine model. Preserving a single identity across roles is cleaner and reduces support burden.
- **Self-service + admin approval** for role addition matches the Entra/Okta pattern — correct level of friction for a semi-privileged role like "player."
- **Primary role auto-loaded** matches the industry standard (NetSuite, Auth0) — deliberate login choice every session (Teamworks model) is unnecessarily high friction for a grassroots sports club.

### Resolved (since initial analysis)
- **Self-assessment guard — server-side enforcement added**: US-P6-004 updated to require a backend validation in the assessment mutation — if `assessor.userId === assessedPlayer.userId`, the mutation throws. The UI disable remains as the first signal; the backend is the safety net. ✅

### Resolved (all open gaps closed)
- **Self-assessment guard — server-side enforcement**: mutation throws if `assessor.userId === assessedPlayer.linkedUserId`. ✅
- **Admin-own-record guard — backend confirmed flag**: enrollment update mutations require `confirmed: true` arg when admin is modifying their own player record. Calling without `confirmed=true` throws a validation error — the UI dialog is no longer the only gate. ✅ (US-P6-004)
- **Notification routing — role-scoped**: `targetRole` optional field added to notifications schema. All notification creation calls updated with role mapping. Notification query and provider filter by `activeFunctionalRole`. ✅ (US-P6-005)
- **Deep link role-context prompt**: when URL role segment mismatches active role and user holds the required role, a prompt offers to switch — no silent 403. ✅ (US-P6-006)
- **First-run onboarding for new role**: dismissible welcome banner shown once on first player portal visit after approval. ✅ (US-P6-003)

### Remaining gaps
- **No role audit log** — deferred to the planned org-wide audit logging feature. GDPR Article 30 requirement documented for that phase.

---

## Phase 7 — Child Player Passport Authorization

### What we're building
`parentChildAuthorizations` table with access levels (none / view_only / view_interact), 5 granular content toggles (wellness, injuries, feedback, passport, teams), 30/7-day pre-birthday notifications, age-13 minimum (COPPA floor), age-16 Irish digital consent threshold, cycle phase never shown to under-18s.

### Industry standard

**COPPA (US, updated January 2025 — effective June 2025, compliance by April 2026):**
Three new verifiable parental consent methods finalised: (1) knowledge-based questions — dynamically difficult, child cannot guess; (2) facial recognition of government-issued photo ID matched with a device selfie; (3) text-plus verification (SMS + additional step — only for operators who do not share children's data with third parties). "Parent logs in and clicks grant" is NOT a recognised COPPA consent method. This is a gap for any US deployment.

**Ireland's digital age of consent: 16 (not 13):**
Ireland implemented GDPR Article 8 at age 16 — one of the stricter EU implementations (others include Czech Republic and UK at 16; Spain and Denmark at 13). The Irish DPC surveyed sports clubs in February 2024 (FAI, IRFU, GAA, LGFA partners) and issued "Fundamentals for a Child-Oriented Approach to Data Processing" (Dec 2021). For Irish sports clubs, this means:
- Under 16: only parental consent creates a valid legal basis — child cannot independently consent to data processing.
- Ages 16-17: child can give their own data consent but is still under the age of majority.
- The PRD's parent-grant flow correctly satisfies this (parent initiates the account, not the child), but the framing as "COPPA: minimum age 13" is misleading for Irish deployment.

**UK Children's Code — common enforcement failures (recent ICO action):**
Reddit fined £18.2M (February 2026) for: using children's data in recommender/personalisation systems without safeguards; profiling enabled by default; failing to treat "best interests of the child" as the primary design consideration. The Code applies to ALL under-18 users, not just under-13.

**GDPR Recital 65 — child's independent right to erasure:**
A child can request erasure of their own data independently, without requiring the consenting parent's involvement, once they are competent to understand what they are asking for. Legal age is not the threshold — demonstrated competence is. This means a 15-year-old player can request their data be erased without their parent approving it. No platform reviewed explicitly handles this.

**Audit trail requirements:**
GDPR Article 5 (accountability principle) and COPPA both require logging of who accessed, modified, or deleted personal data, and when. The regulated-industry standard (healthcare, finance) is a separate, write-once audit table — embedded arrays in documents cannot be made immutable, can grow unbounded, and cannot be efficiently queried for compliance reports.

**Session length for minors:**
Industry best practice (not a legal requirement) is shorter session timeouts for child accounts — 30–60 minutes recommended vs. 24 hours for adults. No platform reviewed explicitly documents this, but it is consistent with security guidance for vulnerable user cohorts.

**Age-gated progressive disclosure:**
YouTube (3 tiers: Kids/Explore/Standard), TikTok (under-13 restricted defaults, family pairing), Snapchat (under-16 private-by-default, over-16 public profile opt-in) all use 13/16/18 as their transition points — directly aligning with GDPR's recommended thresholds and Ireland's 16 threshold.

**Coach-parent-child triangle communications:**
ClassDojo and Seesaw (the leading platforms for this model) implement three distinct visibility layers: (1) coach-only internal notes; (2) parent-visible feedback; (3) child-visible approved summaries. Our `restrictChildView` field matches this pattern. No legal requirement mandates it — it is platform-defined best practice, and we are ahead of sports-specific platforms (Hudl, SportsEngine, TeamSnap do not publish policies on this).

**Pre-birthday notifications:**
No legal standard found for 30-day + 7-day notice windows. This is platform-specific best practice. We are innovating here — no competitor has this mechanism.

### Differences

| Area | Our Approach | Industry Standard | Status |
|------|-------------|-------------------|--------|
| Parental consent mechanism | Parent grants via platform (email login, no identity check) | COPPA (US): verifiable parental consent (knowledge-based Q, facial ID, or text-plus) | Gap for US deployment |
| Irish digital consent age | 13 framed as the COPPA minimum | Ireland: 16 is the digital consent age — under-16 requires parental consent | Framing gap — flow is correct but PRD updated to clarify |
| Child's right to erasure | Not addressed | GDPR Recital 65: child can request erasure independently once competent | Open gap — new story added |
| Access granularity | 5 content-type toggles + 3 access levels | Most platforms: on/off binary (full access or none) | ✅ Best-in-class |
| Pre-birthday notifications | 30 and 7 day alerts | No other platform reviewed has this mechanism | ✅ Ahead of market |
| Cycle tracking age gate | Never for under-18 | FitrWoman: never for under-16 (we are more conservative — correct) | ✅ Correct |
| Audit trail | Embedded `changeLog` array (unbounded, not immutable) | Separate `parentChildAuthorizationLogs` table | Updated in PRD |
| Profiling of children | Not explicitly addressed | UK Children's Code: profiling OFF by default for all under-18 | Added to PRD as explicit prohibition |
| Session length for child accounts | Not specified | Best practice: 30–60 min vs. adult 24 hours | Added to PRD |
| Age of consent threshold | 13 (COPPA floor) | Ireland: 16 (GDPR Article 8 Irish implementation) | Clarified in PRD |

### Pros of our approach
- **Granular content toggles are best-in-class** — no platform reviewed offers per-content-type parental control. This respects both parental oversight needs and the child's emerging autonomy.
- **Pre-birthday transition notifications** are genuinely innovative and directly address a gap in every platform reviewed.
- **`restrictChildView` coach notes filtering** puts us ahead of all sports-specific competitors. ClassDojo and Seesaw have this in education — we are the first to bring it to youth sports.
- **Under-18 cycle tracking block** is ethically sound, legally correct, and aligned with academic consensus.
- **Parent-initiated access model** correctly satisfies GDPR Article 8 for Irish deployment (under-16 requires parental consent — our flow provides it as the trigger).

### Resolved (since initial analysis)
- **Separate audit table** — `parentChildAuthorizationLogs` replaces the embedded `changeLog` array in US-P7-001. Separate table, write-once entries, indexed by child and by date. ✅
- **Irish age of consent clarification** — PRD criticalContext updated to reflect that 16 is Ireland's digital consent threshold; the parent-grant flow satisfies GDPR Article 8 for ages 13-15. ✅
- **Child's right to erasure** — new story US-P7-008 added: child can submit an erasure request independently via account settings; admin reviews and processes it. ✅
- **Profiling prohibition** — criticalContext updated: child accounts must have no analytics profiling beyond session necessities. ✅
- **Session length** — US-P7-003 updated: child accounts should use a shorter session timeout (max 60 minutes idle). ✅

### Remaining gaps
- **No verifiable parental consent mechanism** — for US (COPPA) deployment, the "parent logs in and clicks" mechanism does not meet the 2025 verifiable consent standard (knowledge-based Q / facial ID / text-plus). Irish/EU deployment is adequately covered by the parent-grant flow. US deployment would need a separate consent verification step. **Deferred to a US-expansion phase.**
- **No legal requirement for pre-birthday notification window** — our 30/7-day approach is best practice, not mandated. Low risk.

### Sources
- [FTC finalises COPPA 2025 amendments — White & Case](https://www.whitecase.com/insight-alert/unpacking-ftcs-coppa-amendments-what-you-need-know)
- [Ireland digital age of consent — William Fry](https://www.williamfry.com/knowledge/digital-age-of-consent-for-childrens-data-set-to-be-13/)
- [Irish DPC — Fundamentals for child-oriented data processing](https://www.dataprotection.ie/en/dpc-guidance/fundamentals-child-oriented-approach-data-processing)
- [Irish DPC sports clubs survey 2024](https://www.dataprotection.ie/en/news-media/latest-news/dpc-sports-survey)
- [Reddit fined £18.2M — Feb 2026](https://www.malwarebytes.com/blog/news/2026/02/reddit-porn-sites-fined-by-uk-regulators-over-childrens-safety-and-privacy)
- [GDPR Recital 65 / child right to erasure — ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/how-does-the-right-to-erasure-apply-to-children/)
- [UK Children's Code — ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/)

---

## Phase 8 — WhatsApp Wellness Check (Dual-Channel)

### What we're building
WhatsApp Flows (Meta Cloud API) as the primary channel for WhatsApp users, delivering a native multi-question form inside WhatsApp. Twilio conversational/SMS as the fallback. `WellnessDispatchService` abstraction layer. AES-encrypted Data Exchange for dynamic per-player dimension screens. Channel auto-detection via Meta Contacts API. Opt-in/out via player settings + WELLNESSSTOP command.

### Industry standard

**Competitor channel approaches:**
- **Kitman Labs**, **Catapult**, and **Smartabase** all use in-app push notifications and email as their primary wellness reminder channels. None of the leading athlete management platforms currently use WhatsApp Flows. PlayerARC is **ahead of the market** for this channel.
- **WhatsApp Business API** for health and wellness is well-established in healthcare (patient check-ins, post-operative recovery surveys) but rare in sports. Healthcare providers using WhatsApp surveys report 65–83% completion rates, compared to 30–45% for email surveys and ~55% for SMS sequential surveys.
- **WhatsApp Flows** (2023, Meta) has been adopted primarily by e-commerce (checkout forms), banking (KYC), and healthcare (intake forms). Sports wellness is an emerging use case as of 2025/2026.
- **Twilio Verify** (phone number verification via SMS PIN) is the industry standard for phone verification — aligning with the US-P8-005 approach.

**GDPR Article 9 — Wellness data is special category health data:**
The Article 29 Working Party (now EDPB) and the ICO take the position that subjective wellness scores (sleep quality, energy level, mood, motivation, physical feeling) constitute health data under Article 9 when tracked daily and in aggregate. The test is functional: "does the data reveal or allow reasonable conclusions about someone's health status?" Daily multi-dimension wellness scores — especially longitudinal — clearly pass this test.

Consequences:
1. A standard opt-in toggle ("you consent to receive wellness check messages") is **not sufficient** for Article 9 data. GDPR Article 9(2)(a) requires **explicit consent that specifically identifies health data processing** — the consent text must name the data categories (sleep, mood, energy, physical feeling) and their health data status.
2. Processing requires **both** Article 6(1)(a) (lawful basis) **and** Article 9(2)(a) (exception for health data). Two distinct consent requirements must be met.
3. A **Data Protection Impact Assessment (DPIA) is mandatory** under GDPR Article 35 for large-scale processing of special category data. A sports club processing daily health data for all adult members at scale meets the threshold. The DPIA must be completed before go-live.

**WhatsApp Cloud API GDPR compliance — infrastructure requirements:**
Using WhatsApp Business Cloud API in a GDPR-compliant manner requires four specific steps:
1. **Cloud API, not the standard Business App** — the standard WhatsApp Business App does not qualify for GDPR's processor model. Cloud API is required.
2. **EU-certified Business Solution Provider (BSP)** — the BSP must store message data in EU/EEA servers. Direct Cloud API without a BSP may result in US data processing.
3. **Data Processing Agreement (DPA) under Article 28** — Meta provides a [WhatsApp Business Data Processing Terms](https://www.whatsapp.com/legal/business-data-processing-terms) agreement. It must be accepted before processing personal data. It covers: processing only on instructions, breach notification, sub-processor management, data deletion on termination.
4. **Standard Contractual Clauses (SCCs)** — Meta provides a [Business Data Transfer Addendum](https://www.whatsapp.com/legal/business-data-transfer-addendum) (SCCs Module 3, processor-to-processor) for EEA/Switzerland transfers. The EU-US Data Privacy Framework (DPF) is an additional mechanism but not a substitute for SCCs; DPF stability is uncertain following challenges from Max Schrems.

**WhatsApp E2E encryption — message content vs. metadata:**
WhatsApp uses the Signal Protocol (open-source Double-Ratchet). Message content is E2E encrypted in transit. However, once received by the Cloud API, content is decrypted and forwarded to the business. Meta cannot read message content during transmission but has access to **unencrypted metadata**: phone numbers, IP addresses, timestamps, frequency of interaction, device information, usage patterns. Metadata is personal data under GDPR and must be addressed in the DPA. The correct mental model: "content is protected, metadata is not."

Additionally, the `wa_id` (WhatsApp phone number identifier) that Meta sends to the Flows Data Exchange endpoint is personal data transferred from Meta (processor) to the business (controller). This transfer requires lawful basis documentation and the `wa_id` should be pseudonymized immediately upon receipt (stored only as a lookup against playerIdentityId — never as a freestanding identifier in application tables).

**Meta opt-out confirmation — required phrasing:**
Meta Business Policy requires that opt-out requests are honoured and the user is clearly informed. The industry-standard WELLNESSSTOP opt-out confirmation must include: (1) confirmation they have been removed, (2) how to re-subscribe. The specific phrasing required in US-P8-004 is: `"You have been removed from wellness check-ins. Reply WELLNESS to re-subscribe."` This is a Meta compliance requirement, not optional UX copy.

**Meta rate limits (portfolio-based since October 2025):**
Meta changed from per-number to portfolio-level messaging limits on 7 October 2025. Key tiers: new accounts 250 unique messages/24h; standard 2,000; upgraded 10,000; premium 100,000+. Upgrades now complete within 6 hours (down from 24). For a sports club with 300+ opted-in players, the standard tier (2,000/24h) is sufficient for a single dispatch. Tier upgrades should be applied for as part of the Meta Business setup process. Quality score (Green/Yellow/Red) is based on the last 7 days' message reception — spam or unacknowledged messages can downgrade a number and reduce throughput.

**Meta health/wellness brand categorisation risk (Feb 2025):**
Meta tightened health/wellness brand handling in February 2025. Brands associated with "health conditions, specific health statuses, or wellness trackers" may be internally categorised by Meta, restricting Conversions API usage. This affects advertising but **not WhatsApp messaging** directly. A sports club running wellness check-ins is unlikely to be categorised as a health brand (sports performance monitoring is distinct from clinical wellness apps), but the admin should be aware that the Meta account could be flagged if the messaging templates use clinical health language.

**Alternative channels (not addressed):**
- Push notifications (APN/FCM via PWA Service Worker): 7.8% average reaction rate overall; 15–20% CTR with good targeting; 4x higher CTR with personalisation vs. broadcast. For players who have the app installed, push notifications achieve higher completion rates than external channels (app is already open). This is the standard Kitman Labs/Catapult approach.
- Wearable auto-trigger: Polar, Garmin Connect, Apple Health all expose APIs. Emerging best practice (Kitman Labs direction): trigger wellness check after a detected workout session, not at a fixed daily time. Session-triggered checks are more timely and clinically valid (RPE is best captured within 30 minutes of session end).

### Differences

| Area | Our Approach | Industry Standard | Status |
|------|-------------|-------------------|--------|
| Primary reminder channel | WhatsApp Flows | In-app push notification (Kitman Labs, Catapult) | ✅ Ahead of market |
| Secondary channel | Twilio conversational / SMS | Email (Kitman Labs, Catapult) | ✅ Acceptable |
| Channel sophistication | WhatsApp Flows + SMS dual-channel | Most platforms haven't reached WhatsApp Flows yet | ✅ Best-in-class |
| GDPR Article 9 consent phrasing | "Consent to receive wellness check messages" | Explicit health data consent naming Article 9 categories | Resolved (see below) |
| DPIA requirement | Not mentioned | Mandatory for large-scale health data processing | Resolved (see below) |
| EU BSP requirement | Not specified | EU-certified BSP required for GDPR-compliant Cloud API | Resolved (see below) |
| wa_id handling | Stored for lookup | Pseudonymised — stored as playerIdentityId reference only | Resolved (see below) |
| WELLNESSSTOP confirmation | "Confirmation" (unspecified) | Meta policy: specific re-subscribe phrasing required | Resolved (see below) |
| Wearable trigger | Not included | Auto-trigger after workout session (emerging best practice) | Open gap |
| PWA push notifications | Not included | Service Worker FCM/APN push standard for web apps | Open gap |
| Completion feedback | Score + interpretation text | Kitman Labs: in-app trend comparison vs. last week | Open gap |

### Pros of our approach
- **WhatsApp Flows is genuinely ahead of the market** — no major athlete management platform uses this. The ~83% completion rate vs ~45% email is a compelling adoption argument in Ireland/UK where WhatsApp penetration exceeds 80%.
- **Channel abstraction (`WellnessDispatchService`)** future-proofs the architecture — adding a push notification or email channel requires a single additional case, not a rewrite.
- **Idempotency handling** (checking for existing daily record before inserting) is critical and often overlooked in webhook integrations.
- **AES-encrypted data exchange for dynamic screens** ensures player dimension preferences are not transmitted in plaintext via Meta's servers — technically required and correct privacy practice.
- **Automatic fallback** from Meta Flows to Twilio on failure is the right resilience pattern.
- **Dual opt-out surface** (WELLNESSSTOP command + settings toggle) is more accessible than settings-only, which is the standard in most platforms.

### Cons of our approach
- **Fixed daily dispatch time** may not match training schedules — session-triggered wellness checks are more timely and clinically valid.
- **Meta Business API approval dependency** — a policy violation can result in the number being banned, disabling wellness delivery for all opted-in players. Twilio fallback mitigates this.
- **No native push notifications** — players who have the app installed and prefer push notifications are not served by this design. A significant engagement gap vs. Kitman Labs/Catapult.

### Resolved (since initial analysis)
- **GDPR Article 9 explicit consent** — US-P8-005 opt-in phrasing updated to explicitly name the health data categories and state they are processed as special category health data under GDPR Article 9. The toggle description now reads: "I consent to [club name] processing my daily wellness responses (sleep quality, energy level, mood, motivation, and physical feeling) as health data under GDPR Article 9(2)(a). I can withdraw this consent anytime by toggling off or replying WELLNESSSTOP." ✅
- **DPIA requirement** — criticalContext updated: a Data Protection Impact Assessment is mandatory before go-live for any organisation processing health-category wellness data for a large number of players. ✅
- **EU BSP requirement** — criticalContext updated: Cloud API must be used via an EU-certified Business Solution Provider with EU/EEA data residency; Meta Article 28 DPA and SCCs (Module 3) must be in place. ✅
- **wa_id pseudonymization** — US-P8-002 updated: `wa_id` received at the Flows Data Exchange endpoint must be immediately resolved to `playerIdentityId`; only the `playerIdentityId` is stored in application tables. The `wa_id` is never persisted as a standalone field. ✅
- **WELLNESSSTOP confirmation phrasing** — US-P8-004 updated: WELLNESSSTOP handler must send exactly: "You have been removed from wellness check-ins. Reply WELLNESS to re-subscribe." (Meta compliance requirement). ✅

### Remaining gaps
- **No native push notifications** — players who have the app installed would benefit from push prompts (higher CTR, lower data-transfer overhead). Deferred — requires PWA service worker setup.
- **Fixed dispatch time** — session-triggered wellness checks are more clinically valid. Deferred to a future wearable integration phase.
- **Twilio SMS EU data residency** — Twilio SMS data residency for EU (IE1) is in Private Beta. Twilio WhatsApp data residency is not confirmed (likely routed through Meta's infrastructure). For full GDPR data residency compliance on the SMS fallback channel, monitor Twilio's Private Beta status.

### Sources
- [WhatsApp Business Data Processing Terms](https://www.whatsapp.com/legal/business-data-processing-terms)
- [WhatsApp Business Data Transfer Addendum (SCCs)](https://www.whatsapp.com/legal/business-data-transfer-addendum)
- [EU-US Data Privacy Framework — WhatsApp LLC](https://www.whatsapp.com/legal/data-privacy-framework)
- [GDPR Article 9: Special Category Health Data — ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/)
- [Article 29 Working Party: Health Data in Apps and Devices — Inside Privacy](https://www.insideprivacy.com/international/article-29-working-party-clarifies-scope-of-health-data-in-apps-and-devices/)
- [WhatsApp GDPR Compliance Guide 2025 — Qualimero](https://qualimero.com/en/blog/whatsapp-business-gdpr-compliant-ai-consultation-guide-2025)
- [WhatsApp data security: Encryption & API best practices — Infobip](https://www.infobip.com/blog/whatsapp-data-security)
- [Meta WhatsApp API Rate Limits — WATI](https://www.wati.io/en/blog/whatsapp-business-api/whatsapp-api-rate-limits/)
- [Scale WhatsApp Cloud API: Throughput Limits 2026 — Wuseller](https://www.wuseller.com/whatsapp-business-knowledge-hub/scale-whatsapp-cloud-api-master-throughput-limits-upgrades-2026/)
- [Meta Health and Wellness Restrictions Feb 2025 — Foley Hoag](https://foleyhoag.com/news-and-insights/blogs/security-privacy-and-the-law/2025/january/meta-s-new-advertising-rules-key-considerations-for-health-and-wellness-businesses/)
- [Twilio Data Residency for SMS EU (Private Beta)](https://www.twilio.com/en-us/changelog/data-residency-for-sms--eu--is-now-in-private-beta)
- [Push Notification Statistics 2025 — Mobiloud](https://www.mobiloud.com/blog/push-notification-statistics)

---

## Cross-Cutting Gaps vs. Industry Standards

These are issues that affect multiple phases and are not addressed in any single PRD.

### 1. GDPR Right to Data Portability (Article 20) ✅ RESOLVED
**What it requires:** On request, provide all personal data in a machine-readable format (JSON or CSV) within 30 days.
**Resolution:** US-P5-005 added to Phase 5 — "Download my data" button in player settings, JSON and CSV formats, all 9 data domains, consent-gated cycle phase, privateInsight excluded, rate-limited to 1 export per 24h.

### 2. Right to Erasure (Article 17) — Partially missing
**What it requires:** On request, delete all personal data unless there is a legitimate interest or legal obligation to retain it.
**What we have:** `withdrawCycleTrackingConsent` deletes cycle phase data. No general erasure mechanism.
**Action required:** A `requestDataErasure` mutation and admin review flow needs to be designed. Sport clubs may have a legitimate interest in retaining statistical data even after a player leaves, but the mechanism must exist.

### 3. Accessibility (WCAG 2.1 AA) — Not explicitly specified
**What it requires:** Keyboard navigation, screen reader support (`aria-label`s), minimum 4.5:1 contrast ratio, focus indicators.
**What we have:** 44×44px touch targets specified for mobile (Phase 1, 3, 4). Org theme variables used. No explicit WCAG compliance requirement in any acceptance criterion.
**Action required:** Add `npm run check-types passes` equivalents for accessibility — a tool like `axe-playwright` in the E2E test suite would catch most WCAG AA violations automatically.

### 4. Data Retention Schedules — Not specified
**What it requires:** GDPR requires documented retention policies. COPPA requires a written data retention policy with deletion schedules.
**What we have:** 30-day token expiry (Phase 2), 8h session expiry (Phase 8). No org-level data retention configuration.
**Action required:** Add org-level retention settings (e.g., "wellness data retained for 2 years") and a cron that enforces deletion.

### 5. Audit Logging — Partial
**What we have:** `changeLog` on `parentChildAuthorizations` (Phase 7). No system-wide audit log.
**Industry standard:** Kitman Labs, Teamworks, and Catapult all maintain immutable audit logs for all data access and modification events — critical for both GDPR Article 30 (Records of Processing Activities) and club governance.
**Action required:** A lightweight `auditEvents` table (userId, role, action, targetTable, targetId, timestamp, orgId) populated by all sensitive mutations would bring the platform to compliance.

---

## Summary Scorecard

| Phase | Vs Industry | Key Strength | Key Gap |
|-------|-------------|--------------|---------|
| P1: Portal | **Ahead** | "Today" priority first-screen + full profile below ✅ | No PWA/offline |
| P2: Graduation | **Ahead** | Record continuity best-in-class; SMS/email PIN verification on claim ✅ | No merge audit trail |
| P3: Matching | **Ahead** | Irish name normalisation + multi-signal confidence ✅ | No merge audit trail |
| P4: Wellness | **Ahead** (privacy + design) | Per-coach consent unique; 5-core/3-optional Hooper-aligned model ✅ | No session RPE; no wearable integration |
| P5: Portal Sections | **Ahead** | GDPR Art.20 export added ✅; privateInsight/publicSummary split innovative | Injury triage bypasses medical staff |
| P6: Multi-Role | **Ahead** | All gaps closed ✅ — server-side guards, role-scoped notifications, deep link prompt, first-run onboarding | Role audit log deferred to future audit phase |
| P7: Child Auth | **Ahead** | Per-content-type toggles; pre-birthday notifications; child erasure right ✅; separate audit table ✅ | COPPA verifiable consent gap for US deployment (deferred); no profiling prohibition added ✅ |
| P8: WhatsApp | **Ahead** | WhatsApp Flows ahead of market; channel abstraction; all GDPR gaps closed ✅ (Article 9 consent, DPIA, EU BSP, wa_id pseudonymization, opt-out phrasing) | No native push notifications; no wearable-triggered dispatch; Twilio SMS EU residency still in beta |

**Overall:** PlayerARC's Adult Player Lifecycle design is competitive with or ahead of the market in record continuity, privacy granularity, and messaging channel sophistication. Five gaps have been resolved since initial analysis (Today first-screen, token claim identity verification, Irish name normalisation, Hooper-aligned 5-question wellness model, GDPR Article 20 export). Remaining open gaps: no native push notification path, and no wearable integration roadmap.

---

*Document generated: 2026-02-25*
*Sources consulted:*
- [Kitman Labs Platform](https://www.kitmanlabs.com/platform/)
- [Kitman Labs AMS vs AMS comparison](https://www.kitmanlabs.com/athlete-monitoring-systems/)
- [Top 10 Athlete Data Management Software — SportFirst](https://www.sportsfirst.net/post/top-10-athlete-data-management-software)
- [SportsEngine Team Management](https://play.google.com/store/apps/details?id=com.sportngin.android&hl=en_US)
- [Ethical Risks of Systematic Menstrual Tracking in Sport — Springer](https://link.springer.com/article/10.1007/s11673-023-10333-9)
- [GDPR Guide for Sports Clubs — Wright Hassall](https://www.wrighthassall.co.uk/knowledge-base/guide-to-the-sports-clubs)
- [COPPA updated Rule 2025 — FTC](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa)
- [WhatsApp Survey Tools 2025 — Zonka Feedback](https://www.zonkafeedback.com/blog/whatsapp-survey-tools)
- [WhatsApp Surveys for High Response Rates — Merren](https://merren.io/we-ran-200-surveys-on-fb-messenger-and-whatsapp-8-strategies-we-discovered-for-a-higher-success-rate/)
- [FitrWoman App](https://www.fitrwoman.net/)
- [Biometric Data and Athletes: Privacy Law — Architecture & Governance](https://www.architectureandgovernance.com/applications-technology/biometric-data-and-athletes-privacy-law-and-compliance-implications/)
- [Children's Privacy Rules — Pandectes](https://pandectes.io/blog/childrens-online-privacy-rules-around-coppa-gdpr-k-and-age-verification/)
- [Sports Dashboard Design — Lollypop](https://lollypop.design/blog/2019/november/dashboard-design-in-the-sports-industry/)
- [Customizable Dashboards in Sports Apps — Moldstud](https://moldstud.com/articles/p-creating-a-customizable-dashboard-for-personalized-content-in-sports-apps)
