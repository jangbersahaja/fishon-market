import type { BlogTag } from "@prisma/client";
import EntityForm from "./EntityForm";

interface TagFormProps {
  tag?: BlogTag;
  onSubmit: (formData: FormData) => Promise<void | { success: boolean }>;
}

export default function TagForm({ tag, onSubmit }: TagFormProps) {
  return (
    <EntityForm
      entity={tag}
      onSubmit={onSubmit}
      entityType="tag"
      hasDescription={false}
    />
  );
}
