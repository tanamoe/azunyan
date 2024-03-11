export type TCBExchangeRate = {
  id: number;
  buy: null;
  sell: null;
  transfer: null;
  currency: null;
  date: null;
  dataID: string;
  inputDate: string;
  inputTime: string;
  spotRate: {
    id: number;
    label: string;
    bidRateTM: number;
    bidRateCK: number;
    askRate: number;
    sourceCurrency: string;
    targetCurrency: "VND";
    askRateTM: number;
  }[];
}[];
