import {
  BaseExtractor,
  type ExtractorInfo,
  type ExtractorSearchContext,
  type ExtractorStreamable,
  Playlist,
  Track,
  Util,
} from "discord-player";
import SubsonicAPI, {
  type AlbumWithSongsID3,
  type PlaylistWithSongs,
  type Child,
} from "subsonic-api";
import { joinURL, parseURL, stringifyParsedURL } from "ufo";
import { logger } from "../lib/logger.js";

type NavidromeOption = {
  url: string;
  username: string;
  password: string;
  alternateUrl?: string;
};

export class NavidromeExtractor extends BaseExtractor<NavidromeOption[]> {
  static identifier = "navidrome-extrator" as const;
  private api: SubsonicAPI[] | null = null;

  public createBridgeQuery = (track: Track) =>
    `${track.title} by ${track.author}`;

  async activate(): Promise<void> {
    this.protocols = [
      "navidrome-search",
      "navidrome-search-playlist",
      "navidrome-playlist",
      "navidrome-album",
    ];
    this.api = await Promise.all(
      this.options.map(async (credential) => {
        const { url, username, password } = credential;

        const client = new SubsonicAPI({
          url,
          auth: {
            username,
            password,
          },
        });

        const session = await client.navidromeSession();

        logger.success(`Authenticated to ${url} with user ${session.name}`);

        return client;
      }),
    );
  }

  async deactivate(): Promise<void> {
    this.protocols = [];
  }

  private findIndex(query: string): number {
    return (
      this.options
        .map((credential, index) => {
          const _endpoint = parseURL(credential.url);
          const _url = parseURL(query);

          if (_url.host === _endpoint.host) {
            return index + 1;
          }

          if (credential.alternateUrl) {
            const _alternative = parseURL(credential.alternateUrl);

            if (_url.host === _alternative.host) {
              return index + 1;
            }
          }

          return 0;
        })
        .reduce((acc, curr) => (curr > 0 ? curr : acc), 0) - 1
    );
  }

  async validate(query: string): Promise<boolean> {
    return this.findIndex(query) >= 0;
  }

  async handle(
    query: string,
    context: ExtractorSearchContext,
  ): Promise<ExtractorInfo> {
    if (!this.api) {
      return this.createResponse();
    }

    const _url = parseURL(query);

    if (_url.hash.includes("album")) {
      context.protocol = "navidrome-album";
    } else if (_url.hash.includes("playlist")) {
      context.protocol = "navidrome-playlist";
    }
    switch (context.protocol) {
      case "navidrome-playlist": {
        const _srcIndex = this.findIndex(query);
        if (_srcIndex < 0) return this.createResponse();
        const _api = this.api[_srcIndex];
        const _credential = this.options[_srcIndex];
        const _id = _url.hash.match(/playlist\/(.*)\/show/);

        if (!_id || !_id.length) return this.createResponse();

        const results = await _api.getPlaylist({
          id: _id[1],
        });

        if (!results) return this.createResponse();

        const _playlist = results.playlist as PlaylistWithSongs;

        _playlist.entry?.map((track) => {
          if (track.albumId) {
            track.albumId = `${_srcIndex}/${track.albumId}`;
          }
        });

        const playlist = new Playlist(this.context.player, {
          title: _playlist.name,
          thumbnail:
            "https://raw.githubusercontent.com/navidrome/navidrome/master/resources/logo-192x192.png",
          type: "album",
          description: _playlist.comment ?? "",
          source: "arbitrary",
          author: {
            name: _playlist.owner ?? "Unknown User",
            url: _credential.alternateUrl ?? _credential.url,
          },
          tracks: [],
          id: `${_srcIndex}/${_playlist.id}`,
          url: joinURL(
            _credential.alternateUrl ?? _credential.url,
            "/app/#/playlist",
            _playlist.id,
            "/show",
          ),
          rawPlaylist: _playlist,
        });

        if (_playlist.entry?.length) {
          const _thumbnail = parseURL(
            (
              await _api.getCoverArt({
                id: _playlist.entry[0].id,
              })
            ).url,
          );

          if (_credential.alternateUrl) {
            _thumbnail.host = parseURL(_credential.alternateUrl).host;
          }

          playlist.thumbnail = stringifyParsedURL(_thumbnail);

          playlist.tracks = await Promise.all(
            _playlist.entry?.map((song) => this.extractSong(song, context)),
          );
        }

        return this.createResponse(playlist, playlist.tracks);
      }

      case "navidrome-album": {
        const _srcIndex = this.findIndex(query);
        if (_srcIndex < 0) return this.createResponse();
        const _api = this.api[_srcIndex];
        const _credential = this.options[_srcIndex];
        const _id = _url.hash.match(/album\/(.*)\/show/);

        if (!_id || !_id.length) return this.createResponse();

        const results = await _api.getAlbum({
          id: _id[1],
        });

        if (!results) return this.createResponse();

        const _album = results.album as AlbumWithSongsID3;

        _album.song?.map((track) => {
          if (track.albumId) {
            track.albumId = `${_srcIndex}/${track.albumId}`;
          }
        });

        const playlist = new Playlist(this.context.player, {
          title: _album.name,
          thumbnail:
            "https://raw.githubusercontent.com/navidrome/navidrome/master/resources/logo-192x192.png",
          type: "album",
          description: `${_album.year} · ${_album.genre}`,
          source: "arbitrary",
          author: {
            name: _album.artist ?? "Unknown Artist",
            url: _album.artistId
              ? joinURL(
                  _credential.alternateUrl ?? _credential.url,
                  "/app/#/artist",
                  _album.artistId,
                  "/show",
                )
              : (_credential.alternateUrl ?? _credential.url),
          },
          tracks: [],
          id: `${_srcIndex}/${_album.id}`,
          url: joinURL(
            _credential.alternateUrl ?? _credential.url,
            "/app/#/album",
            _album.id,
            "/show",
          ),
          rawPlaylist: _album,
        });

        if (_album.coverArt) {
          const _coverart = parseURL(
            (
              await _api.getCoverArt({
                id: _album.coverArt,
              })
            ).url,
          );

          if (_credential.alternateUrl) {
            _coverart.host = parseURL(_credential.alternateUrl).host;
          }

          playlist.thumbnail = stringifyParsedURL(_coverart);
        }

        if (_album.song) {
          playlist.tracks = await Promise.all(
            _album.song?.map((song) => this.extractSong(song, context)),
          );
        }

        return this.createResponse(playlist, playlist.tracks);
      }

      default: {
        const results = await Promise.allSettled(
          this.api.map((_api) =>
            _api.search3({
              query,
              artistCount: 0,
              albumCount: 0,
            }),
          ),
        );
        if (!results) {
          return this.createResponse();
        }
        const existSong: { [key: string]: boolean } = {};
        const fulfilledServer: number[] = [];
        results.map((inp, srcIndex) => {
          if (inp.status === "fulfilled") {
            fulfilledServer.push(srcIndex);
          }
        });
        const songs = results
          .filter(
            <T>(
              input: PromiseSettledResult<T>,
            ): input is PromiseFulfilledResult<T> =>
              input.status === "fulfilled",
          )
          .map((inp) => inp.value.searchResult3)
          .map((result, index) => {
            if (!result.song?.length) {
              return [];
            }
            result.song?.map((track) => {
              if (track.albumId) {
                track.albumId = `${fulfilledServer[index]}/${track.albumId}`;
              }
            });
            return result.song;
          })
          .reduce((acc, curr) => [acc, curr].flat(1))
          .filter((song) => {
            const artist = song.artist ?? "Unknown Artist";
            const album = song.album ?? "Unknown Album";
            const key = `${artist} - ${album} - ${song.title}`;
            if (key in existSong) {
              return false;
            }
            existSong[key] = true;
            return true;
          })
          .slice(0, 10);
        if (songs.length <= 0) {
          return this.createResponse();
        }
        return this.createResponse(
          null,
          await Promise.all(
            songs.map((song) => this.extractSong(song, context)),
          ),
        );
      }
    }
  }

