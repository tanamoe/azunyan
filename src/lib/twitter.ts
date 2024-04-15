import { HTTPError } from "discord.js";
import { ofetch } from "ofetch";
import { parseURL } from "ufo";
import type { FxTwitterMedia, FxTwitterResponse } from "../types/fxtwitter.js";
import type {
  VxTwitterMediaExtended,
  VxTwitterResponse,
} from "../types/vxtwitter.js";

export type ExtractorResponse =
  | [VxTwitterResponse | null, null]
  | [null, Error];
type ExtractorFn = (path: string) => Promise<ExtractorResponse>;

export class Twitter {
  normalizeUrl(path: string): [string, null] | ["", Error] {
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

  public async extractTweet(path: string): Promise<ExtractorResponse> {
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
      const data = await ofetch(path, {
        baseURL: "https://api.vxtwitter.com/",
        responseType: "json",
      });
      return [data, null];
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
      if (data.code > 500) {
        return [null, new Error(data.message)];
      }
      if (data.code !== 200) {
        return [null, null];
      }
      const normalized: VxTwitterResponse = {
        date: data.tweet.created_at,
        date_epoch: data.tweet.created_timestamp,
        hashtags: [],
        likes: data.tweet.likes,
        mediaURLs: (data.tweet.media?.all || []).map(
          (media: FxTwitterMedia) => {
            return media.url;
          },
        ),
        media_extended: (data.tweet.media?.all || []).map(
          (media: FxTwitterMedia): VxTwitterMediaExtended => {
            return {
              duration_millis:
                media.duration === undefined
                  ? undefined
                  : media.duration * 1000,
              size: {
                height: media.height,
                width: media.width,
              },
              thumbnail_url: media.thumbnail_url ?? "",
              type: media.type === "photo" ? "image" : media.type,
              url: media.url,
            };
          },
        ),
        replies: data.tweet.replies,
        retweets: data.tweet.retweets,
        text: data.tweet.text,
        tweetID: data.tweet.id,
        tweetURL: data.tweet.url,
        user_name: data.tweet.author.name,
        user_screen_name: data.tweet.author.screen_name,
        user_profile_image_url: data.tweet.author.avatar_url,
      };
      return [normalized, null];
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
}
