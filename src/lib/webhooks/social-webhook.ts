"use server";

/**
 * Post to social media webhook when a blog post is published
 */
export async function notifySocialMedia(postData: {
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
}) {
  const webhookUrl =
    process.env.SOCIAL_WEBHOOK_URL || process.env.ZAPIER_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log(
      "No social media webhook configured, skipping social notification"
    );
    return { success: true, message: "No webhook configured" };
  }

  try {
    const payload = {
      title: postData.title,
      url: `https://www.fishon.my/blog/${postData.slug}`,
      excerpt: postData.excerpt,
      coverImage: postData.coverImage,
      timestamp: new Date().toISOString(),
      hashtags: "#fishing #malaysia #fishon",
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.statusText}`);
    }

    console.log(
      "Successfully notified social media webhook for post:",
      postData.title
    );
    return { success: true, message: "Social notification sent" };
  } catch (error) {
    console.error("Social media webhook error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Enhanced create blog post with social notification
 */
export async function createBlogPostWithSocial(formData: FormData) {
  // Notify social media if publishing
  if (formData.get("published") === "true") {
    await notifySocialMedia({
      title: formData.get("title") as string,
      slug: formData.get("slug") as string,
      excerpt: formData.get("excerpt") as string,
      coverImage: formData.get("coverImage") as string,
    });
  }

  // Create the post (will redirect after creation)
  const { createBlogPost } = await import("@/app/admin/blog/posts/actions");
  await createBlogPost(formData);
}

/**
 * Enhanced update blog post with social notification
 */
export async function updateBlogPostWithSocial(
  postId: string,
  formData: FormData
) {
  // Check if post is being published for the first time
  const { prisma } = await import("@/lib/database/prisma");
  const currentPost = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { published: true, publishedAt: true },
  });

  const isBeingPublished =
    formData.get("published") === "true" && !currentPost?.publishedAt;

  if (isBeingPublished) {
    // Notify social media for newly published posts
    await notifySocialMedia({
      title: formData.get("title") as string,
      slug: formData.get("slug") as string,
      excerpt: formData.get("excerpt") as string,
      coverImage: formData.get("coverImage") as string,
    });
  }

  // Update the post (will redirect after update)
  const { updateBlogPost } = await import("@/app/admin/blog/posts/actions");
  await updateBlogPost(postId, formData);
}
