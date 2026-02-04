/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    adapter: {
      create: FunctionReference<
        "mutation",
        "internal",
        {
          input:
            | {
                data: {
                  address?: string;
                  altEmail?: string;
                  childLinkingSkipCount?: number;
                  country?: string;
                  createdAt: number;
                  currentOrgId?: string;
                  email: string;
                  emailVerified: boolean;
                  firstName?: string;
                  gdprConsentVersion?: number;
                  gdprConsentedAt?: number;
                  image?: null | string;
                  isPlatformStaff?: boolean;
                  lastChildrenCheckAt?: number;
                  lastName?: string;
                  name: string;
                  onboardingComplete?: boolean;
                  parentOnboardingDismissCount?: number;
                  parentOnboardingLastDismissedAt?: number;
                  phone?: string;
                  postcode?: string;
                  profileCompletedAt?: number;
                  profileCompletionStatus?: "pending" | "completed" | "skipped";
                  profileSkipCount?: number;
                  setupComplete?: boolean;
                  setupStep?: string;
                  town?: string;
                  updatedAt: number;
                  userId?: null | string;
                };
                model: "user";
              }
            | {
                data: {
                  activeOrganizationId?: null | string;
                  activeTeamId?: null | string;
                  createdAt: number;
                  expiresAt: number;
                  ipAddress?: null | string;
                  token: string;
                  updatedAt: number;
                  userAgent?: null | string;
                  userId: string;
                };
                model: "session";
              }
            | {
                data: {
                  accessToken?: null | string;
                  accessTokenExpiresAt?: null | number;
                  accountId: string;
                  createdAt: number;
                  idToken?: null | string;
                  password?: null | string;
                  providerId: string;
                  refreshToken?: null | string;
                  refreshTokenExpiresAt?: null | number;
                  scope?: null | string;
                  updatedAt: number;
                  userId: string;
                };
                model: "account";
              }
            | {
                data: {
                  createdAt: number;
                  expiresAt: number;
                  identifier: string;
                  updatedAt: number;
                  value: string;
                };
                model: "verification";
              }
            | {
                data: {
                  createdAt: number;
                  privateKey: string;
                  publicKey: string;
                };
                model: "jwks";
              }
            | {
                data: {
                  ageGroup?: string;
                  coachNotes?: string;
                  createdAt: number;
                  description?: string;
                  gender?: "Male" | "Female" | "Mixed" | "Boys" | "Girls";
                  homeVenue?: string;
                  isActive?: boolean;
                  name: string;
                  organizationId: string;
                  season?: string;
                  sport?: string;
                  trainingSchedule?: string;
                  updatedAt?: null | number;
                };
                model: "team";
              }
            | {
                data: {
                  createdAt?: null | number;
                  teamId: string;
                  userId: string;
                };
                model: "teamMember";
              }
            | {
                data: {
                  adminBlanketBlock?: boolean;
                  adminBlanketBlockSetAt?: number;
                  adminBlanketBlockSetBy?: string;
                  adminContactEmail?: string;
                  adminOverrideSetAt?: number;
                  adminOverrideSetBy?: string;
                  adminOverrideTrustGates?: boolean;
                  allowAdminDelegation?: boolean;
                  allowCoachOverrides?: boolean;
                  autoReInviteOnExpiration?: boolean;
                  colors?: Array<string>;
                  createdAt: number;
                  invitationExpirationDays?: number;
                  logo?: null | string;
                  maxAutoReInvitesPerInvitation?: number;
                  metadata?: null | string;
                  name: string;
                  notifyAdminsOnInvitationRequest?: boolean;
                  sharingContactEmail?: null | string;
                  sharingContactMode?: "direct" | "enquiry" | "none";
                  sharingContactName?: null | string;
                  sharingContactPhone?: null | string;
                  slug: string;
                  socialFacebook?: null | string;
                  socialInstagram?: null | string;
                  socialLinkedin?: null | string;
                  socialTwitter?: null | string;
                  supportedSports?: Array<string>;
                  voiceNotesTrustGatesEnabled?: boolean;
                  website?: null | string;
                };
                model: "organization";
              }
            | {
                data: {
                  activeFunctionalRole?:
                    | "coach"
                    | "parent"
                    | "admin"
                    | "player";
                  createdAt: number;
                  disableReason?: string;
                  disableType?: "org_only" | "account";
                  disabledAt?: number;
                  disabledBy?: string;
                  functionalRoles?: Array<
                    "coach" | "parent" | "admin" | "player"
                  >;
                  isDisabled?: boolean;
                  lastAccessedOrgs?: Array<{
                    orgId: string;
                    role: string;
                    timestamp: number;
                  }>;
                  organizationId: string;
                  pendingFunctionalRoleRequests?: Array<{
                    message?: string;
                    requestedAt: string;
                    role: "coach" | "parent" | "admin" | "player";
                  }>;
                  role: string;
                  userId: string;
                };
                model: "member";
              }
            | {
                data: {
                  autoReInviteCount?: number;
                  email: string;
                  expiresAt: number;
                  inviterId: string;
                  metadata?: any;
                  organizationId: string;
                  role?: null | string;
                  status: string;
                  teamId?: null | string;
                };
                model: "invitation";
              }
            | {
                data: {
                  createdAt: number;
                  createdBy: string;
                  effectiveDate: number;
                  fullText: string;
                  summary: string;
                  version: number;
                };
                model: "gdprVersions";
              };
          onCreateHandle?: string;
          select?: Array<string>;
        },
        any,
        Name
      >;
      deleteMany: FunctionReference<
        "mutation",
        "internal",
        {
          input:
            | {
                model: "user";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "email"
                    | "emailVerified"
                    | "image"
                    | "createdAt"
                    | "updatedAt"
                    | "userId"
                    | "isPlatformStaff"
                    | "firstName"
                    | "lastName"
                    | "phone"
                    | "altEmail"
                    | "address"
                    | "town"
                    | "postcode"
                    | "country"
                    | "profileCompletionStatus"
                    | "profileCompletedAt"
                    | "profileSkipCount"
                    | "onboardingComplete"
                    | "lastChildrenCheckAt"
                    | "parentOnboardingDismissCount"
                    | "parentOnboardingLastDismissedAt"
                    | "childLinkingSkipCount"
                    | "currentOrgId"
                    | "gdprConsentVersion"
                    | "gdprConsentedAt"
                    | "setupComplete"
                    | "setupStep"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "session";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "expiresAt"
                    | "token"
                    | "createdAt"
                    | "updatedAt"
                    | "ipAddress"
                    | "userAgent"
                    | "userId"
                    | "activeOrganizationId"
                    | "activeTeamId"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "account";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "accountId"
                    | "providerId"
                    | "userId"
                    | "accessToken"
                    | "refreshToken"
                    | "idToken"
                    | "accessTokenExpiresAt"
                    | "refreshTokenExpiresAt"
                    | "scope"
                    | "password"
                    | "createdAt"
                    | "updatedAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "verification";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "identifier"
                    | "value"
                    | "expiresAt"
                    | "createdAt"
                    | "updatedAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "jwks";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field: "publicKey" | "privateKey" | "createdAt" | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "team";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "organizationId"
                    | "createdAt"
                    | "updatedAt"
                    | "sport"
                    | "ageGroup"
                    | "gender"
                    | "season"
                    | "description"
                    | "trainingSchedule"
                    | "homeVenue"
                    | "isActive"
                    | "coachNotes"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "teamMember";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field: "teamId" | "userId" | "createdAt" | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "organization";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "slug"
                    | "logo"
                    | "createdAt"
                    | "metadata"
                    | "colors"
                    | "socialFacebook"
                    | "socialTwitter"
                    | "socialInstagram"
                    | "socialLinkedin"
                    | "website"
                    | "supportedSports"
                    | "sharingContactMode"
                    | "sharingContactName"
                    | "sharingContactEmail"
                    | "sharingContactPhone"
                    | "invitationExpirationDays"
                    | "autoReInviteOnExpiration"
                    | "maxAutoReInvitesPerInvitation"
                    | "adminContactEmail"
                    | "notifyAdminsOnInvitationRequest"
                    | "voiceNotesTrustGatesEnabled"
                    | "allowAdminDelegation"
                    | "allowCoachOverrides"
                    | "adminOverrideTrustGates"
                    | "adminOverrideSetBy"
                    | "adminOverrideSetAt"
                    | "adminBlanketBlock"
                    | "adminBlanketBlockSetBy"
                    | "adminBlanketBlockSetAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "member";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "organizationId"
                    | "userId"
                    | "role"
                    | "createdAt"
                    | "functionalRoles"
                    | "activeFunctionalRole"
                    | "pendingFunctionalRoleRequests"
                    | "lastAccessedOrgs"
                    | "isDisabled"
                    | "disabledAt"
                    | "disabledBy"
                    | "disableReason"
                    | "disableType"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "invitation";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "organizationId"
                    | "email"
                    | "role"
                    | "teamId"
                    | "status"
                    | "expiresAt"
                    | "inviterId"
                    | "metadata"
                    | "autoReInviteCount"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "gdprVersions";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "version"
                    | "effectiveDate"
                    | "summary"
                    | "fullText"
                    | "createdBy"
                    | "createdAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              };
          onDeleteHandle?: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        any,
        Name
      >;
      deleteOne: FunctionReference<
        "mutation",
        "internal",
        {
          input:
            | {
                model: "user";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "email"
                    | "emailVerified"
                    | "image"
                    | "createdAt"
                    | "updatedAt"
                    | "userId"
                    | "isPlatformStaff"
                    | "firstName"
                    | "lastName"
                    | "phone"
                    | "altEmail"
                    | "address"
                    | "town"
                    | "postcode"
                    | "country"
                    | "profileCompletionStatus"
                    | "profileCompletedAt"
                    | "profileSkipCount"
                    | "onboardingComplete"
                    | "lastChildrenCheckAt"
                    | "parentOnboardingDismissCount"
                    | "parentOnboardingLastDismissedAt"
                    | "childLinkingSkipCount"
                    | "currentOrgId"
                    | "gdprConsentVersion"
                    | "gdprConsentedAt"
                    | "setupComplete"
                    | "setupStep"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "session";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "expiresAt"
                    | "token"
                    | "createdAt"
                    | "updatedAt"
                    | "ipAddress"
                    | "userAgent"
                    | "userId"
                    | "activeOrganizationId"
                    | "activeTeamId"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "account";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "accountId"
                    | "providerId"
                    | "userId"
                    | "accessToken"
                    | "refreshToken"
                    | "idToken"
                    | "accessTokenExpiresAt"
                    | "refreshTokenExpiresAt"
                    | "scope"
                    | "password"
                    | "createdAt"
                    | "updatedAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "verification";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "identifier"
                    | "value"
                    | "expiresAt"
                    | "createdAt"
                    | "updatedAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "jwks";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field: "publicKey" | "privateKey" | "createdAt" | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "team";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "organizationId"
                    | "createdAt"
                    | "updatedAt"
                    | "sport"
                    | "ageGroup"
                    | "gender"
                    | "season"
                    | "description"
                    | "trainingSchedule"
                    | "homeVenue"
                    | "isActive"
                    | "coachNotes"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "teamMember";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field: "teamId" | "userId" | "createdAt" | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "organization";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "slug"
                    | "logo"
                    | "createdAt"
                    | "metadata"
                    | "colors"
                    | "socialFacebook"
                    | "socialTwitter"
                    | "socialInstagram"
                    | "socialLinkedin"
                    | "website"
                    | "supportedSports"
                    | "sharingContactMode"
                    | "sharingContactName"
                    | "sharingContactEmail"
                    | "sharingContactPhone"
                    | "invitationExpirationDays"
                    | "autoReInviteOnExpiration"
                    | "maxAutoReInvitesPerInvitation"
                    | "adminContactEmail"
                    | "notifyAdminsOnInvitationRequest"
                    | "voiceNotesTrustGatesEnabled"
                    | "allowAdminDelegation"
                    | "allowCoachOverrides"
                    | "adminOverrideTrustGates"
                    | "adminOverrideSetBy"
                    | "adminOverrideSetAt"
                    | "adminBlanketBlock"
                    | "adminBlanketBlockSetBy"
                    | "adminBlanketBlockSetAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "member";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "organizationId"
                    | "userId"
                    | "role"
                    | "createdAt"
                    | "functionalRoles"
                    | "activeFunctionalRole"
                    | "pendingFunctionalRoleRequests"
                    | "lastAccessedOrgs"
                    | "isDisabled"
                    | "disabledAt"
                    | "disabledBy"
                    | "disableReason"
                    | "disableType"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "invitation";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "organizationId"
                    | "email"
                    | "role"
                    | "teamId"
                    | "status"
                    | "expiresAt"
                    | "inviterId"
                    | "metadata"
                    | "autoReInviteCount"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "gdprVersions";
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "version"
                    | "effectiveDate"
                    | "summary"
                    | "fullText"
                    | "createdBy"
                    | "createdAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              };
          onDeleteHandle?: string;
        },
        any,
        Name
      >;
      findMany: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          model:
            | "user"
            | "session"
            | "account"
            | "verification"
            | "jwks"
            | "team"
            | "teamMember"
            | "organization"
            | "member"
            | "invitation"
            | "gdprVersions";
          offset?: number;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          sortBy?: { direction: "asc" | "desc"; field: string };
          where?: Array<{
            connector?: "AND" | "OR";
            field: string;
            operator?:
              | "lt"
              | "lte"
              | "gt"
              | "gte"
              | "eq"
              | "in"
              | "not_in"
              | "ne"
              | "contains"
              | "starts_with"
              | "ends_with";
            value:
              | string
              | number
              | boolean
              | Array<string>
              | Array<number>
              | null;
          }>;
        },
        any,
        Name
      >;
      findOne: FunctionReference<
        "query",
        "internal",
        {
          model:
            | "user"
            | "session"
            | "account"
            | "verification"
            | "jwks"
            | "team"
            | "teamMember"
            | "organization"
            | "member"
            | "invitation"
            | "gdprVersions";
          select?: Array<string>;
          where?: Array<{
            connector?: "AND" | "OR";
            field: string;
            operator?:
              | "lt"
              | "lte"
              | "gt"
              | "gte"
              | "eq"
              | "in"
              | "not_in"
              | "ne"
              | "contains"
              | "starts_with"
              | "ends_with";
            value:
              | string
              | number
              | boolean
              | Array<string>
              | Array<number>
              | null;
          }>;
        },
        any,
        Name
      >;
      updateMany: FunctionReference<
        "mutation",
        "internal",
        {
          input:
            | {
                model: "user";
                update: {
                  address?: string;
                  altEmail?: string;
                  childLinkingSkipCount?: number;
                  country?: string;
                  createdAt?: number;
                  currentOrgId?: string;
                  email?: string;
                  emailVerified?: boolean;
                  firstName?: string;
                  gdprConsentVersion?: number;
                  gdprConsentedAt?: number;
                  image?: null | string;
                  isPlatformStaff?: boolean;
                  lastChildrenCheckAt?: number;
                  lastName?: string;
                  name?: string;
                  onboardingComplete?: boolean;
                  parentOnboardingDismissCount?: number;
                  parentOnboardingLastDismissedAt?: number;
                  phone?: string;
                  postcode?: string;
                  profileCompletedAt?: number;
                  profileCompletionStatus?: "pending" | "completed" | "skipped";
                  profileSkipCount?: number;
                  setupComplete?: boolean;
                  setupStep?: string;
                  town?: string;
                  updatedAt?: number;
                  userId?: null | string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "email"
                    | "emailVerified"
                    | "image"
                    | "createdAt"
                    | "updatedAt"
                    | "userId"
                    | "isPlatformStaff"
                    | "firstName"
                    | "lastName"
                    | "phone"
                    | "altEmail"
                    | "address"
                    | "town"
                    | "postcode"
                    | "country"
                    | "profileCompletionStatus"
                    | "profileCompletedAt"
                    | "profileSkipCount"
                    | "onboardingComplete"
                    | "lastChildrenCheckAt"
                    | "parentOnboardingDismissCount"
                    | "parentOnboardingLastDismissedAt"
                    | "childLinkingSkipCount"
                    | "currentOrgId"
                    | "gdprConsentVersion"
                    | "gdprConsentedAt"
                    | "setupComplete"
                    | "setupStep"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "session";
                update: {
                  activeOrganizationId?: null | string;
                  activeTeamId?: null | string;
                  createdAt?: number;
                  expiresAt?: number;
                  ipAddress?: null | string;
                  token?: string;
                  updatedAt?: number;
                  userAgent?: null | string;
                  userId?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "expiresAt"
                    | "token"
                    | "createdAt"
                    | "updatedAt"
                    | "ipAddress"
                    | "userAgent"
                    | "userId"
                    | "activeOrganizationId"
                    | "activeTeamId"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "account";
                update: {
                  accessToken?: null | string;
                  accessTokenExpiresAt?: null | number;
                  accountId?: string;
                  createdAt?: number;
                  idToken?: null | string;
                  password?: null | string;
                  providerId?: string;
                  refreshToken?: null | string;
                  refreshTokenExpiresAt?: null | number;
                  scope?: null | string;
                  updatedAt?: number;
                  userId?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "accountId"
                    | "providerId"
                    | "userId"
                    | "accessToken"
                    | "refreshToken"
                    | "idToken"
                    | "accessTokenExpiresAt"
                    | "refreshTokenExpiresAt"
                    | "scope"
                    | "password"
                    | "createdAt"
                    | "updatedAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "verification";
                update: {
                  createdAt?: number;
                  expiresAt?: number;
                  identifier?: string;
                  updatedAt?: number;
                  value?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "identifier"
                    | "value"
                    | "expiresAt"
                    | "createdAt"
                    | "updatedAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "jwks";
                update: {
                  createdAt?: number;
                  privateKey?: string;
                  publicKey?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field: "publicKey" | "privateKey" | "createdAt" | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "team";
                update: {
                  ageGroup?: string;
                  coachNotes?: string;
                  createdAt?: number;
                  description?: string;
                  gender?: "Male" | "Female" | "Mixed" | "Boys" | "Girls";
                  homeVenue?: string;
                  isActive?: boolean;
                  name?: string;
                  organizationId?: string;
                  season?: string;
                  sport?: string;
                  trainingSchedule?: string;
                  updatedAt?: null | number;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "organizationId"
                    | "createdAt"
                    | "updatedAt"
                    | "sport"
                    | "ageGroup"
                    | "gender"
                    | "season"
                    | "description"
                    | "trainingSchedule"
                    | "homeVenue"
                    | "isActive"
                    | "coachNotes"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "teamMember";
                update: {
                  createdAt?: null | number;
                  teamId?: string;
                  userId?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field: "teamId" | "userId" | "createdAt" | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "organization";
                update: {
                  adminBlanketBlock?: boolean;
                  adminBlanketBlockSetAt?: number;
                  adminBlanketBlockSetBy?: string;
                  adminContactEmail?: string;
                  adminOverrideSetAt?: number;
                  adminOverrideSetBy?: string;
                  adminOverrideTrustGates?: boolean;
                  allowAdminDelegation?: boolean;
                  allowCoachOverrides?: boolean;
                  autoReInviteOnExpiration?: boolean;
                  colors?: Array<string>;
                  createdAt?: number;
                  invitationExpirationDays?: number;
                  logo?: null | string;
                  maxAutoReInvitesPerInvitation?: number;
                  metadata?: null | string;
                  name?: string;
                  notifyAdminsOnInvitationRequest?: boolean;
                  sharingContactEmail?: null | string;
                  sharingContactMode?: "direct" | "enquiry" | "none";
                  sharingContactName?: null | string;
                  sharingContactPhone?: null | string;
                  slug?: string;
                  socialFacebook?: null | string;
                  socialInstagram?: null | string;
                  socialLinkedin?: null | string;
                  socialTwitter?: null | string;
                  supportedSports?: Array<string>;
                  voiceNotesTrustGatesEnabled?: boolean;
                  website?: null | string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "slug"
                    | "logo"
                    | "createdAt"
                    | "metadata"
                    | "colors"
                    | "socialFacebook"
                    | "socialTwitter"
                    | "socialInstagram"
                    | "socialLinkedin"
                    | "website"
                    | "supportedSports"
                    | "sharingContactMode"
                    | "sharingContactName"
                    | "sharingContactEmail"
                    | "sharingContactPhone"
                    | "invitationExpirationDays"
                    | "autoReInviteOnExpiration"
                    | "maxAutoReInvitesPerInvitation"
                    | "adminContactEmail"
                    | "notifyAdminsOnInvitationRequest"
                    | "voiceNotesTrustGatesEnabled"
                    | "allowAdminDelegation"
                    | "allowCoachOverrides"
                    | "adminOverrideTrustGates"
                    | "adminOverrideSetBy"
                    | "adminOverrideSetAt"
                    | "adminBlanketBlock"
                    | "adminBlanketBlockSetBy"
                    | "adminBlanketBlockSetAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "member";
                update: {
                  activeFunctionalRole?:
                    | "coach"
                    | "parent"
                    | "admin"
                    | "player";
                  createdAt?: number;
                  disableReason?: string;
                  disableType?: "org_only" | "account";
                  disabledAt?: number;
                  disabledBy?: string;
                  functionalRoles?: Array<
                    "coach" | "parent" | "admin" | "player"
                  >;
                  isDisabled?: boolean;
                  lastAccessedOrgs?: Array<{
                    orgId: string;
                    role: string;
                    timestamp: number;
                  }>;
                  organizationId?: string;
                  pendingFunctionalRoleRequests?: Array<{
                    message?: string;
                    requestedAt: string;
                    role: "coach" | "parent" | "admin" | "player";
                  }>;
                  role?: string;
                  userId?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "organizationId"
                    | "userId"
                    | "role"
                    | "createdAt"
                    | "functionalRoles"
                    | "activeFunctionalRole"
                    | "pendingFunctionalRoleRequests"
                    | "lastAccessedOrgs"
                    | "isDisabled"
                    | "disabledAt"
                    | "disabledBy"
                    | "disableReason"
                    | "disableType"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "invitation";
                update: {
                  autoReInviteCount?: number;
                  email?: string;
                  expiresAt?: number;
                  inviterId?: string;
                  metadata?: any;
                  organizationId?: string;
                  role?: null | string;
                  status?: string;
                  teamId?: null | string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "organizationId"
                    | "email"
                    | "role"
                    | "teamId"
                    | "status"
                    | "expiresAt"
                    | "inviterId"
                    | "metadata"
                    | "autoReInviteCount"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "gdprVersions";
                update: {
                  createdAt?: number;
                  createdBy?: string;
                  effectiveDate?: number;
                  fullText?: string;
                  summary?: string;
                  version?: number;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "version"
                    | "effectiveDate"
                    | "summary"
                    | "fullText"
                    | "createdBy"
                    | "createdAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              };
          onUpdateHandle?: string;
          paginationOpts: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        any,
        Name
      >;
      updateOne: FunctionReference<
        "mutation",
        "internal",
        {
          input:
            | {
                model: "user";
                update: {
                  address?: string;
                  altEmail?: string;
                  childLinkingSkipCount?: number;
                  country?: string;
                  createdAt?: number;
                  currentOrgId?: string;
                  email?: string;
                  emailVerified?: boolean;
                  firstName?: string;
                  gdprConsentVersion?: number;
                  gdprConsentedAt?: number;
                  image?: null | string;
                  isPlatformStaff?: boolean;
                  lastChildrenCheckAt?: number;
                  lastName?: string;
                  name?: string;
                  onboardingComplete?: boolean;
                  parentOnboardingDismissCount?: number;
                  parentOnboardingLastDismissedAt?: number;
                  phone?: string;
                  postcode?: string;
                  profileCompletedAt?: number;
                  profileCompletionStatus?: "pending" | "completed" | "skipped";
                  profileSkipCount?: number;
                  setupComplete?: boolean;
                  setupStep?: string;
                  town?: string;
                  updatedAt?: number;
                  userId?: null | string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "email"
                    | "emailVerified"
                    | "image"
                    | "createdAt"
                    | "updatedAt"
                    | "userId"
                    | "isPlatformStaff"
                    | "firstName"
                    | "lastName"
                    | "phone"
                    | "altEmail"
                    | "address"
                    | "town"
                    | "postcode"
                    | "country"
                    | "profileCompletionStatus"
                    | "profileCompletedAt"
                    | "profileSkipCount"
                    | "onboardingComplete"
                    | "lastChildrenCheckAt"
                    | "parentOnboardingDismissCount"
                    | "parentOnboardingLastDismissedAt"
                    | "childLinkingSkipCount"
                    | "currentOrgId"
                    | "gdprConsentVersion"
                    | "gdprConsentedAt"
                    | "setupComplete"
                    | "setupStep"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "session";
                update: {
                  activeOrganizationId?: null | string;
                  activeTeamId?: null | string;
                  createdAt?: number;
                  expiresAt?: number;
                  ipAddress?: null | string;
                  token?: string;
                  updatedAt?: number;
                  userAgent?: null | string;
                  userId?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "expiresAt"
                    | "token"
                    | "createdAt"
                    | "updatedAt"
                    | "ipAddress"
                    | "userAgent"
                    | "userId"
                    | "activeOrganizationId"
                    | "activeTeamId"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "account";
                update: {
                  accessToken?: null | string;
                  accessTokenExpiresAt?: null | number;
                  accountId?: string;
                  createdAt?: number;
                  idToken?: null | string;
                  password?: null | string;
                  providerId?: string;
                  refreshToken?: null | string;
                  refreshTokenExpiresAt?: null | number;
                  scope?: null | string;
                  updatedAt?: number;
                  userId?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "accountId"
                    | "providerId"
                    | "userId"
                    | "accessToken"
                    | "refreshToken"
                    | "idToken"
                    | "accessTokenExpiresAt"
                    | "refreshTokenExpiresAt"
                    | "scope"
                    | "password"
                    | "createdAt"
                    | "updatedAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "verification";
                update: {
                  createdAt?: number;
                  expiresAt?: number;
                  identifier?: string;
                  updatedAt?: number;
                  value?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "identifier"
                    | "value"
                    | "expiresAt"
                    | "createdAt"
                    | "updatedAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "jwks";
                update: {
                  createdAt?: number;
                  privateKey?: string;
                  publicKey?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field: "publicKey" | "privateKey" | "createdAt" | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "team";
                update: {
                  ageGroup?: string;
                  coachNotes?: string;
                  createdAt?: number;
                  description?: string;
                  gender?: "Male" | "Female" | "Mixed" | "Boys" | "Girls";
                  homeVenue?: string;
                  isActive?: boolean;
                  name?: string;
                  organizationId?: string;
                  season?: string;
                  sport?: string;
                  trainingSchedule?: string;
                  updatedAt?: null | number;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "organizationId"
                    | "createdAt"
                    | "updatedAt"
                    | "sport"
                    | "ageGroup"
                    | "gender"
                    | "season"
                    | "description"
                    | "trainingSchedule"
                    | "homeVenue"
                    | "isActive"
                    | "coachNotes"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "teamMember";
                update: {
                  createdAt?: null | number;
                  teamId?: string;
                  userId?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field: "teamId" | "userId" | "createdAt" | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "organization";
                update: {
                  adminBlanketBlock?: boolean;
                  adminBlanketBlockSetAt?: number;
                  adminBlanketBlockSetBy?: string;
                  adminContactEmail?: string;
                  adminOverrideSetAt?: number;
                  adminOverrideSetBy?: string;
                  adminOverrideTrustGates?: boolean;
                  allowAdminDelegation?: boolean;
                  allowCoachOverrides?: boolean;
                  autoReInviteOnExpiration?: boolean;
                  colors?: Array<string>;
                  createdAt?: number;
                  invitationExpirationDays?: number;
                  logo?: null | string;
                  maxAutoReInvitesPerInvitation?: number;
                  metadata?: null | string;
                  name?: string;
                  notifyAdminsOnInvitationRequest?: boolean;
                  sharingContactEmail?: null | string;
                  sharingContactMode?: "direct" | "enquiry" | "none";
                  sharingContactName?: null | string;
                  sharingContactPhone?: null | string;
                  slug?: string;
                  socialFacebook?: null | string;
                  socialInstagram?: null | string;
                  socialLinkedin?: null | string;
                  socialTwitter?: null | string;
                  supportedSports?: Array<string>;
                  voiceNotesTrustGatesEnabled?: boolean;
                  website?: null | string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "name"
                    | "slug"
                    | "logo"
                    | "createdAt"
                    | "metadata"
                    | "colors"
                    | "socialFacebook"
                    | "socialTwitter"
                    | "socialInstagram"
                    | "socialLinkedin"
                    | "website"
                    | "supportedSports"
                    | "sharingContactMode"
                    | "sharingContactName"
                    | "sharingContactEmail"
                    | "sharingContactPhone"
                    | "invitationExpirationDays"
                    | "autoReInviteOnExpiration"
                    | "maxAutoReInvitesPerInvitation"
                    | "adminContactEmail"
                    | "notifyAdminsOnInvitationRequest"
                    | "voiceNotesTrustGatesEnabled"
                    | "allowAdminDelegation"
                    | "allowCoachOverrides"
                    | "adminOverrideTrustGates"
                    | "adminOverrideSetBy"
                    | "adminOverrideSetAt"
                    | "adminBlanketBlock"
                    | "adminBlanketBlockSetBy"
                    | "adminBlanketBlockSetAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "member";
                update: {
                  activeFunctionalRole?:
                    | "coach"
                    | "parent"
                    | "admin"
                    | "player";
                  createdAt?: number;
                  disableReason?: string;
                  disableType?: "org_only" | "account";
                  disabledAt?: number;
                  disabledBy?: string;
                  functionalRoles?: Array<
                    "coach" | "parent" | "admin" | "player"
                  >;
                  isDisabled?: boolean;
                  lastAccessedOrgs?: Array<{
                    orgId: string;
                    role: string;
                    timestamp: number;
                  }>;
                  organizationId?: string;
                  pendingFunctionalRoleRequests?: Array<{
                    message?: string;
                    requestedAt: string;
                    role: "coach" | "parent" | "admin" | "player";
                  }>;
                  role?: string;
                  userId?: string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "organizationId"
                    | "userId"
                    | "role"
                    | "createdAt"
                    | "functionalRoles"
                    | "activeFunctionalRole"
                    | "pendingFunctionalRoleRequests"
                    | "lastAccessedOrgs"
                    | "isDisabled"
                    | "disabledAt"
                    | "disabledBy"
                    | "disableReason"
                    | "disableType"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "invitation";
                update: {
                  autoReInviteCount?: number;
                  email?: string;
                  expiresAt?: number;
                  inviterId?: string;
                  metadata?: any;
                  organizationId?: string;
                  role?: null | string;
                  status?: string;
                  teamId?: null | string;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "organizationId"
                    | "email"
                    | "role"
                    | "teamId"
                    | "status"
                    | "expiresAt"
                    | "inviterId"
                    | "metadata"
                    | "autoReInviteCount"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              }
            | {
                model: "gdprVersions";
                update: {
                  createdAt?: number;
                  createdBy?: string;
                  effectiveDate?: number;
                  fullText?: string;
                  summary?: string;
                  version?: number;
                };
                where?: Array<{
                  connector?: "AND" | "OR";
                  field:
                    | "version"
                    | "effectiveDate"
                    | "summary"
                    | "fullText"
                    | "createdBy"
                    | "createdAt"
                    | "_id";
                  operator?:
                    | "lt"
                    | "lte"
                    | "gt"
                    | "gte"
                    | "eq"
                    | "in"
                    | "not_in"
                    | "ne"
                    | "contains"
                    | "starts_with"
                    | "ends_with";
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                }>;
              };
          onUpdateHandle?: string;
        },
        any,
        Name
      >;
    };
    userFunctions: {
      getUserById: FunctionReference<
        "query",
        "internal",
        { userId: string },
        null | {
          _creationTime: number;
          _id: string;
          createdAt: number;
          currentOrgId?: string;
          email: string;
          emailVerified: boolean;
          image?: null | string;
          isPlatformStaff?: boolean;
          name: string;
          onboardingComplete?: boolean;
          phone?: string;
          updatedAt: number;
          userId?: null | string;
        },
        Name
      >;
      getUserByStringId: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any,
        Name
      >;
      updateOnboardingComplete: FunctionReference<
        "mutation",
        "internal",
        { onboardingComplete: boolean; userId: string },
        null,
        Name
      >;
      updateUserProfile: FunctionReference<
        "mutation",
        "internal",
        {
          firstName?: string;
          lastName?: string;
          phone?: string;
          userId: string;
        },
        { success: boolean },
        Name
      >;
    };
  };
