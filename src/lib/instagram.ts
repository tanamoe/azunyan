import * as cheerio from "cheerio";
import { HTTPError } from "discord.js";
import { ofetch } from "ofetch";
import { joinURL, parseURL, withoutTrailingSlash } from "ufo";

export type InstagramMedia = {
  url: string;
  size: number;
};

export type ExtractorPost = {
  author: string;
  description: string;
  url: string;
  media: InstagramMedia[] | null;
};
export type ExtractorResponse = [ExtractorPost | null, null] | [null, Error];
export type ExtractorMediaResponse =
  | [InstagramMedia[] | null, null]
  | [null, Error];
type ExtractorFn = (path: string) => Promise<ExtractorResponse>;

export class Instagram {
  private lintComplain() {
    return 0;
  }

  static normalizeUrl(path: string): [string, null] | ["", Error] {
    const url = parseURL(path);
    const supportedHosts: ReadonlyArray<string> = [
      "instagram.com",
      "www.instagram.com",
      "ddinstagram.com",
      "www.ddinstagram.com",
    ];
    if (!supportedHosts.includes(url.host ?? "")) {
      return ["", new Error(`Unsupported url '${path}'`)];
    }

    let id = withoutTrailingSlash(url.pathname).split("/").at(-1);

    if (!id) {
      return ["", new Error(`Unsupported path '${url.pathname}'`)];
    }

    // see https://github.com/Wikidepia/InstaFix/blob/main/handlers/embed.go#L17
    if (url.pathname.includes("stories")) {
      const alphabet =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
      let shortCode = "";
      let mediaId = BigInt(id);
      // js is stupid here
      while (mediaId > 0) {
        const r = mediaId % 64n;
        mediaId = BigInt(mediaId / 64n);
        shortCode = alphabet[Number(r)].toString() + shortCode;
      }

      id = shortCode;
    }

    return [id, null];
  }

  public static async extractPost(id: string): Promise<ExtractorResponse> {
    const extractors: ReadonlyArray<ExtractorFn> = [
      Instagram.extractPostViaInstaFix,
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

  private static async extractPostViaInstaFix(
    id: string,
  ): Promise<ExtractorResponse> {
    try {
      const $ = await ofetch(id, {
        baseURL: "https://ddinstagram.com/p",
        headers: {
          "User-Agent": "discord",
        },
        parseResponse: (txt) => cheerio.load(txt),
      });

      const author = $('[name="twitter:title"]').attr("content") ?? "undefined";
      const description =
        $('[property="og:description"]').attr("content") ?? "";
      const url = $('[property="og:url"]').attr("content") ?? "";
      const [media] = await Instagram.instaFixMedia(id);

      return [
        {
          author,
          description,
          url,
          media,
        },
        null,
      ];
    } catch (e) {
      return Instagram.extractError(e);
    }
  }

  private static async instaFixMedia(
    id: string,
  ): Promise<ExtractorMediaResponse> {
    let i = 1;
    const images: InstagramMedia[] = [];

    while (i < 10) {
      try {
        const data = await ofetch.raw(joinURL(id, i.toString()), {
          baseURL: "https://ddinstagram.com/videos",
          headers: {
            "User-Agent": "discord",
          },
          method: "HEAD",
        });

        const size = data.headers.get("Content-Length");
        if (!size) {
          return [images, null];
        }

        images.push({
          url: data.url,
          size: Number.parseInt(size),
        });
        i++;
      } catch (e) {
        return Instagram.mediaError(e);
      }
    }

    return [images, null];
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

  private static mediaError(e: unknown): ExtractorMediaResponse {
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
