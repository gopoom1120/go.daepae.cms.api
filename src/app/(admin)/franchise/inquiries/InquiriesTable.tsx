"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, Trash2 } from "lucide-react";
import { updateInquiryStatusAction, deleteInquiryAction } from "./actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toCsv } from "@/libs/csv";
import type {
  FranchiseInquiry,
  InquiryStatus,
} from "@/types/franchise-inquiry";

const STATUS_OPTIONS: InquiryStatus[] = ["신규", "처리중", "완료"];

const STATUS_BADGE_CLASS: Record<InquiryStatus, string> = {
  신규: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  처리중:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  완료: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const INPUT_CLASS =
  "px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-sm";

const CSV_HEADERS: { key: keyof FranchiseInquiry; label: string }[] = [
  { key: "created_at", label: "접수일시" },
  { key: "name", label: "이름" },
  { key: "phone", label: "연락처" },
  { key: "inquiry_type", label: "문의유형" },
  { key: "franchise_type", label: "창업유형" },
  { key: "region", label: "희망지역" },
  { key: "status", label: "상태" },
  { key: "message", label: "문의내용" },
];

export default function InquiriesTable({
  inquiries,
}: {
  inquiries: FranchiseInquiry[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "전체">(
    "전체",
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return inquiries.filter((inquiry) => {
      if (statusFilter !== "전체" && inquiry.status !== statusFilter)
        return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        inquiry.name.toLowerCase().includes(q) ||
        inquiry.phone.toLowerCase().includes(q) ||
        (inquiry.message ?? "").toLowerCase().includes(q) ||
        (inquiry.franchise_type ?? "").toLowerCase().includes(q) ||
        (inquiry.region ?? "").toLowerCase().includes(q)
      );
    });
  }, [inquiries, search, statusFilter]);

  const handleStatusChange = async (id: string, status: InquiryStatus) => {
    setUpdatingId(id);
    try {
      await updateInquiryStatusAction(id, status);
      router.refresh();
    } catch {
      setAlertMessage("상태 변경에 실패했습니다.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId) return;
    setConfirmOpen(false);
    setDeleting(pendingDeleteId);
    try {
      await deleteInquiryAction(pendingDeleteId);
      router.refresh();
    } catch {
      setAlertMessage("삭제에 실패했습니다.");
    } finally {
      setDeleting(null);
      setPendingDeleteId(null);
    }
  };

  const handleDownloadCsv = () => {
    const csv = toCsv(filtered, CSV_HEADERS);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `franchise-inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름, 연락처, 내용으로 검색"
            className={`${INPUT_CLASS} w-full pl-9`}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as InquiryStatus | "전체")}
        >
          <SelectTrigger className="w-[140px] shrink-0 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="전체">전체 상태</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={handleDownloadCsv}
          className="flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shrink-0"
        >
          <Download size={14} />
          CSV 다운로드
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
        {filtered.map((inquiry) => (
          <div key={inquiry.id} className="flex items-start gap-3 px-4 py-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                  {inquiry.name}
                </p>
                <span className="text-xs text-gray-400">{inquiry.phone}</span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs font-medium">
                  {inquiry.inquiry_type}
                </span>
                {inquiry.franchise_type && (
                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full text-xs font-medium">
                    {inquiry.franchise_type}
                  </span>
                )}
                {inquiry.region && (
                  <span className="text-xs text-gray-400">
                    희망지역: {inquiry.region}
                  </span>
                )}
              </div>
              {inquiry.message && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1.5 whitespace-pre-wrap">
                  {inquiry.message}
                </p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                {new Date(inquiry.created_at).toLocaleString("ko-KR")}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select
                value={inquiry.status}
                disabled={updatingId === inquiry.id}
                onValueChange={(v) =>
                  handleStatusChange(inquiry.id, v as InquiryStatus)
                }
              >
                <SelectTrigger
                  className={`w-auto h-auto gap-1 border-0 rounded-full px-2.5 py-1.5 text-xs font-medium focus:ring-offset-0 ${STATUS_BADGE_CLASS[inquiry.status]}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={() => handleDeleteClick(inquiry.id)}
                disabled={deleting !== null}
                className="p-1.5 rounded text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors disabled:opacity-40"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />
      <AlertDialog
        open={alertMessage !== null}
        message={alertMessage ?? ""}
        onConfirm={() => setAlertMessage(null)}
      />
    </>
  );
}
