"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import slugify from "slugify";

export async function createCategory(formData: FormData) {
  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  let slug = formData.get("slug") as string;

  // Auto-generate slug if not provided
  if (!slug) {
    slug = slugify(name, { lower: true, strict: true });
  } else {
    slug = slugify(slug, { lower: true, strict: true });
  }

  await prisma.blogCategory.create({
    data: {
      name,
      slug,
      description: description || null,
    },
  });

  // Get current locale for revalidation
  const locale = await getLocale();

  revalidatePath(`/${locale}/admin/blog/categories`);
  revalidatePath(`/${locale}/admin/blog/posts`);
  return { success: true };
}

export async function updateCategory(categoryId: string, formData: FormData) {
  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  let slug = formData.get("slug") as string;

  // Slugify the slug
  slug = slugify(slug, { lower: true, strict: true });

  await prisma.blogCategory.update({
    where: { id: categoryId },
    data: {
      name,
      slug,
      description: description || null,
    },
  });

  // Get current locale for revalidation
  const locale = await getLocale();

  revalidatePath(`/${locale}/admin/blog/categories`);
  return { success: true };
}

export async function deleteCategory(categoryId: string) {
  // Get authenticated user
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }

  await prisma.blogCategory.delete({
    where: { id: categoryId },
  });

  // Get current locale for revalidation
  const locale = await getLocale();

  revalidatePath(`/${locale}/admin/blog/categories`);
  return { success: true };
}
