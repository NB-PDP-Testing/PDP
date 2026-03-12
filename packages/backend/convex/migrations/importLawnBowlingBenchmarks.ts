import { internalMutation } from "../_generated/server";

export const importLawnBowlingBenchmarks = internalMutation({
	args: {},
	handler: async (ctx) => {
		const benchmarksData = {
			source: "World Bowls / Bowls England / Coach Bowls",
			sourceDocument:
				"Lawn Bowling Benchmark System v1.0 - Compiled from World Bowls Skills & Drills, Bowls Canada LTAD, Coach Bowls Framework, English Bowls Coaching Society",
			sourceUrl:
				"https://www.worldbowls.com/wp-content/uploads/2024/05/Skills-and-Drills.pdf",
			sourceYear: 2026,
		};

		// Skill definitions for lawn bowling
		const skills = [
			"draw_shot",
			"delivery_technique",
			"line_control",
			"weight_control",
			"yard_on_shot",
			"drive_shot",
			"positional_play",
			"tactical_awareness",
			"green_reading",
			"mental_resilience",
			"team_play",
			"etiquette_sportsmanship",
		];

		const ageGroups = ["u18", "u25", "senior", "veteran"];
		const levels = ["recreational", "competitive", "elite"] as const;

		// Base expected ratings by skill, age group, and level
		// Format: [recreational, competitive, elite]
		const ratingMatrix: Record<
			string,
			Record<string, [number, number, number]>
		> = {
			draw_shot: {
				u18: [2.0, 2.5, 0],
				u25: [2.5, 3.0, 4.0],
				senior: [2.5, 3.5, 4.5],
				veteran: [2.5, 3.5, 0],
			},
			delivery_technique: {
				u18: [2.0, 2.5, 0],
				u25: [2.5, 3.0, 4.0],
				senior: [2.5, 3.5, 4.5],
				veteran: [2.5, 3.5, 0],
			},
			line_control: {
				u18: [1.5, 2.5, 0],
				u25: [2.0, 3.0, 4.0],
				senior: [2.5, 3.5, 4.5],
				veteran: [2.5, 3.5, 0],
			},
			weight_control: {
				u18: [1.5, 2.5, 0],
				u25: [2.0, 3.0, 4.0],
				senior: [2.5, 3.5, 4.5],
				veteran: [2.5, 3.5, 0],
			},
			yard_on_shot: {
				u18: [1.5, 2.0, 0],
				u25: [2.0, 3.0, 3.5],
				senior: [2.0, 3.0, 4.0],
				veteran: [2.0, 3.0, 0],
			},
			drive_shot: {
				u18: [1.0, 2.0, 0],
				u25: [1.5, 2.5, 3.5],
				senior: [1.5, 3.0, 4.0],
				veteran: [1.5, 2.5, 0],
			},
			positional_play: {
				u18: [1.5, 2.0, 0],
				u25: [2.0, 3.0, 3.5],
				senior: [2.0, 3.5, 4.5],
				veteran: [2.5, 3.5, 0],
			},
			tactical_awareness: {
				u18: [1.5, 2.0, 0],
				u25: [2.0, 3.0, 3.5],
				senior: [2.5, 3.5, 4.5],
				veteran: [2.5, 3.5, 0],
			},
			green_reading: {
				u18: [1.5, 2.0, 0],
				u25: [2.0, 3.0, 3.5],
				senior: [2.5, 3.5, 4.5],
				veteran: [2.5, 3.5, 0],
			},
			mental_resilience: {
				u18: [1.5, 2.0, 0],
				u25: [2.0, 3.0, 3.5],
				senior: [2.5, 3.5, 4.5],
				veteran: [2.5, 3.5, 0],
			},
			team_play: {
				u18: [1.5, 2.0, 0],
				u25: [2.0, 3.0, 3.5],
				senior: [2.5, 3.5, 4.5],
				veteran: [2.5, 3.5, 0],
			},
			etiquette_sportsmanship: {
				u18: [2.0, 2.5, 0],
				u25: [2.5, 3.5, 4.0],
				senior: [3.0, 4.0, 4.5],
				veteran: [3.5, 4.0, 0],
			},
		};

		let imported = 0;
		const errors: Array<{ benchmark: string; error: string }> = [];

		for (const skillCode of skills) {
			for (const ageGroup of ageGroups) {
				const ratings = ratingMatrix[skillCode]?.[ageGroup];
				if (!ratings) continue;

				for (let i = 0; i < levels.length; i++) {
					const expectedRating = ratings[i];
					// Skip if rating is 0 (not applicable for this age/level combo)
					if (expectedRating === 0) continue;

					const level = levels[i];
					const minAcceptable = Math.max(1.0, expectedRating - 1.0);
					const developingThreshold = Math.max(
						1.0,
						expectedRating - 0.5,
					);
					const excellentThreshold = Math.min(
						5.0,
						expectedRating + 1.0,
					);

					try {
						await ctx.db.insert("skillBenchmarks", {
							sportCode: "lawn_bowling",
							skillCode,
							ageGroup,
							gender: "all",
							level,
							expectedRating,
							minAcceptable,
							developingThreshold,
							excellentThreshold,
							source: benchmarksData.source,
							sourceDocument: benchmarksData.sourceDocument,
							sourceUrl: benchmarksData.sourceUrl,
							sourceYear: benchmarksData.sourceYear,
							notes: `${ageGroup.toUpperCase()} ${level} - ${skillCode.replace(/_/g, " ")}`,
							isActive: true,
							createdAt: Date.now(),
							updatedAt: Date.now(),
						});
						imported++;
					} catch (error) {
						errors.push({
							benchmark: `${skillCode}-${ageGroup}-all-${level}`,
							error:
								error instanceof Error
									? error.message
									: String(error),
						});
					}
				}
			}
		}

		return {
			success: errors.length === 0,
			imported,
			totalExpected: skills.length * ageGroups.length * levels.length,
			errors,
		};
	},
});
