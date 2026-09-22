"use client";

import { useRouter } from "next/navigation";
import FranchisePopupForm from "@/components/admin/FranchisePopupForm";
import { updateFranchisePopupAction } from "../../actions";
import type {
  FranchisePopup,
  FranchisePopupFormInput,
} from "@/types/franchise-popup";

export default function EditFranchisePopupForm({
  popup,
}: {
  popup: FranchisePopup;
}) {
  const router = useRouter();

  const handleSubmit = async (input: FranchisePopupFormInput) => {
    await updateFranchisePopupAction(popup.id, input);
    router.push("/franchise/popups");
    router.refresh();
  };

  const initialValues: Partial<FranchisePopupFormInput> = {
    title: popup.title,
    image_url: popup.image_url ?? "",
    link_url: popup.link_url ?? "",
    start_date: popup.start_date ?? "",
    end_date: popup.end_date ?? "",
    is_published: popup.is_published,
  };

  return (
    <FranchisePopupForm
      initialValues={initialValues}
      onSubmit={handleSubmit}
      submitLabel="수정 완료"
    />
  );
}
