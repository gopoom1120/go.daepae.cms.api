import NewFranchisePopupForm from "./NewFranchisePopupForm";

export default function NewFranchisePopupPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          새 팝업 공지 등록
        </h1>
      </div>
      <NewFranchisePopupForm />
    </div>
  );
}
