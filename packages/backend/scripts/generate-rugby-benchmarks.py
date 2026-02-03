#!/usr/bin/env python3
"""
Generate comprehensive Rugby skill benchmarks for all age groups and levels.
Based on research document: RUGBY_SKILL_STANDARDS_RESEARCH.md
"""

import json

# All 44 Rugby skills in order
SKILLS = [
    # PASSING & HANDLING (7)
    "Pass Accuracy (Left)",
    "Pass Accuracy (Right)",
    "Pass Under Pressure",
    "Offload in Contact",
    "Draw and Pass",
    "Spiral / Long Pass",
    "Ball Security",
    # CATCHING & RECEIVING (6)
    "High Ball Catching",
    "Chest / Body Catch",
    "Low Ball Pickup",
    "Catching Under Pressure",
    "Hands Ready Position",
    "Watch Ball Into Hands",
    # RUNNING & BALL CARRY (6)
    "Running With Ball",
    "Evasion (Side Step)",
    "Evasion (Swerve)",
    "Dummy Pass",
    "Acceleration Into Space",
    "Ball Carry Into Contact",
    "Body Position / Balance",
    # KICKING (8)
    "Punt Kick (Left)",
    "Punt Kick (Right)",
    "Grubber Kick",
    "Drop Kick",
    "Place Kicking",
    "Kicking Distance",
    "Kick Accuracy",
    # CONTACT & BREAKDOWN (8)
    "Tackle Technique",
    "Tackle Completion",
    "Rip / Tag Technique",
    "Body Position in Contact",
    "Leg Drive Through Contact",
    "Ball Presentation",
    "Ruck Entry / Cleanout",
    "Jackaling / Turnovers",
    # TACTICAL & GAME AWARENESS (9)
    "Decision Making",
    "Reading Defense",
    "Positional Understanding",
    "Support Play (Attack)",
    "Support Play (Defense)",
    "Communication on Field",
    "Spatial Awareness",
    "Game Sense / Instinct",
    "Following Game Plan",
]

# Skills that use "all" gender for all age groups
ALL_GENDER_SKILLS = [
    # Technical execution skills
    "Pass Accuracy (Left)",
    "Pass Accuracy (Right)",
    "Ball Security",
    "Chest / Body Catch",
    "Hands Ready Position",
    "Watch Ball Into Hands",
    # All tactical skills
    "Decision Making",
    "Reading Defense",
    "Positional Understanding",
    "Support Play (Attack)",
    "Support Play (Defense)",
    "Communication on Field",
    "Spatial Awareness",
    "Game Sense / Instinct",
    "Following Game Plan",
]

# Skills that use gender-specific from U14+
GENDER_SPECIFIC_U14_PLUS = [
    # Contact skills with strength component
    "Tackle Technique",
    "Tackle Completion",
    "Body Position in Contact",
    "Leg Drive Through Contact",
    "Ball Presentation",
    "Ruck Entry / Cleanout",
    "Jackaling / Turnovers",
    "Offload in Contact",
    # Kicking distance (power component)
    "Kicking Distance",
    "Punt Kick (Left)",
    "Punt Kick (Right)",
    # Running/Evasion under pressure (speed differential)
    "Evasion (Side Step)",
    "Evasion (Swerve)",
    "Pass Under Pressure",
]

def get_gender_for_skill(skill_name, age_group):
    """Determine if skill should use 'all' or gender-specific benchmarks."""
    if skill_name in ALL_GENDER_SKILLS:
        return ["all"]

    if skill_name in GENDER_SPECIFIC_U14_PLUS:
        if age_group in ["U14", "U16", "U18", "Senior"]:
            return ["male", "female"]
        else:
            return ["all"]

    # Default: all gender for U10-U12, gender-specific for U14+
    if age_group in ["U10", "U12"]:
        return ["all"]
    return ["male", "female"]

