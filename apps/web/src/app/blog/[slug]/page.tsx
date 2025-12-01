"use client";

import { ArrowLeft, Calendar, Clock, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { getPostBySlug, getRecentPosts } from "@/data/blog-posts";

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRecentPosts(3).filter((p) => p.slug !== post.slug);

  return (
    <div className="min-h-screen bg-white">
      {/* Header Image */}
      <div className="relative h-96 w-full overflow-hidden bg-gradient-to-br from-[#1E3A5F] to-[#0F1F35]">
        <Image
          alt={post.title}
          className="object-cover opacity-30"
          fill
          src={post.image}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <span className="mb-4 inline-block rounded-full bg-[#27AE60] px-4 py-2 font-semibold text-sm">
              {post.category}
            </span>
            <h1 className="mx-auto max-w-4xl px-4 font-bold text-4xl sm:text-5xl">
              {post.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="border-gray-200 border-b bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <Button
            asChild
            className="group text-[#1E3A5F] transition-colors hover:text-[#27AE60]"
            variant="ghost"
          >
            <Link href="/blog">
              <ArrowLeft className="group-hover:-translate-x-1 mr-2 h-4 w-4 transition-transform" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <article className="mx-auto max-w-4xl px-4 py-12">
        {/* Meta Information */}
        <div className="mb-8 flex flex-wrap items-center gap-4 text-gray-600 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </div>
          <span>•</span>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{post.readTime} min read</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-2">
            <span>By {post.author}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-8 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-gray-600 text-sm"
              key={tag}
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>

        {/* Article Content */}
        <div className="prose prose-lg max-w-none prose-a:text-[#27AE60] prose-code:text-[#27AE60] prose-headings:text-[#1E3A5F] prose-strong:text-[#1E3A5F]">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-16 border-gray-200 border-t pt-12">
            <h2 className="mb-8 font-bold text-2xl text-[#1E3A5F]">
              Related Articles
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <Link
                  className="group block overflow-hidden rounded-lg border-2 border-gray-100 transition-all hover:shadow-lg"
                  href={`/blog/${relatedPost.slug}`}
                  key={relatedPost.slug}
                >
                  <div className="relative h-32 w-full overflow-hidden bg-gray-200">
                    <Image
                      alt={relatedPost.title}
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      fill
                      src={relatedPost.image}
                    />
                  </div>
                  <div className="p-4">
                    <span className="mb-2 inline-block rounded-full bg-[#27AE60] px-2 py-1 font-semibold text-white text-xs">
                      {relatedPost.category}
                    </span>
                    <h3 className="font-semibold text-[#1E3A5F] transition-colors group-hover:text-[#27AE60]">
                      {relatedPost.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
