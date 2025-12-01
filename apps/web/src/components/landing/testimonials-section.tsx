"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    name: "Sarah O'Connor",
    role: "Head Coach, Dublin GAA Club",
    content:
      "PDP has helped us keep more kids in sport. The ability to track their journey and celebrate their progress has made a real difference. We're seeing higher retention and happier players.",
    initials: "SO",
  },
  {
    name: "Michael Thompson",
    role: "Parent & Club Administrator",
    content:
      "As a parent, I love being able to see my child's development journey. The well-being tracking gives me peace of mind, and the collaboration with coaches keeps everyone on the same page.",
    initials: "MT",
  },
  {
    name: "Emma Walsh",
    role: "Youth Development Coordinator",
    content:
      "We're keeping kids engaged and in love with their sport. PDP helps us identify when players need support and celebrate their achievements. It's transformed how we nurture talent.",
    initials: "EW",
  },
] as const;

export function TestimonialsSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-bold text-4xl text-[#1E3A5F] sm:text-5xl">
            Trusted by Forward-Thinking Clubs
          </h2>
          <p className="mx-auto max-w-3xl text-gray-600 text-lg">
            See how coaches, parents, and administrators are using PDP to keep
            young athletes engaged, healthy, and in love with their sport.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card
              className="border-2 border-gray-200 bg-white transition-shadow hover:shadow-lg"
              key={index}
            >
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-4">
                  <Avatar className="h-12 w-12 bg-[#27AE60] text-white">
                    <AvatarFallback className="bg-[#27AE60] text-white">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-[#1E3A5F]">
                      {testimonial.name}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 italic">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
