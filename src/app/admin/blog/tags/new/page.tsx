import TagForm from "@/components/admin/TagForm";
import { createTag } from "../actions";

export default function NewTagPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Tag</h1>
        <p className="text-sm text-gray-600">
          Add a new tag to categorize your blog posts
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <TagForm onSubmit={createTag} />
      </div>
    </div>
  );
}
