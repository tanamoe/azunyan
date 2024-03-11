export type ACBExchangeRate = {
  currency: string;
  exchangeCurrency: string;
  exchangeRate: number;
  dealType: "BID" | "ASK";
  instrumentType: "CASH" | "TRANSFER";
  maxSequence: number;
  denomination: number;
}[];
