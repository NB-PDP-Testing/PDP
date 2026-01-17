import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SessionPlanSkeleton() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="ml-auto h-5 w-5 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4" />
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pb-4">
        {/* Metadata badges */}
        <div className="mb-3 flex flex-wrap gap-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
        </div>

        {/* Skills */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-14" />
        </div>

        {/* Creator & Usage */}
        <div className="mt-auto mb-3 flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>

        {/* Success Rate */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-8" />
          </div>
          <Skeleton className="mt-1 h-2 w-full rounded-full" />
        </div>

        {/* Action Button */}
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}
