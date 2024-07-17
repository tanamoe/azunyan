import { HTTPError } from "discord.js";
import { ofetch } from "ofetch";
import { joinURL, parseURL } from "ufo";
import type { FxTikTokResponse } from "../types/fxtiktok.js";

export type ExtractorPost = {
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  description: string;
  id: string;
  timestamp: number;
  likes: number;
  comments: number;
  saved: number;
  media: string[] | null;
};
export type ExtractorResponse = [ExtractorPost | null, null] | [null, Error];
export type ExtractorMediaResponse = [string[] | null, null] | [null, Error];
type ExtractorFn = (path: string) => Promise<ExtractorResponse>;

export class TikTok {
  private lintComplain() {
    return 0;
  }

  static normalizeUrl(path: string): [string, null] | ["", Error] {
    const url = parseURL(path);
    const supportedHosts: ReadonlyArray<string> = [
      "tiktok.com",
      "www.tiktok.com",
    ];
    if (!supportedHosts.includes(url.host ?? "")) {
      return ["", new Error(`Unsupported url '${path}'`)];
    }

    const id = url.pathname.split("/").at(-1);

    if (!id) {
      return ["", new Error(`Unsupported path '${url.pathname}'`)];
    }

    return [id, null];
  }

  static async redirectUrl(
    path: string,
  ): Promise<[string, null] | ["", Error]> {
    const url = parseURL(path);
    const supportedHosts: ReadonlyArray<string> = [
      "vm.tiktok.com",
      "vt.tiktok.com",
    ];
    if (!supportedHosts.includes(url.host ?? "")) {
      return [path, null];
    }

    try {
      const res = await ofetch.raw(path);

      return [res.url, null];
    } catch (e) {
      return ["", new Error("Incorrect path")];
    }
  }

  public static async extractPost(id: string): Promise<ExtractorResponse> {
    const extractors: ReadonlyArray<ExtractorFn> = [
      TikTok.extractPostViaFxTikTok,
    ];
    let latestError: Error | null = null;
    for (const extractor of extractors) {
      const [post, err] = await extractor(id);
      if (err == null) {
        return [post, null];
      }
      latestError = err;
    }
    return [null, latestError];
  }

  private static async extractPostViaFxTikTok(
    id: string,
  ): Promise<ExtractorResponse> {
    try {
      const data = await ofetch<FxTikTokResponse>(id, {
        baseURL: "https://fxtiktok-rewrite.tanamoe.workers.dev/test",
      });
      const media = [];

      if (data.video.duration > 0) {
        media.push(joinURL("https://tnktok.com/generate/video", data.id));
      }

      if (data.imagePost) {
        for (const image of data.imagePost.images) {
          media.push(image.imageURL.urlList[0]);
        }
      }

      return [
        {
          author: {
            name: data.author.nickname,
            username: data.author.uniqueId,
            avatar: data.author.avatarThumb,
          },
          description: data.desc,
          id,
          timestamp: Number.parseInt(data.createTime),
          likes: Number.parseInt(data.statsV2.diggCount),
          comments: Number.parseInt(data.statsV2.commentCount),
          saved: Number.parseInt(data.statsV2.collectCount),
          media,
        },
        null,
      ];
    } catch (e) {
      return TikTok.extractError(e);
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
