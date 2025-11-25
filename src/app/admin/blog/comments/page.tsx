import { prisma } from "@/lib/database/prisma";
import { approveComment, deleteComment } from "./actions";

async function getAllComments() {
  return prisma.blogComment.findMany({
    include: {
      author: { select: { email: true } },
      post: { select: { title: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function CommentsListPage() {
  const comments = await getAllComments();
  const pendingCount = comments.filter((c) => !c.approved).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Comments</h1>
        <p className="text-sm text-gray-600">
          {comments.length} total comments, {pendingCount} pending approval
        </p>
      </div>

      <div className="space-y-4">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className={`rounded-lg border p-4 ${
              comment.approved ? "bg-white" : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <div className="mb-2 flex items-start justify-between">
              <div>
                <span className="font-medium text-gray-900">
                  {comment.author.email}
                </span>
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-sm text-gray-600">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              {!comment.approved && (
                <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                  Pending
                </span>
              )}
            </div>

            <p className="mb-2 text-sm text-gray-600">
              On:{" "}
              <a
                href={`/blog/${comment.post.slug}`}
                target="_blank"
                className="text-blue-600 hover:underline"
              >
                {comment.post.title}
              </a>
            </p>

            <p className="mb-4 text-gray-800">{comment.content}</p>

            <div className="flex gap-2">
              {!comment.approved && (
                <form action={approveComment}>
                  <input type="hidden" name="commentId" value={comment.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                  >
                    Approve
                  </button>
                </form>
              )}
              <form action={deleteComment}>
                <input type="hidden" name="commentId" value={comment.id} />
                <button
                  type="submit"
                  className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <div className="rounded-lg bg-white p-8 text-center">
            <p className="text-gray-600">No comments yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
