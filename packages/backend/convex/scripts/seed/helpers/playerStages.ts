/**
 * Player Development Stage Configurations
 *
 * Defines data generation patterns for three player development stages:
 * - Beginner: New to the club, minimal history
 * - Developing: Actively progressing, moderate history
 * - Advanced: Elite level, extensive history
 */

export type PlayerStage = "beginner" | "developing" | "advanced";

export type StageConfig = {
  assessments: {
    count: { min: number; max: number };
    ratingsRange: { min: number; max: number };
    benchmarkStatuses: Array<
      | "below"
      | "needs_support"
      | "on_track"
      | "developing"
      | "exceeding"
      | "exceptional"
    >;
  };
  passport: {
    overallRating: { min: number; max: number } | null;
    coachNotesTemplates: string[];
  };
  goals: {
    count: { min: number; max: number };
    statuses: Array<"not_started" | "in_progress" | "completed">;
    progressRange: { min: number; max: number };
    completedRatio?: number; // For advanced players with completed goals
  };
};

export const STAGE_CONFIGS: Record<PlayerStage, StageConfig> = {
  beginner: {
    assessments: {
      count: { min: 0, max: 1 }, // New players have 0-1 baseline assessments
      ratingsRange: { min: 1, max: 2 },
      benchmarkStatuses: ["below", "needs_support"],
    },
    passport: {
      overallRating: null, // No overall rating yet
      coachNotesTemplates: [
        "New player, orientation phase. Settling into team routines.",
        "Just joined the club. Learning basic team structures and expectations.",
        "Early days - focus on fundamentals and building confidence.",
        "Welcoming new player. Currently assessing baseline skills.",
      ],
    },
    goals: {
      count: { min: 2, max: 3 },
      statuses: ["not_started"],
      progressRange: { min: 0, max: 10 },
    },
  },
  developing: {
    assessments: {
      count: { min: 4, max: 7 }, // Regular assessment history over 6-12 months
      ratingsRange: { min: 2, max: 4 },
      benchmarkStatuses: ["on_track", "developing"],
    },
    passport: {
      overallRating: { min: 2.5, max: 3.5 },
      coachNotesTemplates: [
        "Showing consistent improvement across training sessions. Good attitude.",
        "Making steady progress. Working hard on fundamentals.",
        "Positive development trajectory. Responds well to coaching feedback.",
        "Growing confidence in match situations. Building good habits.",
        "Committed player with solid work ethic. Seeing regular improvement.",
      ],
    },
    goals: {
      count: { min: 4, max: 5 },
      statuses: ["in_progress"],
      progressRange: { min: 30, max: 70 },
    },
  },
  advanced: {
    assessments: {
      count: { min: 12, max: 18 }, // Extensive history over 18-24 months
      ratingsRange: { min: 3, max: 5 },
      benchmarkStatuses: ["exceeding", "exceptional"],
    },
    passport: {
      overallRating: { min: 4.0, max: 4.8 },
      coachNotesTemplates: [
        "Elite development track. Consistently demonstrates advanced technical skills.",
        "Outstanding player with strong leadership qualities. Key team contributor.",
        "Exceptional talent. Shows maturity and game intelligence beyond years.",
        "Elite level performer. Natural leader who elevates teammates.",
        "Advanced technical ability combined with tactical awareness. Future potential is high.",
      ],
    },
    goals: {
      count: { min: 3, max: 4 },
      statuses: ["completed", "in_progress"], // Mix of completed and advanced in-progress goals
      progressRange: { min: 80, max: 100 },
      completedRatio: 0.6, // 60% of goals should be completed
    },
  },
};

/**
 * Generates a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random number between min and max (with decimals)
 */
export function randomFloat(min: number, max: number, decimals = 1): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

/**
 * Picks a random element from an array
 */
export function randomPick<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffles an array and returns first n elements
 */
export function randomSample<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Goal templates by age group and category
 */
