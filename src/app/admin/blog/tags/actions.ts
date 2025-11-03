"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { revalidatePath } from "next/cache";
import slugify from "slugify";

export async function createTag(formData: FormData) {
  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const name = formData.get("name") as string;
  let slug = formData.get("slug") as string;

  // Auto-generate slug if not provided
  if (!slug) {
    slug = slugify(name, { lower: true, strict: true });
  } else {
    slug = slugify(slug, { lower: true, strict: true });
  }

  await prisma.blogTag.create({
    data: {
      name,
      slug,
    },
  });

  revalidatePath("/admin/blog/tags");
  revalidatePath("/admin/blog/posts");
  return { success: true };
}

export async function updateTag(tagId: string, formData: FormData) {
  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const name = formData.get("name") as string;
  let slug = formData.get("slug") as string;

  // Slugify the slug
  slug = slugify(slug, { lower: true, strict: true });

  await prisma.blogTag.update({
    where: { id: tagId },
    data: {
      name,
      slug,
    },
  });

  revalidatePath("/admin/blog/tags");
  return { success: true };
}

export async function deleteTag(tagId: string) {
  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  await prisma.blogTag.delete({
    where: { id: tagId },
  });

  revalidatePath("/admin/blog/tags");
  return { success: true };
}
