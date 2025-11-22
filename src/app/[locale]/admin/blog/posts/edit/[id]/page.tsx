import BlogPostForm from "@/components/admin/BlogPostForm";
import { prisma } from "@/lib/database/prisma";
import { notFound } from "next/navigation";
import { updateBlogPost } from "../../actions";

async function getPost(id: string) {
  return prisma.blogPost.findUnique({
    where: { id },
    include: {
      categories: true,
      tags: true,
    },
  });
}

async function getFormData() {
  const [categories, tags] = await Promise.all([
    prisma.blogCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.blogTag.findMany({ orderBy: { name: "asc" } }),
  ]);

  return { categories, tags };
}

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const post = await getPost(id);

  if (!post) {
    notFound();
  }

  const { categories, tags } = await getFormData();

  const handleUpdate = async (formData: FormData) => {
    "use server";
    await updateBlogPost(id, formData);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Post</h1>
        <p className="text-sm text-gray-600">Update your blog post</p>
      </div>

      <BlogPostForm
        post={post}
        allCategories={categories}
        allTags={tags}
        onSubmit={handleUpdate}
        locale={locale}
      />
    </div>
  );
}
