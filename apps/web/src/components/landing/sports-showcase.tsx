"use client";

import Image from "next/image";

const sports = [
  {
    name: "GAA",
    image: "/sports/sport-gaa.jpg",
    description:
      "Support traditional Irish sports with specialized tracking for hurling, Gaelic football, and camogie development.",
    tags: ["Skill-specific drills", "Traditional values", "Community focus"],
  },
  {
    name: "Rugby",
    image: "/sports/sport-rugby.jpg",
    description:
      "Foster teamwork and physicality with comprehensive rugby development pathways from mini to youth rugby.",
    tags: ["Position-specific training", "Safety protocols", "Team dynamics"],
  },
  {
    name: "Soccer",
    image: "/sports/soccer-practice.jpg",
    description:
      "Develop technical skills and tactical understanding with structured soccer development programs.",
    tags: ["Technical mastery", "Tactical awareness", "Match analysis"],
  },
  {
    name: "Swimming",
    image: "/sports/sport-swimming.jpg",
    description:
      "Track progression through stroke development, endurance building, and competitive swimming milestones.",
    tags: ["Stroke refinement", "Endurance tracking", "Competition prep"],
  },
] as const;

const comingSoon = ["Basketball", "Hockey", "Tennis", "Volleyball"] as const;

export function SportsShowcase() {
  return (
    <section className="bg-gradient-to-br from-[#1E3A5F] via-[#1E3A5F] to-[#0F1F35] py-20 text-white">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-bold text-4xl sm:text-5xl md:text-6xl">
            Built for your Sport
          </h2>
          <p className="mx-auto max-w-3xl text-gray-200 text-lg leading-relaxed">
            Whether it's GAA, Rugby, Soccer, Swimming, or any other discipline,
            PDP adapts to the unique development pathways of each. Our platform
            is built for flexibility — supporting diverse activities, coaching
            styles, and player journeys. Track progress, analyze development,
            and enhance performance across all sports in one unified system.
          </p>
        </div>

        {/* Sports Grid - 2x2 layout */}
        <div className="mb-16 grid gap-6 sm:grid-cols-2">
          {sports.map((sport) => (
            <div
              className="group relative aspect-square overflow-hidden rounded-lg transition-transform hover:scale-105"
              key={sport.name}
            >
              <Image
                alt={sport.name}
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                fill
                src={sport.image}
              />
              {/* Dark overlay gradient from bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-black/40" />
              {/* Text overlay at bottom */}
              <div className="absolute right-0 bottom-0 left-0 p-6">
                <h3 className="mb-2 font-bold text-3xl text-white drop-shadow-lg sm:text-4xl">
                  {sport.name}
                </h3>
                <p className="mb-3 text-gray-200 text-sm leading-relaxed drop-shadow-md sm:text-base">
                  {sport.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sport.tags.map((tag) => (
                    <span
                      className="rounded-full bg-[#27AE60]/20 px-3 py-1 font-medium text-[#27AE60] text-xs backdrop-blur-sm sm:text-sm"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* More to come soon section - refined and subtle */}
        <div className="mx-auto max-w-4xl rounded-lg bg-white/5 p-6 backdrop-blur-sm md:p-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-center sm:text-left">
            <h3 className="font-semibold text-gray-200 text-lg sm:text-xl">
              More sports coming soon:
            </h3>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              {comingSoon.map((sport) => (
                <span
                  className="rounded-full bg-white/10 px-4 py-1.5 font-medium text-gray-200 text-sm backdrop-blur-sm"
                  key={sport}
                >
                  {sport}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
