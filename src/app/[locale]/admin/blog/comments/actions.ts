"use server";

import { prisma } from "@/lib/database/prisma";
import { revalidatePath } from "next/cache";

export async function approveComment(formData: FormData) {
  const commentId = formData.get("commentId") as string;

  await prisma.blogComment.update({
    where: { id: commentId },
    data: { approved: true },
  });

  revalidatePath("/admin/blog/comments");
}

export async function deleteComment(formData: FormData) {
  const commentId = formData.get("commentId") as string;

  await prisma.blogComment.delete({
    where: { id: commentId },
  });

  revalidatePath("/admin/blog/comments");
}

export async function createComment(formData: FormData) {
  const postId = formData.get("postId") as string;
  const authorId = formData.get("authorId") as string;
  const content = formData.get("content") as string;

  await prisma.blogComment.create({
    data: {
      postId,
      authorId,
      content,
      approved: false, // Require approval by default
    },
  });

  revalidatePath(`/blog/${postId}`);
}
