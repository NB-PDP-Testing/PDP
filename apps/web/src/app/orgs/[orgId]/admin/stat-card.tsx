import type { Route } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  variant = "primary",
}: {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: Route;
  variant?: "primary" | "secondary" | "tertiary" | "warning" | "danger";
}) {
  const variantStyles = {
    primary: "bg-[rgb(var(--org-primary-rgb)/0.1)] text-[var(--org-primary)]",
    secondary:
      "bg-[rgb(var(--org-secondary-rgb)/0.1)] text-[var(--org-secondary)]",
    tertiary:
      "bg-[rgb(var(--org-tertiary-rgb)/0.1)] text-[var(--org-tertiary)]",
    warning: "bg-yellow-500/10 text-yellow-600",
    danger: "bg-red-500/10 text-red-600",
  };

  const content = (
    <Card className="!py-0 !gap-0 h-auto max-h-fit min-w-0 overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="!px-2 !py-2 sm:!px-3 sm:!py-2 md:!px-4 md:!py-3 flex flex-row items-center justify-between">
        <CardTitle className="mr-2 min-w-0 flex-1 truncate font-medium text-[10px] text-muted-foreground sm:text-xs md:text-sm">
          {title}
        </CardTitle>
        <div
          className={`flex-shrink-0 rounded-lg p-1 sm:p-1.5 md:p-2 ${variantStyles[variant]}`}
        >
          <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
        </div>
      </CardHeader>
      <CardContent className="!px-2 !pb-2 sm:!px-3 sm:!pb-3 md:!px-4 md:!pb-4">
        <div className="truncate font-bold text-lg sm:text-xl md:text-2xl">
          {value}
        </div>
        {description && (
          <p className="mt-0.5 line-clamp-1 text-[9px] text-muted-foreground sm:mt-1 sm:line-clamp-2 sm:text-[10px] md:text-xs">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="mt-2 h-3 w-32" />
      </CardContent>
    </Card>
  );
}
