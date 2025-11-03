---
type: plan
status: pending
updated: 2025-11-03
feature: blog
author: copilot
---

# Featured Posts Implementation Plan

## Overview
Implement a featured posts system that allows admin to mark specific blog posts as "featured" and display them prominently on the blog homepage and other relevant pages.

## Database Schema Changes

### Add `featured` field to BlogPost model
```prisma
model BlogPost {
  // ... existing fields
  featured      Boolean   @default(false)
  featuredOrder Int?      // Optional: for controlling order of featured posts
  featuredAt    DateTime? // Track when post was featured
  
  // ... existing relations
  
  @@index([featured, featuredAt])
}
```

### Migration Steps
1. Create migration: `npx prisma migrate dev --name add_featured_posts`
2. Update Prisma client: `npx prisma generate`

## Backend Changes

### 1. Update blog-service.ts
Add new functions to handle featured posts:

```typescript
/**
 * Get featured blog posts with explicit featured flag
 */
export async function getFeaturedPosts(limit = 3) {
  return prisma.blogPost.findMany({
    where: { 
      published: true,
      featured: true, // Only get explicitly featured posts
    },
    include: {
      author: {
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          bio: true,
        },
      },
      categories: true,
      tags: true,
    },
    orderBy: [
      { featuredOrder: "asc" }, // Custom order first
      { featuredAt: "desc" },   // Then by when featured
      { viewCount: "desc" },    // Fallback to view count
    ],
    take: limit,
  });
}

/**
 * Toggle featured status of a blog post
 */
export async function togglePostFeatured(postId: string, featured: boolean) {
  return prisma.blogPost.update({
    where: { id: postId },
    data: {
      featured,
      featuredAt: featured ? new Date() : null,
    },
  });
}

/**
 * Update featured post order
 */
export async function updateFeaturedPostOrder(postId: string, order: number) {
  return prisma.blogPost.update({
    where: { id: postId },
    data: { featuredOrder: order },
  });
}
```

### 2. Create Admin API Routes

#### `/api/admin/blog/posts/[id]/featured/route.ts`
```typescript
import { prisma } from "@/lib/database/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { featured } = await request.json();
    
    const post = await prisma.blogPost.update({
      where: { id: params.id },
      data: {
        featured,
        featuredAt: featured ? new Date() : null,
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error updating featured status:", error);
    return NextResponse.json(
      { error: "Failed to update featured status" },
      { status: 500 }
    );
  }
}
```

## Frontend Changes

### 1. Update BlogPostActions Component
Add a "Star" button to toggle featured status:

```tsx
<button
  onClick={handleToggleFeatured}
  className={`p-2 rounded-md ${
    featured
      ? "text-yellow-600 hover:bg-yellow-50"
      : "text-gray-600 hover:bg-gray-50"
  }`}
  title={featured ? "Remove from featured" : "Mark as featured"}
>
  <svg className="h-5 w-5" fill={featured ? "currentColor" : "none"} ...>
    {/* Star icon */}
  </svg>
</button>
```

### 2. Update Admin Posts Table
Add a "Featured" column showing star icon:

```tsx
<th>Featured</th>
// ...
<td>
  {post.featured && (
    <span className="text-yellow-500">
      <svg>★</svg>
    </span>
  )}
</td>
```

### 3. Update Blog Homepage
Modify `/app/blog/page.tsx` to use featured posts properly:

```tsx
const featuredPosts = await getFeaturedPosts(3);

// Display featured posts section only if there are featured posts
{featuredPosts.length > 0 && (
  <section className="mb-12">
    <h2 className="mb-6 text-2xl font-bold">Featured Articles</h2>
    <div className="grid gap-6 md:grid-cols-3">
      {featuredPosts.map((post) => (
        <FeaturedPostCard key={post.id} post={post} />
      ))}
    </div>
  </section>
)}
```

### 4. Add Featured Badge to FeaturedPostCard
```tsx
{post.featured && (
  <div className="absolute top-4 right-4">
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500 px-2 py-1 text-xs font-semibold text-white">
      <svg>★</svg>
      Featured
    </span>
  </div>
)}
```

## Admin UI/UX Enhancements

### 1. Featured Posts Management Page
Create `/admin/blog/featured` page to:
- View all featured posts
- Drag-and-drop to reorder featured posts
- Quick toggle featured status
- Preview how featured posts appear on homepage

### 2. Bulk Actions
Add bulk action in posts list to feature/unfeature multiple posts at once.

### 3. Featured Post Limit Warning
Show warning when trying to feature more than recommended limit (e.g., 6 posts):
```tsx
{featuredCount >= 6 && (
  <div className="rounded-lg bg-yellow-50 p-4">
    <p className="text-sm text-yellow-800">
      ⚠️ You have {featuredCount} featured posts. Consider keeping it to 6 or fewer for better user experience.
    </p>
  </div>
)}
```

## SEO Considerations

### 1. Schema.org Markup
Add `isPartOf` property for featured posts:

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "...",
  "isPartOf": {
    "@type": "Blog",
    "name": "Featured Articles"
  }
}
```

### 2. Meta Tags
Add `article:tag` for "featured" in Open Graph tags.

## Testing Requirements

### Unit Tests
- Test `togglePostFeatured` function
- Test featured posts query with various filters
- Test featured order sorting

### Integration Tests
- Test API route for toggling featured status
- Test featured posts display on homepage
- Test admin panel featured management

### Manual Testing
- Verify featured posts display correctly on homepage
- Verify admin can toggle featured status
- Verify featured badge shows on cards
- Verify featured posts limit warning works
- Test with different numbers of featured posts (0, 1, 3, 6, 10+)

## Performance Considerations

1. **Caching**: Cache featured posts query for 5 minutes
2. **Indexing**: Add database index on `featured` field
3. **Limit**: Recommend maximum 6 featured posts to avoid performance issues

## Rollout Plan

### Phase 1: Database & Backend (Week 1)
- [ ] Add database fields
- [ ] Create migration
- [ ] Update service functions
- [ ] Create API routes
- [ ] Write tests

### Phase 2: Admin UI (Week 1-2)
- [ ] Add toggle button to BlogPostActions
- [ ] Update admin posts table
- [ ] Add featured column/badge
- [ ] Create featured management page
- [ ] Add bulk actions

### Phase 3: Public Display (Week 2)
- [ ] Update blog homepage to use featured posts
- [ ] Add featured badge to cards
- [ ] Update SEO markup
- [ ] Test on staging

### Phase 4: Launch (Week 3)
- [ ] Deploy to production
- [ ] Monitor performance
- [ ] Gather feedback
- [ ] Iterate based on usage

## Future Enhancements

1. **Scheduled Featured Posts**: Allow scheduling posts to be featured during specific dates
2. **Category-Specific Featured**: Feature posts within specific categories
3. **Auto-Featured**: Automatically feature top-performing posts based on engagement
4. **Featured Posts Analytics**: Track click-through rate and engagement for featured posts
5. **A/B Testing**: Test different featured post layouts and positions

## Maintenance

- Review featured posts monthly
- Rotate featured posts quarterly
- Monitor click-through rates
- Update based on seasonal fishing topics
