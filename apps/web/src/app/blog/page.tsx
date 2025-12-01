"use client";

import { ArrowRight, Calendar, Clock, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { blogPosts } from "@/data/blog-posts";

const categories = [
  "All",
  "Research",
  "Player Development",
  "Technology",
  "Well-being",
  "Multi-Sport Benefits",
] as const;

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const filteredPosts = blogPosts.filter((post) => {
    const matchesSearch =
      searchQuery === "" ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === "All" || post.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-gray-200 border-b bg-gradient-to-b from-[#F7FAF7] to-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h1 className="mb-4 font-bold text-4xl text-[#1E3A5F] sm:text-5xl">
            Research & Insights
          </h1>
          <p className="text-gray-600 text-lg">
            Explore comprehensive research, case studies, and insights on player
            development, well-being, and sports technology.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-10 border-gray-200 border-b bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-5 w-5 text-gray-400" />
              <Input
                className="pl-10"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                value={searchQuery}
              />
            </div>
            <Select
              onValueChange={setSelectedCategory}
              value={selectedCategory}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 text-gray-600 text-sm">
            {filteredPosts.length} article
            {filteredPosts.length !== 1 ? "s" : ""} found
          </div>
        </div>
      </div>

      {/* Blog Posts */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        {filteredPosts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-600 text-lg">
              No articles found. Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => (
              <Card
                className="group overflow-hidden border-2 border-gray-100 transition-all hover:shadow-lg"
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
        )}
      </div>
    </div>
  );
}
