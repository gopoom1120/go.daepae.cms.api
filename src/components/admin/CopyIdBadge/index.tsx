"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyIdBadge({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // no-op: 클립보드 권한이 없는 환경에서는 조용히 무시
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="클릭해서 ID 복사"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs font-mono"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "복사됨" : id}
    </button>
  );
}
