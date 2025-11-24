import CategoryForm from "@/components/admin/CategoryForm";
import { prisma } from "@/lib/database/prisma";
import { notFound } from "next/navigation";
import { updateCategory } from "../../actions";

async function getCategory(id: string) {
  return prisma.blogCategory.findUnique({
    where: { id },
  });
}

export default async function EditCategoryPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const category = await getCategory(id);

  if (!category) {
    notFound();
  }

  const handleUpdate = async (formData: FormData) => {
    "use server";
    await updateCategory(id, formData);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Category</h1>
        <p className="text-sm text-gray-600">Update category details</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <CategoryForm category={category} onSubmit={handleUpdate} />
      </div>
    </div>
  );
}