export const GOAL_TEMPLATES = {
  U8: {
    technical: [
      "Master basic ball control in training drills",
      "Learn proper kicking technique",
      "Improve first touch consistency",
      "Practice passing with both feet",
    ],
    physical: [
      "Attend all training sessions this month",
      "Complete warm-up exercises properly",
      "Build basic coordination skills",
    ],
    mental: [
      "Listen to coach instructions",
      "Stay focused during drills",
      "Encourage teammates",
    ],
  },
  U10: {
    technical: [
      "Improve passing accuracy to 80%",
      "Master 2-3 different ball control techniques",
      "Develop consistent shooting form",
      "Learn basic dribbling moves",
    ],
    tactical: [
      "Understand basic positioning concepts",
      "Learn when to pass vs. dribble",
      "Recognize defensive vs. offensive roles",
    ],
    physical: [
      "Improve sprint speed",
      "Build endurance for full game",
      "Develop agility through cone drills",
    ],
    mental: [
      "Build confidence in match situations",
      "Learn from mistakes without frustration",
      "Support teammates consistently",
    ],
  },
  U12: {
    technical: [
      "Achieve 85% passing accuracy in matches",
      "Master advanced ball control under pressure",
      "Develop weak foot to functional level",
      "Perfect shooting technique from various angles",
    ],
    tactical: [
      "Master positional awareness in formation",
      "Learn to read opponent movements",
      "Understand transition play (defense to attack)",
      "Execute set pieces consistently",
    ],
    physical: [
      "Increase sprint speed by 10%",
      "Build match fitness for 60+ minutes",
      "Develop strength for physical challenges",
    ],
    mental: [
      "Maintain focus for full match",
      "Handle pressure situations calmly",
      "Provide leadership in team",
      "Accept and apply coaching feedback",
    ],
  },
  U14: {
    technical: [
      "Achieve consistent first touch in all conditions",
      "Master 3-4 advanced skill moves in match play",
      "Develop equal proficiency with both feet",
      "Perfect technique in specialized position",
    ],
    tactical: [
      "Master tactical role in team system",
      "Read and anticipate game flow",
      "Execute complex tactical instructions",
      "Understand advanced formations and transitions",
    ],
    physical: [
      "Meet position-specific fitness benchmarks",
      "Develop explosive power for key actions",
      "Build resilience for full 70-minute matches",
    ],
    mental: [
      "Demonstrate consistent match mentality",
      "Handle setbacks and adapt quickly",
      "Show tactical decision-making under pressure",
      "Mentor younger players in training",
    ],
    social: [
      "Take on team leadership responsibilities",
      "Help newer players integrate",
    ],
  },
  U16: {
    technical: [
      "Achieve elite proficiency in position-specific skills",
      "Execute advanced techniques consistently in matches",
      "Master all core technical skills at high speed",
      "Develop signature moves and playing style",
    ],
    tactical: [
      "Master multiple tactical roles within formation",
      "Demonstrate advanced game reading and anticipation",
      "Execute complex tactical instructions autonomously",
      "Adapt tactics in-game based on opponent analysis",
    ],
    physical: [
      "Meet elite fitness standards for age group",
      "Develop position-specific physical attributes",
      "Demonstrate consistent high-intensity performance",
    ],
    mental: [
      "Show consistent elite mentality in competition",
      "Handle high-pressure situations with composure",
      "Demonstrate leadership on and off field",
      "Set example for younger age groups",
    ],
    social: [
      "Mentor U12/U14 players in technical development",
      "Represent club values and culture",
    ],
  },
  U18: {
    technical: [
      "Achieve mastery-level proficiency in all position skills",
      "Consistently execute at elite level in competition",
      "Develop adaptability across multiple positions",
    ],
    tactical: [
      "Demonstrate professional-level tactical understanding",
      "Lead tactical execution and adjustments on field",
      "Analyze and exploit opponent weaknesses",
    ],
    physical: [
      "Maintain professional fitness standards",
      "Peak physical performance for key competitions",
    ],
    mental: [
      "Exhibit professional mentality and discipline",
      "Handle elite competition pressure",
      "Lead and inspire entire club",
    ],
    social: ["Mentor multiple age groups", "Ambassador for club in community"],
  },
};

/**
 * Get appropriate goal templates for an age group
 */
export function getGoalTemplatesForAgeGroup(
  ageGroup: string
): Record<string, string[]> {
  // Map age group to template key
  const key = ageGroup.toUpperCase() as keyof typeof GOAL_TEMPLATES;

  if (key in GOAL_TEMPLATES) {
    return GOAL_TEMPLATES[key];
  }

  // Default to U12 if age group not found
  return GOAL_TEMPLATES.U12;
}

/**
 * Skill categories for generating linked skills in goals
 */
export const SKILL_CATEGORIES = {
  technical: [
    "passing",
    "ball_control",
    "dribbling",
    "shooting",
    "first_touch",
    "crossing",
  ],
  tactical: [
    "positioning",
    "game_awareness",
    "decision_making",
    "teamwork",
    "communication",
  ],
  physical: ["speed", "endurance", "strength", "agility", "balance"],
  mental: ["focus", "confidence", "resilience", "composure", "leadership"],
  social: ["teamwork", "communication", "sportsmanship", "leadership"],
};

/**
 * Generate assessment dates going backwards from now
 * Ensures chronological progression with realistic spacing
 */
export function generateAssessmentDates(
  count: number,
  startMonthsAgo = 18
): string[] {
  const dates: Date[] = [];
  const now = new Date();

  if (count === 0) {
    return [];
  }
  if (count === 1) {
    // Single baseline assessment 1-2 weeks ago
    const date = new Date(now);
    date.setDate(date.getDate() - randomInt(7, 14));
    return [date.toISOString().split("T")[0]];
  }

  // Multiple assessments spread over time
  const monthsSpan = Math.min(startMonthsAgo, count * 2); // Roughly one assessment every 2 months
  const daysBetween = Math.floor((monthsSpan * 30) / count);

  for (let i = 0; i < count; i++) {
    const daysAgo = (count - 1 - i) * daysBetween + randomInt(-5, 5); // Add some randomness
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    dates.push(date);
  }

  return dates
    .sort((a, b) => a.getTime() - b.getTime())
    .map((d) => d.toISOString().split("T")[0]);
}

/**
 * Generate progressive skill ratings showing improvement
 * Earlier ratings lower, later ratings higher, with realistic progression
 */
export function generateProgressiveRatings(
  count: number,
  minRating: number,
  maxRating: number
): number[] {
  if (count === 0) {
    return [];
  }
  if (count === 1) {
    return [randomFloat(minRating, maxRating)];
  }

  const ratings: number[] = [];

  for (let i = 0; i < count; i++) {
    // Progress from minRating to maxRating over the assessment timeline
    const progress = i / (count - 1); // 0 to 1
    const baseRating = minRating + (maxRating - minRating) * progress;

    // Add small random variation (±0.3) but keep within bounds
    const variation = randomFloat(-0.3, 0.3);
    const rating = Math.max(1, Math.min(5, baseRating + variation));

    ratings.push(Number(rating.toFixed(1)));
  }

  return ratings;
}
