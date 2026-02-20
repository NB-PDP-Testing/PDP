# Strength & Conditioning - Complete Skills & Benchmarks Data
**Sport Code:** strength&conditioning
**Sport Name:** S&C (Strength & Conditioning)
**Created:** February 2026
**Version:** 1.0

This document contains the complete dataset of skills and benchmarks for the Strength & Conditioning assessment system used in PlayerARC.

---

## TABLE OF CONTENTS

1. [Skills Overview](#skills-overview)
2. [Category 1: Running & Endurance](#category-1-running--endurance)
3. [Category 2: Power & Strength](#category-2-power--strength)
4. [Category 3: Core & Stability](#category-3-core--stability)
5. [Category 4: Speed & Agility](#category-4-speed--agility)
6. [Category 5: Hyrox Stations](#category-5-hyrox-stations)
7. [Category 6: Movement Quality](#category-6-movement-quality)
8. [Benchmarks Overview](#benchmarks-overview)
9. [Benchmarks Data](#benchmarks-data)

---

## SKILLS OVERVIEW

The Strength & Conditioning assessment system contains **42 skills** organized into **6 categories**. Each skill is rated on a 1-5 scale with detailed descriptors for each level.

### Summary Table

| Category | Skill Count | Age Groups | Primary Focus |
|----------|-------------|------------|---------------|
| Running & Endurance | 4 | U14-Adult | Aerobic capacity, pacing, recovery |
| Power & Strength | 5 | U14-Adult | Functional strength, explosive power |
| Core & Stability | 4 | U14-Adult | Stability, balance, injury prevention |
| Speed & Agility | 5 | U14-Adult | Sprint speed, acceleration, COD |
| Hyrox Stations | 8 | U14-Adult (U16+ SkiErg) | Competition-specific skills |
| Movement Quality | 6 | U14-Adult | Fundamental movement patterns |
| **TOTAL** | **42** | | |

---

## CATEGORY 1: RUNNING & ENDURANCE

**Category Code:** running_endurance
**Sort Order:** 1
**Description:** Aerobic capacity, pacing, and running efficiency for Hyrox 8km and GAA match endurance

### Skill 1.1: Aerobic Capacity

**Skill Code:** aerobic_capacity
**Skill Name:** Aerobic Capacity
**Sort Order:** 1
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Ability to sustain prolonged aerobic effort (VO2max, endurance base)

**Level Descriptors:**
- **Level 1 (Beginner):** Struggles with continuous 10+ minute efforts
- **Level 2 (Developing):** Can sustain moderate effort for 20-30 minutes
- **Level 3 (Competent):** Can sustain effort for 40-60 minutes at steady pace
- **Level 4 (Proficient):** Maintains high work rate for 60+ minutes with minimal decline
- **Level 5 (Excellent):** Exceptional endurance, can sustain near-maximal effort for extended periods

---

### Skill 1.2: Running Economy

**Skill Code:** running_economy
**Skill Name:** Running Economy
**Sort Order:** 2
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Efficiency of running gait, energy cost per km

**Level Descriptors:**
- **Level 1 (Beginner):** Inefficient gait, high energy cost, poor mechanics
- **Level 2 (Developing):** Developing technique, some wasted movement
- **Level 3 (Competent):** Competent running mechanics, adequate efficiency
- **Level 4 (Proficient):** Efficient gait, minimal wasted energy, good form under fatigue
- **Level 5 (Excellent):** Exceptional running economy, maintains perfect form throughout

---

### Skill 1.3: Pacing Strategy

**Skill Code:** pacing
**Skill Name:** Pacing Strategy
**Sort Order:** 3
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Ability to manage effort distribution across race/match duration

**Level Descriptors:**
- **Level 1 (Beginner):** Poor pacing, starts too fast or too slow, inconsistent
- **Level 2 (Developing):** Basic pacing awareness, significant variation in splits
- **Level 3 (Competent):** Can maintain relatively consistent pace in training
- **Level 4 (Proficient):** Good pace judgment, minimal variation, adapts to conditions
- **Level 5 (Excellent):** Exceptional pacing control, optimal energy distribution, competitive awareness

---

### Skill 1.4: Recovery Between Efforts

**Skill Code:** recovery_between_efforts
**Skill Name:** Recovery Between Efforts
**Sort Order:** 4
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Ability to recover between high-intensity bouts (Hyrox stations, GAA surges)

**Level Descriptors:**
- **Level 1 (Beginner):** Slow recovery, struggles to resume activity quickly
- **Level 2 (Developing):** Moderate recovery, needs extended rest between efforts
- **Level 3 (Competent):** Can recover within 60-90 seconds for next bout
- **Level 4 (Proficient):** Fast recovery, ready for next effort within 30-60 seconds
- **Level 5 (Excellent):** Exceptional recovery, minimal performance drop between bouts

---

## CATEGORY 2: POWER & STRENGTH

**Category Code:** power_strength
**Sort Order:** 2
**Description:** Functional strength for sled work, carries, and GAA-specific power (tackling, jumping, striking)

### Skill 2.1: Lower Body Strength

**Skill Code:** lower_body_strength
**Skill Name:** Lower Body Strength
**Sort Order:** 1
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Leg strength for sled push/pull, lunges, jumping (squat, lunge strength)

**Level Descriptors:**
- **Level 1 (Beginner):** Struggles with bodyweight movements, poor leg strength
- **Level 2 (Developing):** Can perform basic leg exercises with light load
- **Level 3 (Competent):** Can squat/lunge with moderate load (0.75-1x bodyweight)
- **Level 4 (Proficient):** Strong lower body, can handle 1-1.5x bodyweight with good form
- **Level 5 (Excellent):** Exceptional leg strength, 1.5-2x+ bodyweight, explosive power

---

### Skill 2.2: Upper Body Strength

**Skill Code:** upper_body_strength
**Skill Name:** Upper Body Strength
**Sort Order:** 2
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Upper body strength for farmers carry, wall balls, rowing, skierg

**Level Descriptors:**
- **Level 1 (Beginner):** Struggles with pushups, limited upper body capacity
- **Level 2 (Developing):** Can perform basic upper body exercises with light load
- **Level 3 (Competent):** Can perform pushups/pulls with moderate load
- **Level 4 (Proficient):** Strong upper body, good pressing/pulling strength
- **Level 5 (Excellent):** Exceptional upper body strength and endurance

---

### Skill 2.3: Grip Strength

**Skill Code:** grip_strength
**Skill Name:** Grip Strength
**Sort Order:** 3
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Grip endurance for farmers carry, sled pull, GAA ball handling

**Level Descriptors:**
- **Level 1 (Beginner):** Weak grip, cannot sustain carries or hangs
- **Level 2 (Developing):** Basic grip strength, fatigues quickly under load
- **Level 3 (Competent):** Can sustain moderate grip demands for 30-60 seconds
- **Level 4 (Proficient):** Strong grip, can sustain heavy carries/hangs for 60+ seconds
- **Level 5 (Excellent):** Exceptional grip strength and endurance, no limiting factor

---

### Skill 2.4: Explosive Power

**Skill Code:** explosive_power
**Skill Name:** Explosive Power
**Sort Order:** 4
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Rate of force production - jumping, sprinting, striking, tackling

**Level Descriptors:**
- **Level 1 (Beginner):** Limited explosiveness, slow force development
- **Level 2 (Developing):** Developing power, moderate jump height/sprint acceleration
- **Level 3 (Competent):** Good power output, competent jumping and acceleration
- **Level 4 (Proficient):** High power output, impressive explosiveness
- **Level 5 (Excellent):** Exceptional explosiveness, elite jump/sprint/strike power

---

### Skill 2.5: Strength Endurance

**Skill Code:** strength_endurance
**Skill Name:** Strength Endurance
**Sort Order:** 5
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Ability to maintain strength output under fatigue (wall balls, repeated efforts)

**Level Descriptors:**
- **Level 1 (Beginner):** Strength deteriorates rapidly with repetition
- **Level 2 (Developing):** Can maintain moderate output for 10-15 reps
- **Level 3 (Competent):** Can sustain strength for 20-30 reps with minor decline
- **Level 4 (Proficient):** Maintains high output for 30-50+ reps
- **Level 5 (Excellent):** Exceptional strength endurance, minimal decline over 50+ reps

---

## CATEGORY 3: CORE & STABILITY

**Category Code:** core_stability
**Sort Order:** 3
**Description:** Core strength, balance, and stability for injury prevention and performance

### Skill 3.1: Core Strength

**Skill Code:** core_strength
**Skill Name:** Core Strength
**Sort Order:** 1
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Anti-extension, anti-rotation, anti-lateral flexion strength

**Level Descriptors:**
- **Level 1 (Beginner):** Weak core, cannot hold basic plank positions
- **Level 2 (Developing):** Can hold plank for 30-60 seconds with moderate form
- **Level 3 (Competent):** Can hold planks/carries 60-90 seconds with good form
- **Level 4 (Proficient):** Strong core, can maintain stability under load/fatigue
- **Level 5 (Excellent):** Exceptional core strength, perfect stability in all movements

---

### Skill 3.2: Balance & Stability

**Skill Code:** balance_stability
**Skill Name:** Balance & Stability
**Sort Order:** 2
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Single-leg balance, dynamic stability, proprioception

**Level Descriptors:**
- **Level 1 (Beginner):** Poor balance, struggles on single leg
- **Level 2 (Developing):** Can balance on single leg for 10-20 seconds
- **Level 3 (Competent):** Good static balance, developing dynamic stability
- **Level 4 (Proficient):** Strong balance, stable in dynamic movements
- **Level 5 (Excellent):** Exceptional balance and proprioception in all conditions

---

### Skill 3.3: Hip Stability

**Skill Code:** hip_stability
**Skill Name:** Hip Stability
**Sort Order:** 3
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Glute strength, single-leg control, pelvic stability

**Level Descriptors:**
- **Level 1 (Beginner):** Weak hips, knee valgus, poor single-leg control
- **Level 2 (Developing):** Developing hip strength, some compensation patterns
- **Level 3 (Competent):** Adequate hip stability for basic movements
- **Level 4 (Proficient):** Strong hips, good control in running/jumping/cutting
- **Level 5 (Excellent):** Exceptional hip stability, perfect movement patterns

---

### Skill 3.4: Postural Control

**Skill Code:** postural_control
**Skill Name:** Postural Control
**Sort Order:** 4
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Ability to maintain neutral spine and optimal posture under load

**Level Descriptors:**
- **Level 1 (Beginner):** Poor posture, excessive spinal flexion/extension
- **Level 2 (Developing):** Developing postural awareness, loses position under load
- **Level 3 (Competent):** Can maintain good posture in most movements
- **Level 4 (Proficient):** Excellent postural control, maintains position under fatigue
- **Level 5 (Excellent):** Perfect postural control in all conditions and loads

---

## CATEGORY 4: SPEED & AGILITY

**Category Code:** speed_agility
**Sort Order:** 4
**Description:** Sprint speed, acceleration, change of direction, and reactive agility for GAA

### Skill 4.1: Sprint Speed (Max Velocity)

**Skill Code:** sprint_speed
**Skill Name:** Sprint Speed (Max Velocity)
**Sort Order:** 1
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Top-end running speed (20-40m flying sprint)

**Level Descriptors:**
- **Level 1 (Beginner):** Slow sprinter, limited top speed
- **Level 2 (Developing):** Below average sprint speed for age/level
- **Level 3 (Competent):** Average sprint speed, adequate for level
- **Level 4 (Proficient):** Fast sprinter, above average speed
- **Level 5 (Excellent):** Exceptional sprint speed, elite velocity

---

### Skill 4.2: Acceleration (0-10m)

**Skill Code:** acceleration
**Skill Name:** Acceleration (0-10m)
**Sort Order:** 2
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** First step quickness, acceleration out of static position

**Level Descriptors:**
- **Level 1 (Beginner):** Slow acceleration, poor first step
- **Level 2 (Developing):** Developing acceleration, below average start
- **Level 3 (Competent):** Good acceleration, adequate for level
- **Level 4 (Proficient):** Fast acceleration, explosive first 5-10m
- **Level 5 (Excellent):** Exceptional acceleration, elite starting speed

---

### Skill 4.3: Change of Direction

**Skill Code:** change_of_direction
**Skill Name:** Change of Direction
**Sort Order:** 3
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Ability to decelerate, cut, and re-accelerate (pre-planned)

**Level Descriptors:**
- **Level 1 (Beginner):** Slow direction changes, poor deceleration mechanics
- **Level 2 (Developing):** Developing COD, loses speed through cuts
- **Level 3 (Competent):** Can change direction adequately, some speed loss
- **Level 4 (Proficient):** Fast COD, maintains speed through cuts
- **Level 5 (Excellent):** Exceptional COD, minimal speed loss, explosive out of cuts

---

### Skill 4.4: Reactive Agility

**Skill Code:** reactive_agility
**Skill Name:** Reactive Agility
**Sort Order:** 4
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Ability to react and change direction based on stimulus (GAA-specific)

**Level Descriptors:**
- **Level 1 (Beginner):** Slow reactions, struggles with unpredictable movements
- **Level 2 (Developing):** Developing reactive ability, delayed responses
- **Level 3 (Competent):** Adequate reactions, can respond to simple stimuli
- **Level 4 (Proficient):** Fast reactions, responds well to complex stimuli
- **Level 5 (Excellent):** Exceptional reactive agility, elite anticipation and response

---

### Skill 4.5: Repeated Sprint Ability

**Skill Code:** repeated_sprint_ability
**Skill Name:** Repeated Sprint Ability
**Sort Order:** 5
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Ability to maintain sprint performance across multiple bouts

**Level Descriptors:**
- **Level 1 (Beginner):** Significant speed decline after 2-3 sprints
- **Level 2 (Developing):** Moderate decline after 4-5 sprints
- **Level 3 (Competent):** Can maintain 80-85% speed for 6-8 sprints
- **Level 4 (Proficient):** Maintains 85-90% speed for 8-10 sprints
- **Level 5 (Excellent):** Exceptional RSA, maintains 90%+ speed for 10+ sprints

---

## CATEGORY 5: HYROX STATIONS

**Category Code:** hyrox_stations
**Sort Order:** 5
**Description:** Technique and efficiency for the 8 Hyrox competition stations

### Skill 5.1: SkiErg Technique (1000m)

**Skill Code:** skierg_technique
**Skill Name:** SkiErg Technique (1000m)
**Sort Order:** 1
**Age Group Relevance:** U16, U18, Senior

**Description:** Efficiency and power on SkiErg, pacing for 1000m effort

**Level Descriptors:**
- **Level 1 (Beginner):** Poor technique, inefficient stroke, very slow pace
- **Level 2 (Developing):** Basic technique, developing efficiency, slow pace
- **Level 3 (Competent):** Competent technique, can complete 1000m at steady pace
- **Level 4 (Proficient):** Efficient technique, strong power output, good pace
- **Level 5 (Excellent):** Exceptional technique and power, elite SkiErg performance

---

### Skill 5.2: Sled Push (50m)

**Skill Code:** sled_push
**Skill Name:** Sled Push (50m)
**Sort Order:** 2
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Leg drive and body position for 50m sled push

**Level Descriptors:**
- **Level 1 (Beginner):** Struggles to move sled, poor mechanics
- **Level 2 (Developing):** Can push sled slowly with coaching cues
- **Level 3 (Competent):** Can complete 50m push with good pace and form
- **Level 4 (Proficient):** Strong push, fast pace, excellent body position
- **Level 5 (Excellent):** Exceptional power and speed on sled push

---

### Skill 5.3: Sled Pull (50m)

**Skill Code:** sled_pull
**Skill Name:** Sled Pull (50m)
**Sort Order:** 3
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Arm-over-arm rope pull technique for 50m

**Level Descriptors:**
- **Level 1 (Beginner):** Struggles with pulling motion, very slow
- **Level 2 (Developing):** Can complete pull with poor efficiency
- **Level 3 (Competent):** Adequate pulling technique, steady pace
- **Level 4 (Proficient):** Efficient pull, strong grip, fast pace
- **Level 5 (Excellent):** Exceptional pulling power and efficiency

---

### Skill 5.4: Burpee Broad Jumps (80m)

**Skill Code:** burpee_broad_jumps
**Skill Name:** Burpee Broad Jumps (80m)
**Sort Order:** 4
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Efficient burpee technique combined with maximal broad jumps

**Level Descriptors:**
- **Level 1 (Beginner):** Slow burpees, short jumps, poor efficiency
- **Level 2 (Developing):** Can complete movement but very fatiguing
- **Level 3 (Competent):** Adequate technique, can maintain pace for 80m
- **Level 4 (Proficient):** Efficient burpees, good jump distance, strong pace
- **Level 5 (Excellent):** Exceptional efficiency and power, minimal fatigue

---

### Skill 5.5: Rowing (1000m)

**Skill Code:** rowing_technique
**Skill Name:** Rowing (1000m)
**Sort Order:** 5
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Rowing technique and pacing for 1000m effort

**Level Descriptors:**
- **Level 1 (Beginner):** Poor rowing form, very slow, inefficient
- **Level 2 (Developing):** Basic rowing technique, developing power
- **Level 3 (Competent):** Competent rowing, can maintain steady 1000m pace
- **Level 4 (Proficient):** Efficient technique, strong power, good pace
- **Level 5 (Excellent):** Exceptional rowing technique and power output

---

### Skill 5.6: Farmers Carry (200m)

**Skill Code:** farmers_carry
**Skill Name:** Farmers Carry (200m)
**Sort Order:** 6
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Posture, grip endurance, and walking efficiency with heavy kettlebells

**Level Descriptors:**
- **Level 1 (Beginner):** Cannot complete carry, drops weights multiple times
- **Level 2 (Developing):** Can complete with many stops, poor posture
- **Level 3 (Competent):** Can complete 200m with 1-2 stops, adequate posture
- **Level 4 (Proficient):** Strong carry, minimal stops, good posture and pace
- **Level 5 (Excellent):** Exceptional carry, no stops, perfect posture, fast pace

---

### Skill 5.7: Sandbag Lunges (100m)

**Skill Code:** sandbag_lunges
**Skill Name:** Sandbag Lunges (100m)
**Sort Order:** 7
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Lunge technique and endurance with sandbag for 100m

**Level Descriptors:**
- **Level 1 (Beginner):** Poor lunge form, cannot complete distance
- **Level 2 (Developing):** Can complete with poor form, many stops
- **Level 3 (Competent):** Adequate lunge technique, can complete 100m steadily
- **Level 4 (Proficient):** Good form, strong lunges, minimal stops
- **Level 5 (Excellent):** Exceptional lunge technique and endurance

---

### Skill 5.8: Wall Balls (100 reps)

**Skill Code:** wall_balls
**Skill Name:** Wall Balls (100 reps)
**Sort Order:** 8
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Squat depth, timing, and endurance for 100 wall ball shots

**Level Descriptors:**
- **Level 1 (Beginner):** Poor squat depth, cannot maintain rhythm
- **Level 2 (Developing):** Basic technique, breaks into many small sets
- **Level 3 (Competent):** Adequate form, can complete 100 with several breaks
- **Level 4 (Proficient):** Good form, strong sets, efficient pacing
- **Level 5 (Excellent):** Exceptional technique, large unbroken sets, fast completion

---

## CATEGORY 6: MOVEMENT QUALITY

**Category Code:** movement_quality
**Sort Order:** 6
**Description:** Fundamental movement patterns, mobility, and technique

### Skill 6.1: Squat Pattern

**Skill Code:** squat_pattern
**Skill Name:** Squat Pattern
**Sort Order:** 1
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Bodyweight squat mechanics - depth, knee tracking, spine position

**Level Descriptors:**
- **Level 1 (Beginner):** Poor squat mechanics, limited depth, knee valgus
- **Level 2 (Developing):** Developing squat, some compensation patterns
- **Level 3 (Competent):** Competent squat to parallel with good alignment
- **Level 4 (Proficient):** Excellent squat mechanics, full depth, perfect form
- **Level 5 (Excellent):** Exceptional squat pattern, role model movement quality

---

### Skill 6.2: Hip Hinge Pattern

**Skill Code:** hip_hinge
**Skill Name:** Hip Hinge Pattern
**Sort Order:** 2
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Deadlift/hinge mechanics - neutral spine, hip drive

**Level Descriptors:**
- **Level 1 (Beginner):** Poor hinge, excessive spinal flexion, quad-dominant
- **Level 2 (Developing):** Developing hinge awareness, some lumbar rounding
- **Level 3 (Competent):** Adequate hinge, can maintain neutral spine with light load
- **Level 4 (Proficient):** Excellent hinge mechanics under load
- **Level 5 (Excellent):** Perfect hinge pattern, optimal hip drive and spinal position

---

### Skill 6.3: Shoulder Mobility

**Skill Code:** shoulder_mobility
**Skill Name:** Shoulder Mobility
**Sort Order:** 3
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Overhead range of motion, shoulder flexion and rotation

**Level Descriptors:**
- **Level 1 (Beginner):** Limited overhead mobility, restricted shoulder movement
- **Level 2 (Developing):** Developing mobility, can reach overhead with compensation
- **Level 3 (Competent):** Adequate shoulder mobility for basic movements
- **Level 4 (Proficient):** Good shoulder mobility, full overhead range
- **Level 5 (Excellent):** Exceptional shoulder mobility and control

---

### Skill 6.4: Thoracic Mobility

**Skill Code:** thoracic_mobility
**Skill Name:** Thoracic Mobility
**Sort Order:** 4
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Mid-back extension and rotation capacity

**Level Descriptors:**
- **Level 1 (Beginner):** Very stiff thoracic spine, limited rotation/extension
- **Level 2 (Developing):** Limited thoracic mobility, compensates with lumbar spine
- **Level 3 (Competent):** Adequate thoracic mobility for basic movements
- **Level 4 (Proficient):** Good thoracic extension and rotation
- **Level 5 (Excellent):** Exceptional thoracic mobility and control

---

### Skill 6.5: Ankle Mobility

**Skill Code:** ankle_mobility
**Skill Name:** Ankle Mobility
**Sort Order:** 5
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Dorsiflexion range for squatting, lunging, running

**Level Descriptors:**
- **Level 1 (Beginner):** Severely limited ankle dorsiflexion
- **Level 2 (Developing):** Restricted ankle mobility, compensates with heel lift
- **Level 3 (Competent):** Adequate ankle mobility for most movements
- **Level 4 (Proficient):** Good ankle dorsiflexion, no movement limitations
- **Level 5 (Excellent):** Exceptional ankle mobility and control

---

### Skill 6.6: Movement Coordination

**Skill Code:** movement_coordination
**Skill Name:** Movement Coordination
**Sort Order:** 6
**Age Group Relevance:** U14, U16, U18, Senior

**Description:** Ability to learn and perform complex movement sequences

**Level Descriptors:**
- **Level 1 (Beginner):** Struggles with basic coordination, clumsy movements
- **Level 2 (Developing):** Developing coordination, learns movements slowly
- **Level 3 (Competent):** Adequate coordination, can learn standard movements
- **Level 4 (Proficient):** Good coordination, learns complex movements quickly
- **Level 5 (Excellent):** Exceptional coordination and body awareness

---

## BENCHMARKS OVERVIEW

The benchmark system contains **88 benchmarks** that define expected performance standards for each skill based on:
- **Age Group:** U14, U16, U18, Senior (Adult)
- **Gender:** Male, Female, All (gender-neutral)
- **Level:** Recreational, Competitive, Elite

### Benchmark Structure

Each benchmark defines:
- **Expected Rating:** The target rating for athletes at this age/gender/level
- **Min Acceptable:** Minimum acceptable rating (below this is "Below" status)
- **Developing Threshold:** Rating above this is "Developing" or better
- **Excellent Threshold:** Rating above this is "Exceeding" or "Exceptional"

### Benchmark Status Calculation

The system automatically compares an athlete's rating to benchmarks:
- **Below:** Rating < Min Acceptable (Red flag - priority focus)
- **Developing:** Min Acceptable ≤ Rating < Expected (Orange - keep working)
- **On Track:** Expected ≤ Rating < Excellent (Yellow - meeting standards)
- **Exceeding:** Excellent ≤ Rating < 5.0 (Green - above standards)
- **Exceptional:** Rating = 5.0 (Green - outstanding)

### Source Information

- **Source:** Hyrox/GAA Standards
- **Source Document:** Hyrox & GAA Fitness Benchmark System v1.0
- **Source Year:** 2026
- **Data Derivation:** Based on Hyrox competition data, GAA sports science research, LTAD guidelines, and trainer experience

---

## BENCHMARKS DATA

### Aerobic Capacity Benchmarks

**Skill:** aerobic_capacity (Aerobic Capacity)

#### U14 Male Recreational
- Expected Rating: 2.5
- Min Acceptable: 1.5
- Developing Threshold: 2.0
- Excellent Threshold: 3.5
- Notes: U14 male recreational - building aerobic base

#### U14 Male Competitive
- Expected Rating: 3.0
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 4.0
- Notes: U14 male competitive - club development standard

#### U14 Female Recreational
- Expected Rating: 2.5
- Min Acceptable: 1.5
- Developing Threshold: 2.0
- Excellent Threshold: 3.5
- Notes: U14 female recreational - building aerobic base

#### U14 Female Competitive
- Expected Rating: 3.0
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 4.0
- Notes: U14 female competitive - club development standard

#### U16 Male Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 4.0
- Notes: U16 male recreational - increasing capacity

#### U16 Male Competitive
- Expected Rating: 3.5
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.5
- Notes: U16 male competitive - county development panel level

#### U16 Male Elite
- Expected Rating: 4.0
- Min Acceptable: 3.0
- Developing Threshold: 3.5
- Excellent Threshold: 4.5
- Notes: U16 male elite - county panel standard

#### U16 Female Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 4.0
- Notes: U16 female recreational - increasing capacity

#### U16 Female Competitive
- Expected Rating: 3.5
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.5
- Notes: U16 female competitive - county development panel level

#### U16 Female Elite
- Expected Rating: 4.0
- Min Acceptable: 3.0
- Developing Threshold: 3.5
- Excellent Threshold: 4.5
- Notes: U16 female elite - county panel standard

#### U18 Male Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 4.0
- Notes: U18 male recreational - club fitness

#### U18 Male Competitive
- Expected Rating: 4.0
- Min Acceptable: 3.0
- Developing Threshold: 3.5
- Excellent Threshold: 4.5
- Notes: U18 male competitive - county minor/u20 standard

#### U18 Male Elite
- Expected Rating: 4.5
- Min Acceptable: 3.5
- Developing Threshold: 4.0
- Excellent Threshold: 4.8
- Notes: U18 male elite - elite minor/u20 level

#### U18 Female Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 4.0
- Notes: U18 female recreational - club fitness

#### U18 Female Competitive
- Expected Rating: 4.0
- Min Acceptable: 3.0
- Developing Threshold: 3.5
- Excellent Threshold: 4.5
- Notes: U18 female competitive - county minor/u20 standard

#### U18 Female Elite
- Expected Rating: 4.5
- Min Acceptable: 3.5
- Developing Threshold: 4.0
- Excellent Threshold: 4.8
- Notes: U18 female elite - elite minor/u20 level

#### Senior Male Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 4.0
- Percentile 25th: 2.5
- Percentile 50th: 3.0
- Percentile 75th: 3.5
- Percentile 90th: 4.2
- Notes: Adult male recreational - Hyrox finisher, club player

#### Senior Male Competitive
- Expected Rating: 4.0
- Min Acceptable: 3.0
- Developing Threshold: 3.5
- Excellent Threshold: 4.5
- Percentile 25th: 3.5
- Percentile 50th: 4.0
- Percentile 75th: 4.3
- Percentile 90th: 4.7
- Notes: Adult male competitive - sub-90min Hyrox, county panel

#### Senior Male Elite
- Expected Rating: 4.5
- Min Acceptable: 4.0
- Developing Threshold: 4.3
- Excellent Threshold: 4.8
- Percentile 25th: 4.3
- Percentile 50th: 4.5
- Percentile 75th: 4.7
- Percentile 90th: 4.9
- Notes: Adult male elite - sub-75min Hyrox, county senior

#### Senior Female Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 4.0
- Percentile 25th: 2.5
- Percentile 50th: 3.0
- Percentile 75th: 3.5
- Percentile 90th: 4.2
- Notes: Adult female recreational - Hyrox finisher, club player

#### Senior Female Competitive
- Expected Rating: 4.0
- Min Acceptable: 3.0
- Developing Threshold: 3.5
- Excellent Threshold: 4.5
- Percentile 25th: 3.5
- Percentile 50th: 4.0
- Percentile 75th: 4.3
- Percentile 90th: 4.7
- Notes: Adult female competitive - sub-100min Hyrox, county panel

#### Senior Female Elite
- Expected Rating: 4.5
- Min Acceptable: 4.0
- Developing Threshold: 4.3
- Excellent Threshold: 4.8
- Percentile 25th: 4.3
- Percentile 50th: 4.5
- Percentile 75th: 4.7
- Percentile 90th: 4.9
- Notes: Adult female elite - sub-85min Hyrox, county senior

---

### Lower Body Strength Benchmarks

**Skill:** lower_body_strength (Lower Body Strength)

#### U14 Male Recreational
- Expected Rating: 2.0
- Min Acceptable: 1.5
- Developing Threshold: 2.0
- Excellent Threshold: 3.0
- Notes: U14 male - bodyweight movements focus, no heavy loading

#### U14 Male Competitive
- Expected Rating: 2.5
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 3.5
- Notes: U14 male competitive - developing strength base

#### U14 Female Recreational
- Expected Rating: 2.0
- Min Acceptable: 1.5
- Developing Threshold: 2.0
- Excellent Threshold: 3.0
- Notes: U14 female - bodyweight movements focus

#### U14 Female Competitive
- Expected Rating: 2.5
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 3.5
- Notes: U14 female competitive - developing strength base

#### U16 Male Recreational
- Expected Rating: 2.5
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 3.5
- Notes: U16 male - progressive loading phase

#### U16 Male Competitive
- Expected Rating: 3.0
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.0
- Notes: U16 male competitive - 0.75-1x BW squat range

#### U16 Male Elite
- Expected Rating: 3.5
- Min Acceptable: 3.0
- Developing Threshold: 3.5
- Excellent Threshold: 4.5
- Notes: U16 male elite - approaching 1.25x BW

#### U16 Female Recreational
- Expected Rating: 2.5
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 3.5
- Notes: U16 female - progressive loading phase

#### U16 Female Competitive
- Expected Rating: 3.0
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.0
- Notes: U16 female competitive - 0.6-0.9x BW squat range

#### U16 Female Elite
- Expected Rating: 3.5
- Min Acceptable: 3.0
- Developing Threshold: 3.5
- Excellent Threshold: 4.5
- Notes: U16 female elite - approaching 1x BW

#### U18 Male Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.0
- Notes: U18 male - 0.75-1x BW baseline

#### U18 Male Competitive
- Expected Rating: 3.5
- Min Acceptable: 3.0
- Developing Threshold: 3.5
- Excellent Threshold: 4.5
- Notes: U18 male competitive - 1-1.5x BW squat

#### U18 Male Elite
- Expected Rating: 4.0
- Min Acceptable: 3.5
- Developing Threshold: 4.0
- Excellent Threshold: 4.8
- Notes: U18 male elite - 1.5-2x BW squat

#### U18 Female Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.0
- Notes: U18 female - 0.6-0.9x BW baseline

#### U18 Female Competitive
- Expected Rating: 3.5
- Min Acceptable: 3.0
- Developing Threshold: 3.5
- Excellent Threshold: 4.5
- Notes: U18 female competitive - 0.9-1.25x BW squat

#### U18 Female Elite
- Expected Rating: 4.0
- Min Acceptable: 3.5
- Developing Threshold: 4.0
- Excellent Threshold: 4.8
- Notes: U18 female elite - 1.25-1.75x BW squat

#### Senior Male Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 4.0
- Percentile 25th: 2.5
- Percentile 50th: 3.0
- Percentile 75th: 3.5
- Percentile 90th: 4.2
- Notes: Adult male recreational - 1x BW squat baseline

#### Senior Male Competitive
- Expected Rating: 4.0
- Min Acceptable: 3.0
- Developing Threshold: 3.5
- Excellent Threshold: 4.5
- Percentile 25th: 3.5
- Percentile 50th: 4.0
- Percentile 75th: 4.3
- Percentile 90th: 4.7
- Notes: Adult male competitive - 1.5x BW squat target

#### Senior Male Elite
- Expected Rating: 4.5
- Min Acceptable: 4.0
- Developing Threshold: 4.3
- Excellent Threshold: 4.8
- Percentile 25th: 4.2
- Percentile 50th: 4.5
- Percentile 75th: 4.7
- Percentile 90th: 4.9
- Notes: Adult male elite - 2x+ BW squat

#### Senior Female Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 4.0
- Percentile 25th: 2.5
- Percentile 50th: 3.0
- Percentile 75th: 3.5
- Percentile 90th: 4.2
- Notes: Adult female recreational - 0.75x BW squat baseline

#### Senior Female Competitive
- Expected Rating: 4.0
- Min Acceptable: 3.0
- Developing Threshold: 3.5
- Excellent Threshold: 4.5
- Percentile 25th: 3.5
- Percentile 50th: 4.0
- Percentile 75th: 4.3
- Percentile 90th: 4.7
- Notes: Adult female competitive - 1.25x BW squat target

#### Senior Female Elite
- Expected Rating: 4.5
- Min Acceptable: 4.0
- Developing Threshold: 4.3
- Excellent Threshold: 4.8
- Percentile 25th: 4.2
- Percentile 50th: 4.5
- Percentile 75th: 4.7
- Percentile 90th: 4.9
- Notes: Adult female elite - 1.75x+ BW squat

---

### Sprint Speed Benchmarks

**Skill:** sprint_speed (Sprint Speed - Max Velocity)

#### U14 Male Recreational
- Expected Rating: 2.5
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 3.5
- Notes: U14 male - developing speed mechanics

#### U14 Male Competitive
- Expected Rating: 3.0
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.0
- Notes: U14 male competitive - good speed for age

#### U14 Female Recreational
- Expected Rating: 2.5
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 3.5
- Notes: U14 female - developing speed mechanics

#### U14 Female Competitive
- Expected Rating: 3.0
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.0
- Notes: U14 female competitive - good speed for age

#### U16 Male Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.0
- Notes: U16 male - approaching adult speed

#### U16 Male Competitive
- Expected Rating: 3.5
- Min Acceptable: 3.0
- Developing Threshold: 3.5
- Excellent Threshold: 4.5
- Notes: U16 male competitive - fast for age

#### U16 Male Elite
- Expected Rating: 4.0
- Min Acceptable: 3.5
- Developing Threshold: 4.0
- Excellent Threshold: 4.5
- Notes: U16 male elite - elite youth speed

#### U16 Female Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.0
- Notes: U16 female - approaching adult speed

#### U16 Female Competitive
- Expected Rating: 3.5
- Min Acceptable: 3.0
- Developing Threshold: 3.5
- Excellent Threshold: 4.5
- Notes: U16 female competitive - fast for age

#### U16 Female Elite
- Expected Rating: 4.0
- Min Acceptable: 3.5
- Developing Threshold: 4.0
- Excellent Threshold: 4.5
- Notes: U16 female elite - elite youth speed

#### U18 Male Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.0
- Notes: U18 male - adult speed baseline

#### U18 Male Competitive
- Expected Rating: 4.0
- Min Acceptable: 3.5
- Developing Threshold: 3.8
- Excellent Threshold: 4.5
- Notes: U18 male competitive - fast athlete

#### U18 Male Elite
- Expected Rating: 4.5
- Min Acceptable: 4.0
- Developing Threshold: 4.3
- Excellent Threshold: 4.8
- Notes: U18 male elite - elite minor speed

#### U18 Female Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.0
- Notes: U18 female - adult speed baseline

#### U18 Female Competitive
- Expected Rating: 4.0
- Min Acceptable: 3.5
- Developing Threshold: 3.8
- Excellent Threshold: 4.5
- Notes: U18 female competitive - fast athlete

#### U18 Female Elite
- Expected Rating: 4.5
- Min Acceptable: 4.0
- Developing Threshold: 4.3
- Excellent Threshold: 4.8
- Notes: U18 female elite - elite minor speed

#### Senior Male Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 4.0
- Percentile 25th: 2.5
- Percentile 50th: 3.0
- Percentile 75th: 3.5
- Percentile 90th: 4.0
- Notes: Adult male recreational - adequate speed for participation

#### Senior Male Competitive
- Expected Rating: 4.0
- Min Acceptable: 3.5
- Developing Threshold: 3.8
- Excellent Threshold: 4.5
- Percentile 25th: 3.7
- Percentile 50th: 4.0
- Percentile 75th: 4.2
- Percentile 90th: 4.5
- Notes: Adult male competitive - fast competitive athlete

#### Senior Male Elite
- Expected Rating: 4.5
- Min Acceptable: 4.0
- Developing Threshold: 4.3
- Excellent Threshold: 4.8
- Percentile 25th: 4.3
- Percentile 50th: 4.5
- Percentile 75th: 4.7
- Percentile 90th: 4.9
- Notes: Adult male elite - elite level speed

#### Senior Female Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 4.0
- Percentile 25th: 2.5
- Percentile 50th: 3.0
- Percentile 75th: 3.5
- Percentile 90th: 4.0
- Notes: Adult female recreational - adequate speed for participation

#### Senior Female Competitive
- Expected Rating: 4.0
- Min Acceptable: 3.5
- Developing Threshold: 3.8
- Excellent Threshold: 4.5
- Percentile 25th: 3.7
- Percentile 50th: 4.0
- Percentile 75th: 4.2
- Percentile 90th: 4.5
- Notes: Adult female competitive - fast competitive athlete

#### Senior Female Elite
- Expected Rating: 4.5
- Min Acceptable: 4.0
- Developing Threshold: 4.3
- Excellent Threshold: 4.8
- Percentile 25th: 4.3
- Percentile 50th: 4.5
- Percentile 75th: 4.7
- Percentile 90th: 4.9
- Notes: Adult female elite - elite level speed

---

### Core Strength Benchmarks (Gender Neutral)

**Skill:** core_strength (Core Strength)

#### U14 All Genders Recreational
- Expected Rating: 2.5
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 3.5
- Notes: U14 - plank 30-60s baseline

#### U14 All Genders Competitive
- Expected Rating: 3.0
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.0
- Notes: U14 competitive - plank 60-90s

#### U16 All Genders Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.0
- Notes: U16 - plank 60-90s baseline

#### U16 All Genders Competitive
- Expected Rating: 3.5
- Min Acceptable: 3.0
- Developing Threshold: 3.5
- Excellent Threshold: 4.5
- Notes: U16 competitive - plank 90-120s

#### U16 All Genders Elite
- Expected Rating: 4.0
- Min Acceptable: 3.5
- Developing Threshold: 4.0
- Excellent Threshold: 4.5
- Notes: U16 elite - plank 120s+

#### U18 All Genders Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.0
- Notes: U18 - plank 60-90s baseline

#### U18 All Genders Competitive
- Expected Rating: 4.0
- Min Acceptable: 3.5
- Developing Threshold: 3.8
- Excellent Threshold: 4.5
- Notes: U18 competitive - plank 90-120s

#### U18 All Genders Elite
- Expected Rating: 4.5
- Min Acceptable: 4.0
- Developing Threshold: 4.3
- Excellent Threshold: 4.8
- Notes: U18 elite - plank 120-180s

#### Senior All Genders Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 4.0
- Percentile 25th: 2.5
- Percentile 50th: 3.0
- Percentile 75th: 3.5
- Percentile 90th: 4.0
- Notes: Adult - plank 60-90s baseline

#### Senior All Genders Competitive
- Expected Rating: 4.0
- Min Acceptable: 3.5
- Developing Threshold: 3.8
- Excellent Threshold: 4.5
- Percentile 25th: 3.7
- Percentile 50th: 4.0
- Percentile 75th: 4.2
- Percentile 90th: 4.5
- Notes: Adult competitive - plank 120s+

#### Senior All Genders Elite
- Expected Rating: 4.5
- Min Acceptable: 4.0
- Developing Threshold: 4.3
- Excellent Threshold: 4.8
- Percentile 25th: 4.3
- Percentile 50th: 4.5
- Percentile 75th: 4.7
- Percentile 90th: 4.9
- Notes: Adult elite - plank 180s+, perfect stability under load

---

### Squat Pattern Benchmarks (Gender Neutral)

**Skill:** squat_pattern (Squat Pattern)

#### U14 All Genders Recreational
- Expected Rating: 2.5
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 3.5
- Notes: U14 - developing movement literacy

#### U14 All Genders Competitive
- Expected Rating: 3.0
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.0
- Notes: U14 competitive - good squat mechanics

#### U16 All Genders Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.0
- Notes: U16 - competent squat pattern

#### U16 All Genders Competitive
- Expected Rating: 3.5
- Min Acceptable: 3.0
- Developing Threshold: 3.5
- Excellent Threshold: 4.5
- Notes: U16 competitive - excellent squat mechanics

#### U16 All Genders Elite
- Expected Rating: 4.0
- Min Acceptable: 3.5
- Developing Threshold: 4.0
- Excellent Threshold: 4.5
- Notes: U16 elite - role model squat pattern

#### U18 All Genders Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.5
- Developing Threshold: 3.0
- Excellent Threshold: 4.0
- Notes: U18 - competent squat pattern

#### U18 All Genders Competitive
- Expected Rating: 4.0
- Min Acceptable: 3.5
- Developing Threshold: 3.8
- Excellent Threshold: 4.5
- Notes: U18 competitive - excellent mechanics under load

#### U18 All Genders Elite
- Expected Rating: 4.5
- Min Acceptable: 4.0
- Developing Threshold: 4.3
- Excellent Threshold: 4.8
- Notes: U18 elite - perfect squat pattern

#### Senior All Genders Recreational
- Expected Rating: 3.0
- Min Acceptable: 2.0
- Developing Threshold: 2.5
- Excellent Threshold: 4.0
- Percentile 25th: 2.5
- Percentile 50th: 3.0
- Percentile 75th: 3.5
- Percentile 90th: 4.0
- Notes: Adult - adequate squat mechanics

#### Senior All Genders Competitive
- Expected Rating: 4.0
- Min Acceptable: 3.5
- Developing Threshold: 3.8
- Excellent Threshold: 4.5
- Percentile 25th: 3.7
- Percentile 50th: 4.0
- Percentile 75th: 4.2
- Percentile 90th: 4.5
- Notes: Adult competitive - excellent mechanics under fatigue

#### Senior All Genders Elite
- Expected Rating: 4.5
- Min Acceptable: 4.0
- Developing Threshold: 4.3
- Excellent Threshold: 4.8
- Percentile 25th: 4.3
- Percentile 50th: 4.5
- Percentile 75th: 4.7
- Percentile 90th: 4.9
- Notes: Adult elite - perfect squat pattern, role model quality

---

## SUMMARY STATISTICS

### Total Benchmarks by Category
- Aerobic Capacity: 22 benchmarks
- Lower Body Strength: 22 benchmarks
- Sprint Speed: 22 benchmarks
- Core Strength: 11 benchmarks (gender-neutral)
- Squat Pattern: 11 benchmarks (gender-neutral)
- **TOTAL: 88 benchmarks**

### Benchmarks by Age Group
- U14: 8 benchmarks (4 male, 4 female)
- U16: 30 benchmarks (15 male, 15 female)
- U18: 30 benchmarks (15 male, 15 female)
- Senior: 20 benchmarks (10 male, 10 female) + percentile data

### Benchmarks by Level
- Recreational: 32 benchmarks
- Competitive: 32 benchmarks
- Elite: 24 benchmarks (U16+ only)

### Gender Distribution
- Male-specific: 33 benchmarks
- Female-specific: 33 benchmarks
- Gender-neutral (all): 22 benchmarks

---

## APPLICATION IN PLAYERARC

### How Benchmarks Are Used

When a coach assesses an athlete in the PlayerARC system:
1. Athlete's age is calculated from date of birth
2. Age group is determined (U14, U16, U18, or Senior)
3. Gender is from athlete profile (male/female)
4. Level is from org settings or coach selection (recreational/competitive/elite)
5. System looks up benchmark for: sport + skill + age group + gender + level
6. Rating is compared to benchmark thresholds
7. Status is calculated and displayed with color coding
8. Historical trend is tracked over time

### Benefits for Coaches

- **Objective Standards:** Remove guesswork, know what's expected
- **Age-Appropriate:** No comparing U14 to adults
- **Progressive:** See clear progression pathways
- **Visual Feedback:** Color-coded status (red/orange/yellow/green)
- **Focus Areas:** Automatically identify priorities
- **Track Progress:** See improvement over time

### Benefits for Athletes/Parents

- **Clear Targets:** Know what to work toward
- **Motivation:** See progress toward benchmarks
- **Context:** Understand if "on track" for age/level
- **Goal Setting:** Link training to benchmark targets

---

## VERSION HISTORY

- **v1.0 (February 2026):** Initial release
  - 42 skills across 6 categories
  - 88 benchmarks for U14-Adult athletes
  - Male/Female/All gender coverage
  - Recreational/Competitive/Elite levels

---

**END OF DOCUMENT**

*This data powers the Strength & Conditioning assessment system in PlayerARC*
*Use this document for NotebookLM import or reference*
