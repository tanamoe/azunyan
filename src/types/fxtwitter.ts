export interface FxTwitterResponse {
  code: number;
  message: string;
  tweet: FxTwitterTweet;
}

export interface FxTwitterTweet {
  url: string;
  id: string;
  text: string;
  author: FxTwitterAuthor;
  replies: number;
  retweets: number;
  likes: number;
  created_at: string;
  created_timestamp: number;
  possibly_sensitive: boolean;
  views: number;
  is_note_tweet: boolean;
  lang: string;
  replying_to?: string;
  replying_to_status?: string;
  media?: FxTwitterMediaGroup;
  source: string;
  twitter_card: string;
  color?: string;
}

export interface FxTwitterAuthor {
  id: string;
  name: string;
  screen_name: string;
  avatar_url?: string;
  banner_url?: string;
  description: string;
  location?: string;
  url: string;
  followers: number;
  following: number;
  joined: string;
  likes: number;
  website?: string;
  tweets: number;
  avatar_color?: string;
}

export interface FxTwitterMediaGroup {
  all: FxTwitterMedia[];
  videos?: FxTwitterVideo[];
}

export interface FxTwitterMedia {
  url: string;
  thumbnail_url?: string;
  duration?: number;
  width: number;
  height: number;
  format?: string;
  type: "photo" | "video" | "gif";
}

export interface FxTwitterVideo {
  url: string;
  thumbnail_url: string;
  duration: number;
  width: number;
  height: number;
  format: string;
  type: "video";
}
