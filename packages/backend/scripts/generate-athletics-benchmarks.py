#!/usr/bin/env python3
"""
Generate comprehensive Athletics benchmarks for the PDP system.

This script creates benchmarks covering:
- 30 athletics skills across 5 categories
- Age groups: U10, U12, U14, U16, U18, U20, Senior
- Genders: Male, Female
- Competitive Levels: Developmental, Competitive, Elite
- Event Groups: General, Sprints, Middle Distance, Long Distance, Hurdles
"""

import json
from typing import List, Dict, Any

# Skill definitions with categories and applicable event groups
SKILLS = {
    "Running Mechanics": {
        "skills": [
            "Posture & Alignment",
            "Arm Action & Mechanics",
            "Hip Extension & Drive",
            "Knee Drive & Lift",
            "Foot Strike Pattern",
            "Ground Contact Time",
            "Stride Length",
            "Stride Frequency",
            "Core Stability During Running",
            "Ankle Control & Stiffness"
        ],
        "eventGroups": ["General"]  # Applies to all events
    },
    "Speed & Power": {
        "skills": [
            "Acceleration Ability",
            "Maximum Velocity",
            "Speed Endurance",
            "Power Output",
            "Starting Blocks Technique"
        ],
        "eventGroups": {
            "Acceleration Ability": ["General"],
            "Maximum Velocity": ["Sprints"],
            "Speed Endurance": ["Sprints", "Middle Distance"],
            "Power Output": ["Sprints"],
            "Starting Blocks Technique": ["Sprints"]
        }
    },
    "Endurance & Physiological": {
        "skills": [
            "Aerobic Capacity (VO2 Max)",
            "Lactate Threshold",
            "Running Economy",
            "Lactate Tolerance",
            "Recovery Ability"
        ],
        "eventGroups": {
            "Aerobic Capacity (VO2 Max)": ["Middle Distance", "Long Distance"],
            "Lactate Threshold": ["Middle Distance", "Long Distance"],
            "Running Economy": ["General"],
            "Lactate Tolerance": ["Sprints", "Middle Distance"],
            "Recovery Ability": ["General"]
        }
    },
    "Technical & Event-Specific": {
        "skills": [
            "Hurdle Clearance Technique",
            "Relay Handoff Technique",
            "Cornering Technique",
            "Finishing Technique",
            "Starting Stance & Reaction"
        ],
        "eventGroups": {
            "Hurdle Clearance Technique": ["Hurdles"],
            "Relay Handoff Technique": ["General"],
            "Cornering Technique": ["Sprints"],
            "Finishing Technique": ["General"],
            "Starting Stance & Reaction": ["General"]
        }
    },
    "Tactical & Mental": {
        "skills": [
            "Race Strategy & Tactics",
            "Pacing Judgment",
            "Competitive Mindset",
            "Focus & Concentration",
            "Visualization & Mental Preparation"
        ],
        "eventGroups": ["General"]  # Applies to all events
    }
}

