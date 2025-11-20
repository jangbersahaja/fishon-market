import { deleteTag } from "@/app/[locale]/admin/blog/tags/actions";
import EntityActions from "./EntityActions";

interface TagActionsProps {
  tagId: string;
  tagSlug: string;
  postCount: number;
}

export default function TagActions({
  tagId,
  tagSlug,
  postCount,
}: TagActionsProps) {
  return (
    <EntityActions
      entityId={tagId}
      entitySlug={tagSlug}
      postCount={postCount}
      entityType="tag"
      deleteAction={deleteTag}
    />
  );
}
