/**
 * Community Note currently not working
 *
 * @see {@link https://github.com/dylanpdx/BetterTwitFix/blob/c33a6ec09558eccfeb849690d974170f1afa4ed8/twitfix.py#L264}
 */
export interface VxTwitterResponse {
  date: string;
  date_epoch: number;
  hashtags: string[];
  likes: number;
  mediaURLs: string[];
  media_extended: VxTwitterMediaExtended[];
  replies: number;
  retweets: number;
  text: string;
  tweetID: string;
  tweetURL: string;
  user_name: string;
  user_screen_name: string;
  user_profile_image_url: string;
  conversationID: string;
  qrtURL: string;
  possibly_sensitive: boolean;
}

export interface VxTwitterSize {
  height: number;
  width: number;
}

export interface VxTwitterMediaExtended {
  altText?: string;
  duration_millis: number;
  size: VxTwitterSize;
  thumbnail_url: string;
  type: "image" | "video" | "gif";
  url: string; // direct URL to the media
}
