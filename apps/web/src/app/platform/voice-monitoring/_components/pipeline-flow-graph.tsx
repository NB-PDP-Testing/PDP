import { Skeleton } from "@/components/ui/skeleton";

// Stage configuration
const PIPELINE_STAGES = [
  { id: "ingestion", label: "Ingestion", counterKey: "artifactsReceived1h" },
  {
    id: "transcription",
    label: "Transcription",
    counterKey: "transcriptionsCompleted1h",
  },
  { id: "claims", label: "Claims", counterKey: "claimsExtracted1h" },
  {
    id: "resolution",
    label: "Resolution",
    counterKey: "entitiesResolved1h",
  },
  { id: "drafts", label: "Drafts", counterKey: "draftsGenerated1h" },
] as const;

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

type PipelineFlowGraphProps = {
  metrics: RealTimeMetrics | undefined;
  onStageClick?: (stageId: string, stageLabel: string) => void;
};

function getStageColor(count: number, failCount: number): string {
  if (failCount > 0) {
    return "#ef4444"; // red-500
  }
  if (count === 0) {
    return "#9ca3af"; // gray-400
  }
  return "#22c55e"; // green-500
}

export function PipelineFlowGraph({
  metrics,
  onStageClick,
}: PipelineFlowGraphProps) {
  if (!metrics) {
    return <PipelineFlowGraphSkeleton />;
  }

  const failCount = metrics.artifactsFailed1h;

  return (
    <>
      {/* Desktop/Tablet: Horizontal */}
      <div className="hidden md:block">
        <svg
          aria-label="Voice pipeline flow with 5 stages"
          className="h-auto w-full"
          role="img"
          viewBox="0 0 1200 240"
        >
          <title>Pipeline Flow Graph</title>
          <defs>
            <marker
              id="arrowhead"
              markerHeight="7"
              markerWidth="10"
              orient="auto"
              refX="10"
              refY="3.5"
            >
              <polygon fill="#94a3b8" points="0 0, 10 3.5, 0 7" />
            </marker>
          </defs>
          {PIPELINE_STAGES.map((stage, i) => {
            const x = 20 + i * 240;
            const count = metrics[stage.counterKey];
            const color = getStageColor(count, failCount);
            return (
              <g key={stage.id}>
                {/* Clickable stage box */}
                {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG group used as interactive button */}
                {/* biome-ignore lint/a11y/useSemanticElements: Cannot use button element in SVG context */}
                <g
                  aria-label={`View ${stage.label} stage details`}
                  className={onStageClick ? "cursor-pointer" : ""}
                  onClick={
                    onStageClick
                      ? () => onStageClick(stage.id, stage.label)
                      : undefined
                  }
                  onKeyDown={
                    onStageClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onStageClick(stage.id, stage.label);
                          }
                        }
                      : undefined
                  }
                  role="button"
                  tabIndex={onStageClick ? 0 : -1}
                >
                  <rect
                    fill={color}
                    fillOpacity="0.15"
                    height="100"
                    rx="12"
                    stroke={color}
                    strokeWidth="2"
                    width="200"
                    x={x}
                    y={50}
                  />
                  {/* Stage label */}
                  <text
                    className="fill-foreground font-medium text-sm"
                    fontSize="14"
                    pointerEvents="none"
                    textAnchor="middle"
                    x={x + 100}
                    y={85}
                  >
                    {stage.label}
                  </text>
                  {/* Count */}
                  <text
                    className="fill-foreground font-bold"
                    fontSize="24"
                    pointerEvents="none"
                    textAnchor="middle"
                    x={x + 100}
                    y={115}
                  >
                    {count}
                  </text>
                  {/* Subtitle */}
                  <text
                    fill="#6b7280"
                    fontSize="11"
                    pointerEvents="none"
                    textAnchor="middle"
                    x={x + 100}
                    y={138}
                  >
                    last hour
                  </text>
                </g>
                {/* Arrow to next stage */}
                {i < PIPELINE_STAGES.length - 1 && (
                  <line
                    markerEnd="url(#arrowhead)"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    x1={x + 200}
                    x2={x + 240}
                    y1={100}
                    y2={100}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Mobile: Vertical */}
      <div className="block md:hidden">
        <svg
          aria-label="Voice pipeline flow with 5 stages"
          className="h-auto w-full"
          role="img"
          viewBox="0 0 300 800"
        >
          <title>Pipeline Flow Graph</title>
          <defs>
            <marker
              id="arrowhead-v"
              markerHeight="10"
              markerWidth="7"
              orient="auto"
              refX="3.5"
              refY="10"
            >
              <polygon fill="#94a3b8" points="0 0, 7 0, 3.5 10" />
            </marker>
          </defs>
          {PIPELINE_STAGES.map((stage, i) => {
            const y = 10 + i * 160;
            const count = metrics[stage.counterKey];
            const color = getStageColor(count, failCount);
            return (
              <g key={stage.id}>
                {/* Clickable stage box */}
                {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG group used as interactive button */}
                {/* biome-ignore lint/a11y/useSemanticElements: Cannot use button element in SVG context */}
                <g
                  aria-label={`View ${stage.label} stage details`}
                  className={onStageClick ? "cursor-pointer" : ""}
                  onClick={
                    onStageClick
                      ? () => onStageClick(stage.id, stage.label)
                      : undefined
                  }
                  onKeyDown={
                    onStageClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onStageClick(stage.id, stage.label);
                          }
                        }
                      : undefined
                  }
                  role="button"
                  tabIndex={onStageClick ? 0 : -1}
                >
                  <rect
                    fill={color}
                    fillOpacity="0.15"
                    height="110"
                    rx="12"
                    stroke={color}
                    strokeWidth="2"
                    width="260"
                    x={20}
                    y={y}
                  />
                  <text
                    className="fill-foreground font-medium"
                    fontSize="15"
                    pointerEvents="none"
                    textAnchor="middle"
                    x={150}
                    y={y + 35}
                  >
                    {stage.label}
                  </text>
                  <text
                    className="fill-foreground font-bold"
                    fontSize="28"
                    pointerEvents="none"
                    textAnchor="middle"
                    x={150}
                    y={y + 70}
                  >
                    {count}
                  </text>
                  <text
                    fill="#6b7280"
                    fontSize="12"
                    pointerEvents="none"
                    textAnchor="middle"
                    x={150}
                    y={y + 95}
                  >
                    last hour
                  </text>
                </g>
                {i < PIPELINE_STAGES.length - 1 && (
                  <line
                    markerEnd="url(#arrowhead-v)"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    x1={150}
                    x2={150}
                    y1={y + 110}
                    y2={y + 160}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}

function PipelineFlowGraphSkeleton() {
  return (
    <>
      <div className="hidden items-center justify-between gap-4 px-4 py-8 md:flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton className="h-24 w-44 rounded-lg" key={i} />
        ))}
      </div>
      <div className="flex flex-col items-center gap-4 py-8 md:hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton className="h-20 w-64 rounded-lg" key={i} />
        ))}
      </div>
    </>
  );
}
