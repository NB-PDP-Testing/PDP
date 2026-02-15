# Phase 3.1 Test Data Files

This directory contains CSV test data files for Phase 3.1 manual UAT testing.

## Test Files

### 1. duplicate-guardians.csv

**Purpose**: Test confidence indicator features (US-P3.1-001 to 004)

**Contents**: 10 players with intentional duplicate guardians

**Expected Duplicate Patterns**:

| Players | Guardian | Expected Confidence | Match Signals |
|---------|----------|---------------------|---------------|
| Emma Walsh & Sophie O'Connor | Sarah Walsh | **High (60+)** | ✅ Email exact match<br>✅ Name exact match<br>✅ Address exact match<br>✅ Phone different (expected: 80-90%) |
| Jack Murphy & Liam Kelly | John Murphy | **Medium (40-59)** | ✅ Email domain match<br>✅ Phone exact match<br>✅ Name exact match<br>✅ Address exact match<br>(Expected: 50-60%) |
| Aoife Ryan & Conor Brennan | Mary Ryan / M. Ryan | **Medium (40-59)** | ✅ Email exact match<br>✅ Phone exact match<br>⚠️ Name similarity (Mary vs M.)<br>✅ Address exact match<br>(Expected: 50-60%) |
| Niamh McCarthy & Cian O'Sullivan | Lisa McCarthy | **Medium (40-59)** | ✅ Email exact match<br>✅ Phone match (format variation)<br>✅ Name exact match<br>✅ Address exact match<br>(Expected: 55-65%) |
| Saoirse Doyle & Finn Gallagher | Katie Doyle | **Low (<40)** | ✅ Email exact match<br>❌ Phone missing<br>✅ Name exact match<br>❌ Address missing<br>(Expected: 30-40%) |

**Usage**:
```bash
# Upload this file during import wizard
# On Review step, verify confidence scores match expectations
# Test admin override on low/high confidence matches
```

---

### 2. clean-players.csv

**Purpose**: Test partial undo functionality (US-P3.1-005 to 008)

**Contents**: 10 players with unique guardians (no duplicates)

**Players**:
1. Ava Byrne (F, 2015-04-22)
2. Sean O'Brien (M, 2014-10-15)
3. Ella Donnelly (F, 2015-01-28)
4. Ryan Kavanagh (M, 2014-07-08)
5. Grace Lynch (F, 2015-08-11)
6. Dylan Murray (M, 2014-03-19)
7. Lucy Quinn (F, 2015-11-03)
8. Adam Dunne (M, 2014-09-27)
9. Kate Nolan (F, 2015-05-16)
10. James Kennedy (M, 2014-06-14)

**Usage**:
```bash
# Import this file completely (all players)
# After import completes, test Partial Undo dialog
# Select 3-5 players for removal
# Verify remaining players stay intact
```

**Test Scenarios**:
- Search for "Sean" → should find "Sean O'Brien"
- Search for "o'br" → should find "Sean O'Brien" (case-insensitive)
- Filter by "Active" status
- Select Ava, Sean, Ella for removal
- Verify Ryan, Grace, Dylan, Lucy, Adam, Kate, James remain

---

## Creating Additional Test Data

### Large Import Test (50+ players)

To test performance with larger datasets, duplicate the clean-players.csv data and modify names:

```csv
First Name,Last Name,Date of Birth,Gender,Parent Email,Parent Phone
Ava,Byrne,2015-04-22,Female,ava.parent@example.com,0867778899
Sean,O'Brien,2014-10-15,Male,sean.parent@example.com,0850001122
... (repeat with variations like Ava2, Sean2, etc.)
```

### Error Testing Data

To test error handling, create files with:
- Invalid dates: `2015-13-45` (month > 12)
- Missing required fields
- Invalid phone formats
- Special characters in names

---

## Notes

- All phone numbers use Irish format (087/086/085 prefixes)
- Email addresses use @example.com or @email.com domains
- Date format: YYYY-MM-DD (ISO 8601)
- Gender values: Male, Female

---

## File Locations

These files are located at:
```
docs/testing/import/test-data/
├── duplicate-guardians.csv
├── clean-players.csv
└── README.md (this file)
```

Reference from test guide: `docs/testing/import/phase-3.1-manual-tests.md`
