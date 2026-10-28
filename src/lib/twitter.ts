import createClient from "openapi-fetch";
import { parseURL } from "ufo";
import type { components, paths } from "./fxtwitter/v2.js";

export interface ExtractorAuthor {
  name: string;
  screen_name: string;
  avatar_url: string | null;
  url: string;
}

export interface ExtractorTranslation {
  text: string;
  source_lang: string;
  target_lang: string;
  provider: string;
}

export interface ExtractorTweet {
  id: string;
  url: string;
  text: string;
  created_at: string;
  created_timestamp: number;

  likes: number;
  retweets: number;
  replies: number;
  views?: number | null;

  quote?: ExtractorTweet;
  translation?: ExtractorTranslation;

  lang: string | null;
  possibly_sensitive: boolean;

  author: ExtractorAuthor;
  media?: { photos?: ExtractorPhoto[]; videos?: ExtractorVideo[] };
}

export interface ExtractorMedia {
  type: string;
  url: string;
  width: number;
  height: number;
}

export interface ExtractorPhoto extends ExtractorMedia {
  type: "photo";
  altText: string;
}

export interface ExtractorVideo extends ExtractorMedia {
  type: "video" | "gif";
  thumbnail_url: string;
  duration: number;
}

export type ExtractorResponse = [ExtractorTweet | null, null] | [null, Error];
type ExtractorFn = (path: string, lang?: string) => Promise<ExtractorResponse>;

export class Twitter {
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

    return [url.pathname.slice(url.pathname.lastIndexOf("/") + 1), null];
  }

  public static async extractTweet(
    path: string,
    lang?: string,
  ): Promise<ExtractorResponse> {
    const extractors: ReadonlyArray<ExtractorFn> = [extractFxTwitterV2];
    let latestError: Error | null = null;
    for (const extractor of extractors) {
      const [tweet, err] = await extractor(path, lang);
      if (err == null) {
        return [tweet, null];
      }
      latestError = err;
    }
    return [null, latestError];
  }
}

async function extractFxTwitterV2(
  id: string,
  lang?: string,
): Promise<ExtractorResponse> {
  const client = createClient<paths>({ baseUrl: "https://api.fxtwitter.com" });

  const { data, error } = await client.GET("/2/status/{id}", {
    params: {
      path: { id: id },
      query: { lang: lang },
    },
  });

  if (error) {
    return [null, new Error("cannot fetch")];
  }

  if (!data.status) {
    return [null, new Error("empty response")];
  }

  return [
    normalizeFxTwitterV2(
      <components["schemas"]["APITwitterStatus"]>data.status,
    ),
    null,
  ];
}

function normalizeFxTwitterV2(
  response: components["schemas"]["APITwitterStatus"],
): ExtractorTweet {
  const photos: ExtractorPhoto[] = [];
  const videos: ExtractorVideo[] = [];

  if (response.media.all) {
    for (const media of response.media.all) {
      switch (media.type) {
        case "photo":
          photos.push({
            url: media.url,
            width: media.width,
            height: media.height,
            altText: "",
            type: media.type,
          });
          break;
        case "gif":
        case "video":
          videos.push({
            url: media.url,
            thumbnail_url: media.type,
            width: media.width,
            height: media.height,
            duration: 0,
            type: media.type,
          });
          break;
      }
    }
  }

  return {
    id: response.id,
    url: response.url,
    text: response.text,
    created_at: response.created_at,
    created_timestamp: response.created_timestamp,
    likes: response.likes,
    retweets: response.reposts,
    replies: response.replies,
    author: response.author,
    lang: response.lang,
    translation: response.translation,
    possibly_sensitive: response.possibly_sensitive,
    media: {
      photos,
      videos,
    },
  };
}
