import { ofetch } from "ofetch";
import { parseURL } from "ufo";
import type { iTunesSearchResponse } from "../types/itunes.js";

type SearchLanguage = "en_US" | "ja_JP";

type Artwork = {
  name: string;
  artist: string;
  url: string;
  artistUrl: string;
  artworkUrl: string;
};

export type ArtworkResponse = [Artwork | null, null] | [null, Error];

// iTunes Search API bindings
// https://performance-partners.apple.com/search-api
export class iTunes {
  public async lookup(
    id: string,
    lang: SearchLanguage,
  ): Promise<ArtworkResponse> {
    const data = await ofetch<iTunesSearchResponse>(
      "https://itunes.apple.com/lookup",
      {
        query: {
          id,
          country: "JP",
          lang,
          entity: "album",
        },
        parseResponse: JSON.parse,
      },
    );

    if (data.resultCount === 0) {
      return [null, null];
    }

    const normalized: Artwork = {
      name: data.results[0].collectionName,
      artist: data.results[0].artistName,
      url: data.results[0].collectionViewUrl,
      artistUrl: data.results[0].artistViewUrl,
      artworkUrl: data.results[0].artworkUrl100
        .replace("is1-ssl", "a5")
        .replace("image/thumb", "jp/r1000/0")
        .replace("/100x100bb.jpg", ""),
    };

    return [normalized, null];
  }

  public async search(
    term: string,
    lang: SearchLanguage,
    limit: number,
  ): Promise<ArtworkResponse> {
    const _url = parseURL(term);

    if (_url.host?.includes("music.apple.com")) {
      const _id = _url.pathname.match(/\d+$/)?.[0];

      if (_id) {
        return this.lookup(_id, lang);
      }
    }

    const data = await ofetch<iTunesSearchResponse>(
      "https://itunes.apple.com/search",
      {
        query: {
          term,
          country: "JP",
          media: "music",
          lang,
          entity: "album",
          limit,
        },
        parseResponse: JSON.parse,
      },
    );

    if (data.resultCount === 0) {
      return [null, null];
    }

    const normalized: Artwork = {
      name: data.results[0].collectionName,
      artist: data.results[0].artistName,
      url: data.results[0].collectionViewUrl,
      artistUrl: data.results[0].artistViewUrl,
      artworkUrl: data.results[0].artworkUrl100
        .replace("is1-ssl", "a5")
        .replace("image/thumb", "jp/r1000/0")
        .replace("/100x100bb.jpg", ""),
    };

    return [normalized, null];
  }
}
