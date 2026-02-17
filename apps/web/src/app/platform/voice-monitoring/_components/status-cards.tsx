import {
  Activity,
  CheckCircle,
  Clock,
  Cpu,
  DollarSign,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Type for metrics from getRealTimeMetrics
type RealTimeMetrics = {
  artifactsReceived1h: number;
  artifactsCompleted1h: number;
  artifactsFailed1h: number;
  transcriptionsCompleted1h: number;
  claimsExtracted1h: number;
  entitiesResolved1h: number;
  draftsGenerated1h: number;
  failures1h: number;
  windowStart: number;
  windowEnd: number;
};

// Type for alerts from getActiveAlerts
type Alert = {
  _id: string;
  alertType: string;
  severity: string;
  message: string;
  metadata?: unknown;
  createdAt?: number;
  acknowledged: boolean;
};

type StatusCardsProps = {
  metrics: RealTimeMetrics | undefined;
  alerts: Alert[] | undefined;
};

export function StatusCards({ metrics, alerts }: StatusCardsProps) {
  if (!metrics) {
    return <StatusCardsSkeleton />;
  }

  const totalProcessed =
    metrics.artifactsCompleted1h + metrics.artifactsFailed1h;
  const failureRate =
    totalProcessed > 0 ? metrics.artifactsFailed1h / totalProcessed : 0;
  const failureRatePercent = Math.round(failureRate * 100);

  // Active artifacts = received - completed - failed (clamp to 0)
  const activeArtifacts = Math.max(
    0,
    metrics.artifactsReceived1h -
      metrics.artifactsCompleted1h -
      metrics.artifactsFailed1h
  );

  // Circuit breaker state from alerts
  const circuitBreakerAlert = alerts?.find(
    (a) => a.alertType === "PIPELINE_CIRCUIT_BREAKER_OPEN"
  );
  const circuitBreakerState = circuitBreakerAlert ? "open" : "closed";

  const cards = [
    {
      title: "Active Artifacts",
      icon: Activity,
      value: activeArtifacts.toString(),
      subtitle: "Currently processing",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Completed (1h)",
      icon: CheckCircle,
      value: metrics.artifactsCompleted1h.toString(),
      subtitle: "Last hour",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Failed (1h)",
      icon: XCircle,
      value: metrics.artifactsFailed1h.toString(),
      subtitle: `Failure rate: ${failureRatePercent}%`,
      color: failureRate > 0.1 ? "text-red-600" : "text-orange-600",
      bgColor: failureRate > 0.1 ? "bg-red-100" : "bg-orange-100",
    },
    {
      title: "Avg Latency",
      icon: Clock,
      value: "--",
      subtitle: "Available in M7",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "AI Service Status",
      icon: Cpu,
      value: circuitBreakerState === "open" ? "Open" : "Closed",
      subtitle: "Circuit breaker",
      color: circuitBreakerState === "open" ? "text-red-600" : "text-green-600",
      bgColor: circuitBreakerState === "open" ? "bg-red-100" : "bg-green-100",
    },
    {
      title: "Total Cost",
      icon: DollarSign,
      value: "--",
      subtitle: "Available in M7",
      color: "text-cyan-600",
      bgColor: "bg-cyan-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className={cn("rounded-lg p-3", card.bgColor)}>
              <card.icon className={cn("h-6 w-6", card.color)} />
            </div>
            <div>
              <p className="font-bold text-2xl">{card.value}</p>
              <p className="text-muted-foreground text-sm">{card.subtitle}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StatusCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => `skeleton-${i}`).map((key) => (
        <Card key={key}>
          <CardContent className="p-6">
            <Skeleton className="h-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
