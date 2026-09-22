import { notFound } from "next/navigation";
import EditFranchisePopupForm from "./EditFranchisePopupForm";
import { getFranchisePopupByIdAdmin } from "@/libs/supabase/queries/franchise-popups.admin";

export default async function EditFranchisePopupPage({
  params,
}: {
  params: { id: string };
}) {
  const popup = await getFranchisePopupByIdAdmin(params.id);
  if (!popup) notFound();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          팝업 공지 편집
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">{popup.title}</p>
      </div>
      <EditFranchisePopupForm popup={popup} />
    </div>
  );
}
