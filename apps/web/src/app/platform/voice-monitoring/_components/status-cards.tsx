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

// Type for active artifacts from getActiveArtifacts
type ActiveArtifact = {
  _id: string;
  status: string;
};

// Type for historical metrics from getHistoricalMetrics
type HistoricalMetric = {
  _id: string;
  periodType: string;
  avgEndToEndLatency?: number;
  periodStart: number;
  periodEnd: number;
};

// Type for pipeline events
type PipelineEvent = {
  _id: string;
  eventType: string;
  metadata?: {
    aiCost?: number;
  };
};

type StatusCardsProps = {
  metrics: RealTimeMetrics | undefined;
  alerts: Alert[] | undefined;
  activeArtifacts: ActiveArtifact[] | undefined;
  historicalMetrics: HistoricalMetric[] | undefined;
  recentEvents: PipelineEvent[] | undefined;
};

export function StatusCards({
  metrics,
  alerts,
  activeArtifacts,
  historicalMetrics,
  recentEvents,
}: StatusCardsProps) {
  if (!metrics) {
    return <StatusCardsSkeleton />;
  }

  const totalProcessed =
    metrics.artifactsCompleted1h + metrics.artifactsFailed1h;
  const failureRate =
    totalProcessed > 0 ? metrics.artifactsFailed1h / totalProcessed : 0;
  const failureRatePercent = Math.round(failureRate * 100);

  // Active artifacts count from actual DB query
  const activeCount = activeArtifacts?.length ?? 0;

  // Calculate average latency from last 24 hours of snapshots
  const avgLatency =
    historicalMetrics && historicalMetrics.length > 0
      ? historicalMetrics.reduce(
          (sum, m) => sum + (m.avgEndToEndLatency ?? 0),
          0
        ) / historicalMetrics.length
      : 0;

  // Calculate total AI cost from recent events
  const totalCost =
    recentEvents?.reduce((sum, e) => sum + (e.metadata?.aiCost ?? 0), 0) ?? 0;

  // Circuit breaker state from alerts
  const circuitBreakerAlert = alerts?.find(
    (a) => a.alertType === "PIPELINE_CIRCUIT_BREAKER_OPEN"
  );
  const circuitBreakerState = circuitBreakerAlert ? "open" : "closed";

  const cards = [
    {
      title: "Active Artifacts",
      icon: Activity,
      value: activeCount.toString(),
      subtitle: "Currently processing",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Completed Today",
      icon: CheckCircle,
      value: Math.round(metrics.artifactsCompleted1h * 24).toString(),
      subtitle: "Last 24 hours (est)",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Failed Today",
      icon: XCircle,
      value: Math.round(metrics.artifactsFailed1h * 24).toString(),
      subtitle: `Failure rate: ${failureRatePercent}%`,
      color: failureRate > 0.1 ? "text-red-600" : "text-orange-600",
      bgColor: failureRate > 0.1 ? "bg-red-100" : "bg-orange-100",
    },
    {
      title: "Avg Latency",
      icon: Clock,
      value: avgLatency > 0 ? `${avgLatency.toFixed(1)}s` : "--",
      subtitle: "End-to-end (24h avg)",
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
      title: "Total Cost Today",
      icon: DollarSign,
      value: totalCost > 0 ? `$${totalCost.toFixed(2)}` : "$0.00",
      subtitle: "Pipeline AI costs (est)",
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
            <div className="flex-1">
              <p className="mb-1 font-medium text-muted-foreground text-sm">
                {card.title}
              </p>
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
