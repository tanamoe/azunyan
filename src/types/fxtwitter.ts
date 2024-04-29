/**
 * FxTwitter response types.
 * This might change later, as FxTwitter is migrating to API v2.
 * Currently based on their latest API code, combined with explicit delete from processor.
 */
export interface FxTwitterResponse {
  code: number;
  message: string;
  tweet: FxTwitterTweet;
}

/**
 * @see {@link https://github.com/FixTweet/FxTwitter/blob/e617991f8b7623bb6bbf9ab1a0e4699a13636fc0/src/providers/twitter/processor.ts#L82}
 * @see {@link https://github.com/FixTweet/FxTwitter/blob/e617991f8b7623bb6bbf9ab1a0e4699a13636fc0/src/providers/twitter/processor.ts#L308}
 * @see {@link https://github.com/FixTweet/FxTwitter/blob/e617991f8b7623bb6bbf9ab1a0e4699a13636fc0/src/types/types.d.ts#L115}
 * @see {@link https://github.com/FixTweet/FxTwitter/blob/e617991f8b7623bb6bbf9ab1a0e4699a13636fc0/src/types/types.d.ts#L151}
 */
export interface FxTwitterTweet {
  id: string;
  url: string;
  text: string;
  created_at: string;
  created_timestamp: number;

  likes: number;
  retweets: number;
  replies: number;
  views?: number | null;

  quote?: FxTwitterTweet;
  poll?: FxTwitterPoll;
  translation?: FxTwitterTranslation;
  author: FxTwitterUser;

  media?: FxTwitterMediaGroup;

  lang: string | null;
  possibly_sensitive: boolean;

  replying_to: string | null;
  replying_to_status: string | null;

  source: string;

  is_note_tweet: boolean;

  twitter_card: "tweet" | "summary" | "summary_large_image" | "player";
}

/**
 * @see {@link https://github.com/FixTweet/FxTwitter/blob/e617991f8b7623bb6bbf9ab1a0e4699a13636fc0/src/providers/twitter/processor.ts#L93-L94}
 * @see {@link https://github.com/FixTweet/FxTwitter/blob/e617991f8b7623bb6bbf9ab1a0e4699a13636fc0/src/types/types.d.ts#L158}
 */
export interface FxTwitterUser {
  id: string;
  name: string;
  screen_name: string;
  global_screen_name?: string;
  avatar_url: string;
  banner_url: string;
  description: string;
  location: string;
  url: string;
  protected: boolean;
  followers: number;
  following: number;
  statuses: number;
  likes: number;
  joined: string;
  website: {
    url: string;
    display_url: string;
  } | null;
  birthday: {
    day?: number;
    month?: number;
    year?: number;
  };
  avatar_color?: string | null;
  tweets: number;
}

/**
 * @see {@link https://github.com/FixTweet/FxTwitter/blob/e617991f8b7623bb6bbf9ab1a0e4699a13636fc0/src/types/types.d.ts#L115}
 */
export interface FxTwitterMediaGroup {
  all?: FxTwitterMedia[];
  external?: FxTwitterExternalMedia;
  photos?: FxTwitterPhoto[];
  videos?: FxTwitterVideo[];
}

/**
 * @see {@link https://github.com/FixTweet/FxTwitter/blob/e617991f8b7623bb6bbf9ab1a0e4699a13636fc0/src/types/types.d.ts#L87}
 */
export interface FxTwitterMedia {
  type: string;
  url: string;
  width: number;
  height: number;
}

/**
 * @see {@link https://github.com/FixTweet/FxTwitter/blob/e617991f8b7623bb6bbf9ab1a0e4699a13636fc0/src/types/types.d.ts#L66}
 */
interface FxTwitterExternalMedia {
  type: "video";
  url: string;
  thumbnail_url?: string;
  height?: number;
  width?: number;
}

/**
 * @see {@link https://github.com/FixTweet/FxTwitter/blob/e617991f8b7623bb6bbf9ab1a0e4699a13636fc0/src/types/types.d.ts#L94}
 */
export interface FxTwitterPhoto extends FxTwitterMedia {
  type: "photo";
  altText: string;
}

/**
 * @see {@link https://github.com/FixTweet/FxTwitter/blob/e617991f8b7623bb6bbf9ab1a0e4699a13636fc0/src/types/types.d.ts#L99}
 */
export interface FxTwitterVideo extends FxTwitterMedia {
  type: "video" | "gif";
  thumbnail_url: string;
  format: string;
  duration: number;
  variants: {
    bitrate: number;
    content_type: string;
    url: string;
  }[];
}

/**
 * @see {@link https://github.com/FixTweet/FxTwitter/blob/e617991f8b7623bb6bbf9ab1a0e4699a13636fc0/src/types/types.d.ts#L80}
 */
export interface FxTwitterPoll {
  choices: {
    label: string;
    count: number;
    percentage: number;
  }[];
  total_votes: number;
  ends_at: string;
  time_left_en: string;
}

/**
 * @see {@link https://github.com/FixTweet/FxTwitter/blob/e617991f8b7623bb6bbf9ab1a0e4699a13636fc0/src/types/types.d.ts#L59}
 */
export interface FxTwitterTranslation {
  text: string;
  source_lang: string;
  source_lang_en: string;
  target_lang: string;
}
