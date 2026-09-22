export interface FranchisePopup {
  id: string;
  title: string;
  image_url: string | null;
  link_url: string | null;
  start_date: string | null;
  end_date: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FranchisePopupFormInput {
  title: string;
  image_url: string;
  link_url: string;
  start_date: string;
  end_date: string;
  is_published: boolean;
}
