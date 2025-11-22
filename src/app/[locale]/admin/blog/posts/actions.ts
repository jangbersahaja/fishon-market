"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createBlogPost(formData: FormData) {
  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: You must be logged in to create posts");
  }
  const authorId = session.user.id;

  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  const coverImage = formData.get("coverImage") as string;
  const coverImageAlt = formData.get("coverImageAlt") as string;
  const published = formData.get("published") === "true";
  const categoryIds = formData.get("categoryIds") as string;
  const tagIds = formData.get("tagIds") as string;

  // Calculate reading time (rough estimate: 200 words per minute)
  const wordCount = content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  await prisma.blogPost.create({
    data: {
      title,
      slug,
      excerpt,
      content,
      coverImage: coverImage || null,
      coverImageAlt: coverImageAlt || null,
      published,
      publishedAt: published ? new Date() : null,
      authorId,
      readingTime,
      categories: categoryIds
        ? {
            connect: categoryIds.split(",").map((id) => ({ id: id.trim() })),
          }
        : undefined,
      tags: tagIds
        ? {
            connect: tagIds.split(",").map((id) => ({ id: id.trim() })),
          }
        : undefined,
    },
  });

  // Get current locale for redirect
  const locale = await getLocale();

  revalidatePath(`/${locale}/blog`);
  revalidatePath(`/${locale}/admin/blog/posts`);

  redirect(`/${locale}/admin/blog/posts`);
}

export async function updateBlogPost(postId: string, formData: FormData) {
  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  const coverImage = formData.get("coverImage") as string;
  const coverImageAlt = formData.get("coverImageAlt") as string;
  const published = formData.get("published") === "true";
  const categoryIds = formData.get("categoryIds") as string;
  const tagIds = formData.get("tagIds") as string;

  const wordCount = content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  // Get current post to check if it's being published for the first time
  const currentPost = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { published: true, publishedAt: true },
  });

  const post = await prisma.blogPost.update({
    where: { id: postId },
    data: {
      title,
      slug,
      excerpt,
      content,
      coverImage: coverImage || null,
      coverImageAlt: coverImageAlt || null,
      published,
      publishedAt:
        published && !currentPost?.publishedAt ? new Date() : undefined,
      readingTime,
      categories: categoryIds
        ? {
            set: categoryIds.split(",").map((id) => ({ id: id.trim() })),
          }
        : { set: [] },
      tags: tagIds
        ? {
            set: tagIds.split(",").map((id) => ({ id: id.trim() })),
          }
        : { set: [] },
    },
  });

  // Get current locale for revalidation
  const locale = await getLocale();

  revalidatePath(`/${locale}/blog`);
  revalidatePath(`/${locale}/blog/${post.slug}`);
  revalidatePath(`/${locale}/admin/blog/posts`);

  return { success: true, postId: post.id };
}

export async function deleteBlogPost(postId: string) {
  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: You must be logged in to delete posts");
  }

  await prisma.blogPost.delete({
    where: { id: postId },
  });

  // Get current locale for revalidation
  const locale = await getLocale();

  revalidatePath(`/${locale}/blog`);
  revalidatePath(`/${locale}/admin/blog/posts`);

  return { success: true };
}

export async function togglePublishBlogPost(postId: string) {
  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: You must be logged in to publish posts");
  }

  // Get current post
  const currentPost = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { published: true, publishedAt: true, slug: true },
  });

  if (!currentPost) {
    throw new Error("Post not found");
  }

  // Toggle published status
  const post = await prisma.blogPost.update({
    where: { id: postId },
    data: {
      published: !currentPost.published,
      publishedAt:
        !currentPost.published && !currentPost.publishedAt
          ? new Date()
          : currentPost.publishedAt,
    },
  });

  // Get current locale for revalidation
  const locale = await getLocale();

  revalidatePath(`/${locale}/blog`);
  revalidatePath(`/${locale}/blog/${post.slug}`);
  revalidatePath(`/${locale}/admin/blog/posts`);

  return { success: true, published: post.published };
}
