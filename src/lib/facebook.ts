import * as cheerio from "cheerio";
import { HTTPError } from "discord.js";
import { ofetch } from "ofetch";
import { parseURL } from "ufo";

export type ExtractorPost = {
  author: string;
  description: string;
  url: string;
  media: string[] | null;
};
export type ExtractorResponse = [ExtractorPost | null, null] | [null, Error];
type ExtractorFn = (path: string) => Promise<ExtractorResponse>;

export class Facebook {
  static normalizeUrl(path: string): [string, null] | ["", Error] {
    const url = parseURL(path);
    const supportedHosts: ReadonlyArray<string> = [
      "facebook.com",
      "www.facebook.com",
    ];
    if (!supportedHosts.includes(url.host ?? "")) {
      return ["", new Error(`Unsupported url '${path}'`)];
    }

    return [url.pathname, null];
  }

  public static async extractPost(path: string): Promise<ExtractorResponse> {
    const extractors: ReadonlyArray<ExtractorFn> = [extractPostViaFacebed];
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

async function extractPostViaFacebed(path: string): Promise<ExtractorResponse> {
  try {
    const $ = await ofetch<cheerio.CheerioAPI>(path, {
      baseURL: "https://facebed.com",
      headers: {
        "User-Agent": "HTTPie/3.2.4",
      },
      parseResponse: (txt) => cheerio.load(txt),
    });

    const author =
      $('[property="og:title"]').attr("content") ?? "Unknown Author";
    const description = $('[property="og:description"]').attr("content") ?? "";
    const url = $('[property="og:url"]').attr("content") ?? "";

    const media: string[] = [];

    $('[property="og:image"]').each((_, el) => {
      if ("content" in el.attribs) {
        media.push(el.attribs.content);
      }
    });

    $('[property="og:video"]').each((_, el) => {
      if ("content" in el.attribs) {
        media.push(el.attribs.content);
      }
    });

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
