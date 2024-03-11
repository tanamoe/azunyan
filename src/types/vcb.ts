export type VCBExchangeRate = {
  Count: number;
  Date: string;
  UpdatedDate: string;
  Data: {
    currencyName: string;
    currencyCode: string;
    cash: string;
    transfer: string;
    sell: string;
    icon: string;
  }[];
};
