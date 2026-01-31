import { Skeleton } from "@/components/ui/skeleton";

export function TabsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Tabs list skeleton */}
      <div className="flex gap-2 border-b">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton className="h-10 w-24 rounded-b-none" key={i} />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}
