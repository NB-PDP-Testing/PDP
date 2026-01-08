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
 */

// Card skeletons
export {
  CardGridSkeleton,
  CardSkeleton,
  StatCardSkeleton,
  StatGridSkeleton,
} from "./card-skeleton";
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
