"use client";

import { ArrowRight, Calendar, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRecentPosts } from "@/data/blog-posts";

export function BlogSection() {
  const blogPosts = getRecentPosts(6);

  return (
    <section className="bg-gradient-to-b from-[#F7FAF7] to-white py-20">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h2 className="mb-4 font-bold text-4xl text-[#1E3A5F] sm:text-5xl">
              Research & Insights
            </h2>
            <p className="text-gray-600 text-lg">
              Evidence-based insights on keeping young athletes engaged,
              healthy, and in love with their sport.
            </p>
          </div>
          <Button
            asChild
            className="group hidden bg-[#1E3A5F] text-white transition-all hover:bg-[#1E3A5F]/90 sm:flex"
            variant="outline"
          >
            <Link href="/blog">
              View All Research
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        {/* Blog Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <Card
              className="group overflow-hidden border-2 border-gray-200 bg-white transition-all hover:shadow-lg"
              key={post.slug}
            >
              <div className="relative h-48 w-full overflow-hidden bg-gray-200">
                <Image
                  alt={post.title}
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  fill
                  src={post.image}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute right-4 bottom-4 left-4">
                  <span className="inline-block rounded-full bg-[#27AE60] px-3 py-1 font-semibold text-white text-xs">
                    {post.category}
                  </span>
                </div>
              </div>
              <CardHeader>
                <div className="mb-2 flex items-center gap-2 text-gray-500 text-sm">
                  <Calendar className="h-4 w-4" />
                  <time dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{post.readTime} min read</span>
                  </div>
                </div>
                <CardTitle className="text-[#1E3A5F] text-xl transition-colors group-hover:text-[#27AE60]">
                  {post.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4 text-base text-gray-600">
                  {post.excerpt}
                </CardDescription>
                <Button
                  asChild
                  className="group w-full text-[#1E3A5F] transition-colors hover:text-[#27AE60]"
                  variant="ghost"
                >
                  <Link href={`/blog/${post.slug}`}>
                    Read More
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 text-center sm:hidden">
          <Button
            asChild
            className="group bg-[#1E3A5F] text-white transition-all hover:bg-[#1E3A5F]/90"
            variant="outline"
          >
            <Link href="/blog">
              View All Research
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
