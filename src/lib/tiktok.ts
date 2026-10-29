import { HTTPError } from "discord.js";
import { ofetch } from "ofetch";
import { parseURL } from "ufo";
import type { TikWMResponse } from "../types/tikwm.js";

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
  static normalizeUrl(path: string): [string, null] | ["", Error] {
    const url = parseURL(path);
    const supportedHosts: ReadonlyArray<string> = [
      "tiktok.com",
      "www.tiktok.com",
      "vm.tiktok.com",
      "vt.tiktok.com",
    ];
    if (!supportedHosts.includes(url.host ?? "")) {
      return ["", new Error(`Unsupported url '${path}'`)];
    }

    return [path, null];
  }

  public static async extractPost(path: string): Promise<ExtractorResponse> {
    const extractors: ReadonlyArray<ExtractorFn> = [extractPostViaTikWM];
    let latestError: Error | null = null;
    for (const extractor of extractors) {
      const [post, err] = await extractor(path);
      if (err == null) {
        return [post, null];
      }
      latestError = err;
    }
    return [null, latestError];
  }
}

export async function extractPostViaTikWM(
  path: string,
): Promise<ExtractorResponse> {
  try {
    const { data } = await ofetch<TikWMResponse>("/api", {
      baseURL: "https://tikwm.com",
      query: {
        url: path,
      },
    });
    const media = [];

    if (data.play) {
      media.push(data.play);
    }

    if (data.images) {
      media.push(...data.images);
    }

    return [
      {
        author: {
          name: data.author.nickname,
          username: data.author.unique_id,
          avatar: data.author.avatar,
        },
        description: data.title,
        id: data.id,
        timestamp: data.create_time,
        likes: data.digg_count,
        comments: data.comment_count,
        saved: data.collect_count,
        media,
      },
      null,
    ];
  } catch (e) {
    return extractError(e);
  }
}

function extractError(e: unknown): ExtractorResponse {
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
