"use client";

import { CheckCircle2, Circle, FileWarning } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ProfileItem = {
  id: string;
  label: string;
  description: string;
  childrenCount: number;
  completed: boolean;
  url?: string;
};

type ProfileCompletionChecklistProps = {
  items: ProfileItem[];
  organizationId?: string;
  onSkip: () => void;
  onComplete: () => void;
};

export function ProfileCompletionChecklist({
  items,
  organizationId: _organizationId,
  onSkip,
  onComplete,
}: ProfileCompletionChecklistProps) {
  const router = useRouter();
  const allCompleted = items.every((item) => item.completed);
  const completedCount = items.filter((item) => item.completed).length;

  const handleCompleteNow = () => {
    // Navigate to the first incomplete item's URL
    const firstIncomplete = items.find((item) => !item.completed);
    if (firstIncomplete?.url) {
      router.push(firstIncomplete.url as any);
    }
    onComplete();
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileWarning className="h-6 w-6 text-orange-500" />
          <CardTitle>Complete Your Children's Profiles</CardTitle>
        </div>
        <CardDescription>
          Help us ensure your children's safety by completing their profiles.
          You can do this now or skip for later.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
            key={item.id}
          >
            {item.completed ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
            ) : (
              <Circle className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
            )}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-medium">{item.label}</div>
                {!item.completed && (
                  <div className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                    {item.childrenCount}{" "}
                    {item.childrenCount === 1 ? "child" : "children"}
                  </div>
                )}
              </div>
              <div className="text-muted-foreground text-sm">
                {item.description}
              </div>
            </div>
          </div>
        ))}

        {/* Progress indicator */}
        <div className="pt-2">
          <div className="mb-2 text-muted-foreground text-sm">
            {completedCount} of {items.length} completed
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-green-500 transition-all"
              style={{ width: `${(completedCount / items.length) * 100}%` }}
            />
          </div>
        </div>

        {allCompleted && (
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-700 text-sm">
              All profiles complete!
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between gap-2">
        <Button onClick={onSkip} variant="outline">
          Skip for Now
        </Button>
        <Button disabled={allCompleted} onClick={handleCompleteNow}>
          {allCompleted ? "Done" : "Complete Now"}
        </Button>
      </CardFooter>

      {!allCompleted && (
        <div className="px-6 pb-4">
          <div className="text-muted-foreground text-xs">
            Don't worry, you can complete these profiles later from your parent
            dashboard. We'll remind you with a banner until they're complete.
          </div>
        </div>
      )}
    </Card>
  );
}
