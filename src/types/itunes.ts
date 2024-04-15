export type iTunesExplicitness = "explicit" | "notExplicit";

export interface iTunesSearchResponse {
  resultCount: number;
  results: iTunesAlbum[];
}

export interface iTunesAlbum {
  wrapperType: "collection";
  artistId: number;
  collectionId: number;
  artistName: string;
  collectionName: string;
  collectionCensoredName: string;
  artistViewUrl: string;
  collectionViewUrl: string;
  artworkUrl60: string;
  artworkUrl100: string;
  collectionPrice: string;
  collectionExplicitness: iTunesExplicitness;
  trackCount: number;
  copyright: string;
  country: string;
  currency: string;
  primaryGenreName: string;
}
