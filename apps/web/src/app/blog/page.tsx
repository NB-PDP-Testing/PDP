"use client";

import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Search,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FloatingHeader } from "@/components/landing/floating-header";
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
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categoryParam || "All"
  );

  // Update category when URL param changes
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

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
      <FloatingHeader />
      {/* Header */}
      <div className="border-gray-200 border-b bg-gradient-to-b from-[#F7FAF7] to-white pt-20">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <div className="mb-12 text-center">
            <h1 className="mb-4 font-bold text-4xl text-[#1E3A5F] sm:text-5xl">
              Research & Insights
            </h1>
            <p className="mx-auto max-w-3xl text-gray-600 text-lg leading-relaxed">
              Explore comprehensive research, case studies, and insights on
              player development, well-being, and sports technology.
            </p>
            {/* Back to Home Button */}
            <div className="mt-8">
              <Button
                asChild
                className="group bg-[#1E3A5F] text-white transition-all hover:bg-[#1E3A5F]/90"
              >
                <Link href="/">
                  <ArrowLeft className="group-hover:-translate-x-1 mr-2 h-4 w-4 transition-transform" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-0 z-10 border-gray-200 border-b bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-5 w-5 text-gray-400" />
              <Input
                className="bg-white pr-10 pl-10 text-gray-900 placeholder:text-gray-500"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                value={searchQuery}
              />
              {searchQuery && (
                <button
                  className="-translate-y-1/2 absolute top-1/2 right-3 flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-600"
                  onClick={() => setSearchQuery("")}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select
              onValueChange={setSelectedCategory}
              value={selectedCategory}
            >
              <SelectTrigger className="w-full bg-white sm:w-[200px]">
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
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4">
          {filteredPosts.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-gray-600 text-lg">
                No articles found. Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post) => (
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
          )}
        </div>
      </section>
    </div>
  );
}