# Performance standards from research document
PERFORMANCE_STANDARDS = {
    "100m": {
        "U12": {"Male": {"Developmental": ">16.0", "Competitive": "14.5-16.0", "Elite": "<14.5"},
                "Female": {"Developmental": ">17.0", "Competitive": "15.0-17.0", "Elite": "<15.0"}},
        "U14": {"Male": {"Developmental": ">14.5", "Competitive": "12.8-14.5", "Elite": "<12.8"},
                "Female": {"Developmental": ">15.0", "Competitive": "13.3-15.0", "Elite": "<13.3"}},
        "U16": {"Male": {"Developmental": ">12.5", "Competitive": "11.5-12.5", "Elite": "<11.5"},
                "Female": {"Developmental": ">13.5", "Competitive": "12.5-13.5", "Elite": "<12.5"}},
        "U18": {"Male": {"Developmental": ">11.8", "Competitive": "11.0-11.8", "Elite": "<10.8"},
                "Female": {"Developmental": ">13.0", "Competitive": "12.0-13.0", "Elite": "<11.8"}},
        "U20": {"Male": {"Developmental": ">11.5", "Competitive": "10.8-11.5", "Elite": "<10.5"},
                "Female": {"Developmental": ">12.8", "Competitive": "12.0-12.8", "Elite": "<11.6"}},
        "Senior": {"Male": {"Developmental": ">12.0", "Competitive": "10.8-12.0", "Elite": "<10.0"},
                   "Female": {"Developmental": ">13.5", "Competitive": "12.0-13.5", "Elite": "<11.0"}}
    },
    "400m": {
        "U14": {"Male": {"Developmental": ">64", "Competitive": "56-64", "Elite": "<56"},
                "Female": {"Developmental": ">69", "Competitive": "62-69", "Elite": "<62"}},
        "U16": {"Male": {"Developmental": ">56", "Competitive": "52-56", "Elite": "<50"},
                "Female": {"Developmental": ">64", "Competitive": "59-64", "Elite": "<57"}},
        "U18": {"Male": {"Developmental": ">52", "Competitive": "49-52", "Elite": "<47.5"},
                "Female": {"Developmental": ">61", "Competitive": "57-61", "Elite": "<54"}},
        "U20": {"Male": {"Developmental": ">50", "Competitive": "47-50", "Elite": "<46.5"},
                "Female": {"Developmental": ">58", "Competitive": "53-58", "Elite": "<52"}},
        "Senior": {"Male": {"Developmental": ">52", "Competitive": "48-52", "Elite": "<45"},
                   "Female": {"Developmental": ">60", "Competitive": "55-60", "Elite": "<50"}}
    },
    "800m": {
        "U12": {"Male": {"Developmental": ">2:50", "Competitive": "2:30-2:50", "Elite": "<2:30"},
                "Female": {"Developmental": ">3:00", "Competitive": "2:40-3:00", "Elite": "<2:40"}},
        "U14": {"Male": {"Developmental": ">2:40", "Competitive": "2:15-2:40", "Elite": "<2:10"},
                "Female": {"Developmental": ">2:50", "Competitive": "2:25-2:50", "Elite": "<2:18"}},
        "U16": {"Male": {"Developmental": ">2:15", "Competitive": "2:00-2:15", "Elite": "<1:55"},
                "Female": {"Developmental": ">2:30", "Competitive": "2:15-2:30", "Elite": "<2:08"}},
        "U18": {"Male": {"Developmental": ">2:05", "Competitive": "1:54-2:05", "Elite": "<1:50"},
                "Female": {"Developmental": ">2:20", "Competitive": "2:10-2:20", "Elite": "<2:05"}},
        "U20": {"Male": {"Developmental": ">2:00", "Competitive": "1:52-2:00", "Elite": "<1:48"},
                "Female": {"Developmental": ">2:15", "Competitive": "2:08-2:15", "Elite": "<2:03"}},
        "Senior": {"Male": {"Developmental": ">2:05", "Competitive": "1:50-2:05", "Elite": "<1:44"},
                   "Female": {"Developmental": ">2:20", "Competitive": "2:05-2:20", "Elite": "<1:58"}}
    },
    "1500m": {
        "U14": {"Male": {"Developmental": ">5:15", "Competitive": "4:45-5:15", "Elite": "<4:30"},
                "Female": {"Developmental": ">5:45", "Competitive": "5:10-5:45", "Elite": "<4:55"}},
        "U16": {"Male": {"Developmental": ">4:45", "Competitive": "4:15-4:45", "Elite": "<4:05"},
                "Female": {"Developmental": ">5:20", "Competitive": "4:50-5:20", "Elite": "<4:35"}},
        "U18": {"Male": {"Developmental": ">4:20", "Competitive": "4:00-4:20", "Elite": "<3:52"},
                "Female": {"Developmental": ">5:00", "Competitive": "4:35-5:00", "Elite": "<4:22"}},
        "U20": {"Male": {"Developmental": ">4:10", "Competitive": "3:55-4:10", "Elite": "<3:45"},
                "Female": {"Developmental": ">4:50", "Competitive": "4:30-4:50", "Elite": "<4:15"}},
        "Senior": {"Male": {"Developmental": ">4:20", "Competitive": "3:50-4:20", "Elite": "<3:33"},
                   "Female": {"Developmental": ">5:05", "Competitive": "4:25-5:05", "Elite": "<3:57"}}
    },
    "5000m": {
        "U16": {"Male": {"Developmental": ">17:30", "Competitive": "16:00-17:30", "Elite": "<15:30"},
                "Female": {"Developmental": ">19:30", "Competitive": "18:00-19:30", "Elite": "<17:30"}},
        "U18": {"Male": {"Developmental": ">17:00", "Competitive": "15:30-17:00", "Elite": "<14:50"},
                "Female": {"Developmental": ">19:30", "Competitive": "17:30-19:30", "Elite": "<16:30"}},
        "U20": {"Male": {"Developmental": ">16:00", "Competitive": "14:45-16:00", "Elite": "<14:00"},
                "Female": {"Developmental": ">18:00", "Competitive": "17:00-18:00", "Elite": "<15:45"}},
        "Senior": {"Male": {"Developmental": ">17:00", "Competitive": "14:45-17:00", "Elite": "<13:00"},
                   "Female": {"Developmental": ">20:00", "Competitive": "16:30-20:00", "Elite": "<14:25"}}
    }
}

