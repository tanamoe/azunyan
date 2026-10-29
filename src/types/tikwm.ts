export interface TikWMResponse {
  code?: number;
  msg: string;
  processed_time?: number;
  data: TikWMData;
}

export interface TikWMData {
  id: string;
  region?: string;
  title: string;

  play?: string;
  images?: string[];

  play_count: number;
  digg_count: number;
  comment_count: number;
  share_count: number;
  download_count: number;
  collect_count: number;

  author: TikWMAuthor;
  create_time: number;
}

export interface TikWMAuthor {
  id: string;
  unique_id: string;
  nickname: string;
  avatar: string;
}
