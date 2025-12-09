import TagForm from "@/components/admin/TagForm";
import { prisma } from "@/lib/database/prisma";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { updateTag } from "../../actions";

async function getTag(id: string) {
  return prisma.blogTag.findUnique({
    where: { id },
  });
}

export default async function EditTagPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();

  const { id } = await params;
  const tag = await getTag(id);

  if (!tag) {
    notFound();
  }

  const handleUpdate = async (formData: FormData) => {
    "use server";
    await updateTag(id, formData);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Tag</h1>
        <p className="text-sm text-gray-600">Update tag details</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <TagForm tag={tag} onSubmit={handleUpdate} />
      </div>
    </div>
  );
}
