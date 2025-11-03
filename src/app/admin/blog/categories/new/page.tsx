import CategoryForm from "@/components/admin/CategoryForm";
import { createCategory } from "../actions";

export default function NewCategoryPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Create New Category
        </h1>
        <p className="text-sm text-gray-600">
          Add a new category to organize your blog posts
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <CategoryForm onSubmit={createCategory} />
      </div>
    </div>
  );
}
