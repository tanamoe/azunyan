export interface CapsuleToyCardResponse {
  cards: {
    id: string;
    name: string;
    game: string;
    character?: string;
    rarity?: string;
    path: string;
    imageUrl: string;
    thumbnailUrl?: string;
  };
  characters: {
    id: string;
    name: string;
    baseGame: string;
    path: string;
  };
  games: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string;
  };
}

export interface CapsuleToyCardStats {
  total: number;
  games: {
    name: string;
    slug: string;
    count: number;
  }[];
  characters: {
    name: string;
    slug: string;
    game: string;
    count: number;
  }[];
}
