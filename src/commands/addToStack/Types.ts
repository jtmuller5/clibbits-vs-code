export interface Libbit {
  id: string;
  name: string;
  description: string | null;
  category: string;
  language?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  clibbit_count: {
    count: number;  
  }[] | number;
  user?: {
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface Clibbit {
  id: string;
  name: string;
  content: string;
  language: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}