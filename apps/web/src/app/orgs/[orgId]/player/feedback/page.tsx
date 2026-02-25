import { MessageSquare } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PlayerFeedbackPage() {
  return (
    <div className="container mx-auto max-w-3xl p-4 md:p-8">
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Coach Feedback</CardTitle>
          <CardDescription>
            View feedback and summaries from your coaches — coming in a future
            phase.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