# Expected level mapping by age and competitive level
EXPECTED_LEVELS = {
    "U10": {"Developmental": 1},  # Foundation, fun, multi-event
    "U12": {"Developmental": 2, "Competitive": 2},  # Basic fundamentals
    "U14": {"Developmental": 2, "Competitive": 3, "Elite": 3},  # Specialization begins
    "U16": {"Developmental": 2, "Competitive": 3, "Elite": 4},  # Technical refinement
    "U18": {"Developmental": 3, "Competitive": 3, "Elite": 4},  # Competition development
    "U20": {"Developmental": 3, "Competitive": 4, "Elite": 4},  # Approaching peak
    "Senior": {"Developmental": 3, "Competitive": 4, "Elite": 5}  # Peak performance
}

def get_event_groups_for_skill(skill_name: str, category: str) -> List[str]:
    """Get applicable event groups for a given skill."""
    category_data = SKILLS[category]

    # Check if eventGroups is a simple list (applies to all skills in category)
    if isinstance(category_data.get("eventGroups"), list):
        return category_data["eventGroups"]

    # Otherwise it's a dict mapping specific skills to event groups
    event_groups_dict = category_data.get("eventGroups", {})
    return event_groups_dict.get(skill_name, ["General"])

def should_create_benchmark(age_group: str, competitive_level: str, event_group: str, skill_name: str) -> bool:
    """Determine if a benchmark should be created for this combination."""

    # U10 only has Developmental level
    if age_group == "U10" and competitive_level != "Developmental":
        return False

    # U12 only has Developmental and Competitive
    if age_group == "U12" and competitive_level == "Elite":
        return False

    # Hurdles introduced at U12+
    if event_group == "Hurdles" and age_group == "U10":
        return False

    # Starting blocks primarily for sprints
    if skill_name == "Starting Blocks Technique" and age_group in ["U10", "U12"]:
        return False

    # Advanced physiological skills not assessed at U10-U12
    if skill_name in ["Aerobic Capacity (VO2 Max)", "Lactate Threshold", "Running Economy", "Lactate Tolerance"] and age_group in ["U10", "U12"]:
        return False

    # Long distance (5000m) typically starts at U14+
    if event_group == "Long Distance" and age_group in ["U10", "U12"]:
        return False

    return True

def get_technical_indicators(skill_name: str, level: int, age_group: str, event_group: str) -> List[str]:
    """Generate technical indicators based on skill, level, age, and event group."""

    # This is a simplified version - in reality, you'd have detailed mappings
    # for each skill at each level

    base_indicators = {
        "Posture & Alignment": {
            1: ["Aware of posture but inconsistent execution",
                "Often runs with excessive forward bend or sitting back with hips",
                "Tends to look down at feet rather than ahead",
                "Shoulders frequently tense and raised toward ears"],
            2: ["Maintains reasonable posture during easy running with occasional lapses",
                "Can implement coaching cues with reminders",
                "Generally keeps head position neutral during steady efforts",
                "Posture breaks down during intense efforts or late in runs"],
            3: ["Consistently maintains good posture during training runs",
                "Proper ankle lean and spinal alignment visible",
                "Self-corrects when posture slips without external cueing",
                "Eyes focused forward 10-20 meters ahead, shoulders relaxed"],
            4: ["Excellent posture across all training intensities and race situations",
                "Strong core stability preventing energy leaks",
                "Maintains optimal alignment throughout races and hard workouts",
                "Serves as positive example for training partners"],
            5: ["Optimal biomechanics automatic across all situations",
                "Maintains perfect posture even in extreme fatigue states",
                "World-class running economy through flawless alignment",
                "Serves as biomechanical model for other athletes"]
        },
        # Add more skills as needed...
    }

    # Return default indicators if skill not in mapping
    if skill_name not in base_indicators:
        return [f"Level {level} technical execution for {skill_name}",
                f"Age-appropriate mechanics for {age_group}",
                f"Event-specific application for {event_group}"]

    return base_indicators[skill_name].get(level, [f"Level {level} execution"])

