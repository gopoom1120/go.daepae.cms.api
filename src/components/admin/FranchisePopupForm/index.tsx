"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, X } from "lucide-react";
import { createClient } from "@/libs/supabase/client";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import type { FranchisePopupFormInput } from "@/types/franchise-popup";

const INPUT_CLASS =
  "w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-sm";

const CHECKBOX_CLASS =
  "w-4 h-4 rounded border-gray-300 accent-black dark:accent-white focus:ring-black dark:focus:ring-white";

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

async function uploadImageToStorage(file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage
    .from("franchise-popups")
    .upload(path, file, { upsert: false });
  if (error) throw new Error(`이미지 업로드 실패: ${error.message}`);
  const {
    data: { publicUrl },
  } = supabase.storage.from("franchise-popups").getPublicUrl(data.path);
  return publicUrl;
}

interface FranchisePopupFormProps {
  initialValues?: Partial<FranchisePopupFormInput>;
  onSubmit: (input: FranchisePopupFormInput) => Promise<void>;
  submitLabel?: string;
}

export default function FranchisePopupForm({
  initialValues,
  onSubmit,
  submitLabel = "등록",
}: FranchisePopupFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [linkUrl, setLinkUrl] = useState(initialValues?.link_url ?? "");
  const [startDate, setStartDate] = useState(initialValues?.start_date ?? "");
  const [endDate, setEndDate] = useState(initialValues?.end_date ?? "");
  const [isPublished, setIsPublished] = useState(
    initialValues?.is_published ?? false,
  );

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(
    initialValues?.image_url ?? "",
  );
  const [imageUrl, setImageUrl] = useState(initialValues?.image_url ?? "");
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (imageFile && imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imageFile, imagePreview]);

  const handleImageSelect = (file: File) => {
    if (file.size > IMAGE_MAX_BYTES) {
      setAlertMessage("이미지는 5MB 이하 파일만 업로드할 수 있습니다.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview && imageFile) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(imageUrl);
    if (imageRef.current) imageRef.current.value = "";
  };

  const handleSave = async () => {
    if (loading) return;
    if (!title.trim()) {
      setAlertMessage("제목을 입력해주세요.");
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setAlertMessage("노출 종료일은 시작일보다 늦어야 합니다.");
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) finalImageUrl = await uploadImageToStorage(imageFile);

      await onSubmit({
        title: title.trim(),
        image_url: finalImageUrl,
        link_url: linkUrl,
        start_date: startDate,
        end_date: endDate,
        is_published: isPublished,
      });
    } catch (err) {
      setAlertMessage(
        err instanceof Error ? err.message : "저장에 실패했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start max-w-5xl w-full">
        {/* 모바일 전용 액션 바 */}
        <div className="lg:hidden w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <label
              htmlFor="isPublished-mobile"
              className="flex items-center gap-2 cursor-pointer mr-auto"
            >
              <input
                id="isPublished-mobile"
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className={CHECKBOX_CLASS}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                발행 (프론트에 노출)
              </span>
            </label>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 text-sm bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {loading ? "저장 중..." : submitLabel}
            </button>
          </div>
        </div>

        {/* 메인 폼 카드 */}
        <div className="w-full lg:flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 sm:p-6">
          <div className="space-y-5">
            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 추석 연휴 휴무 안내"
                className={INPUT_CLASS}
              />
            </div>

            {/* 링크 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                링크 (클릭 시 이동할 URL)
              </label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className={INPUT_CLASS}
              />
            </div>

            {/* 노출 기간 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  노출 시작일
                </label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  노출 종료일
                </label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  min={startDate}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {/* 팝업 이미지 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                팝업 이미지
              </label>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
                <div className="relative w-full sm:w-64 h-40 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-700">
                  {imagePreview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="팝업 이미지 미리보기"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={clearImage}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl">
                      <ImageIcon
                        size={32}
                        className="text-gray-300 dark:text-gray-600"
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => imageRef.current?.click()}
                    className="px-8 py-3.5 text-sm bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:opacity-80 transition-opacity"
                  >
                    {imagePreview ? "이미지 변경" : "이미지 선택"}
                  </button>
                  <p className="text-xs text-gray-400">
                    JPG, PNG, WebP · 최대 5MB
                  </p>
                </div>
              </div>
              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] && handleImageSelect(e.target.files[0])
                }
              />
            </div>
          </div>
        </div>

        {/* 우측 액션 패널 (데스크탑 전용) */}
        <div className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="w-full px-4 py-2.5 text-sm bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {loading ? "저장 중..." : submitLabel}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              취소
            </button>
            <label
              htmlFor="isPublished-desktop"
              className="flex items-center gap-2.5 cursor-pointer pt-3 mt-1 border-t border-gray-100 dark:border-gray-700"
            >
              <input
                id="isPublished-desktop"
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className={CHECKBOX_CLASS}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                발행 (프론트에 노출)
              </span>
            </label>
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!alertMessage}
        message={alertMessage}
        onConfirm={() => setAlertMessage("")}
      />
    </>
  );
}
