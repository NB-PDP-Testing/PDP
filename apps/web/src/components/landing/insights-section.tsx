"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const insights = {
  "so-what": {
    title: "The So What: Why It Matters",
    content: [
      {
        title: "Long-term Development",
        description:
          "Player development is a marathon, not a sprint. Without continuity, we lose the ability to see long-term trends, identify patterns, and make informed decisions about a player's journey.",
      },
      {
        title: "Retention Crisis",
        description:
          "The 70% dropout rate by age 13 represents a massive loss of potential. Many players quit not because they don't enjoy sports, but because they feel disconnected or unsupported.",
      },
      {
        title: "Well-being Impact",
        description:
          "Sports participation has profound effects on mental health, physical fitness, and social development. Losing players means losing these benefits for thousands of young people.",
      },
    ],
  },
  why: {
    title: "The Why: Root Causes",
    content: [
      {
        title: "Fragmented Systems",
        description:
          "Each club, sport, and organization uses different systems or paper-based tracking. There's no standard way to transfer player information between contexts.",
      },
      {
        title: "Communication Barriers",
        description:
          "Parents, coaches, and administrators often lack effective channels for sharing information. Important details get lost in emails, texts, or verbal conversations.",
      },
      {
        title: "Resource Constraints",
        description:
          "Many clubs operate with limited resources and volunteer coaches who don't have time to maintain comprehensive tracking systems.",
      },
    ],
  },
  "whats-happening": {
    title: "What's Happening: Current State",
    content: [
      {
        title: "Data Silos",
        description:
          "Player information exists in isolated systems - club databases, coach notebooks, parent spreadsheets. There's no unified view of a player's complete journey.",
      },
      {
        title: "Lost Transitions",
        description:
          "When players move between clubs, age groups, or sports, their development history is often lost. New coaches start from scratch, missing critical context.",
      },
      {
        title: "Reactive Approach",
        description:
          "Without comprehensive tracking, issues are often identified too late. Well-being concerns, skill gaps, or development needs aren't spotted until they become problems.",
      },
    ],
  },
  fallout: {
    title: "The Fallout: Consequences",
    content: [
      {
        title: "Player Dropout",
        description:
          "Players who feel unsupported or disconnected are more likely to quit. The lack of continuity makes it harder to maintain engagement and motivation.",
      },
      {
        title: "Missed Opportunities",
        description:
          "Without comprehensive tracking, coaches miss opportunities to tailor training, provide targeted support, or identify players who might benefit from additional resources.",
      },
      {
        title: "Well-being Risks",
        description:
          "Early warning signs of physical or mental health issues can go unnoticed without systematic monitoring and communication between stakeholders.",
      },
    ],
  },
} as const;

export function InsightsSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-bold text-4xl text-[#1E3A5F] sm:text-5xl">
            Understanding Player Development
          </h2>
          <p className="mx-auto max-w-3xl text-gray-600 text-lg">
            Deep insights into the challenges, causes, and consequences of
            fragmented player development.
          </p>
        </div>

        {/* Tabs */}
        <Tabs className="w-full" defaultValue="so-what">
          <TabsList className="mb-8 grid w-full grid-cols-2 gap-2 bg-gray-100 lg:grid-cols-4">
            <TabsTrigger
              className="data-[state=active]:!bg-[#1E3A5F] data-[state=active]:!text-white data-[state=active]:shadow-sm"
              value="so-what"
            >
              The So What
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:!bg-[#1E3A5F] data-[state=active]:!text-white data-[state=active]:shadow-sm"
              value="why"
            >
              The Why
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:!bg-[#1E3A5F] data-[state=active]:!text-white data-[state=active]:shadow-sm"
              value="whats-happening"
            >
              What&apos;s Happening
            </TabsTrigger>
            <TabsTrigger
              className="data-[state=active]:!bg-[#1E3A5F] data-[state=active]:!text-white data-[state=active]:shadow-sm"
              value="fallout"
            >
              The Fallout
            </TabsTrigger>
          </TabsList>

          {Object.entries(insights).map(([key, section]) => (
            <TabsContent key={key} value={key}>
              <div className="mb-6">
                <h3 className="font-semibold text-3xl text-[#1E3A5F]">
                  {section.title}
                </h3>
              </div>
              <div className="mb-8 grid gap-6 md:grid-cols-3">
                {section.content.map((item, index) => (
                  <Card
                    className="border-2 border-gray-200 bg-white"
                    key={index}
                  >
                    <CardHeader>
                      <CardTitle className="text-[#1E3A5F] text-xl">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base text-gray-600">
                        {item.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Mission Call-out Box - only show for "so-what" */}
              {key === "so-what" && (
                <>
                  <Card className="mx-auto mb-8 max-w-4xl border-2 border-gray-200 bg-white">
                    <CardContent className="p-8 text-center">
                      <h3 className="mb-4 font-bold text-3xl text-[#1E3A5F] sm:text-4xl">
                        As Many as Possible, For as Long as Possible
                      </h3>
                      <p className="mx-auto max-w-3xl text-gray-700 text-lg leading-relaxed">
                        Our mission isn&apos;t just about creating elite
                        athletes—it&apos;s about keeping kids engaged in sports
                        throughout their youth, building lifelong habits of
                        movement, teamwork, and resilience.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Research Insights Call-out Box */}
                  <Card className="mx-auto mt-8 max-w-4xl border-2 border-gray-200 bg-white">
                    <CardContent className="p-8 text-center">
                      <h3 className="mb-6 font-bold text-3xl text-[#1E3A5F] sm:text-4xl">
                        Key Research Findings
                      </h3>
                      <div className="grid gap-6 md:grid-cols-3">
                        <div className="text-center">
                          <div className="mb-2 font-bold text-5xl text-[#27AE60] sm:text-6xl">
                            1 in 3
                          </div>
                          <p className="text-base text-gray-700 leading-relaxed">
                            young athletes quit organised sports by age 14, with
                            dropout rates peaking between ages 12-16
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="mb-2 font-bold text-5xl text-[#27AE60] sm:text-6xl">
                            29.4%
                          </div>
                          <p className="text-base text-gray-700 leading-relaxed">
                            of parents report lack of communication with
                            coaches—a top-5 reason for dissatisfaction
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="mb-2 font-bold text-5xl text-[#27AE60] sm:text-6xl">
                            70-93%
                          </div>
                          <p className="text-base text-gray-700 leading-relaxed">
                            higher injury risk for single-sport specialisation
                            compared to multi-sport participation
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
