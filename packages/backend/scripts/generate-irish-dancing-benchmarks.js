/**
 * Generate Irish Dancing Benchmarks with Correct Database Levels
 *
 * Maps CLRG competition levels to database schema levels:
 * - Beginner → "recreational"
 * - Advanced Beginner → "development"
 * - Novice → "competitive"
 * - Prizewinner → "competitive"
 * - Preliminary Championship → "elite"
 * - Open Championship → "elite"
 */

const skills = [
  "Upper Body Control",
  "Arm Placement",
  "Shoulder Position",
  "Head Position",
  "Back Alignment",
  "Turnout",
  "Toe Point",
  "Crossing at Knees",
  "Weight Placement",
  "Elevation on Toes",
  "Lightness & Spring",
  "Jump Height",
  "Landing Control",
  "Footwork Speed",
  "Trebles/Toe Technique",
  "Rhythmic Drumming",
  "Stamps & Heel Clicks",
  "Precision & Clarity",
  "Rhythm & Timing",
  "Musicality",
  "Flow & Continuity",
  "Performance Quality",
  "Stage Presence",
  "Facial Expression",
  "Stamina & Endurance",
];

const ageGroups = ["U6", "U8", "U10", "U12", "U14", "U16", "U18", "Adult"];

// Level configurations by age group
const levelsByAge = {
  U6: [
    { level: "recreational", competitionLevel: "Beginner" },
    { level: "development", competitionLevel: "Advanced Beginner" },
  ],
  U8: [
    { level: "recreational", competitionLevel: "Beginner" },
    { level: "development", competitionLevel: "Advanced Beginner" },
    { level: "competitive", competitionLevel: "Novice" },
  ],
  U10: [
    { level: "recreational", competitionLevel: "Beginner" },
    { level: "development", competitionLevel: "Advanced Beginner" },
    { level: "competitive", competitionLevel: "Novice/Prizewinner" },
  ],
  U12: [
    { level: "recreational", competitionLevel: "Beginner" },
    { level: "development", competitionLevel: "Advanced Beginner" },
    { level: "competitive", competitionLevel: "Novice/Prizewinner" },
    { level: "elite", competitionLevel: "Preliminary Championship" },
  ],
  // U14+ have all four levels (mapping 6 competition levels to 4 database levels)
  U14: [
    { level: "recreational", competitionLevel: "Beginner" },
    { level: "development", competitionLevel: "Advanced Beginner" },
    { level: "competitive", competitionLevel: "Novice/Prizewinner" },
    { level: "elite", competitionLevel: "Preliminary/Open Championship" },
  ],
  U16: [
    { level: "recreational", competitionLevel: "Beginner" },
    { level: "development", competitionLevel: "Advanced Beginner" },
    { level: "competitive", competitionLevel: "Novice/Prizewinner" },
    { level: "elite", competitionLevel: "Preliminary/Open Championship" },
  ],
  U18: [
    { level: "recreational", competitionLevel: "Beginner" },
    { level: "development", competitionLevel: "Advanced Beginner" },
    { level: "competitive", competitionLevel: "Novice/Prizewinner" },
    { level: "elite", competitionLevel: "Preliminary/Open Championship" },
  ],
  Adult: [
    { level: "recreational", competitionLevel: "Beginner" },
    { level: "development", competitionLevel: "Advanced Beginner" },
    { level: "competitive", competitionLevel: "Novice/Prizewinner" },
    { level: "elite", competitionLevel: "Preliminary/Open Championship" },
  ],
};

