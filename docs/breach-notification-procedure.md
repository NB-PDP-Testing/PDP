# Data Breach Notification Procedure

**Version:** 1.0 — Phase 9 Compliance Sprint
**Applicable regulation:** GDPR Articles 33 & 34 | Irish Data Protection Act 2018
**Primary regulator:** Irish Data Protection Commission (DPC)

---

## Overview

This procedure applies when any member of the organisation becomes aware of a personal data breach involving PlayerARC data. A "personal data breach" is any security incident leading to the accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to personal data.

**All incidents — regardless of severity — must be logged in the Breach Register in PlayerARC.**

---

## Step 1 — Identification & Containment

**As soon as an incident is discovered:**

1. **Contain the breach** — stop the source of the breach. This may include:
   - Disabling a compromised user account
   - Revoking unauthorised data access
   - Isolating an affected system or integration
   - Blocking an external attacker's access point

2. **Do not delete evidence.** Preserve logs, screenshots, and system records that document what happened.

3. **Who to contact first:**
   - Contact your organisation's **Data Controller** (the club admin designated as the GDPR controller) immediately.
   - If you cannot reach the Data Controller within 1 hour, escalate to the club's committee chair.

4. **Document the discovery time** — GDPR's 72-hour clock starts from when the organisation first *becomes aware* of the breach, not from when it occurred.

---

## Step 2 — Assessment

Within the first few hours, the Data Controller must assess:

| Question | Relevance |
|---|---|
| Was personal data involved? | If no personal data: no GDPR notification required, but log the incident anyway |
| What categories of data? | Health data (wellness check-ins, injuries) = special category data — higher risk |
| How many individuals affected? | More individuals = higher risk, more likely to require DPC notification |
| What was the likely impact on individuals? | Physical, financial, reputational, or emotional harm |
| Has the breach been fully contained? | If not: immediate containment is priority 1 |

**PlayerARC data categories (high risk):**
- Wellness / health check-in data (special category health data under Article 9 GDPR)
- Injury records (special category data if medical treatment involved)
- Guardian / parent personal data linked to minors
- Minor children's data

---

## Step 3 — Internal Escalation

| Timeline | Action |
|---|---|
| 0–1 hours | Data Controller notified by person who discovered the breach |
| 1–8 hours | Data Controller assesses severity and determines whether DPC notification is required |
| 8–24 hours | All relevant internal parties briefed; containment confirmed |
| 24 hours | Internal incident report drafted; decision on DPC notification finalised |

**The Data Controller must be notified within 24 hours of detection even if assessment is still ongoing.**

---

## Step 4 — DPC Notification (72-hour requirement)

**When is DPC notification required?**

Notification is required unless the breach is "unlikely to result in a risk to the rights and freedoms of natural persons." In practice, **notify the DPC if:**

- Personal data of any individual has been exposed to an unauthorised party
- Health or special category data was involved (almost always notify)
- Data of minors was involved
- A large number of individuals were affected

**When is notification NOT required?**

- Accidental internal access with no external disclosure AND the data was encrypted AND access was immediately revoked with no evidence of exfiltration
- Test/dummy data only — no real personal data involved

**How to notify the Irish DPC:**

1. Navigate to: **https://forms.dataprotection.ie/report-a-breach-of-personal-data**
2. Complete the online breach notification form
3. Record the DPC submission reference number
4. Update the Breach Register in PlayerARC with the notification date and reference

**Required information for DPC notification (Article 33(3)):**
- Nature of the breach (categories and approximate number of data subjects affected)
- Name and contact details of the Data Protection Officer or contact point
- Likely consequences of the breach
- Measures taken or proposed to address the breach

---

## Step 5 — Individual Notification (Article 34)

**When are individuals (data subjects) notified?**

Notification to affected individuals is required when the breach is "likely to result in a high risk to the rights and freedoms of natural persons." This applies when:

- Health or special category data was exposed
- Data of minors was exposed to unauthorised parties
- Financial data was exposed
- The breach could enable identity theft or fraud

**How to notify individuals:**

- Contact affected players/guardians directly via email or telephone
- If individual contact is not possible (e.g. no email on file): publish a prominent public notice
- Notification should include: what happened, what data was involved, what you are doing about it, what individuals can do to protect themselves

**Record the individual notification date in the PlayerARC Breach Register.**

---

## Step 6 — Documentation

**All incidents must be logged in the Breach Register regardless of severity.**

The Breach Register in PlayerARC captures:
- Date/time detected
- Description of what happened
- Data categories affected
- Estimated number of individuals affected
- Severity assessment
- Status tracking (detected → assessment → DPC notified → individuals notified → closed)
- DPC notification date
- Individual notification date
- Resolution notes

**This register is your Article 33(5) compliance record. It must be available for DPC inspection on request.**

---

## Contact References

| Organisation | Contact |
|---|---|
| Irish Data Protection Commission (DPC) | https://www.dataprotection.ie |
| DPC breach notification form | https://forms.dataprotection.ie/report-a-breach-of-personal-data |
| DPC helpline | +353 (0)761 104 800 |
| PlayerARC support | support@playerarc.io |

---

## Related Policies

- GDPR Article 33 — Notification of a personal data breach to the supervisory authority
- GDPR Article 34 — Communication of a personal data breach to the data subject
- GDPR Article 33(5) — Documentation obligations
- Irish Data Protection Act 2018 — Section 71 (Personal data breaches)
- Children First Act 2015 — Mandatory reporting obligations for safeguarding incidents
