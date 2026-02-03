# Data Migration Status

**Date**: 2026-02-02
**Status**: SKIPPED - No teams in database

## Summary

Migration script `packages/backend/convex/migrations/fixCoachTeams.ts` cannot run because the Better Auth `team` table is empty. Both Pattern A and Pattern B handle legacy data defensively, so no urgency.

## When to Run

Run migration after teams are created via admin UI, seed script, or production data. 

Command: `npx convex run migrations/fixCoachTeams:fix`

## Current State

With admin UI fix (commit 0b48f2dd), future assignments will be saved correctly.

Related to #416
