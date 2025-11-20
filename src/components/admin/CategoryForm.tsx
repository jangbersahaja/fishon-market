import type { BlogCategory } from "@prisma/client";
import EntityForm from "./EntityForm";

interface CategoryFormProps {
  category?: BlogCategory;
  onSubmit: (formData: FormData) => Promise<void | { success: boolean }>;
}

export default function CategoryForm({
  category,
  onSubmit,
}: CategoryFormProps) {
  return (
    <EntityForm
      entity={category}
      onSubmit={onSubmit}
      entityType="category"
      hasDescription={true}
    />
  );
}
