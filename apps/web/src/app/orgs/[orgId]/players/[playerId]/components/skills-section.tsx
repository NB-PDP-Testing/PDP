"use client";

import { Award, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PlayerData {
  sport: string;
  skills?: Record<string, number>;
}

interface Props {
  player: PlayerData;
}

export function SkillsSection({ player }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!player.skills || Object.keys(player.skills).length === 0) {
    return null;
  }

  // Determine sport type and render appropriate skills
  const renderSkills = () => {
    const sport = player.sport.toLowerCase();

    if (
      sport.includes("soccer") ||
      (sport.includes("football") && !sport.includes("gaa"))
    ) {
      return <SoccerSkills skills={player.skills!} />;
    }
    if (sport.includes("rugby")) {
      return <RugbySkills skills={player.skills!} />;
    }
    if (sport.includes("gaa") || sport.includes("hurling")) {
      return <GAASkills skills={player.skills!} />;
    }
    return <GenericSkills skills={player.skills!} />;
  };

  return (
    <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer transition-colors hover:bg-accent/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Player Skills
              </CardTitle>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">{renderSkills()}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Rating Display Component
function RatingDisplay({ label, value }: { label: string; value: number }) {
  const getColorForRating = (rating: number): string => {
    if (rating === 0) return "#9CA3AF"; // gray-400 - Not Rated
    if (rating <= 1) return "#dc2626"; // red-600 - Developing
    if (rating <= 2) return "#f97316"; // orange-500 - Emerging
    if (rating <= 3) return "#eab308"; // yellow-500 - Competent
    if (rating <= 4) return "#84cc16"; // lime-500 - Proficient
    return "#22c55e"; // green-500 - Excellent
  };

  const getRatingLabel = (rating: number): string => {
    if (rating === 0) return "Not Rated";
    if (rating <= 1) return "Developing";
    if (rating <= 2) return "Emerging";
    if (rating <= 3) return "Competent";
    if (rating <= 4) return "Proficient";
    return "Excellent";
  };

  const color = getColorForRating(value);

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-medium text-gray-700 text-sm">{label}</span>
        <span className="font-semibold text-sm" style={{ color }}>
          {value} - {getRatingLabel(value)}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${(value / 5) * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

// Soccer Skills Component
function SoccerSkills({ skills }: { skills: Record<string, number> }) {
  return (
    <div className="space-y-6">
      {/* Technical Skills - Ball Mastery */}
      <SkillCategory title="TECHNICAL SKILLS - Ball Mastery">
        <RatingDisplay label="Ball Control" value={skills.ballControl || 0} />
        <RatingDisplay
          label="Ball Control Under Pressure"
          value={skills.ballControlUnderPressure || 0}
        />
        <RatingDisplay
          label="Ball Protection"
          value={skills.ballProtection || 0}
        />
        <RatingDisplay label="Dribbling" value={skills.dribbling || 0} />
        <RatingDisplay label="First Touch" value={skills.firstTouch || 0} />
      </SkillCategory>

      {/* Technical Skills - Passing & Distribution */}
      <SkillCategory title="TECHNICAL SKILLS - Passing & Distribution">
        <RatingDisplay label="Passing" value={skills.passing || 0} />
        <RatingDisplay
          label="Passing Under Pressure"
          value={skills.passingUnderPressure || 0}
        />
        <RatingDisplay label="Crossing" value={skills.crossing || 0} />
        <RatingDisplay label="Throw-Ins" value={skills.throwIns || 0} />
      </SkillCategory>

      {/* Technical Skills - Shooting & Finishing */}
      <SkillCategory title="TECHNICAL SKILLS - Shooting & Finishing">
        <RatingDisplay label="Shot Accuracy" value={skills.shotAccuracy || 0} />
        <RatingDisplay label="Shot Power" value={skills.shotPower || 0} />
        <RatingDisplay
          label="Finishing Ability"
          value={skills.finishingAbility || 0}
        />
        <RatingDisplay label="Heading" value={skills.heading || 0} />
      </SkillCategory>

      {/* Tactical Skills */}
      <SkillCategory title="TACTICAL SKILLS - Positioning & Awareness">
        <RatingDisplay
          label="Offensive Positioning"
          value={skills.offensivePositioning || 0}
        />
        <RatingDisplay
          label="Defensive Positioning"
          value={skills.defensivePositioning || 0}
        />
        <RatingDisplay
          label="Defensive Aggressiveness"
          value={skills.defensiveAggressiveness || 0}
        />
        <RatingDisplay
          label="Transitional Play"
          value={skills.transitionalPlay || 0}
        />
        <RatingDisplay
          label="Off-Ball Movement"
          value={skills.offBallMovement || 0}
        />
        <RatingDisplay label="Awareness/Vision" value={skills.awareness || 0} />
        <RatingDisplay
          label="Decision Making"
          value={skills.decisionMaking || 0}
        />
      </SkillCategory>

      {/* Physical/Athletic */}
      <SkillCategory title="PHYSICAL/ATHLETIC">
        <RatingDisplay label="Speed" value={skills.speed || 0} />
        <RatingDisplay label="Agility" value={skills.agility || 0} />
        <RatingDisplay label="Strength" value={skills.strength || 0} />
        <RatingDisplay label="Endurance" value={skills.endurance || 0} />
      </SkillCategory>

      {/* Character & Team */}
      <SkillCategory title="CHARACTER & TEAM">
        <RatingDisplay
          label="Communication"
          value={skills.communication || 0}
        />
        <RatingDisplay label="Coachability" value={skills.coachability || 0} />
        <RatingDisplay label="Leadership" value={skills.leadership || 0} />
        <RatingDisplay
          label="Team Orientation"
          value={skills.teamOrientation || 0}
        />
      </SkillCategory>
    </div>
  );
}

// Rugby Skills Component
function RugbySkills({ skills }: { skills: Record<string, number> }) {
  return (
    <div className="space-y-6">
      {/* Passing & Handling */}
      <SkillCategory title="TECHNICAL SKILLS - Passing & Handling">
        <RatingDisplay
          label="Pass Accuracy (Left)"
          value={skills.passAccuracyLeft || 0}
        />
        <RatingDisplay
          label="Pass Accuracy (Right)"
          value={skills.passAccuracyRight || 0}
        />
        <RatingDisplay
          label="Pass Under Pressure"
          value={skills.passUnderPressure || 0}
        />
        <RatingDisplay
          label="Offload in Contact"
          value={skills.offloadInContact || 0}
        />
        <RatingDisplay label="Draw and Pass" value={skills.drawAndPass || 0} />
        <RatingDisplay
          label="Spiral/Long Pass"
          value={skills.spiralLongPass || 0}
        />
        <RatingDisplay label="Ball Security" value={skills.ballSecurity || 0} />
      </SkillCategory>

      {/* Add more Rugby categories as needed */}
      <SkillCategory title="PHYSICAL & GAME AWARENESS">
        <RatingDisplay label="Speed" value={skills.speed || 0} />
        <RatingDisplay label="Agility" value={skills.agility || 0} />
        <RatingDisplay label="Strength" value={skills.strength || 0} />
        <RatingDisplay label="Endurance" value={skills.endurance || 0} />
      </SkillCategory>
    </div>
  );
}

// GAA Skills Component
function GAASkills({ skills }: { skills: Record<string, number> }) {
  return (
    <div className="space-y-6">
      {/* Ball Handling & Control */}
      <SkillCategory title="BALL HANDLING & CONTROL">
        <RatingDisplay label="Solo Run" value={skills.soloRun || 0} />
        <RatingDisplay label="Bounce" value={skills.bounce || 0} />
        <RatingDisplay label="Pick Up" value={skills.pickUp || 0} />
        <RatingDisplay label="Ball Control" value={skills.ballControl || 0} />
      </SkillCategory>

      {/* Add more GAA categories as needed */}
      <SkillCategory title="PHYSICAL & GAME AWARENESS">
        <RatingDisplay label="Speed" value={skills.speed || 0} />
        <RatingDisplay label="Agility" value={skills.agility || 0} />
        <RatingDisplay label="Strength" value={skills.strength || 0} />
        <RatingDisplay label="Endurance" value={skills.endurance || 0} />
      </SkillCategory>
    </div>
  );
}

// Generic Skills (fallback)
function GenericSkills({ skills }: { skills: Record<string, number> }) {
  return (
    <div className="space-y-6">
      <SkillCategory title="PLAYER SKILLS">
        {Object.entries(skills).map(([key, value]) => (
          <RatingDisplay
            key={key}
            label={key
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toUpperCase())}
            value={value}
          />
        ))}
      </SkillCategory>
    </div>
  );
}

// Skill Category Container
function SkillCategory({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-3 border-gray-200 border-b pb-2 font-semibold text-gray-700 text-sm">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
