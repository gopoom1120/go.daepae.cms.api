"use server";

import {
  updateInquiryStatus,
  deleteInquiry,
} from "@/libs/supabase/queries/franchise-inquiries.admin";
import type {
  FranchiseInquiry,
  InquiryStatus,
} from "@/types/franchise-inquiry";

export async function updateInquiryStatusAction(
  id: string,
  status: InquiryStatus,
  adminMemo?: string,
): Promise<FranchiseInquiry> {
  return updateInquiryStatus(id, status, adminMemo);
}

export async function deleteInquiryAction(id: string): Promise<void> {
  return deleteInquiry(id);
}
