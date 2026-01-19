"use client";

import { useMemo } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  RadarChart,
  Radar as RechartsRadar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// Colors for chart
const CHART_COLORS = {
  local: {
    stroke: "#22c55e", // Green
    fill: "#22c55e",
    fillOpacity: 0.3,
  },
  shared: {
    stroke: "#3b82f6", // Blue
    fill: "#3b82f6",
    fillOpacity: 0.2,
  },
};

type SkillData = {
  skillCode: string;
  skillName: string;
  rating: number;
  category?: string;
};

type ComparisonRadarChartProps = {
  localSkills: SkillData[];
  sharedSkills: SkillData[];
  localLabel?: string;
  sharedLabel?: string;
  height?: number;
};

/**
 * Comparison Radar Chart
 *
 * Displays two datasets overlaid on a single radar chart for visual comparison.
 * Useful for comparing local assessments with shared passport data.
 */
export function ComparisonRadarChart({
  localSkills,
  sharedSkills,
  localLabel = "Your Assessment",
  sharedLabel = "Shared Data",
  height = 400,
}: ComparisonRadarChartProps) {
  // Build combined data for the chart
  const chartData = useMemo(() => {
    // Get all unique skill codes from both datasets
    const allSkillCodes = new Set([
      ...localSkills.map((s) => s.skillCode),
      ...sharedSkills.map((s) => s.skillCode),
    ]);

    // Create lookup maps
    const localMap = new Map(localSkills.map((s) => [s.skillCode, s]));
    const sharedMap = new Map(sharedSkills.map((s) => [s.skillCode, s]));

    // Build combined data
    return Array.from(allSkillCodes).map((skillCode) => {
      const local = localMap.get(skillCode);
      const shared = sharedMap.get(skillCode);

      return {
        skill: local?.skillName || shared?.skillName || skillCode,
        skillCode,
        localRating: local?.rating || 0,
        sharedRating: shared?.rating || 0,
        fullMark: 5,
      };
    });
  }, [localSkills, sharedSkills]);

  // Not enough data for radar (need at least 3 points)
  if (chartData.length < 3) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-gray-50 py-8">
        <p className="text-muted-foreground text-sm">
          Not enough data points for radar visualization. At least 3 common
          skills are required.
        </p>
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer height="100%" width="100%">
        <RadarChart cx="50%" cy="50%" data={chartData} outerRadius="75%">
          <PolarGrid strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fontSize: 11 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tick={{ fontSize: 10 }}
            tickCount={6}
          />

          {/* Shared data (rendered first so local overlays it) */}
          <RechartsRadar
            dataKey="sharedRating"
            fill={CHART_COLORS.shared.fill}
            fillOpacity={CHART_COLORS.shared.fillOpacity}
            name={sharedLabel}
            stroke={CHART_COLORS.shared.stroke}
            strokeDasharray="5 5"
            strokeWidth={2}
          />

          {/* Local data */}
          <RechartsRadar
            dataKey="localRating"
            fill={CHART_COLORS.local.fill}
            fillOpacity={CHART_COLORS.local.fillOpacity}
            name={localLabel}
            stroke={CHART_COLORS.local.stroke}
            strokeWidth={2}
          />

          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length > 0) {
                const data = payload[0].payload;
                const delta = Math.abs(data.localRating - data.sharedRating);
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg">
                    <p className="mb-2 font-medium">{data.skill}</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-green-600">
                        {localLabel}: {data.localRating.toFixed(1)}
                      </p>
                      <p className="text-blue-600">
                        {sharedLabel}: {data.sharedRating.toFixed(1)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Difference: {delta.toFixed(1)}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />

          <Legend
            formatter={(value) => (
              <span className="text-foreground text-sm">{value}</span>
            )}
            wrapperStyle={{ paddingTop: "20px" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Compact version for smaller spaces
 */
export function ComparisonRadarChartCompact({
  localSkills,
  sharedSkills,
  height = 250,
}: Omit<ComparisonRadarChartProps, "localLabel" | "sharedLabel" | "height"> & {
  height?: number;
}) {
  // Build combined data for the chart
  const chartData = useMemo(() => {
    const allSkillCodes = new Set([
      ...localSkills.map((s) => s.skillCode),
      ...sharedSkills.map((s) => s.skillCode),
    ]);

    const localMap = new Map(localSkills.map((s) => [s.skillCode, s]));
    const sharedMap = new Map(sharedSkills.map((s) => [s.skillCode, s]));

    return Array.from(allSkillCodes).map((skillCode) => {
      const local = localMap.get(skillCode);
      const shared = sharedMap.get(skillCode);

      return {
        skill: local?.skillName || shared?.skillName || skillCode,
        localRating: local?.rating || 0,
        sharedRating: shared?.rating || 0,
        fullMark: 5,
      };
    });
  }, [localSkills, sharedSkills]);

  if (chartData.length < 3) {
    return null;
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer height="100%" width="100%">
        <RadarChart cx="50%" cy="50%" data={chartData} outerRadius="80%">
          <PolarGrid strokeDasharray="3 3" />
          <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tick={false}
            tickCount={6}
          />

          <RechartsRadar
            dataKey="sharedRating"
            fill={CHART_COLORS.shared.fill}
            fillOpacity={CHART_COLORS.shared.fillOpacity}
            name="Shared"
            stroke={CHART_COLORS.shared.stroke}
            strokeDasharray="5 5"
          />

          <RechartsRadar
            dataKey="localRating"
            fill={CHART_COLORS.local.fill}
            fillOpacity={CHART_COLORS.local.fillOpacity}
            name="You"
            stroke={CHART_COLORS.local.stroke}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Category-based radar chart
 * Groups skills by category and shows average ratings per category
 */
export function ComparisonRadarChartByCategory({
  localSkills,
  sharedSkills,
  localLabel = "Your Assessment",
  sharedLabel = "Shared Data",
  height = 400,
}: ComparisonRadarChartProps) {
  // Group skills by category and calculate averages
  const chartData = useMemo(() => {
    // Group local skills
    const localByCategory = localSkills.reduce(
      (acc, skill) => {
        const category = skill.category || "Other";
        if (!acc[category]) {
          acc[category] = { total: 0, count: 0 };
        }
        acc[category].total += skill.rating;
        acc[category].count += 1;
        return acc;
      },
      {} as Record<string, { total: number; count: number }>
    );

    // Group shared skills
    const sharedByCategory = sharedSkills.reduce(
      (acc, skill) => {
        const category = skill.category || "Other";
        if (!acc[category]) {
          acc[category] = { total: 0, count: 0 };
        }
        acc[category].total += skill.rating;
        acc[category].count += 1;
        return acc;
      },
      {} as Record<string, { total: number; count: number }>
    );

    // Get all categories
    const allCategories = new Set([
      ...Object.keys(localByCategory),
      ...Object.keys(sharedByCategory),
    ]);

    // Build chart data
    return Array.from(allCategories).map((category) => {
      const local = localByCategory[category];
      const shared = sharedByCategory[category];

      return {
        category,
        localRating: local ? local.total / local.count : 0,
        sharedRating: shared ? shared.total / shared.count : 0,
        fullMark: 5,
      };
    });
  }, [localSkills, sharedSkills]);

  if (chartData.length < 3) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-gray-50 py-8">
        <p className="text-muted-foreground text-sm">
          Not enough categories for radar visualization.
        </p>
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer height="100%" width="100%">
        <RadarChart cx="50%" cy="50%" data={chartData} outerRadius="75%">
          <PolarGrid strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fontSize: 11 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tick={{ fontSize: 10 }}
            tickCount={6}
          />

          <RechartsRadar
            dataKey="sharedRating"
            fill={CHART_COLORS.shared.fill}
            fillOpacity={CHART_COLORS.shared.fillOpacity}
            name={sharedLabel}
            stroke={CHART_COLORS.shared.stroke}
            strokeDasharray="5 5"
            strokeWidth={2}
          />

          <RechartsRadar
            dataKey="localRating"
            fill={CHART_COLORS.local.fill}
            fillOpacity={CHART_COLORS.local.fillOpacity}
            name={localLabel}
            stroke={CHART_COLORS.local.stroke}
            strokeWidth={2}
          />

          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length > 0) {
                const data = payload[0].payload;
                const delta = Math.abs(data.localRating - data.sharedRating);
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg">
                    <p className="mb-2 font-medium">{data.category}</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-green-600">
                        {localLabel}: {data.localRating.toFixed(2)}
                      </p>
                      <p className="text-blue-600">
                        {sharedLabel}: {data.sharedRating.toFixed(2)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Category average difference: {delta.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />

          <Legend
            formatter={(value) => (
              <span className="text-foreground text-sm">{value}</span>
            )}
            wrapperStyle={{ paddingTop: "20px" }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
