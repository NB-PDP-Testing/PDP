import { Shield } from "lucide-react";

interface PlayerTeamBadgesProps {
  /** List of team names the player belongs to */
  teams: string[];
  /** The core team name (matches player's sport + ageGroup) */
  coreTeamName?: string;
  /** Optional size variant */
  size?: "sm" | "md";
}

/**
 * Displays team badges for a player with core team highlighted
 *
 * Core team (matching enrollment sport + ageGroup) shows with:
 * - Green background
 * - Shield icon
 * - Bold font
 *
 * Additional teams show with gray background
 */
export function PlayerTeamBadges({
  teams,
  coreTeamName,
  size = "md",
}: PlayerTeamBadgesProps) {
  if (teams.length === 0) {
    return <span className="text-gray-400 text-sm">Not assigned</span>;
  }

  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-0.5";
  const iconSize = size === "sm" ? 10 : 12;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {teams.map((teamName, idx) => {
        const isCoreTeam = coreTeamName === teamName;
        return (
          <span
            key={`${teamName}-${idx}`}
            className={`inline-flex items-center gap-1 rounded ${padding} ${textSize} ${
              isCoreTeam
                ? "bg-green-100 font-medium text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
            title={
              isCoreTeam
                ? "Core Team (matches age group)"
                : "Additional Team"
            }
          >
            {isCoreTeam && <Shield size={iconSize} />}
            {teamName}
          </span>
        );
      })}
    </div>
  );
}
