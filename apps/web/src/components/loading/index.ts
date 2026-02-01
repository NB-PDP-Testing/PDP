/**
 * Loading Components (Skeleton Loaders)
 *
 * Phase 6 UX improvements: Loading states that match content structure
 * - TableSkeleton - For data tables
 * - CardSkeleton - For card components
 * - ListSkeleton - For list items
 * - FormSkeleton - For form fields
 * - PageSkeleton - For full page layouts
 *
 * Feature Flag: ux_skeleton_loaders
 *
 * @file Intentional barrel file for organizing loading components
 */

/* biome-ignore-all lint/performance/noBarrelFile: Intentional barrel file for organizing loading components */

// Board skeleton (Kanban view)
export { BoardSkeleton } from "./board-skeleton";
// Calendar skeleton (Month view)
export { CalendarSkeleton } from "./calendar-skeleton";
// Card skeletons
export {
  CardGridSkeleton,
  CardSkeleton,
  StatCardSkeleton,
  StatGridSkeleton,
} from "./card-skeleton";
// Centered skeleton (for auth/transition pages)
export { CenteredSkeleton } from "./centered-skeleton";
// Form skeletons
export {
  FormFieldSkeleton,
  FormSectionSkeleton,
  FormSkeleton,
  MultiSectionFormSkeleton,
} from "./form-skeleton";

// List skeletons
export {
  ListSkeleton,
  NavListSkeleton,
  TextListSkeleton,
  TimelineSkeletion,
} from "./list-skeleton";
// Page skeletons
export {
  AdminDashboardSkeleton,
  AdminPlayersPageSkeleton,
  PageSkeleton,
  PlayerDetailSkeleton,
} from "./page-skeleton";
// Table skeletons
export { TableRowSkeleton, TableSkeleton } from "./table-skeleton";
// Tabs skeleton
export { TabsSkeleton } from "./tabs-skeleton";
