import BlogCommentSection from "@/components/blog/BlogCommentSection";
import BlogPostCard from "@/components/blog/BlogPostCard";
import NewsletterWidget from "@/components/blog/NewsletterWidget";
import ReadingProgress from "@/components/blog/ReadingProgress";
import TableOfContents from "@/components/blog/TableOfContents";
import {
  getBlogPostBySlug,
  getRelatedPosts,
} from "@/lib/services/blog-service";
import { Calendar, Clock, User } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found | Fishon.my",
    };
  }

  const title = post.metaTitle || post.title;
  const description =
    post.metaDescription || post.excerpt || "Read this article on Fishon.my";
  const images = post.coverImage
    ? [{ url: post.coverImage, width: 1200, height: 630 }]
    : [{ url: "/og-image.jpg", width: 1200, height: 630 }];

  return {
    title: `${title} | Fishon.my`,
    description,
    keywords: post.metaKeywords,
    alternates: {
      canonical: `https://www.fishon.my/blog/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://www.fishon.my/blog/${slug}`,
      siteName: "Fishon.my",
      images,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author.email],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post || !post.published) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post.id, 3);

  // Fetch comments for this post
  const comments = post.comments || [];

  // JSON-LD structured data for the blog post
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || post.title,
    image: post.coverImage || "/og-image.jpg",
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: post.author.name || post.author.email.split("@")[0],
      url: `https://www.fishon.my/author/${post.author.id}`,
    },
    publisher: {
      "@type": "Organization",
      name: "Fishon.my",
      url: "https://www.fishon.my",
      logo: {
        "@type": "ImageObject",
        url: "https://www.fishon.my/favicon.ico",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://www.fishon.my/blog/${slug}`,
    },
    keywords: post.metaKeywords || "",
  };

  // Breadcrumb schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.fishon.my",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://www.fishon.my/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `https://www.fishon.my/blog/${slug}`,
      },
    ],
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Reading Progress Indicator */}
      <ReadingProgress />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Breadcrumbs */}
      <nav
        className=" border-b border-gray-200 bg-gray-50"
        aria-label="Breadcrumb"
      >
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <ol className="flex items-center gap-2 text-sm text-gray-600">
            <li>
              <Link href="/" className="hover:text-[#ec2227]">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/blog" className="hover:text-[#ec2227]">
                Blog
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 font-medium truncate">{post.title}</li>
          </ol>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Content */}
          <article className="lg:col-span-8">
            {/* Article Header */}
            <header className="mb-8">
              {/* Categories */}
              {post.categories.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {post.categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/blog/category/${category.slug}`}
                      className="rounded-full bg-[#ec2227]/10 px-3 py-1 text-xs font-medium text-[#ec2227] hover:bg-[#ec2227]/20 transition"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              )}

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                {post.title}
              </h1>

              {post.excerpt && (
                <p className="mt-4 text-xl text-gray-600">{post.excerpt}</p>
              )}

              {/* Meta info */}
              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  {post.author.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.author.image}
                      alt={post.author.name || post.author.email}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <User size={16} />
                  )}
                  <span>
                    By {post.author.name || post.author.email.split("@")[0]}
                  </span>
                </div>
                {post.publishedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <time dateTime={post.publishedAt.toISOString()}>
                      {new Date(post.publishedAt).toLocaleDateString("en-MY", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                )}
                {post.readingTime && (
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>{post.readingTime} min read</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/blog/tag/${tag.slug}`}
                      className="text-sm text-gray-600 hover:text-[#ec2227]"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              )}
            </header>

            {/* Cover Image */}
            {post.coverImage && (
              <div className="mb-12 aspect-video relative overflow-hidden rounded-lg">
                <Image
                  src={post.coverImage}
                  alt={post.coverImageAlt || post.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 896px"
                />
              </div>
            )}

            {/* Article Content */}
            <div
              className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-[#ec2227] prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Share Section */}
            <div className="mt-12 border-t border-gray-200 pt-8">
              <h3 className="text-lg font-semibold">Share this article</h3>
              <div className="mt-4 flex gap-3">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=https://www.fishon.my/blog/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#1877f2] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d65d9] transition"
                >
                  Facebook
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=https://www.fishon.my/blog/${slug}&text=${encodeURIComponent(
                    post.title
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#1da1f2] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d8bd9] transition"
                >
                  Twitter
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    post.title + " - https://www.fishon.my/blog/" + slug
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#25d366] px-4 py-2 text-sm font-medium text-white hover:bg-[#1fbc57] transition"
                >
                  WhatsApp
                </a>
              </div>
            </div>

            {/* Author Bio */}
            {post.author.bio && (
              <div className="mt-12 border-t border-gray-200 pt-8">
                <h3 className="mb-4 text-lg font-semibold">About the Author</h3>
                <div className="flex gap-4">
                  {post.author.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.author.image}
                      alt={post.author.name || post.author.email}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200">
                      <User size={32} className="text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      {post.author.name || post.author.email.split("@")[0]}
                    </h4>
                    <p className="mt-1 text-sm text-gray-600">
                      {post.author.bio}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Comments Section */}
            <BlogCommentSection postId={post.id} comments={comments} />
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              {/* Table of Contents */}
              <TableOfContents />

              {/* Newsletter Widget */}
              <NewsletterWidget />
            </div>
          </aside>
        </div>
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="border-t border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="mb-6 text-2xl font-bold">Related Articles</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <BlogPostCard key={relatedPost.id} post={relatedPost} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
