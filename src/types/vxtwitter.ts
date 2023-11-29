type VxTwitterSize = {
  height: number;
  width: number;
};

type VxTwitterMediaExtended = {
  altText?: string;
  duration_millis?: number;
  size: VxTwitterSize;
  thumbnail_url: string;
  type: "image" | "video" | "gif";
  url: "https://pbs.twimg.com/media/FeU5fhPXkCoZXZB.jpg"; // direct URL to the media
};

export type VxTwitterResponse = {
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
  user_profile_image_url?: string;
};