def get_skill_benchmark_data(skill_name, age_group, gender, level):
    """
    Get benchmark data for specific skill/age/gender/level combination.
    Returns: (expectedRating, notes)
    """

    # Base expected ratings by age/level
    base_ratings = {
        "U10": {"recreational": 1.5},
        "U12": {"recreational": 2.0, "competitive": 2.5},
        "U14": {"recreational": 2.5, "competitive": 3.0, "elite": 3.5},
        "U16": {"recreational": 3.0, "competitive": 3.5, "elite": 4.0},
        "U18": {"recreational": 3.0, "competitive": 3.5, "elite": 4.0},
        "Senior": {"recreational": 3.0, "competitive": 4.0, "elite": 4.5},
    }

    base_rating = base_ratings[age_group][level]

    # Adjustments for specific skill types

    # Tactical skills develop slower (start lower, progress more gradually)
    tactical_skills = ["Decision Making", "Reading Defense", "Positional Understanding",
                       "Game Sense / Instinct", "Following Game Plan", "Spatial Awareness",
                       "Communication on Field"]

    if skill_name in tactical_skills:
        if age_group == "U10":
            base_rating = 1.0
        elif age_group == "U12":
            base_rating = base_rating - 0.5 if level == "recreational" else base_rating

    # Contact skills introduction progression
    contact_skills = ["Tackle Technique", "Tackle Completion", "Body Position in Contact",
                      "Leg Drive Through Contact", "Ball Presentation", "Ruck Entry / Cleanout"]

    if skill_name in contact_skills:
        if age_group == "U10":
            base_rating = 1.5  # Tag to contact transition
        elif age_group == "U12":
            base_rating = min(base_rating, 2.5)  # Progressive contact

    # Kicking skills introduction
    kicking_skills = ["Punt Kick (Left)", "Punt Kick (Right)", "Grubber Kick",
                      "Drop Kick", "Place Kicking", "Kicking Distance", "Kick Accuracy"]

    if skill_name in kicking_skills:
        if age_group == "U10":
            base_rating = 1.0  # Not yet introduced
        elif age_group == "U12":
            if level == "recreational":
                base_rating = 1.5
            else:
                base_rating = 2.0

    # Offload in Contact - not expected at U10
    if skill_name == "Offload in Contact" and age_group == "U10":
        base_rating = 1.0

    # Spiral / Long Pass - not introduced until U14
    if skill_name == "Spiral / Long Pass":
        if age_group == "U10":
            base_rating = 1.0
        elif age_group == "U12":
            base_rating = min(base_rating, 2.0)

    # Jackaling - not introduced until U14
    if skill_name == "Jackaling / Turnovers":
        if age_group in ["U10", "U12"]:
            base_rating = 1.0

    # Dummy Pass - not expected until U12
    if skill_name == "Dummy Pass" and age_group == "U10":
        base_rating = 1.0

    # Catching Under Pressure - starts low
    if skill_name == "Catching Under Pressure":
        if age_group == "U10":
            base_rating = 1.0
        elif age_group == "U12" and level == "recreational":
            base_rating = 1.5

    # Ruck Entry - U12+ only
    if skill_name == "Ruck Entry / Cleanout":
        if age_group == "U10":
            base_rating = 1.0
        elif age_group == "U12" and level == "recreational":
            base_rating = 1.5

    # Generate contextual notes
    notes = get_skill_notes(skill_name, age_group, gender, level, base_rating)

    return (base_rating, notes)

