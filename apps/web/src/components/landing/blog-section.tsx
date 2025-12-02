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
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-bold text-4xl text-[#1E3A5F] sm:text-5xl">
            Research & Insights
          </h2>
          <p className="mx-auto max-w-3xl text-gray-600 text-lg leading-relaxed">
            Evidence-based insights on keeping young athletes engaged, healthy,
            and in love with their sport.
          </p>
          <div className="mt-8">
            <Button
              asChild
              className="group bg-[#1E3A5F] text-white transition-all hover:bg-[#1E3A5F]/90"
              size="lg"
            >
              <Link href="/blog">
                View All Research
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Blog Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <Link href={`/blog/${post.slug}`} key={post.slug}>
              <Card className="group h-full overflow-hidden border-2 border-gray-200 bg-white transition-all hover:border-[#27AE60] hover:shadow-lg">
                <div className="relative h-48 w-full overflow-hidden bg-gray-200">
                  <Image
                    alt={post.title}
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
                      {new Date(post.date).toLocaleDateString("en-GB", {
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
                  <div className="mb-4 flex flex-wrap gap-2">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        className="rounded-full bg-gray-100 px-2 py-1 text-gray-600 text-xs"
                        key={tag}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <Button className="group w-full bg-[#1E3A5F] text-white transition-all hover:bg-[#1E3A5F]/90">
                    Read More
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <Button
            asChild
            className="group bg-[#1E3A5F] text-white transition-all hover:bg-[#1E3A5F]/90"
            size="lg"
          >
            <Link href="/blog">
              View All Research
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
