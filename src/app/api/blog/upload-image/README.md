# Blog Image Upload API

## Overview

This API endpoint handles image uploads for blog posts using Vercel Blob storage. It supports both cover images and inline content images.

## Endpoint

```
POST /api/blog/upload-image
```

## Authentication

Requires authenticated user session (NextAuth).

## Request Format

```typescript
FormData {
  file: File,           // Image file (JPEG, PNG, WebP, GIF)
  type: "cover" | "content"  // Image type
}
```

## Response Format

### Success (200)

```json
{
  "success": true,
  "url": "https://your-bucket.public.blob.vercel-storage.com/blog/user123/cover/1699123456-image.jpg",
  "key": "blog/user123/cover/1699123456-image.jpg",
  "type": "cover"
}
```

### Error (4xx, 5xx)

```json
{
  "error": "Error message"
}
```

## Blob Key Structure

Images are organized by user and type:

```
blog/
  {userId}/
    cover/              # Cover images
      {timestamp}-{filename}
    content/            # Inline content images
      {timestamp}-{filename}
```

### Examples:

- `blog/user_abc123/cover/1699123456-header-image.jpg`
- `blog/user_abc123/content/1699123789-fishing-technique.png`

## Constraints

- **File Size**: Maximum 5MB
- **File Types**: JPEG, JPG, PNG, WebP, GIF
- **Authentication**: Required (user must be logged in)

## Usage

### Cover Image Upload

Used in `BlogPostForm` component via `ImageUpload` component:

```tsx
<ImageUpload
  value={coverImage}
  onChange={setCoverImage}
  type="cover"
  label="Upload Cover Image"
  description="Recommended size: 1200x630px. Max 5MB."
/>
```

### Content Image Upload

Used in `RichTextEditor` component when clicking the image button:

1. User clicks 🖼️ button in toolbar
2. File picker opens
3. Image uploads automatically
4. Image URL inserted into editor at cursor position

## Environment Variables

Required:

- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token

Optional:

- `NEXT_PUBLIC_BLOB_HOST` - For next.config.ts image optimization patterns

## Error Handling

The endpoint validates:

- User authentication
- File type (must be image)
- File size (max 5MB)
- File presence in form data

Common errors:

- `401`: User not authenticated
- `400`: Invalid file type or missing file
- `413`: File too large (>5MB)
- `500`: Upload failed (network or storage error)

## Cleanup

Blog images are permanently stored and associated with the user who uploaded them. To implement cleanup:

1. Track image URLs in blog posts
2. When deleting a post, optionally delete unused images
3. Implement background job to clean orphaned images

## Migration from URL Input

Previous implementation used manual URL input. Posts created before this feature will still have URLs in the `coverImage` field. Both methods are supported:

- Old posts: Manual URL still works
- New posts: Upload via ImageUpload component

## Security

- Authentication required (no anonymous uploads)
- File type whitelist (only images)
- File size limit (prevents abuse)
- User-scoped paths (organized by userId)
- No overwrite protection (timestamp in filename)
