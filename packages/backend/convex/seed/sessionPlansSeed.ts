import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Seed session plans for testing
 * Run this once to populate the database with test data
 */
export const seedSessionPlans = mutation({
  args: {
    organizationId: v.string(),
    coachId: v.string(),
    coachName: v.string(),
    count: v.optional(v.number()), // Number of plans to create (default: 20)
  },
  returns: v.object({
    created: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const count = args.count || 20;
    const now = Date.now();

    const sports = ["Football", "Soccer", "Basketball", "Rugby", "GAA"];
    const ageGroups = ["U8", "U10", "U12", "U14", "U16", "U18", "Senior"];
    const intensities: Array<"low" | "medium" | "high"> = [
      "low",
      "medium",
      "high",
    ];
    const focusAreas = [
      "Technical Skills",
      "Tactical Awareness",
      "Physical Fitness",
      "Team Cohesion",
      "Game Strategy",
      "Individual Development",
    ];

    const skillsByCategory = {
      technical: [
        "Passing",
        "Ball Control",
        "Dribbling",
        "Shooting",
        "First Touch",
        "Crossing",
      ],
      tactical: [
        "Positioning",
        "Game Awareness",
        "Decision Making",
        "Defensive Shape",
        "Attacking Movement",
      ],
      physical: ["Speed", "Endurance", "Agility", "Strength", "Coordination"],
    };

    const categories = [
      "Technical Training",
      "Tactical Training",
      "Physical Conditioning",
      "Game-Based",
      "Skill Development",
      "Team Building",
    ];

    const equipment = [
      "Balls",
      "Cones",
      "Bibs",
      "Goals",
      "Markers",
      "Hurdles",
      "Agility Ladders",
    ];

    const teamNames = [
      "Lions U12",
      "Tigers U14",
      "Eagles Senior",
      "Hawks U10",
      "Wolves U16",
      "Bears U8",
      "Panthers U18",
      "Sharks U14",
    ];

    const created: string[] = [];

    for (let i = 0; i < count; i++) {
      const sport = sports[Math.floor(Math.random() * sports.length)];
      const ageGroup = ageGroups[Math.floor(Math.random() * ageGroups.length)];
      const intensity =
        intensities[Math.floor(Math.random() * intensities.length)];
      const focusArea =
        focusAreas[Math.floor(Math.random() * focusAreas.length)];
      const teamName = teamNames[Math.floor(Math.random() * teamNames.length)];
      const duration = [60, 75, 90, 120][Math.floor(Math.random() * 4)];

      // Random skills (3-5 skills)
      const allSkills = [
        ...skillsByCategory.technical,
        ...skillsByCategory.tactical,
        ...skillsByCategory.physical,
      ];
      const numSkills = 3 + Math.floor(Math.random() * 3);
      const selectedSkills: string[] = [];
      for (let j = 0; j < numSkills; j++) {
        const skill = allSkills[Math.floor(Math.random() * allSkills.length)];
        if (!selectedSkills.includes(skill)) {
          selectedSkills.push(skill);
        }
      }

      // Random categories (1-3)
      const numCategories = 1 + Math.floor(Math.random() * 3);
      const selectedCategories: string[] = [];
      for (let j = 0; j < numCategories; j++) {
        const category =
          categories[Math.floor(Math.random() * categories.length)];
        if (!selectedCategories.includes(category)) {
          selectedCategories.push(category);
        }
      }

      // Random equipment (3-5 items)
      const numEquipment = 3 + Math.floor(Math.random() * 3);
      const selectedEquipment: string[] = [];
      for (let j = 0; j < numEquipment; j++) {
        const item = equipment[Math.floor(Math.random() * equipment.length)];
        if (!selectedEquipment.includes(item)) {
          selectedEquipment.push(item);
        }
      }

      // Random metadata
      const favorited = Math.random() > 0.7; // 30% favorited
      const visibility =
        Math.random() > 0.7
          ? "club"
          : Math.random() > 0.9
            ? "platform"
            : "private";
      const pinnedByAdmin = visibility === "club" && Math.random() > 0.85; // 15% of club plans are pinned
      const timesUsed = Math.floor(Math.random() * 15); // 0-14 uses
      const successRate =
        timesUsed > 0 ? 60 + Math.floor(Math.random() * 35) : undefined; // 60-95% success rate

      // Random creation date (last 90 days)
      const daysAgo = Math.floor(Math.random() * 90);
      const createdAt = now - daysAgo * 24 * 60 * 60 * 1000;

      const playerCount = [10, 12, 14, 16, 18, 20, 22][
        Math.floor(Math.random() * 7)
      ];

      const title = `${focusArea} Session - ${ageGroup} ${sport}`;

      const rawContent = `# ${title}

## Session Overview
- **Duration**: ${duration} minutes
- **Age Group**: ${ageGroup}
- **Sport**: ${sport}
- **Focus**: ${focusArea}
- **Intensity**: ${intensity}

## Warm-Up (15 minutes)

### Dynamic Stretching
- Light jogging around the pitch
- Dynamic stretches (leg swings, arm circles)
- Gradual increase in intensity

### Ball Familiarization
- Players in pairs with one ball
- Simple passing drills
- Focus on first touch and accuracy

## Main Session (${duration - 30} minutes)

### Technical Drills
Focus on: ${selectedSkills.join(", ")}

- Station-based work
- Progressive difficulty
- Game-realistic scenarios

### Small-Sided Games
- Apply learned skills in game context
- Emphasis on decision making
- Coach interventions for teaching moments

## Cool-Down (15 minutes)

- Light jogging and walking
- Static stretching routine
- Team discussion and feedback

---

**Equipment Needed:**
${selectedEquipment.map((e) => `- ${e}`).join("\n")}

**Safety Considerations:**
- Proper warm-up
- Hydration breaks
- Age-appropriate intensity
`;

      // Create structured sections
      const sections = [
        {
          id: `warmup-${i}`,
          type: "warmup" as const,
          title: "Warm-Up",
          duration: 15,
          order: 1,
          activities: [
            {
              id: `warmup-${i}-1`,
              name: "Dynamic Stretching",
              description: "Light jogging and dynamic stretches",
              duration: 8,
              order: 1,
              activityType: "exercise" as const,
            },
            {
              id: `warmup-${i}-2`,
              name: "Ball Familiarization",
              description: "Pairs passing with focus on first touch",
              duration: 7,
              order: 2,
              activityType: "drill" as const,
            },
          ],
        },
        {
          id: `technical-${i}`,
          type: "technical" as const,
          title: "Technical Skills",
          duration: Math.floor((duration - 30) / 2),
          order: 2,
          activities: [
            {
              id: `technical-${i}-1`,
              name: "Station Work",
              description: `Focus on ${selectedSkills.slice(0, 2).join(" and ")}`,
              duration: Math.floor((duration - 30) / 2),
              order: 1,
              activityType: "drill" as const,
            },
          ],
        },
        {
          id: `games-${i}`,
          type: "games" as const,
          title: "Small-Sided Games",
          duration: Math.floor((duration - 30) / 2),
          order: 3,
          activities: [
            {
              id: `games-${i}-1`,
              name: "Game Application",
              description: "Apply skills in game context",
              duration: Math.floor((duration - 30) / 2),
              order: 1,
              activityType: "game" as const,
            },
          ],
        },
        {
          id: `cooldown-${i}`,
          type: "cooldown" as const,
          title: "Cool-Down",
          duration: 15,
          order: 4,
          activities: [
            {
              id: `cooldown-${i}-1`,
              name: "Recovery & Reflection",
              description: "Static stretching and team discussion",
              duration: 15,
              order: 1,
              activityType: "exercise" as const,
            },
          ],
        },
      ];

      const planId = await ctx.db.insert("sessionPlans", {
        organizationId: args.organizationId,
        coachId: args.coachId,
        coachName: args.coachName,
        teamName,
        title,
        rawContent,
        sections,
        status: "saved",
        visibility,
        ageGroup,
        sport,
        duration,
        focusArea,
        playerCount,
        favorited,
        pinnedByAdmin,
        timesUsed,
        successRate,
        extractedTags: {
          categories: selectedCategories,
          skills: selectedSkills,
          equipment: selectedEquipment,
          intensity,
          playerCountRange: {
            min: playerCount - 4,
            max: playerCount + 4,
            optimal: playerCount,
          },
        },
        createdAt,
        updatedAt: createdAt,
      });

      created.push(planId);
    }

    return {
      created: created.length,
      message: `Successfully created ${created.length} session plans`,
    };
  },
});
