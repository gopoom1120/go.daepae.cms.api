import EmptyState from "@/components/admin/EmptyState";
import InquiriesTable from "./InquiriesTable";
import { getAllInquiries } from "@/libs/supabase/queries/franchise-inquiries.admin";

export default async function FranchiseInquiriesPage() {
  const inquiries = await getAllInquiries();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          가맹점 문의
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">총 {inquiries.length}건</p>
      </div>

      {inquiries.length === 0 ? (
        <EmptyState message="접수된 문의가 없습니다" />
      ) : (
        <InquiriesTable inquiries={inquiries} />
      )}
    </div>
  );
}
