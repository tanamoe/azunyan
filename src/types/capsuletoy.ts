export interface CapsuleToyCardResponse {
  cards: {
    id: string;
    name: string;
    game: string;
    character: string;
    rarity: string;
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
