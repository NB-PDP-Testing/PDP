"use client";

import { Award, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import {
  getColorForRating,
  getRatingLabel,
  RatingBar,
} from "@/components/rating-slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Regex patterns for converting camelCase to title case
const CAMEL_CASE_REGEX = /([A-Z])/g;
const FIRST_CHAR_REGEX = /^./;

type PlayerData = {
  sport: string;
  skills?: Record<string, number>;
};

type Props = {
  player: PlayerData;
};

export function SkillsSection({ player }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  const skills = player.skills;
  if (!skills || Object.keys(skills).length === 0) {
    return null;
  }

  // Determine sport type and render appropriate skills
  const renderSkills = () => {
    const sport = player.sport.toLowerCase();

    if (
      sport.includes("soccer") ||
      (sport.includes("football") && !sport.includes("gaa"))
    ) {
      return <SoccerSkills skills={skills} />;
    }
    if (sport.includes("rugby")) {
      return <RugbySkills skills={skills} />;
    }
    if (sport.includes("gaa") || sport.includes("hurling")) {
      return <GAASkills skills={skills} />;
    }
    return <GenericSkills skills={skills} />;
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

// Rating Display Component - uses shared RatingBar from rating-slider
function RatingDisplay({ label, value }: { label: string; value: number }) {
  const color = value === 0 ? "#9CA3AF" : getColorForRating(value);
  const ratingLabel = value === 0 ? "Not Rated" : getRatingLabel(value);

  return (
    <div className="mb-3">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="min-w-0 font-medium text-gray-700 text-sm">
          {label}
        </span>
        <span
          className="shrink-0 whitespace-nowrap font-semibold text-sm"
          style={{ color }}
        >
          {value} - {ratingLabel}
        </span>
      </div>
      <RatingBar height="md" value={value} />
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
      <SkillCategory title="PASSING & HANDLING">
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

      {/* Catching & Receiving */}
      <SkillCategory title="CATCHING & RECEIVING">
        <RatingDisplay
          label="High Ball Catching"
          value={skills.highBallCatching || 0}
        />
        <RatingDisplay
          label="Chest/Body Catch"
          value={skills.chestBodyCatch || 0}
        />
        <RatingDisplay
          label="Low Ball Pickup"
          value={skills.lowBallPickup || 0}
        />
        <RatingDisplay
          label="Catching Under Pressure"
          value={skills.catchingUnderPressure || 0}
        />
        <RatingDisplay
          label="Hands Ready Position"
          value={skills.handsReadyPosition || 0}
        />
        <RatingDisplay
          label="Watch Ball Into Hands"
          value={skills.watchBallIntoHands || 0}
        />
      </SkillCategory>

      {/* Running & Ball Carry */}
      <SkillCategory title="RUNNING & BALL CARRY">
        <RatingDisplay
          label="Running With Ball"
          value={skills.runningWithBall || 0}
        />
        <RatingDisplay
          label="Evasion (Side Step)"
          value={skills.evasionSideStep || 0}
        />
        <RatingDisplay
          label="Evasion (Swerve)"
          value={skills.evasionSwerve || 0}
        />
        <RatingDisplay label="Dummy Pass" value={skills.dummyPass || 0} />
        <RatingDisplay
          label="Acceleration Into Space"
          value={skills.accelerationIntoSpace || 0}
        />
        <RatingDisplay
          label="Ball Carry Into Contact"
          value={skills.ballCarryIntoContact || 0}
        />
        <RatingDisplay
          label="Body Position/Balance"
          value={skills.bodyPositionBalance || 0}
        />
      </SkillCategory>

      {/* Kicking */}
      <SkillCategory title="KICKING">
        <RatingDisplay
          label="Punt Kick (Left)"
          value={skills.puntKickLeft || 0}
        />
        <RatingDisplay
          label="Punt Kick (Right)"
          value={skills.puntKickRight || 0}
        />
        <RatingDisplay label="Grubber Kick" value={skills.grubberKick || 0} />
        <RatingDisplay label="Drop Kick" value={skills.dropKick || 0} />
        <RatingDisplay label="Place Kicking" value={skills.placeKicking || 0} />
        <RatingDisplay
          label="Kicking Distance"
          value={skills.kickingDistance || 0}
        />
        <RatingDisplay label="Kick Accuracy" value={skills.kickAccuracy || 0} />
      </SkillCategory>

      {/* Contact & Breakdown */}
      <SkillCategory title="CONTACT & BREAKDOWN">
        <RatingDisplay
          label="Tackle Technique"
          value={skills.tackleTechnique || 0}
        />
        <RatingDisplay
          label="Tackle Completion"
          value={skills.tackleCompletion || 0}
        />
        <RatingDisplay
          label="Rip/Tag Technique"
          value={skills.ripTagTechnique || 0}
        />
        <RatingDisplay
          label="Body Position in Contact"
          value={skills.bodyPositionInContact || 0}
        />
        <RatingDisplay
          label="Leg Drive Through Contact"
          value={skills.legDriveThroughContact || 0}
        />
        <RatingDisplay
          label="Ball Presentation"
          value={skills.ballPresentation || 0}
        />
        <RatingDisplay
          label="Ruck Entry/Cleanout"
          value={skills.ruckEntryCleanout || 0}
        />
        <RatingDisplay
          label="Jackaling/Turnovers"
          value={skills.jackalingTurnovers || 0}
        />
      </SkillCategory>

      {/* Tactical & Game Awareness */}
      <SkillCategory title="TACTICAL & GAME AWARENESS">
        <RatingDisplay
          label="Decision Making"
          value={skills.decisionMaking || 0}
        />
        <RatingDisplay
          label="Reading Defense"
          value={skills.readingDefense || 0}
        />
        <RatingDisplay
          label="Positional Understanding"
          value={skills.positionalUnderstanding || 0}
        />
        <RatingDisplay
          label="Support Play (Attack)"
          value={skills.supportPlayAttack || 0}
        />
        <RatingDisplay
          label="Support Play (Defense)"
          value={skills.supportPlayDefense || 0}
        />
        <RatingDisplay
          label="Communication on Field"
          value={skills.communicationOnField || 0}
        />
        <RatingDisplay
          label="Spatial Awareness"
          value={skills.spatialAwareness || 0}
        />
        <RatingDisplay
          label="Game Sense/Instinct"
          value={skills.gameSenseInstinct || 0}
        />
        <RatingDisplay
          label="Following Game Plan"
          value={skills.followingGamePlan || 0}
        />
      </SkillCategory>
    </div>
  );
}

// GAA Skills Component
function GAASkills({ skills }: { skills: Record<string, number> }) {
  return (
    <div className="space-y-6">
      {/* Ball Mastery */}
      <SkillCategory title="BALL MASTERY">
        <RatingDisplay label="Soloing" value={skills.soloing || 0} />
        <RatingDisplay label="Ball Handling" value={skills.ballHandling || 0} />
        <RatingDisplay
          label="Pickup/Toe Lift"
          value={skills.pickupToeLift || 0}
        />
      </SkillCategory>

      {/* Kicking */}
      <SkillCategory title="KICKING">
        <RatingDisplay label="Kicking (Long)" value={skills.kickingLong || 0} />
        <RatingDisplay
          label="Kicking (Short)"
          value={skills.kickingShort || 0}
        />
      </SkillCategory>

      {/* Catching */}
      <SkillCategory title="CATCHING">
        <RatingDisplay label="High Catching" value={skills.highCatching || 0} />
      </SkillCategory>

      {/* Free Taking */}
      <SkillCategory title="FREE TAKING">
        <RatingDisplay
          label="Free Taking (Ground)"
          value={skills.freeTakingGround || 0}
        />
        <RatingDisplay
          label="Free Taking (Hand)"
          value={skills.freeTakingHand || 0}
        />
      </SkillCategory>

      {/* Passing */}
      <SkillCategory title="PASSING">
        <RatingDisplay label="Hand Passing" value={skills.handPassing || 0} />
      </SkillCategory>

      {/* Tactical & Decision Making */}
      <SkillCategory title="TACTICAL & DECISION MAKING">
        <RatingDisplay
          label="Positional Sense"
          value={skills.positionalSense || 0}
        />
        <RatingDisplay label="Tracking" value={skills.tracking || 0} />
        <RatingDisplay
          label="Decision Making"
          value={skills.decisionMaking || 0}
        />
        <RatingDisplay
          label="Decision Speed"
          value={skills.decisionSpeed || 0}
        />
      </SkillCategory>

      {/* Defensive */}
      <SkillCategory title="DEFENSIVE">
        <RatingDisplay label="Tackling" value={skills.tackling || 0} />
      </SkillCategory>

      {/* Laterality */}
      <SkillCategory title="LATERALITY">
        <RatingDisplay label="Left Side" value={skills.leftSide || 0} />
        <RatingDisplay label="Right Side" value={skills.rightSide || 0} />
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
              .replace(CAMEL_CASE_REGEX, " $1")
              .replace(FIRST_CHAR_REGEX, (str) => str.toUpperCase())}
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
