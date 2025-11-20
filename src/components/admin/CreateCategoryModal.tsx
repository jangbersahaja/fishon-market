import { createCategory } from "@/app/[locale]/admin/blog/categories/actions";
import CreateEntityModal from "./CreateEntityModal";

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateCategoryModal({
  isOpen,
  onClose,
}: CreateCategoryModalProps) {
  return (
    <CreateEntityModal
      isOpen={isOpen}
      onClose={onClose}
      entityType="category"
      createAction={createCategory}
      hasDescription={true}
    />
  );
}