def generate_benchmark(skill_name: str, category: str, age_group: str, gender: str,
                      competitive_level: str, event_group: str) -> Dict[str, Any]:
    """Generate a single benchmark entry."""

    # Get expected level for this age/competitive level combination
    expected_level = EXPECTED_LEVELS.get(age_group, {}).get(competitive_level, 2)

    # Get technical indicators
    technical = get_technical_indicators(skill_name, expected_level, age_group, event_group)

    # Generate performance indicators
    performance = []
    if skill_name == "Acceleration Ability" and event_group == "Sprints":
        perf_std = PERFORMANCE_STANDARDS.get("100m", {}).get(age_group, {}).get(gender, {}).get(competitive_level)
        if perf_std:
            performance.append(f"100m time: {perf_std} reflects acceleration ability")

    # Add generic performance indicators
    if not performance:
        performance = [
            f"Performance appropriate for {competitive_level.lower()} {age_group} {gender.lower()} athlete",
            f"Consistent execution in {event_group.lower()} events"
        ]

    # Training indicators
    training = []
    if competitive_level == "Developmental":
        if age_group in ["U10", "U12"]:
            training = ["Fun, game-based activities", "Multi-event exposure", "1-2 sessions per week"]
        else:
            training = ["Regular participation for fitness/social", "1-2 training sessions per week",
                       "Basic technical understanding"]
    elif competitive_level == "Competitive":
        if age_group in ["U12", "U14"]:
            training = ["Regular structured training 3-4x per week", "Event preferences developing",
                       "Club-level competition"]
        else:
            training = ["Consistent training 4-5x per week", "Event specialization established",
                       "Regional/national competition"]
    else:  # Elite
        if age_group in ["U14", "U16"]:
            training = ["High-level training 5-6x per week", "Advanced event-specific work",
                       "National age-group competition"]
        else:
            training = ["Elite-level training 6-8x per week", "Specialized high-performance program",
                       "International competition level"]

    # Assessment notes
    assessment_notes = f"Assess {skill_name} for {age_group} {gender} {competitive_level.lower()} athletes in {event_group.lower()} events. Expected level {expected_level} reflects {competitive_level.lower()}-level standards for this age group."

    # Progression path
    progression_path = f"Continue developing {skill_name} through {event_group.lower()}-specific training. Progress toward level {min(expected_level + 1, 5)} through consistent practice and appropriate technical coaching."

    return {
        "sport": "Athletics",
        "ageGroup": age_group,
        "gender": gender,
        "competitiveLevel": competitive_level,
        "eventGroup": event_group,
        "skillName": skill_name,
        "expectedLevel": expected_level,
        "performanceIndicators": {
            "technical": technical,
            "performance": performance,
            "training": training
        },
        "assessmentNotes": assessment_notes,
        "progressionPath": progression_path
    }

def generate_all_benchmarks() -> List[Dict[str, Any]]:
    """Generate complete set of athletics benchmarks."""
    benchmarks = []

    age_groups = ["U10", "U12", "U14", "U16", "U18", "U20", "Senior"]
    genders = ["Male", "Female"]
    competitive_levels = ["Developmental", "Competitive", "Elite"]

    for category, category_data in SKILLS.items():
        for skill_name in category_data["skills"]:
            # Get applicable event groups for this skill
            event_groups = get_event_groups_for_skill(skill_name, category)

            for age_group in age_groups:
                for gender in genders:
                    for competitive_level in competitive_levels:
                        for event_group in event_groups:
                            # Check if this combination should be created
                            if should_create_benchmark(age_group, competitive_level, event_group, skill_name):
                                benchmark = generate_benchmark(
                                    skill_name, category, age_group, gender,
                                    competitive_level, event_group
                                )
                                benchmarks.append(benchmark)

    return benchmarks

def main():
    """Generate and save athletics benchmarks."""
    print("Generating Athletics benchmarks...")

    benchmarks = generate_all_benchmarks()

    output = {
        "benchmarks": benchmarks
    }

    # Save to JSON file
    output_file = "athletics-benchmarks-IMPORT.json"
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"✅ Generated {len(benchmarks)} benchmarks")
    print(f"✅ Saved to {output_file}")

    # Print summary statistics
    print("\n📊 Summary Statistics:")
    print(f"Total benchmarks: {len(benchmarks)}")

    # Count by age group
    age_counts = {}
    for b in benchmarks:
        age_counts[b['ageGroup']] = age_counts.get(b['ageGroup'], 0) + 1
    print(f"\nBy Age Group:")
    for age, count in sorted(age_counts.items()):
        print(f"  {age}: {count}")

    # Count by competitive level
    level_counts = {}
    for b in benchmarks:
        level_counts[b['competitiveLevel']] = level_counts.get(b['competitiveLevel'], 0) + 1
    print(f"\nBy Competitive Level:")
    for level, count in sorted(level_counts.items()):
        print(f"  {level}: {count}")

    # Count by event group
    event_counts = {}
    for b in benchmarks:
        event_counts[b['eventGroup']] = event_counts.get(b['eventGroup'], 0) + 1
    print(f"\nBy Event Group:")
    for event, count in sorted(event_counts.items()):
        print(f"  {event}: {count}")

if __name__ == "__main__":
    main()