def get_skill_notes(skill_name, age_group, gender, level, rating):
    """Generate contextual notes for benchmark."""

    notes = []

    # Age-specific context
    if age_group == "U10":
        if skill_name in ["Tackle Technique", "Tackle Completion", "Body Position in Contact", "Ball Carry Into Contact"]:
            notes.append("Tag to contact transition - safe technique emphasis")
        elif skill_name in ["Punt Kick (Left)", "Punt Kick (Right)", "Grubber Kick", "Drop Kick", "Place Kicking", "Kicking Distance", "Kick Accuracy"]:
            notes.append("Not yet introduced - optional if included")
        elif "Decision Making" in skill_name or "Tactical" in skill_name:
            notes.append("Foundation age - learning basic concepts")
        else:
            notes.append("Foundation age - learning fundamental technique")

    elif age_group == "U12":
        if skill_name in ["Tackle Technique", "Tackle Completion"]:
            notes.append("Progressive contact with safety restrictions. Walking to jogging speed.")
        elif skill_name in ["Punt Kick (Left)", "Punt Kick (Right)", "Grubber Kick", "Drop Kick", "Place Kicking"]:
            notes.append("Introduction to kicking - focus on technique")
        elif level == "competitive":
            notes.append("Above average for age - representative standard developing")

    elif age_group == "U14":
        if skill_name in ["Tackle Technique", "Tackle Completion"]:
            notes.append("Full contact with age-appropriate restrictions. Safe technique at game speed.")
        elif level == "recreational":
            notes.append("Club level - functional competence")
        elif level == "competitive":
            notes.append("Representative level - strong skills under pressure")
        elif level == "elite":
            notes.append("County/development squad standard")

    elif age_group == "U16":
        if level == "recreational":
            notes.append("Social club level - competent execution")
        elif level == "competitive":
            notes.append("Representative/development level - consistent performance")
        elif level == "elite":
            notes.append("Academy selection standard - professional potential")

    elif age_group == "U18":
        if level == "recreational":
            notes.append("Adult baseline - functional rugby")
        elif level == "competitive":
            notes.append("Strong club/county level")
        elif level == "elite":
            notes.append("Academy/U20 level - professional pathway")

    elif age_group == "Senior":
        if level == "recreational":
            notes.append("Social/club rugby - competent adult standard")
        elif level == "competitive":
            notes.append("High-level club/county competition")
        elif level == "elite":
            notes.append("Professional/international standard")

    # Skill-specific notes
    if skill_name in ["Pass Accuracy (Left)", "Pass Accuracy (Right)"]:
        notes.append("Bilateral development essential")

    if skill_name in ["Tackle Technique", "Tackle Completion"]:
        if age_group != "U10":
            notes.append("Head position safety critical")

    if skill_name == "Rip / Tag Technique":
        if age_group == "U10":
            notes.append("Tag rugby primary skill")
        else:
            notes.append("Strip technique in contact rugby")

    if skill_name in ["Kicking Distance", "Punt Kick (Left)", "Punt Kick (Right)"] and gender in ["male", "female"]:
        if age_group == "U16" and level == "elite":
            if gender == "male":
                notes.append("45m+ expected")
            else:
                notes.append("40m+ expected")
        elif age_group == "Senior" and level == "elite":
            if gender == "male":
                notes.append("50m+ (backs), 40m+ (forwards)")
            else:
                notes.append("45m+ (backs), 35m+ (forwards)")

    if skill_name == "Jackaling / Turnovers":
        if age_group in ["U10", "U12"]:
            notes.append("Not yet introduced - complex skill for older ages")
        elif level == "elite":
            notes.append("Specialist skill (7s, loose forwards)")

    return " ".join(notes)

def generate_benchmarks():
    """Generate all benchmarks for all skills, age groups, genders, and levels."""

    benchmarks = []

    age_groups = ["U10", "U12", "U14", "U16", "U18", "Senior"]

    for age_group in age_groups:
        # Determine levels for this age group
        if age_group == "U10":
            levels = ["recreational"]
        elif age_group == "U12":
            levels = ["recreational", "competitive"]
        else:  # U14, U16, U18, Senior
            levels = ["recreational", "competitive", "elite"]

        for skill_name in SKILLS:
            genders = get_gender_for_skill(skill_name, age_group)

            for gender in genders:
                for level in levels:
                    expected_rating, notes = get_skill_benchmark_data(
                        skill_name, age_group, gender, level
                    )

                    benchmark = {
                        "sportCode": "rugby",
                        "skillName": skill_name,
                        "ageGroup": age_group,
                        "gender": gender,
                        "level": level,
                        "expectedRating": expected_rating,
                        "minAcceptable": expected_rating - 0.5,
                        "developingThreshold": expected_rating,
                        "excellentThreshold": expected_rating + 0.5,
                        "notes": notes
                    }

                    benchmarks.append(benchmark)

    return benchmarks

def main():
    """Generate and save benchmarks to JSON file."""

    print("Generating Rugby skill benchmarks...")
    benchmarks = generate_benchmarks()

    print(f"Generated {len(benchmarks)} benchmarks")

    # Count by age group
    by_age = {}
    for b in benchmarks:
        age = b["ageGroup"]
        by_age[age] = by_age.get(age, 0) + 1

    print("\nBreakdown by age group:")
    for age in ["U10", "U12", "U14", "U16", "U18", "Senior"]:
        print(f"  {age}: {by_age.get(age, 0)} benchmarks")

    # Save to file
    output = {"benchmarks": benchmarks}

    with open("rugby-benchmarks-IMPORT.json", "w") as f:
        json.dump(output, f, indent=2)

    print("\nSaved to rugby-benchmarks-IMPORT.json")

if __name__ == "__main__":
    main()
