/**
 * GAA Foireann Testing Infrastructure
 *
 * Mock data and utilities for testing GAA sync functionality without hitting the real Foireann API.
 *
 * Includes:
 * - Realistic test member data with edge cases
 * - Mock API response formats
 * - Mock Foireann API client for testing
 * - Test mutations for validating sync functionality
 */

import type { GAAMember } from "./gaaMapper";

// ===== Mock GAA Member Data =====

/**
 * Collection of realistic GAA member test data
 * Covers various scenarios and edge cases:
 * - Valid members with complete data
 * - Members with missing optional fields (email, phone)
 * - Invalid data (malformed email, phone, address)
 * - Lapsed memberships
 * - Members with Irish unicode characters in names (Seán, Niamh)
 * - Various address formats
 */
export const mockGAAMembers: GAAMember[] = [
  // 1. Valid member with complete data
  {
    memberId: "GAA-001",
    firstName: "Seán",
    lastName: "Murphy",
    dateOfBirth: "2010-05-15",
    email: "sean.murphy@example.ie",
    phone: "087 123 4567",
    address: "123 Main Street, Dublin, County Dublin, D02 X123",
    membershipNumber: "123-45678-901",
    membershipStatus: "Active",
    joinDate: "2020-01-15",
  },

  // 2. Valid member with no email
  {
    memberId: "GAA-002",
    firstName: "Niamh",
    lastName: "O'Brien",
    dateOfBirth: "2012-08-22",
    phone: "086 987 6543",
    address: "45 Oak Road, Cork, County Cork, T12 ABC1",
    membershipNumber: "234-56789-012",
    membershipStatus: "Active",
    joinDate: "2021-03-10",
  },

  // 3. Valid member with no phone
  {
    memberId: "GAA-003",
    firstName: "Ciarán",
    lastName: "Walsh",
    dateOfBirth: "2009-11-30",
    email: "ciaran.walsh@example.ie",
    address: "78 River View, Galway, County Galway, H91 XY56",
    membershipNumber: "345-67890-123",
    membershipStatus: "Active",
    joinDate: "2019-09-01",
  },

  // 4. Lapsed membership
  {
    memberId: "GAA-004",
    firstName: "Patrick",
    lastName: "Fitzgerald",
    dateOfBirth: "2008-03-12",
    email: "patrick.fitzgerald@example.ie",
    phone: "085 234 5678",
    address: "12 Church Street, Limerick, County Limerick, V94 AB12",
    membershipNumber: "456-78901-234",
    membershipStatus: "Lapsed",
    joinDate: "2018-02-20",
  },

  // 5. Invalid email format (should generate warning)
  {
    memberId: "GAA-005",
    firstName: "Aoife",
    lastName: "Kelly",
    dateOfBirth: "2011-07-08",
    email: "aoife.kelly@invalid", // Missing TLD
    phone: "087 345 6789",
    address: "56 Park Avenue, Waterford, County Waterford, X91 CD34",
    membershipNumber: "567-89012-345",
    membershipStatus: "Active",
    joinDate: "2020-06-15",
  },

  // 6. Invalid phone format (should generate warning)
  {
    memberId: "GAA-006",
    firstName: "Conor",
    lastName: "Ryan",
    dateOfBirth: "2013-01-25",
    email: "conor.ryan@example.ie",
    phone: "not-a-phone-number",
    address: "89 Hill Road, Kilkenny, County Kilkenny, R95 EF78",
    membershipNumber: "678-90123-456",
    membershipStatus: "Active",
    joinDate: "2022-01-10",
  },

  // 7. Malformed address (single line, no commas)
  {
    memberId: "GAA-007",
    firstName: "Sinéad",
    lastName: "McCarthy",
    dateOfBirth: "2010-09-14",
    email: "sinead.mccarthy@example.ie",
    phone: "+353 86 456 7890",
    address: "34 Green Street Sligo",
    membershipNumber: "789-01234-567",
    membershipStatus: "Active",
    joinDate: "2020-08-05",
  },

  // 8. Missing membership number (should still import using name+DOB matching)
  {
    memberId: "GAA-008",
    firstName: "Liam",
    lastName: "Brennan",
    dateOfBirth: "2012-04-18",
    email: "liam.brennan@example.ie",
    phone: "087 567 8901",
    address: "67 Main Road, Donegal, County Donegal, F94 GH90",
    membershipStatus: "Active",
    joinDate: "2021-05-20",
  },

  // 9. Invalid membership number format (should generate warning)
  {
    memberId: "GAA-009",
    firstName: "Emma",
    lastName: "Doyle",
    dateOfBirth: "2011-12-03",
    email: "emma.doyle@example.ie",
    phone: "086 678 9012",
    address: "23 Lake View, Cavan, County Cavan, H12 IJ01",
    membershipNumber: "INVALID-FORMAT", // Wrong format
    membershipStatus: "Active",
    joinDate: "2020-11-12",
  },

  // 10. Missing required field (lastName) - should generate error
  {
    memberId: "GAA-010",
    firstName: "Daniel",
    lastName: "", // Empty - required field
    dateOfBirth: "2009-06-27",
    email: "daniel.missing@example.ie",
    phone: "087 789 0123",
    address: "90 Sea Road, Wexford, County Wexford, Y35 KL23",
    membershipNumber: "901-23456-789",
    membershipStatus: "Active",
    joinDate: "2019-07-15",
  },

  // 11. Invalid date format (should generate error)
  {
    memberId: "GAA-011",
    firstName: "Grace",
    lastName: "Byrne",
    dateOfBirth: "2010/13/45", // Invalid date
    email: "grace.byrne@example.ie",
    phone: "086 890 1234",
    address: "15 Park Lane, Meath, County Meath, C15 MN45",
    membershipNumber: "012-34567-890",
    membershipStatus: "Active",
    joinDate: "2020-09-01",
  },

  // 12. Phone with +353 country code (should normalize correctly)
  {
    memberId: "GAA-012",
    firstName: "Tadhg",
    lastName: "O'Sullivan",
    dateOfBirth: "2013-02-10",
    email: "tadhg.osullivan@example.ie",
    phone: "+353 87 901 2345",
    address: "42 Castle Street, Kerry, County Kerry, V93 OP67",
    membershipNumber: "123-98765-432",
    membershipStatus: "Active",
    joinDate: "2022-03-01",
  },

  // 13. Phone without country code (should add +353)
  {
    memberId: "GAA-013",
    firstName: "Róisín",
    lastName: "Connolly",
    dateOfBirth: "2011-10-05",
    email: "roisin.connolly@example.ie",
    phone: "0871234567", // No spaces or country code
    address: "88 High Street, Mayo, County Mayo, F23 QR89",
    membershipNumber: "234-87654-321",
    membershipStatus: "Active",
    joinDate: "2021-02-14",
  },
];

