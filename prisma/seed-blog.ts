import { PrismaClient } from "@prisma/client";
import {
  dummyBlogCategories,
  dummyBlogPosts,
  dummyBlogTags,
} from "../src/data/mock/blog";

const prisma = new PrismaClient();

async function seedBlog() {
  console.log("🌱 Starting blog seed...");

  // Create a default admin user for blog posts
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@fishon.my" },
    update: { role: "ADMIN" }, // Ensure role is ADMIN
    create: {
      email: "admin@fishon.my",
      role: "ADMIN",
      passwordHash:
        "$2a$10$K7L.H8LqG8S5h9GQXZ5gWuZr1Zi8ZLr7HNrxH3GV7vFZKpw8P4q0W", // placeholder hash
    },
  });
  console.log(
    `✓ Created admin user: ${adminUser.email} (role: ${adminUser.role})`
  );

  // Seed categories
  console.log("\n📁 Seeding categories...");
  for (const category of dummyBlogCategories) {
    await prisma.blogCategory.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
    console.log(`  ✓ ${category.name}`);
  }

  // Seed tags
  console.log("\n🏷️  Seeding tags...");
  for (const tag of dummyBlogTags) {
    await prisma.blogTag.upsert({
      where: { slug: tag.slug },
      update: tag,
      create: tag,
    });
    console.log(`  ✓ ${tag.name}`);
  }

  // Seed blog posts
  console.log("\n📝 Seeding blog posts...");
  for (const post of dummyBlogPosts) {
    const { categories, tags, ...postData } = post as any;

    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        ...postData,
        authorId: adminUser.id,
        published: true,
        publishedAt: new Date(),
        categories: categories
          ? {
              connect: categories.map((slug: string) => ({ slug })),
            }
          : undefined,
        tags: tags
          ? {
              connect: tags.map((slug: string) => ({ slug })),
            }
          : undefined,
      },
    });
    console.log(`  ✓ ${post.title}`);
  }

  console.log("\n✅ Blog seed completed!");
}

seedBlog()
  .catch((e) => {
    console.error("❌ Error seeding blog:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
