# Confidence Level Testing - Step-by-Step Guide

## Problem with Single-File Testing

The duplicate detection system checks **uploaded players against EXISTING guardians in the database**. It does NOT detect duplicates within the same CSV file.

This means:
- If you upload a CSV with 10 players and no guardians exist → **0 duplicates detected**
- If you upload a CSV and ALL guardians exist → **ALL players show as duplicates**

## Solution: 2-Step Import Process

To test different confidence levels (HIGH, MEDIUM, LOW) in one session, you need:

### Step 1: Import Base Guardians
**File:** `step1-base-guardians.csv`

This creates 4 guardians with specific data patterns:

| Guardian | Email | Phone | Name | Address | Purpose |
|----------|-------|-------|------|---------|---------|
| Guardian Full | ✅ | ✅ | ✅ | ✅ | For HIGH (100%) match |
| Guardian EmailName | ✅ | ❌ | ✅ | ❌ | For HIGH (60%) match |
| Guardian PhoneOnly | ❌ | ✅ | ✅ | ❌ | For LOW (30%) match |
| Different Name | ✅ | ❌ | ❌ | ❌ | For MEDIUM (40%) match |

**Instructions:**
1. Upload `step1-base-guardians.csv`
2. Complete the full import wizard
3. Verify 4 players imported successfully

### Step 2: Import Duplicate Test
**File:** `step2-duplicate-test.csv`

This file will match against the guardians created in Step 1:

| Player | Will Match | Confidence | Signals |
|--------|-----------|------------|---------|
| DupTest1 FullMatch | Guardian Full | **HIGH (100%)** | Email(40) + Phone(30) + Name+Addr(30) |
| DupTest2 EmailNameMatch | Guardian EmailName | **HIGH (60%)** | Email(40) + Name(20) |
| DupTest3 PhoneMatch | Guardian PhoneOnly | **LOW (30%)** | Phone(30) only |
| DupTest4 EmailDiffName | Different Name | **MEDIUM (40%)** | Email(40) only |

**Instructions:**
1. Upload `step2-duplicate-test.csv`
2. On the **Review step**, you should see **4 duplicates** with different confidence levels
3. Test admin override features (Force Link, Reject Link)

## Expected Results

After uploading `step2-duplicate-test.csv`, the Review step should show:

```
Duplicate Players Detected (4)

✅ HIGH CONFIDENCE (100%)
   Player: DupTest1 FullMatch
   Existing Guardian: Guardian Full
   Signals: ✅ Email ✅ Phone ✅ Name ✅ Address

✅ HIGH CONFIDENCE (60%)
   Player: DupTest2 EmailNameMatch
   Existing Guardian: Guardian EmailName
   Signals: ✅ Email ✅ Name

⚠️ MEDIUM CONFIDENCE (40%)
   Player: DupTest4 EmailDiffName
   Existing Guardian: Different Name
   Signals: ✅ Email

❌ LOW CONFIDENCE (30%)
   Player: DupTest3 PhoneMatch
   Existing Guardian: Guardian PhoneOnly
   Signals: ✅ Phone
```

## Troubleshooting

**"I'm seeing more than 4 duplicates!"**
- You have old guardian data in the database
- Solution: Clear test guardians before Step 1

**"All duplicates showing same confidence!"**
- Check that Step 1 guardians were created correctly
- Verify email addresses match exactly between files
- Check phone numbers match format (087xxxxxxx)

**"No duplicates detected!"**
- Step 1 guardians don't exist in database
- Make sure you completed Step 1 import first

## Clearing Test Data

Before starting fresh, clear old test guardians:
1. Delete import sessions from history
2. Clear guardian test data via Convex dashboard
3. Start with Step 1 again
