export type InquiryType = "방문예약" | "창업상담" | "제휴문의" | "기타";
export type InquiryStatus = "신규" | "처리중" | "완료";

export interface FranchiseInquiry {
  id: string;
  name: string;
  phone: string;
  inquiry_type: InquiryType;
  message: string | null;
  status: InquiryStatus;
  admin_memo: string | null;
  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;
  region: string | null;
  franchise_type: string | null;
  created_at: string;
  updated_at: string;
}
