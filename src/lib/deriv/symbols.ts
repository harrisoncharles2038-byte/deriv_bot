export interface DerivSymbol {
  code: string;
  name: string;
}

export const DERIV_SYMBOLS: DerivSymbol[] = [
  { code: "R_10", name: "Volatility 10 Index" },
  { code: "R_25", name: "Volatility 25 Index" },
  { code: "R_50", name: "Volatility 50 Index" },
  { code: "R_75", name: "Volatility 75 Index" },
  { code: "R_100", name: "Volatility 100 Index" },
  { code: "1HZ10V", name: "Volatility 10 (1s) Index" },
  { code: "1HZ25V", name: "Volatility 25 (1s) Index" },
  { code: "1HZ50V", name: "Volatility 50 (1s) Index" },
  { code: "1HZ75V", name: "Volatility 75 (1s) Index" },
  { code: "1HZ100V", name: "Volatility 100 (1s) Index" },
];

export function isOneSecondIndex(code: string): boolean {
  return code.startsWith("1HZ");
}