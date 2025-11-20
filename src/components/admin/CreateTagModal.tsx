import { createTag } from "@/app/admin/blog/tags/actions";
import CreateEntityModal from "./CreateEntityModal";

interface CreateTagModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateTagModal({
  isOpen,
  onClose,
}: CreateTagModalProps) {
  return (
    <CreateEntityModal
      isOpen={isOpen}
      onClose={onClose}
      entityType="tag"
      createAction={createTag}
      hasDescription={false}
    />
  );
}
