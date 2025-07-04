import { AtpAgent } from "@atproto/api";
import type { OutputSchema } from "@atproto/api/dist/client/types/app/bsky/feed/getPosts.js";
import { HandleResolver } from "@atproto/identity";
import { HTTPError } from "discord.js";
import { parseURL } from "ufo";

export type ExtractorResponse = [OutputSchema | null, null] | [null, Error];
type ExtractorFn = (path: string) => Promise<ExtractorResponse>;

export class Bluesky {
  #lintComplain() {
    return 0;
  }

  static normalizeUrl(path: string): [string, null] | ["", Error] {
    const url = parseURL(path);
    const supportedHosts: ReadonlyArray<string> = ["bsky.app"];
    if (!supportedHosts.includes(url.host ?? "")) {
      return ["", new Error(`Unsupported url '${path}'`)];
    }
    return [url.pathname, null];
  }

  public static async extractPost(path: string): Promise<ExtractorResponse> {
    const extractors: ReadonlyArray<ExtractorFn> = [
      Bluesky.extractPostViaATProto,
    ];
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

  private static async extractPostViaATProto(
    path: string,
  ): Promise<ExtractorResponse> {
    const agent = new AtpAgent({ service: "https://public.api.bsky.app" });
    const hdlres = new HandleResolver({});

    try {
      const profileHandle = path.match(/profile\/([\w\d\-.]+)/);
      const postHandle = path.match(/post\/([\w\d.]+)/);

      if (!profileHandle?.[1] || !postHandle?.[1]) {
        return Bluesky.extractError("Invalid URL");
      }

      const did = await hdlres.resolve(profileHandle[1]);

      if (!did) {
        return Bluesky.extractError("Invalid user");
      }

      const post = await agent.getPosts({
        uris: [`at://${did}/app.bsky.feed.post/${postHandle[1]}`],
      });

      if (!post.success) {
        return Bluesky.extractError("Cannot get post");
      }

      return [post.data, null];
    } catch (e) {
      return Bluesky.extractError(e);
    }
  }

  private static extractError(e: unknown): ExtractorResponse {
    if (!(e instanceof HTTPError)) {
      if (!(e instanceof Error)) {
        console.error(e);
        return [null, new Error("Unknown error")];
      }
      return [null, e];
    }

    return [null, e];
  }
}