// ===== Mock API Responses =====

/**
 * Mock paginated membership list response from GAA Foireann API
 *
 * Simulates API returning first page of members (100 per page)
 * Set hasMore=true to test pagination logic
 */
export function mockGAAMembershipListResponse(
  page = 1,
  perPage = 100
): {
  members: GAAMember[];
  page: number;
  perPage: number;
  totalCount: number;
  hasMore: boolean;
} {
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const pageMembers = mockGAAMembers.slice(startIndex, endIndex);

  return {
    members: pageMembers,
    page,
    perPage,
    totalCount: mockGAAMembers.length,
    hasMore: endIndex < mockGAAMembers.length,
  };
}

/**
 * Mock detailed member response from GAA Foireann API
 *
 * Returns member with additional detail fields:
 * - Emergency contacts
 * - Medical info
 * - Player positions
 * - Team assignments
 */
export function mockGAAMemberDetailResponse(memberId: string): {
  member: GAAMember & {
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    medicalConditions?: string;
    allergies?: string;
    playerPositions?: string[];
    teams?: Array<{
      teamId: string;
      teamName: string;
      ageGroup: string;
    }>;
  };
} {
  const baseMember = mockGAAMembers.find((m) => m.memberId === memberId);

  if (!baseMember) {
    throw new Error(`Member ${memberId} not found`);
  }

  // Add detail fields based on member ID for variety
  const detailFields:
    | {
        emergencyContactName?: string;
        emergencyContactPhone?: string;
        medicalConditions?: string;
        allergies?: string;
        playerPositions?: string[];
        teams?: Array<{
          teamId: string;
          teamName: string;
          ageGroup: string;
        }>;
      }
    | Record<string, never> =
    memberId === "GAA-001"
      ? {
          emergencyContactName: "Mary Murphy",
          emergencyContactPhone: "+353 87 111 2222",
          medicalConditions: "Asthma",
          allergies: "Peanuts",
          playerPositions: ["Full Forward", "Midfielder"],
          teams: [
            {
              teamId: "TEAM-001",
              teamName: "U14 Hurling",
              ageGroup: "U14",
            },
          ],
        }
      : memberId === "GAA-002"
        ? {
            emergencyContactName: "John O'Brien",
            emergencyContactPhone: "+353 86 222 3333",
            playerPositions: ["Corner Back"],
            teams: [
              {
                teamId: "TEAM-002",
                teamName: "U12 Camogie",
                ageGroup: "U12",
              },
            ],
          }
        : {};

  return {
    member: {
      ...baseMember,
      ...detailFields,
    },
  };
}

