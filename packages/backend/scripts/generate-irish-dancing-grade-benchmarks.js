/**
 * Generate Irish Dancing Grade Examination benchmarks
 * Run: node packages/backend/scripts/generate-irish-dancing-grade-benchmarks.js
 */

const fs = require("node:fs");
const path = require("node:path");

// 25 skills from competition system
const skills = [
  "Upper Body Control",
  "Head Position",
  "Arm Placement",
  "Back Alignment",
  "Shoulder Position",
  "Toe Point",
  "Turnout",
  "Elevation on Toes",
  "Weight Placement",
  "Footwork Speed",
  "Precision & Clarity",
  "Crossing at Knees",
  "Lightness & Spring",
  "Jump Height",
  "Landing Control",
  "Rhythm & Timing",
  "Musicality",
  "Flow & Continuity",
  "Stage Presence",
  "Facial Expression",
  "Performance Quality",
  "Stamina & Endurance",
  "Trebles/Toe Technique",
  "Stamps & Heel Clicks",
  "Rhythmic Drumming",
];

// CLRG Grade structure
const grades = [
  { name: "Preliminary", level: "recreational", expectedRating: 1.5 },
  { name: "Grade 1", level: "recreational", expectedRating: 1.5 },
  { name: "Grade 2", level: "recreational", expectedRating: 2.0 },
  { name: "Grade 3", level: "development", expectedRating: 2.5 },
  { name: "Grade 4", level: "development", expectedRating: 2.5 },
  { name: "Grade 5", level: "development", expectedRating: 3.0 },
  { name: "Grade 6", level: "competitive", expectedRating: 3.5 },
  { name: "Grade 7", level: "competitive", expectedRating: 3.5 },
  { name: "Grade 8", level: "competitive", expectedRating: 4.0 },
  { name: "Grade 9", level: "elite", expectedRating: 4.0 },
  { name: "Grade 10", level: "elite", expectedRating: 4.5 },
  { name: "Grade 11", level: "elite", expectedRating: 4.5 },
  { name: "Grade 12", level: "elite", expectedRating: 5.0 },
];

// Skill-specific notes templates
const skillNotes = {
  "Upper Body Control": "stillness and posture control in step sequences",
  "Head Position": "proper head carriage and alignment",
  "Arm Placement": "correct arm positioning at sides",
  "Back Alignment": "upright posture and spinal alignment",
  "Shoulder Position": "relaxed yet controlled shoulder placement",
  "Toe Point": "pointed foot technique and articulation",
  Turnout: "hip rotation and foot positioning",
  "Elevation on Toes": "height and control on balls of feet",
  "Weight Placement": "proper weight distribution and balance",
  "Footwork Speed": "tempo and speed of footwork execution",
  "Precision & Clarity": "clean and accurate step execution",
  "Crossing at Knees": "proper leg crossing technique",
  "Lightness & Spring": "bounce and lightness in movement",
  "Jump Height": "elevation in jumps and leaps",
  "Landing Control": "controlled landings from jumps",
  "Rhythm & Timing": "timing accuracy and rhythmic precision",
  Musicality: "connection to music and phrasing",
  "Flow & Continuity": "smooth transitions between movements",
  "Stage Presence": "confidence and presentation on stage",
  "Facial Expression": "appropriate facial animation",
  "Performance Quality": "overall performance execution",
  "Stamina & Endurance": "ability to maintain quality throughout",
  "Trebles/Toe Technique": "hard shoe toe work precision",
  "Stamps & Heel Clicks": "hard shoe heel work clarity",
  "Rhythmic Drumming": "rhythmic complexity in hard shoe work",
};

const benchmarks = [];

// Generate benchmarks for each skill × grade combination
for (const skill of skills) {
  for (const grade of grades) {
    const expectedRating = grade.expectedRating;
    const minAcceptable = Math.max(1.0, expectedRating - 0.5);
    const developingThreshold = expectedRating;
    const excellentThreshold = Math.min(5.0, expectedRating + 0.5);

    const note = `${grade.name}: ${skillNotes[skill]}`;

    benchmarks.push({
      sportCode: "irish_dancing",
      skillName: skill,
      ageGroup: grade.name,
      gender: "all",
      level: grade.level,
      expectedRating,
      minAcceptable,
      developingThreshold,
      excellentThreshold,
      notes: note.substring(0, 150), // Ensure max length
    });
  }
}

// Save to file
const output = { benchmarks };
const outputPath = path.join(
  __dirname,
  "irish-dancing-grade-benchmarks-IMPORT.json"
);

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`✅ Generated ${benchmarks.length} grade benchmarks`);
console.log(`📄 Saved to: ${outputPath}`);
console.log("\nBreakdown:");
console.log("- 25 skills");
console.log("- 13 grades (Preliminary + Grades 1-12)");
console.log(`- Total: ${benchmarks.length} benchmarks`);