  async stream(track: Track<Child>): Promise<ExtractorStreamable> {
    if (!track.metadata) {
      throw new Error("Unable to find song");
    }

    if (!this.api) {
      throw new Error("Cannot connect to API");
    }

    const _api = this.api[this.findIndex(track.url)];
    const stream = await _api.stream({
      id: track.metadata?.id,
      format: "ogg",
    });

    if (!stream) {
      throw new Error("Could not find stream source");
    }

    return stream.url;
  }

  async getRelatedTracks(track: Track<Child>): Promise<ExtractorInfo> {
    if (!track.metadata || !this.api) {
      return this.createResponse();
    }

    const _api = this.api[this.findIndex(track.url)];
    const results = await _api.getSimilarSongs2({
      id: track.metadata.id,
      count: 5,
    });

    if (!results.similarSongs2.song) {
      return this.createResponse();
    }

    return this.createResponse(
      null,
      await Promise.all(
        results.similarSongs2.song?.map(
          async (song) => await this.extractSong(song),
        ),
      ),
    );
  }

  async extractSong(song: Child, context?: ExtractorSearchContext) {
    if (!this.api) {
      throw new Error("Cannot connect to API");
    }

    const _parsedAlbumId = song.albumId?.split("/") || [];
    if (_parsedAlbumId.length < 2) {
      throw new Error(`Invalid album id ${song.albumId}`);
    }
    const _srcIndex = Number.parseInt(_parsedAlbumId[0]);
    const _albumId = _parsedAlbumId[1];
    const _api = this.api[_srcIndex];
    const _credential = this.options[_srcIndex];
    const url = song.albumId
      ? joinURL(
          _credential.alternateUrl ?? _credential.url,
          "/app/#/album",
          _albumId,
          "/show",
          song.id.substring(1, 5),
        )
      : undefined;

    const track = new Track(this.context.player, {
      title: song.title,
      author: song.artist ?? "Unknown Artist",
      url,
      duration: Util.buildTimeCode(Util.parseMS((song.duration ?? 0) * 1000)),
      requestedBy: context?.requestedBy,
      metadata: song,
      async requestMetadata() {
        return song;
      },
    });

    if (song.coverArt) {
      const _coverart = parseURL(
        (
          await _api.getCoverArt({
            id: song.coverArt,
          })
        ).url,
      );

      if (_credential.alternateUrl) {
        _coverart.host = parseURL(_credential.alternateUrl).host;
      }

      track.thumbnail = stringifyParsedURL(_coverart);
    }

    return track;
  }
}
