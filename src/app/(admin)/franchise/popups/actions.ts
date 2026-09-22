"use server";

import {
  createFranchisePopup,
  updateFranchisePopup,
  deleteFranchisePopup,
  updateFranchisePopupsSortOrder,
} from "@/libs/supabase/queries/franchise-popups.admin";
import type {
  FranchisePopup,
  FranchisePopupFormInput,
} from "@/types/franchise-popup";

export async function createFranchisePopupAction(
  input: FranchisePopupFormInput,
): Promise<FranchisePopup> {
  return createFranchisePopup(input);
}

export async function updateFranchisePopupAction(
  id: string,
  input: FranchisePopupFormInput,
): Promise<FranchisePopup> {
  return updateFranchisePopup(id, input);
}

export async function deleteFranchisePopupAction(id: string): Promise<void> {
  return deleteFranchisePopup(id);
}

export async function updateFranchisePopupsSortOrderAction(
  updates: { id: string; sort_order: number }[],
): Promise<void> {
  return updateFranchisePopupsSortOrder(updates);
}
