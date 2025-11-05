import type { BlogPostWithDetails } from "@/lib/services/blog-service";
import { Calendar, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type FeaturedPostCardProps = {
  post: BlogPostWithDetails;
  variant?: "large" | "small";
};

export default function FeaturedPostCard({
  post,
  variant = "large",
}: FeaturedPostCardProps) {
  if (variant === "small") {
    return (
      <article className="group relative overflow-hidden rounded-lg">
        <Link href={`/blog/${post.slug}`} className="flex gap-4">
          {/* Thumbnail */}
          <div className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
            {post.coverImage ? (
              <Image
                src={post.coverImage}
                alt={post.coverImageAlt || post.title}
                fill
                className="object-cover transition duration-300 group-hover:scale-105"
                sizes="128px"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#ec2227]/40 to-[#ec2227]/20 flex items-center justify-center">
                <span className="text-3xl">🎣</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 py-1">
            {/* Categories */}
            {post.categories.length > 0 && (
              <div className="mb-1 flex flex-wrap gap-1">
                {post.categories.slice(0, 1).map((category) => (
                  <span
                    key={category.id}
                    className="rounded-full bg-[#ec2227]/10 px-2 py-0.5 text-xs font-medium text-[#ec2227]"
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h3 className="mb-1 line-clamp-2 text-sm font-bold text-gray-900 group-hover:text-[#ec2227] transition">
              {post.title}
            </h3>

            {/* Meta */}
            {post.publishedAt && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar size={12} />
                <time dateTime={post.publishedAt.toISOString()}>
                  {new Date(post.publishedAt).toLocaleDateString("en-MY", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </div>
            )}
          </div>
        </Link>
      </article>
    );
  }

  // Large variant (default)
  return (
    <article className="group relative overflow-hidden rounded-lg">
      <Link href={`/blog/${post.slug}`}>
        {/* Cover Image with Overlay */}
        <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
          {post.coverImage ? (
            <Image
              src={post.coverImage}
              alt={post.coverImageAlt || post.title}
              fill
              className="object-cover transition duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#ec2227]/40 to-[#ec2227]/20 flex items-center justify-center">
              <span className="text-9xl">🎣</span>
            </div>
          )}

          {/* Featured Badge */}
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
              <Star size={14} fill="currentColor" />
              Featured
            </span>
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Content Overlay */}
          <div className="absolute inset-x-0 bottom-0 p-8 text-white">
            {/* Categories */}
            {post.categories.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {post.categories.slice(0, 2).map((category) => (
                  <span
                    key={category.id}
                    className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur-sm"
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h3 className="mb-3 line-clamp-2 text-3xl font-bold">
              {post.title}
            </h3>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="mb-3 line-clamp-2 text-sm text-white/90">
                {post.excerpt}
              </p>
            )}

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-white/90">
              {post.publishedAt && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} />
                  <time dateTime={post.publishedAt.toISOString()}>
                    {new Date(post.publishedAt).toLocaleDateString("en-MY", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </div>
              )}
              {post.readingTime && (
                <span className="text-white/80">
                  {post.readingTime} min read
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
