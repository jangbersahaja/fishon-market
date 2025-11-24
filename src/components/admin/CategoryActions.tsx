import { deleteCategory } from "@/app/[locale]/admin/blog/categories/actions";
import EntityActions from "./EntityActions";

interface CategoryActionsProps {
  categoryId: string;
  categorySlug: string;
  postCount: number;
}

export default function CategoryActions({
  categoryId,
  categorySlug,
  postCount,
}: CategoryActionsProps) {
  return (
    <EntityActions
      entityId={categoryId}
      entitySlug={categorySlug}
      postCount={postCount}
      entityType="category"
      deleteAction={deleteCategory}
    />
  );
}
