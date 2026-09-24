import { createClient } from "@/libs/supabase/server";

export interface PublicFranchisePopup {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string | null;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  created_at: string;
}

const SELECT_COLUMNS =
  "id,title,image_url,link_url,start_date,end_date,sort_order,created_at";

/** franchise_popups_public 뷰 조회 (RLS: is_published=true 행만, anon 허용) */
export async function getPublicFranchisePopups(): Promise<
  PublicFranchisePopup[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("franchise_popups_public")
    .select(SELECT_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getPublicFranchisePopups]", error);
    throw new Error("팝업 목록을 불러오지 못했습니다.");
  }

  return (data ?? []) as unknown as PublicFranchisePopup[];
}
