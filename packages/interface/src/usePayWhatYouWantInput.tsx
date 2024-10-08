import { parseLogicalAssetAmount } from "@3cities/core";
import React, { useMemo, useState } from "react";
import { type PayWhatYouWant } from "./Payment";
import { ToggleSwitch } from "./ToggleSwitch";
import { flatMap } from "./flatMap";
import { useInput } from "./useInput";

// TODO consider converting usePayWhatYouWantInput into the
// PayWhatYouWantInput component so that client aren't forced to
// rerender on any state update internal to usePayWhatYouWantInput.

const useInputOpts = {
  onEnterKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => e.currentTarget.blur(),
}

// usePayWhatYouWantInput returns a PayWhatYouWant input element as well
// as the computed PayWhatYouWant currently produced by this input
// element. This is the 3cities canonical UX for constructing
// PayWhatYouWant. 
export function usePayWhatYouWantInput(inputId: string): {
  payWhatYouWant: PayWhatYouWant;
  payWhatYouWantInputElement: JSX.Element;
} {
  const useInputHtmlAttrs = useMemo(() => {
    return {
      id: inputId,
      className: 'w-full rounded-md border px-3.5 py-2',
      type: 'text',
      placeholder: 'Amounts suggested to sender (optional, csv)',
      autoComplete: "off",
    };
  }, [inputId]);

  const [rawSuggestedLogicalAssetAmounts, suggestedLogicalAssetAmountsInputElement] = useInput('', useInputHtmlAttrs, useInputOpts);

  const suggestedLogicalAssetAmounts: bigint[] = useMemo(() => Array.from(new Set(flatMap(rawSuggestedLogicalAssetAmounts.split(','), a => {
    try {
      return parseLogicalAssetAmount(a);
    } catch {
      return undefined;
    }
  }))).sort((a, b) => (a > b) ? 1 : (a < b) ? -1 : 0) // ascending order so that smaller suggested amounts appear first
    .filter(a => a > 0n), // NB we don't currently support checking out for a zero amount, so we'll disallow a suggestion of 0
    [rawSuggestedLogicalAssetAmounts]);

  const [isDynamicPricingEnabled, setIsDynamicPricingEnabled] = useState(true);

  const payWhatYouWant = useMemo((): PayWhatYouWant => {
    return {
      isDynamicPricingEnabled,
      canPayAnyAsset: false, // TODO support canPayAnyAsset
      suggestedLogicalAssetAmounts,
    };
  }, [suggestedLogicalAssetAmounts, isDynamicPricingEnabled]);

  const payWhatYouWantInputElement = useMemo((): JSX.Element => {
    return <div className="w-full flex flex-col gap-4 items-center">
      <div className="w-full flex flex-col gap-2 items-center">
        <span className="w-full font-semibold">Suggested Amounts</span>
        {suggestedLogicalAssetAmountsInputElement}
      </div>
      <div className="w-full flex justify-between items-center">
        <span className="grow font-semibold">Auto upsell suggested amounts</span>
        <ToggleSwitch initialIsOn={isDynamicPricingEnabled} onToggle={setIsDynamicPricingEnabled} offClassName="text-gray-500" className="font-bold text-2xl" />
      </div>
    </div>;
  }, [suggestedLogicalAssetAmountsInputElement, isDynamicPricingEnabled, setIsDynamicPricingEnabled]);

  const ret = useMemo((): ReturnType<typeof usePayWhatYouWantInput> => {
    return {
      payWhatYouWant,
      payWhatYouWantInputElement,
    };
  }, [payWhatYouWant, payWhatYouWantInputElement]);

  return ret;
}