/**
 * Mock error responses for testing error handling
 */
export const mockGAAErrorResponses = {
  unauthorized: {
    status: 401,
    message: "Invalid or expired OAuth token",
  },
  forbidden: {
    status: 403,
    message: "Access denied to this resource",
  },
  notFound: {
    status: 404,
    message: "Club or member not found",
  },
  rateLimited: {
    status: 429,
    message: "Rate limit exceeded. Try again later.",
  },
  serverError: {
    status: 500,
    message: "GAA Foireann API server error",
  },
};

// ===== Known Duplicate Test Data =====

/**
 * Test data for duplicate detection validation
 *
 * These members should be detected as duplicates based on:
 * - Matching GAA membership number (strongest signal)
 * - Matching name + DOB (fallback)
 */
export const mockDuplicateTestCases = [
  {
    scenario:
      "Same membership number, different name (should match by membership number)",
    existing: {
      memberId: "GAA-001",
      firstName: "Seán",
      lastName: "Murphy",
      dateOfBirth: "2010-05-15",
      membershipNumber: "123-45678-901",
    },
    incoming: {
      memberId: "GAA-001-DUP",
      firstName: "Sean", // Different spelling (no fada)
      lastName: "Murphy",
      dateOfBirth: "2010-05-15",
      membershipNumber: "123-45678-901", // SAME membership number
    },
    expectedMatch: "HIGH_CONFIDENCE",
    expectedReason: "GAA membership number match",
  },
  {
    scenario:
      "Same name + DOB, no membership number (should match by name+DOB)",
    existing: {
      memberId: "GAA-008",
      firstName: "Liam",
      lastName: "Brennan",
      dateOfBirth: "2012-04-18",
      // No membership number
    },
    incoming: {
      memberId: "GAA-008-DUP",
      firstName: "Liam",
      lastName: "Brennan",
      dateOfBirth: "2012-04-18",
      // No membership number
    },
    expectedMatch: "MEDIUM_CONFIDENCE",
    expectedReason: "Name + DOB match",
  },
  {
    scenario:
      "Similar name (typo), same DOB (should not match or low confidence)",
    existing: {
      memberId: "GAA-002",
      firstName: "Niamh",
      lastName: "O'Brien",
      dateOfBirth: "2012-08-22",
    },
    incoming: {
      memberId: "GAA-002-DUP",
      firstName: "Niamh",
      lastName: "O'Brian", // Typo in last name
      dateOfBirth: "2012-08-22",
    },
    expectedMatch: "LOW_CONFIDENCE",
    expectedReason: "Name similarity but not exact match",
  },
];
