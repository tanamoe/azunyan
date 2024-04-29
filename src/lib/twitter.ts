import { HTTPError } from "discord.js";
import { ofetch } from "ofetch";
import { parseURL } from "ufo";
import type {
  FxTwitterPhoto,
  FxTwitterResponse,
  FxTwitterTweet,
  FxTwitterUser,
  FxTwitterVideo,
} from "../types/fxtwitter.js";
import type { VxTwitterResponse } from "../types/vxtwitter.js";

// helper
type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type ExtractorAuthor = Pick<
  FxTwitterUser,
  "screen_name" | "avatar_url" | "name"
>;
export type ExtractorPhoto = FxTwitterPhoto;
export type ExtractorVideo = Omit<FxTwitterVideo, "format" | "variants">;
export type ExtractorTweet = Omit<
  Optional<
    FxTwitterTweet,
    | "is_note_tweet"
    | "twitter_card"
    | "lang"
    | "source"
    | "replying_to"
    | "replying_to_status"
  >,
  "author" | "media"
> & {
  author: ExtractorAuthor;
  media?: { photos?: ExtractorPhoto[]; videos?: ExtractorVideo[] };
};
export type ExtractorResponse = [ExtractorTweet | null, null] | [null, Error];
type ExtractorFn = (path: string) => Promise<ExtractorResponse>;

export class Twitter {
  private lintComplain() {
    return 0;
  }

  static normalizeUrl(path: string): [string, null] | ["", Error] {
    const url = parseURL(path);
    const supportedHosts: ReadonlyArray<string> = [
      "twitter.com",
      "x.com",
      "vxtwitter.com",
      "api.vxtwitter.com",
      "fxtwitter.com",
      "api.fxtwitter.com",
    ];
    if (!supportedHosts.includes(url.host ?? "")) {
      return ["", new Error(`Unsupported url '${path}'`)];
    }
    return [url.pathname, null];
  }

  public static async extractTweet(path: string): Promise<ExtractorResponse> {
    const extractors: ReadonlyArray<ExtractorFn> = [
      Twitter.extractTweetViaFxTwitter,
      Twitter.extractTweetViaVxTwitter,
    ];
    let latestError: Error | null = null;
    for (const extractor of extractors) {
      const [tweet, err] = await extractor(path);
      if (err == null) {
        return [tweet, null];
      }
      latestError = err;
    }
    return [null, latestError];
  }

  private static async extractTweetViaVxTwitter(
    path: string,
  ): Promise<ExtractorResponse> {
    try {
      const data = await ofetch<VxTwitterResponse>(path, {
        baseURL: "https://api.vxtwitter.com/",
        responseType: "json",
      });

      const normalize = await Twitter.normalizeVxTwitter(data);

      return [normalize, null];
    } catch (e) {
      return Twitter.extractError(e);
    }
  }

  private static async extractTweetViaFxTwitter(
    path: string,
  ): Promise<ExtractorResponse> {
    try {
      const data = await ofetch<FxTwitterResponse>(path, {
        baseURL: "https://api.fxtwitter.com/",
        responseType: "json",
      });

      // TODO: https://github.com/FixTweet/FxTwitter/wiki/Status-Fetch-API
      if (data.code > 500) {
        return [null, new Error(data.message)];
      }
      if (data.code !== 200) {
        return [null, null];
      }

      return [data.tweet, null];
    } catch (e) {
      return Twitter.extractError(e);
    }
  }

  private static extractError(e: unknown): ExtractorResponse {
    if (!(e instanceof HTTPError)) {
      if (!(e instanceof Error)) {
        return [null, new Error("Unknown error")];
      }
      return [null, e];
    }
    const status = e.status;
    if (status > 500) {
      return [null, e];
    }
    return [null, null];
  }

  private static async normalizeVxTwitter(data: VxTwitterResponse) {
    const photos: ExtractorPhoto[] = [];
    const videos: ExtractorVideo[] = [];

    data.media_extended.map((media) => {
      switch (media.type) {
        case "image":
          photos.push({
            url: media.url,
            width: media.size.width,
            height: media.size.height,
            altText: media.altText ?? "",
            type: "photo",
          });
          break;

        case "gif":
        case "video":
          videos.push({
            url: media.url,
            thumbnail_url: media.thumbnail_url,
            width: media.size.width,
            height: media.size.height,
            duration: media.duration_millis / 1000,
            type: media.type,
          });
      }
    });

    const normalize: ExtractorTweet = {
      id: data.tweetID,
      url: data.tweetURL,
      text: data.text,
      created_at: data.date,
      created_timestamp: data.date_epoch,
      likes: data.likes,
      retweets: data.retweets,
      replies: data.replies,
      author: {
        name: data.user_name,
        screen_name: data.user_screen_name,
        avatar_url: data.user_profile_image_url,
      },
      possibly_sensitive: data.possibly_sensitive,
      media: {
        photos,
        videos,
      },
    };

    return normalize;
  }
}
