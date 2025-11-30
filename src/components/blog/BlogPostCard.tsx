import type { BlogPostWithDetails } from "@/lib/services/blog-service";
import { Calendar, Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

type BlogPostCardProps = {
  post: BlogPostWithDetails;
};

export default function BlogPostCard({ post }: BlogPostCardProps) {
  const locale = useLocale();
  const t = useTranslations("common");

  return (
    <article className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
      <Link href={`/blog/${post.slug}`}>
        {/* Cover Image */}
        {post.coverImage ? (
          <div className="relative aspect-video overflow-hidden bg-gray-100">
            <Image
              src={post.coverImage}
              alt={post.coverImageAlt || post.title}
              fill
              className="object-cover transition duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-[#ec2227]/20 to-[#ec2227]/5 flex items-center justify-center">
            <span className="text-4xl">🎣</span>
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {/* Categories */}
          {post.categories.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {post.categories.slice(0, 2).map((category) => (
                <span
                  key={category.id}
                  className="rounded-full bg-[#ec2227]/10 px-2 py-1 text-xs font-medium text-[#ec2227]"
                >
                  {category.name}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h3 className="mb-2 line-clamp-2 text-lg font-semibold group-hover:text-[#ec2227] transition">
            {post.title}
          </h3>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="mb-3 line-clamp-2 text-sm text-gray-600">
              {post.excerpt}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {post.publishedAt && (
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <time dateTime={post.publishedAt.toISOString()}>
                  {new Date(post.publishedAt).toLocaleDateString(
                    locale === "ms" ? "ms-MY" : "en-MY",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                </time>
              </div>
            )}
            {post.readingTime && (
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>
                  {post.readingTime} {t("min")}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