// Skill-specific benchmarks with expected ratings by level
const skillBenchmarks = {
  "Upper Body Control": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "keeping arms at sides",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "consistent arm control",
    },
    competitive: {
      expected: 3.0,
      min: 2.0,
      developing: 3.0,
      excellent: 4.0,
      desc: "controlled stillness with choreography",
    },
    elite: {
      expected: 4.0,
      min: 3.0,
      developing: 4.0,
      excellent: 5.0,
      desc: "perfect stillness under pressure",
    },
  },
  "Arm Placement": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "learning natural arm position",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "relaxed placement at sides",
    },
    competitive: {
      expected: 3.0,
      min: 2.0,
      developing: 3.0,
      excellent: 4.0,
      desc: "refined placement with flow",
    },
    elite: {
      expected: 4.0,
      min: 3.0,
      developing: 4.0,
      excellent: 5.0,
      desc: "seamless integration with movement",
    },
  },
  "Shoulder Position": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "beginning to hold level shoulders",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "mostly level shoulders",
    },
    competitive: {
      expected: 3.0,
      min: 2.0,
      developing: 3.0,
      excellent: 4.0,
      desc: "consistently square shoulders",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "perfect shoulder alignment at all speeds",
    },
  },
  "Head Position": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "learning to hold head up",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "consistent upward gaze",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "confident carriage with focus",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "regal presence and control",
    },
  },
  "Back Alignment": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "beginning postural awareness",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "upright posture during basics",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "strong straight back in all movements",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "perfect alignment under high-speed demand",
    },
  },
  Turnout: {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "introduction to external rotation",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "developing turnout in basics",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "strong turnout from hips",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "maximum turnout with control",
    },
  },
  "Toe Point": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "learning to point toes",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "consistent point in basic steps",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "sharp point through arch",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "extreme extension with power",
    },
  },
  "Crossing at Knees": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "introduction to leg crossing",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "basic crossing technique",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "tight knee crossing at speed",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "perfect crossing under maximum demand",
    },
  },
  "Weight Placement": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "learning forward weight",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "forward balance in routines",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "controlled weight shifts",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "optimal weight placement at all times",
    },
  },
  "Elevation on Toes": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "learning to rise on toes",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "consistent elevation",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "high consistent elevation",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "maximum height with control",
    },
  },
  "Lightness & Spring": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "beginning bounce in steps",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "natural spring in movement",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "effortless spring and bounce",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "extraordinary lightness at high speed",
    },
  },
  "Jump Height": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "learning to leave the ground",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "moderate jump height",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "impressive height with control",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "maximum height with precision",
    },
  },
  "Landing Control": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "learning safe landings",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "controlled landings",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "soft silent landings",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "perfect landings at maximum height",
    },
  },
  "Footwork Speed": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "learning basic tempo",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "moderate speed with control",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "fast footwork with clarity",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "lightning speed with precision",
    },
  },
  "Trebles/Toe Technique": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "introduction to trebles",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "basic treble execution",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "clean crisp trebles",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "explosive trebles at speed",
    },
  },
  "Rhythmic Drumming": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "learning to drum beats",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "basic drumming patterns",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "complex rhythms with clarity",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "intricate drumming at maximum speed",
    },
  },
  "Stamps & Heel Clicks": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "learning stamp technique",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "consistent stamps and clicks",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "powerful clear stamps",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "explosive stamps with precision",
    },
  },
  "Precision & Clarity": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "learning clean movements",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "mostly clear execution",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "sharp precise movements",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "crystal clear at maximum speed",
    },
  },
  "Rhythm & Timing": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "basic rhythm awareness",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "consistent timing",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "perfect timing with music",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "impeccable rhythm at championship level",
    },
  },
  Musicality: {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "beginning to hear music structure",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "following musical phrases",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "expressive musical interpretation",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "exceptional musical connection",
    },
  },
  "Flow & Continuity": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "learning to connect steps",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "smooth transitions",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "seamless flow throughout",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "effortless continuity at peak difficulty",
    },
  },
  "Performance Quality": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "building confidence",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "comfortable performing",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "confident engaging performance",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "commanding championship presence",
    },
  },
  "Stage Presence": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "learning to face audience",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "comfortable on stage",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "strong stage command",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "magnetic championship presence",
    },
  },
  "Facial Expression": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "learning to smile",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "natural pleasant expression",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "engaging expressive face",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "captivating performance face",
    },
  },
  "Stamina & Endurance": {
    recreational: {
      expected: 1.5,
      min: 1.0,
      developing: 1.5,
      excellent: 2.0,
      desc: "building basic fitness",
    },
    development: {
      expected: 2.0,
      min: 1.5,
      developing: 2.0,
      excellent: 2.5,
      desc: "completing full routines",
    },
    competitive: {
      expected: 3.5,
      min: 2.5,
      developing: 3.5,
      excellent: 4.5,
      desc: "strong throughout multiple dances",
    },
    elite: {
      expected: 4.5,
      min: 3.5,
      developing: 4.5,
      excellent: 5.0,
      desc: "championship endurance at peak speed",
    },
  },
};

function generateBenchmark(skill, ageGroup, levelConfig) {
  const { level, competitionLevel } = levelConfig;
  const benchmarkData = skillBenchmarks[skill][level];

  return {
    sportCode: "irish_dancing",
    skillName: skill,
    ageGroup,
    gender: "all",
    level,
    expectedRating: benchmarkData.expected,
    minAcceptable: benchmarkData.min,
    developingThreshold: benchmarkData.developing,
    excellentThreshold: benchmarkData.excellent,
    notes: `${competitionLevel} ${ageGroup}: ${benchmarkData.desc}`,
  };
}

function generateAllBenchmarks() {
  const benchmarks = [];

  for (const skill of skills) {
    for (const ageGroup of ageGroups) {
      const levels = levelsByAge[ageGroup];
      for (const levelConfig of levels) {
        benchmarks.push(generateBenchmark(skill, ageGroup, levelConfig));
      }
    }
  }

  return { benchmarks };
}

// Generate and output
const result = generateAllBenchmarks();
console.error(`Generating ${result.benchmarks.length} benchmarks...`);
console.log(JSON.stringify(result, null, 2));
