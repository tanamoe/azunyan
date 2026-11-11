export interface MastercardConversionRates {
  data: MastercardConversionRate;
}

export interface MastercardConversionRate {
  conversionRate: string;
  crdhldBillAmt: string;
  crdhldBillCurr: string;
  fxDate: string;
  transAmt: string;
  transCurr: string;
}
