import { type IntRange } from "./IntRange";
import { hasOwnProperty } from "./hasOwnProperty";

// Token is our type for fungible (ERC-20) tokens. An instance of
// Token represents a token's definition and not a balance denominated
// in that token. For balances, see TokenBalance.
export type Token = Readonly<{
  name: string;
  ticker: Uppercase<string>;
  tickerCanonical?: string; // optional canonical ticker intended to be read by humans. If tickerCanonical is defined, Token renderers should use it over ticker. For example, tickerCanonical can be useful if the human-readable ticker is not all uppercase, and/or if `ticker` is being set to something other than this token's canonical ticker. For example, "USDC.e" is the tickerCanonical and "USDC" the ticker for bridged USDC on Arbitrum, which has the effect of using the actual USDC.e ticker in renderers while handling bridged USDC as ordinary USDC from the perspective of the rest of system
  decimals: IntRange<0, 19>;
  chainId: number;
  contractAddress: `0x${string}`;
  testnet?: true; // true iff this token is on a testnet chain
}>

// NativeCurrency is our type for each chain's native currency, eg.
// ETH for the L1. An instance of NativeCurrency represents a native
// currency's definition and not a balance denominated in that native
// currency. For balances (for both tokens and native currencies), see
// TokenBalance.
export type NativeCurrency = Readonly<{
  name: string;
  ticker: Uppercase<string>;
  tickerCanonical?: string; // optional canonical ticker intended to be read by humans. If tickerCanonical is defined, Token renderers should use it over ticker. For example, tickerCanonical can be useful if the human-readable ticker is not all uppercase, and/or if `ticker` is being set to something other than this token's canonical ticker. For example, "USDC.e" is the tickerCanonical and "USDC" the ticker for bridged USDC on Arbitrum, which has the effect of using the actual USDC.e ticker in renderers while handling bridged USDC as ordinary USDC from the perspective of the rest of system
  decimals: 18; // all EVM chains should implement 18 decimals in their native currencies in order to remain compatible with solidity
  chainId: number;
  contractAddress?: never;
  testnet?: true; // true iff this token is on a testnet chain
}>

// isToken is a TypeScript type guard helper function to match
// `NativeCurrency | Token` into `Token` or `NativeCurrency`
export function isToken(o: NativeCurrency | Token): o is Token {
  return hasOwnProperty(o, "contractAddress");
}

// isNativeCurrency is a TypeScript type guard helper function to match
// `NativeCurrency | Token` into `Token` or `NativeCurrency`
export function isNativeCurrency(o: NativeCurrency | Token): o is NativeCurrency {
  return !isToken(o);
}

// const t: Token = { name: 'Test', ticker: 'T', decimals: 18, chainId: 5, contractAddress: "0x123" };
// const nc: NativeCurrency = { name: 'Test2', ticker: 'T2', decimals: 18, chainId: 5 };
// const fails: NativeCurrency = t;
// const fails2: Token = nc;
