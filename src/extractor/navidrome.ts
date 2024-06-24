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

type NavidromeOption = {
  url: string;
  username: string;
  password: string;
  alternateUrl?: string;
};

export class NavidromeExtractor extends BaseExtractor<NavidromeOption> {
  static identifier = "navidrome-extrator" as const;
  private api: SubsonicAPI | null = null;

  public createBridgeQuery = (track: Track) =>
    `${track.title} by ${track.author}`;

  async activate(): Promise<void> {
    const { url, username, password } = this.options;
    this.protocols = [
      "navidrome-search",
      "navidrome-search-playlist",
      "navidrome-playlist",
      "navidrome-album",
    ];

    this.api = new SubsonicAPI({
      url,
      type: "navidrome",
    });
    await this.api.login({
      username,
      password,
    });
  }

  async deactivate(): Promise<void> {
    this.protocols = [];
  }

  async validate(query: string): Promise<boolean> {
    const _endpoint = parseURL(this.options.url);
    const _url = parseURL(query);

    if (_url.host === _endpoint.host) {
      return true;
    }

    if (this.options.alternateUrl) {
      const _alternative = parseURL(this.options.alternateUrl);

      if (_url.host === _alternative.host) {
        return true;
      }
    }

    return false;
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
        const _id = _url.hash.match(/playlist\/(.*)\/show/);

        if (!_id || !_id.length) return this.createResponse();

        const results = await this.api.getPlaylist({
          id: _id[1],
        });

        if (!results) return this.createResponse();

        const _playlist = results.playlist as PlaylistWithSongs;

        const playlist = new Playlist(this.context.player, {
          title: _playlist.name,
          thumbnail:
            "https://raw.githubusercontent.com/navidrome/navidrome/master/resources/logo-192x192.png",
          type: "album",
          description: _playlist.comment ?? "",
          source: "arbitrary",
          author: {
            name: _playlist.owner ?? "Unknown User",
            url: this.options.alternateUrl ?? this.options.url,
          },
          tracks: [],
          id: _playlist.id,
          url: joinURL(
            this.options.alternateUrl ?? this.options.url,
            "/app/#/playlist",
            _playlist.id,
            "/show",
          ),
          rawPlaylist: _playlist,
        });

        if (_playlist.entry?.length) {
          const _thumbnail = parseURL(
            (
              await this.api.getCoverArt({
                id: _playlist.entry[0].id,
              })
            ).url,
          );

          if (this.options.alternateUrl) {
            _thumbnail.host = parseURL(this.options.alternateUrl).host;
          }

          playlist.thumbnail = stringifyParsedURL(_thumbnail);

          playlist.tracks = await Promise.all(
            _playlist.entry?.map((song) => this.extractSong(song, context)),
          );
        }

        return this.createResponse(playlist, playlist.tracks);
      }

      case "navidrome-album": {
        const _id = _url.hash.match(/album\/(.*)\/show/);

        if (!_id || !_id.length) return this.createResponse();

        const results = await this.api.getAlbum({
          id: _id[1],
        });

        if (!results) return this.createResponse();

        const _album = results.album as AlbumWithSongsID3;

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
                  this.options.alternateUrl ?? this.options.url,
                  "/app/#/artist",
                  _album.artistId,
                  "/show",
                )
              : this.options.alternateUrl ?? this.options.url,
          },
          tracks: [],
          id: _album.id,
          url: joinURL(
            this.options.alternateUrl ?? this.options.url,
            "/app/#/album",
            _album.id,
            "/show",
          ),
          rawPlaylist: _album,
        });

        if (_album.coverArt) {
          const _coverart = parseURL(
            (
              await this.api.getCoverArt({
                id: _album.coverArt,
              })
            ).url,
          );

          console.log(_coverart);
          if (this.options.alternateUrl) {
            _coverart.host = parseURL(this.options.alternateUrl).host;
          }

          console.log(_coverart);
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
        const results = await this.api.search3({
          query,
          artistCount: 0,
          albumCount: 0,
        });

        if (!results || !results.searchResult3.song?.length)
          return this.createResponse();

        return this.createResponse(
          null,
          await Promise.all(
            results.searchResult3.song.map((song) =>
              this.extractSong(song, context),
            ),
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

    const stream = await this.api.stream({
      id: track.metadata?.id,
      format: "aac",
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

    const results = await this.api.getSimilarSongs2({
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

    const url = song.albumId
      ? joinURL(
          this.options.alternateUrl ?? this.options.url,
          "/app/#/album",
          song.albumId,
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
          await this.api.getCoverArt({
            id: song.coverArt,
          })
        ).url,
      );

      console.log(_coverart);
      if (this.options.alternateUrl) {
        _coverart.host = parseURL(this.options.alternateUrl).host;
      }

      console.log(_coverart);
      track.thumbnail = stringifyParsedURL(_coverart);
    }

    return track;
  }
}
