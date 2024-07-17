/**
 * FxTiktok response types.
 *
 * @see https://github.com/okdargy/fxTikTok/blob/hono-rewrite/src/types/Web.ts
 */
export interface FxTikTokResponse {
  id: string;
  desc: string;
  createTime: string;
  scheduleTime: number;
  video: Video;
  author: Author;
  music: Music;
  challenges: Challenge[];
  stats: Stats;
  statsV2: StatsV2;
  warnInfo: unknown[];
  originalItem: boolean;
  officalItem: boolean;
  textExtra: TextExtra[];
  secret: boolean;
  forFriend: boolean;
  digged: boolean;
  itemCommentStatus: number;
  takeDown: number;
  effectStickers: unknown[];
  privateItem: boolean;
  stickersOnItem: unknown[];
  shareEnabled: boolean;
  comments: unknown[];
  duetDisplay: number;
  stitchDisplay: number;
  imagePost: ImagePost;
  locationCreated: string;
  suggestedWords: unknown[];
  contents: Content[];
  collected: boolean;
  channelTags: unknown[];
  item_control: ItemControl;
  IsAigc: boolean;
  AIGCDescription: string;
}

export interface Video {
  id: string;
  height: number;
  width: number;
  duration: number;
  ratio: string;
  cover: string;
  originCover: string;
  dynamicCover: string;
  playAddr: string;
  downloadAddr: string;
  shareCover: string[];
  reflowCover: string;
  zoomCover: ZoomCover;
}

export interface ZoomCover {
  "240": string;
  "480": string;
  "720": string;
  "960": string;
}

export interface Author {
  id: string;
  shortId: string;
  uniqueId: string;
  nickname: string;
  avatarLarger: string;
  avatarMedium: string;
  avatarThumb: string;
  signature: string;
  createTime: number;
  verified: boolean;
  secUid: string;
  ftc: boolean;
  relation: number;
  openFavorite: boolean;
  commentSetting: number;
  duetSetting: number;
  stitchSetting: number;
  privateAccount: boolean;
  secret: boolean;
  isADVirtual: boolean;
  roomId: string;
  uniqueIdModifyTime: number;
  ttSeller: boolean;
  downloadSetting: number;
  recommendReason: string;
  nowInvitationCardUrl: string;
  nickNameModifyTime: number;
  isEmbedBanned: boolean;
  canExpPlaylist: boolean;
  suggestAccountBind: boolean;
}

export interface Music {
  id: string;
  title: string;
  playUrl: string;
  coverLarge: string;
  coverMedium: string;
  coverThumb: string;
  authorName: string;
  original: boolean;
  duration: number;
  album: string;
  scheduleSearchTime: number;
  collected: boolean;
  preciseDuration: PreciseDuration;
}

export interface PreciseDuration {
  preciseDuration: number;
  preciseShootDuration: number;
  preciseAuditionDuration: number;
  preciseVideoDuration: number;
}

export interface Challenge {
  id: string;
  title: string;
  desc: string;
  profileLarger: string;
  profileMedium: string;
  profileThumb: string;
  coverLarger: string;
  coverMedium: string;
  coverThumb: string;
}

export interface Stats {
  diggCount: number;
  shareCount: number;
  commentCount: number;
  playCount: number;
  collectCount: string;
}

export interface StatsV2 {
  diggCount: string;
  shareCount: string;
  commentCount: string;
  playCount: string;
  collectCount: string;
  repostCount: string;
}

export interface TextExtra {
  awemeId: string;
  start: number;
  end: number;
  hashtagId?: string;
  hashtagName: string;
  type: number;
  subType: number;
  isCommerce: boolean;
  userId?: string;
  userUniqueId?: string;
  secUid?: string;
}

export interface ImagePost {
  images: Image[];
  cover: Cover;
  shareCover: ShareCover;
  title: string;
}

export interface Image {
  imageURL: ImageUrl;
  imageWidth: number;
  imageHeight: number;
}

export interface ImageUrl {
  urlList: string[];
}

export interface Cover {
  imageURL: ImageUrl2;
  imageWidth: number;
  imageHeight: number;
}

export interface ImageUrl2 {
  urlList: string[];
}

export interface ShareCover {
  imageURL: ImageUrl3;
  imageWidth: number;
  imageHeight: number;
}

export interface ImageUrl3 {
  urlList: string[];
}

export interface Content {
  desc: string;
  textExtra: TextExtra2[];
}

export interface TextExtra2 {
  awemeId: string;
  start: number;
  end: number;
  hashtagId?: string;
  hashtagName: string;
  type: number;
  subType: number;
  isCommerce: boolean;
  userId?: string;
  userUniqueId?: string;
  secUid?: string;
}

export type ItemControl = unknown;
