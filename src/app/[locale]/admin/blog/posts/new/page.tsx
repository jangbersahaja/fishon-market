import BlogPostForm from "@/components/admin/BlogPostForm";
import { prisma } from "@/lib/database/prisma";
import { createBlogPost } from "../actions";

async function getFormData() {
  const [categories, tags] = await Promise.all([
    prisma.blogCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.blogTag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return { categories, tags };
}

export default async function NewBlogPostPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { categories, tags } = await getFormData();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Post</h1>
        <p className="text-sm text-gray-600">
          Write and publish a new blog post
        </p>
      </div>

      <BlogPostForm
        allCategories={categories}
        allTags={tags}
        onSubmit={createBlogPost}
        locale={locale}
      />
    </div>
  );
}
