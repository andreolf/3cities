import { type NativeCurrency, type Token, getDecimalsToRenderForTokenTicker, getDefaultTruncateTrailingZeroesForTokenTicker, getSupportedChainName } from "@3cities/core";
import React from "react";
import { formatUnits } from "viem";
import { type FormatFloatOpts, formatFloat } from "./formatFloat";

export type RenderRawTokenBalanceProps = {
  balance: bigint | undefined; // token balance to render WARNING must be denominated in full-precision units of the passed nativeCurrencyOrToken
  nativeCurrencyOrToken: NativeCurrency | Token; // native currency or token to render
  opts?: {
    hideAmount?: true; // iff true, the amount won't be rendered.
    hideTicker?: true; // iff true, the ticker won't be rendered.
    hideChainSeparator?: true; // iff true, the separator between the ticker and chain won't be rendered (ie hides the word "on").
    hideChain?: true; // iff true, the chain won't be rendered.
    truncateTrailingZeroes?: boolean; // iff true, any zeroes (after the decimal point AND after the last significant digit that wasn't rounded) will be truncated. Iff undefined, the passed ticker's default truncateTrailingZeroes will be used.
  }
}

// RenderRawTokenBalance is a referentially transparent component that
// owns the definition of a canonical render of one token balance. The
// inputs to RenderRawTokenBalance are low-level and are expected to be
// used by intermediate utility components and not by end-clients.
export const RenderRawTokenBalance: React.FC<RenderRawTokenBalanceProps> = ({ balance, nativeCurrencyOrToken, opts }) => {
  const decimals = nativeCurrencyOrToken.decimals;
  const chainName = getSupportedChainName(nativeCurrencyOrToken.chainId);
  const formatFloatOpts: FormatFloatOpts = {
    truncateTrailingZeroes: opts?.truncateTrailingZeroes !== undefined ? opts.truncateTrailingZeroes : getDefaultTruncateTrailingZeroesForTokenTicker(nativeCurrencyOrToken.ticker),
  };
  return <span>{balance !== undefined && opts?.hideAmount !== true ? formatFloat(formatUnits(balance, decimals), getDecimalsToRenderForTokenTicker(nativeCurrencyOrToken.ticker), formatFloatOpts) : '?'}{opts?.hideTicker !== true && ` ${nativeCurrencyOrToken.tickerCanonical || nativeCurrencyOrToken.ticker}`}{opts?.hideChainSeparator !== true && ' on'}{opts?.hideChain !== true && ` ${chainName}`}</span>;
}
