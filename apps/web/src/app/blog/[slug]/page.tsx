import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { FloatingHeader } from "@/components/landing/floating-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  blogPosts,
  getCategoryStats,
  getNextPost,
  getPostBySlug,
  getPostsByCategory,
  getPreviousPost,
  getRelatedPosts,
} from "@/data/blog-posts";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(post, 3);
  const categoryPosts = getPostsByCategory(post.category).filter(
    (p) => p.slug !== post.slug
  );
  const nextPost = getNextPost(post);
  const previousPost = getPreviousPost(post);
  const categoryStats = getCategoryStats();
  const totalPosts = blogPosts.length;

  return (
    <div className="min-h-screen bg-white">
      <FloatingHeader />
      {/* Header Image */}
      <div className="relative h-96 w-full overflow-hidden bg-gradient-to-br from-[#1E3A5F] to-[#0F1F35] pt-20">
        <Image
          alt={post.title}
          className="object-cover opacity-30"
          fill
          sizes="100vw"
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
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="flex items-center gap-4">
            <Button
              asChild
              className="group bg-[#1E3A5F] text-white transition-all hover:bg-[#1E3A5F]/90"
            >
              <Link href="/blog">
                <ArrowLeft className="group-hover:-translate-x-1 mr-2 h-4 w-4 transition-transform" />
                Back to Research
              </Link>
            </Button>
            <Button
              asChild
              className="group text-[#1E3A5F] transition-colors hover:text-[#27AE60]"
              variant="ghost"
            >
              <Link href="/">
                <ArrowLeft className="group-hover:-translate-x-1 mr-2 h-4 w-4 transition-transform" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <article className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4">
          {/* Meta Information */}
          <div className="mb-6 flex flex-wrap items-center gap-4 text-gray-600 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("en-GB", {
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
          <div className="mb-10 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                className="rounded-full bg-gray-100 px-2 py-1 text-gray-600 text-xs"
                key={tag}
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Article Content */}
          <div className="prose prose-lg prose-h2:mt-8 prose-h3:mt-6 prose-h1:mb-6 prose-h2:mb-4 prose-h3:mb-3 max-w-none prose-a:font-medium prose-headings:font-bold prose-strong:font-semibold prose-a:text-[#27AE60] prose-code:text-[#27AE60] prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-headings:text-[#1E3A5F] prose-li:text-gray-900 prose-ol:text-gray-900 prose-p:text-gray-900 prose-strong:text-[#1E3A5F] prose-ul:text-gray-900 text-gray-900 prose-ol:leading-relaxed prose-p:leading-relaxed prose-ul:leading-relaxed prose-a:no-underline hover:prose-a:underline">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>
        </div>

        {/* Post Navigation */}
        {(previousPost || nextPost) && (
          <div className="mt-16 border-gray-200 border-t bg-white pt-8">
            <div className="mx-auto max-w-4xl px-4">
              <div className="grid gap-4 md:grid-cols-2">
                {previousPost && (
                  <Link
                    className="group flex items-center gap-4 rounded-lg border-2 border-gray-200 bg-white p-4 transition-all hover:border-[#27AE60] hover:shadow-md"
                    href={`/blog/${previousPost.slug}`}
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-400 transition-colors group-hover:text-[#27AE60]" />
                    <div className="flex-1">
                      <div className="mb-1 font-medium text-gray-500 text-xs uppercase">
                        Previous Article
                      </div>
                      <div className="font-semibold text-[#1E3A5F] transition-colors group-hover:text-[#27AE60]">
                        {previousPost.title}
                      </div>
                    </div>
                  </Link>
                )}
                {nextPost && (
                  <Link
                    className="group flex items-center gap-4 rounded-lg border-2 border-gray-200 bg-white p-4 transition-all hover:border-[#27AE60] hover:shadow-md md:ml-auto"
                    href={`/blog/${nextPost.slug}`}
                  >
                    <div className="flex-1 text-right">
                      <div className="mb-1 font-medium text-gray-500 text-xs uppercase">
                        Next Article
                      </div>
                      <div className="font-semibold text-[#1E3A5F] transition-colors group-hover:text-[#27AE60]">
                        {nextPost.title}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 transition-colors group-hover:text-[#27AE60]" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-16 border-gray-200 border-t bg-white pt-12">
            <div className="mx-auto max-w-7xl px-4">
              <div className="mb-12 text-center">
                <h2 className="mb-4 font-bold text-4xl text-[#1E3A5F] sm:text-5xl">
                  Related Articles
                </h2>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    className="group block overflow-hidden rounded-lg border-2 border-gray-200 bg-white transition-all hover:shadow-lg"
                    href={`/blog/${relatedPost.slug}`}
                    key={relatedPost.slug}
                  >
                    <div className="relative h-48 w-full overflow-hidden bg-gray-200">
                      <Image
                        alt={relatedPost.title}
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        src={relatedPost.image}
                      />
                    </div>
                    <div className="p-4">
                      <span className="mb-2 inline-block rounded-full bg-[#27AE60] px-2 py-1 font-semibold text-white text-xs">
                        {relatedPost.category}
                      </span>
                      <h3 className="mb-2 font-semibold text-[#1E3A5F] transition-colors group-hover:text-[#27AE60]">
                        {relatedPost.title}
                      </h3>
                      <p className="line-clamp-2 text-base text-gray-600">
                        {relatedPost.excerpt}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* More in Category */}
        {categoryPosts.length > 0 && (
          <div className="mt-16 border-gray-200 border-t bg-white pt-12">
            <div className="mx-auto max-w-7xl px-4">
              <div className="mb-12 text-center">
                <h2 className="mb-4 font-bold text-4xl text-[#1E3A5F] sm:text-5xl">
                  More in {post.category}
                </h2>
                <Button
                  asChild
                  className="group mt-4 bg-[#1E3A5F] text-white transition-all hover:bg-[#1E3A5F]/90"
                  size="lg"
                >
                  <Link
                    href={`/blog?category=${encodeURIComponent(post.category)}`}
                  >
                    View All {post.category}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {categoryPosts.slice(0, 6).map((categoryPost) => (
                  <Link
                    className="group block overflow-hidden rounded-lg border-2 border-gray-200 bg-white transition-all hover:shadow-lg"
                    href={`/blog/${categoryPost.slug}`}
                    key={categoryPost.slug}
                  >
                    <div className="relative h-48 w-full overflow-hidden bg-gray-200">
                      <Image
                        alt={categoryPost.title}
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        src={categoryPost.image}
                      />
                    </div>
                    <div className="p-4">
                      <div className="mb-2 flex items-center gap-2 text-gray-500 text-sm">
                        <Calendar className="h-4 w-4" />
                        <time dateTime={categoryPost.date}>
                          {new Date(categoryPost.date).toLocaleDateString(
                            "en-GB",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </time>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{categoryPost.readTime} min read</span>
                      </div>
                      <h3 className="mb-2 font-semibold text-[#1E3A5F] text-xl transition-colors group-hover:text-[#27AE60]">
                        {categoryPost.title}
                      </h3>
                      <p className="line-clamp-2 text-base text-gray-600">
                        {categoryPost.excerpt}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </article>

      {/* View All Research CTA Section */}
      <section className="border-gray-200 border-t bg-gradient-to-b from-[#F7FAF7] to-white py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-bold text-4xl text-[#1E3A5F] sm:text-5xl">
              Research & Insights
            </h2>
            <p className="mx-auto max-w-3xl text-gray-600 text-lg leading-relaxed">
              Discover comprehensive research, case studies, and insights on
              player development, well-being, and sports technology.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-gray-600 text-sm">
              <span className="font-semibold text-[#1E3A5F]">
                {totalPosts} Research Articles
              </span>
              <span>•</span>
              <span>{Object.keys(categoryStats).length} Categories</span>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(categoryStats).map(([category, count]) => (
              <Link
                className="group rounded-lg border-2 border-gray-200 bg-white p-4 text-center transition-all hover:border-[#27AE60] hover:shadow-md"
                href={`/blog?category=${encodeURIComponent(category)}`}
                key={category}
              >
                <div className="mb-2 font-bold text-3xl text-[#27AE60]">
                  {count}
                </div>
                <div className="font-medium text-[#1E3A5F] transition-colors group-hover:text-[#27AE60]">
                  {category}
                </div>
              </Link>
            ))}
          </div>

          {/* Featured Research Posts */}
          <div className="mb-12">
            <div className="mb-12 text-center">
              <h3 className="mb-4 font-bold text-4xl text-[#1E3A5F] sm:text-5xl">
                Featured Research
              </h3>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {blogPosts
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .slice(0, 6)
                .map((featuredPost) => (
                  <Card
                    className="group overflow-hidden border-2 border-gray-200 bg-white transition-all hover:border-[#27AE60] hover:shadow-lg"
                    key={featuredPost.slug}
                  >
                    <Link href={`/blog/${featuredPost.slug}`}>
                      <div className="relative h-48 w-full overflow-hidden bg-gray-200">
                        <Image
                          alt={featuredPost.title}
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          src={featuredPost.image}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute right-4 bottom-4 left-4">
                          <span className="inline-block rounded-full bg-[#27AE60] px-3 py-1 font-semibold text-white text-xs">
                            {featuredPost.category}
                          </span>
                        </div>
                      </div>
                      <CardHeader>
                        <div className="mb-2 flex items-center gap-2 text-gray-500 text-sm">
                          <Calendar className="h-4 w-4" />
                          <time dateTime={featuredPost.date}>
                            {new Date(featuredPost.date).toLocaleDateString(
                              "en-GB",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </time>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>{featuredPost.readTime} min read</span>
                        </div>
                        <CardTitle className="text-[#1E3A5F] text-xl transition-colors group-hover:text-[#27AE60]">
                          {featuredPost.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="mb-4 line-clamp-2 text-base text-gray-600">
                          {featuredPost.excerpt}
                        </CardDescription>
                        <Button
                          className="group w-full text-[#1E3A5F] transition-colors hover:text-[#27AE60]"
                          variant="ghost"
                        >
                          Read More
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Button
              asChild
              className="group bg-[#1E3A5F] px-8 py-6 text-lg text-white transition-all hover:bg-[#1E3A5F]/90 hover:shadow-lg"
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
    </div>
  );
}
