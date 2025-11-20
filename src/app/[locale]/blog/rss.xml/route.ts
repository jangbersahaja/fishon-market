import { getBlogPosts } from "@/lib/services/blog-service";

export async function GET() {
  const baseUrl = "https://www.fishon.my";
  const { posts } = await getBlogPosts({ page: 1, perPage: 50 });

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Fishon.my Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Expert fishing tips, charter guides, and destination reviews for Malaysian anglers</description>
    <language>en-MY</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/blog/rss.xml" rel="self" type="application/rss+xml" />
    ${posts
      .map(
        (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${post.excerpt || post.title}]]></description>
      <pubDate>${
        post.publishedAt
          ? new Date(post.publishedAt).toUTCString()
          : new Date(post.createdAt).toUTCString()
      }</pubDate>
      ${post.categories
        .map((cat) => `<category>${cat.name}</category>`)
        .join("\n      ")}
    </item>`
      )
      .join("")}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
