"use client";

import { TrendingUp } from "lucide-react";

export function AttentionRing({
  score,
  gini,
  avgQuality,
  qualityTrend,
  color,
}: {
  score: number;
  gini: number;
  avgQuality: number;
  qualityTrend: string;
  color: string;
}) {
  const radius = 80;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const qualityRadius = 60;
  const qualityCircumference = 2 * Math.PI * qualityRadius;
  const qualityOffset =
    qualityCircumference - (avgQuality / 100) * qualityCircumference;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* SVG Ring */}
      <div className="relative">
        <svg
          className="-rotate-90"
          height={radius * 2 + strokeWidth * 2}
          width={radius * 2 + strokeWidth * 2}
        >
          <title>Attention balance and quality score ring</title>
          {/* Outer track */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            fill="none"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Outer value */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            fill="none"
            r={radius}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
          />
          {/* Inner track */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            fill="none"
            r={qualityRadius}
            stroke="#e5e7eb"
            strokeWidth={8}
          />
          {/* Inner value (quality) */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            fill="none"
            r={qualityRadius}
            stroke="#f59e0b"
            strokeDasharray={qualityCircumference}
            strokeDashoffset={qualityOffset}
            strokeLinecap="round"
            strokeWidth={8}
            style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold text-3xl text-gray-900">{score}</span>
          <span className="text-gray-500 text-xs">/ 100</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid w-full grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <div>
            <p className="font-medium text-gray-700 text-sm">
              Attention Balance
            </p>
            <p className="text-gray-400 text-xs">
              Gini: {gini.toFixed(2)} (moderate)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <div>
            <p className="font-medium text-gray-700 text-sm">Avg Quality</p>
            <p className="flex items-center gap-1 text-gray-400 text-xs">
              {avgQuality}/100
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-600">{qualityTrend}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Interpretation */}
      <div className="w-full rounded-lg bg-gray-50 p-3">
        <p className="text-center text-gray-600 text-sm">
          Your attention distribution is{" "}
          <span className="font-medium text-amber-600">
            moderately balanced
          </span>
          . Some players are receiving significantly more detailed feedback than
          others.
        </p>
      </div>
    </div>
  );
}
