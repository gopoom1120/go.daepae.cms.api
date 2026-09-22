"use client";

import { useRouter } from "next/navigation";
import FranchisePopupForm from "@/components/admin/FranchisePopupForm";
import { createFranchisePopupAction } from "../actions";
import type { FranchisePopupFormInput } from "@/types/franchise-popup";

export default function NewFranchisePopupForm() {
  const router = useRouter();

  const handleSubmit = async (input: FranchisePopupFormInput) => {
    await createFranchisePopupAction(input);
    router.push("/franchise/popups");
    router.refresh();
  };

  return <FranchisePopupForm onSubmit={handleSubmit} />;
}
