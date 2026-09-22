import Link from "next/link";
import { Plus } from "lucide-react";
import EmptyState from "@/components/admin/EmptyState";
import FranchisePopupsTable from "./FranchisePopupsTable";
import { getAllFranchisePopups } from "@/libs/supabase/queries/franchise-popups.admin";

export default async function FranchisePopupsPage() {
  const popups = await getAllFranchisePopups();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            팝업 및 공지
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">총 {popups.length}건</p>
        </div>
        <Link
          href="/franchise/popups/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:opacity-80 transition-opacity"
        >
          <Plus size={15} />새 팝업
        </Link>
      </div>

      {popups.length === 0 ? (
        <EmptyState message="등록된 팝업 공지가 없습니다" />
      ) : (
        <FranchisePopupsTable popups={popups} />
      )}
    </div>
  );
}
