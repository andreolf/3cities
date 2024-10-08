import { caip222StyleSignatureMessageDomain, caip222StyleSignatureMessagePrimaryType, caip222StyleSignatureMessageTypes, chainIdOnWhichToSignMessagesAndVerifySignatures, chainsSupportedBy3cities, convert, convertFromLogicalAssetDecimalsToTokenDecimals, erc1271MagicValue, erc1271SmartAccountAbi, getConfirmationsToWait, getLogicalAssetTickerForTokenOrNativeCurrencyTicker, getSupportedChainName, nativeCurrencies, tokens, type Caip222StyleMessageToSign, type Caip222StyleSignature, type NativeCurrency, type Token } from "@3cities/core";
import { ETHTransferProxyABI, getETHTransferProxyContractAddress } from "@3cities/eth-transfer-proxy";
import { getTransactionConfirmations, getTransactionReceipt, readContract, verifyTypedData, type Config } from "@wagmi/core";
import { erc20Abi, formatUnits, hashTypedData, isHex, parseEventLogs } from "viem";
import { serialize } from "wagmi";

export type TransferVerificationRequest = {
  trusted: { // from the point of view of the verification client (caller), these data are trusted and will be used to verify the untrustedToBeVerified data
    currency: 'USD'; // TODO support more than USD-denominated requests. NB we already support ETH transfer amount verification via usdPerEth, just not ETH-denominated requests
    logicalAssetAmount: bigint; // full-precision logical asset amount denominated in `currency` to expect was successfully transferred in the transfer being verified
    tokenTickerAllowlist: string[]; // allowlist of tokens to permit for a successfully verified transfer. WARNING today, not all supported tokens by 3cities are supported by 3cities on every chain (ie. the matrix of tokens * chains is incomplete), so if a ticker in tokenTickerAllowList is not available on the passed chainId, then any transfers of that token will not be detected and verification will fail as if the transfer never happened. TODO response can include a note of which token tickers were not found on the passed chain id --> TODO should this be Set<Uppercase<string>>? 
    usdPerEth: number; // ETH price in USD exchange rate to be used when verifying logical asset amounts. TODO consider supporting undefined, in which case USD-to-ETH currency conversions can' be verified
    receiverAddress: `0x${string}`; // receiver address on the passed chainId where transfer being verified is expected to have been sent
    externalId?: string; // an optional external ID that may be provided by the client for tracking purposes. Not used by 3cities
  };
  untrustedToBeVerified: { // from the point of view of the verification client (caller), these data are untrusted and will be verified. Verification will be successful if and only if all these untrusted data are proven to be correct and match/correspond to the trusted data. NB as always, the RPC providers used by verification are assumed to be trustworthy - clients are trusting their RPC providers to facilitate verification
    chainId: number; // chainId on which the transfer is being verified
    transactionHash: `0x${string}`; // transaction hash of the transfer being verified
    senderAddress?: `0x${string}` | undefined; // senderAddress whose transfer to receiverAddress is being verified. NB senderAddress must match caip222StyleSignature.message.senderAddress if both are defined. The idea is that senderAddress may optionally be provided without a caip222StyleSignature to verify a transfer without also authenticating the sender
    caip222StyleSignature?: { // a signature to authenticate senderAddress. If defined, the signature will be verified against 3cities's trusted caip222 message schema (domain, types, primaryType). This only proves that the signer of senderAddress provided the signature to the verification client (eg. to securely associate an onchain payment with an offchain order ID) and proves nothing about the transfer being verified
      message: Caip222StyleMessageToSign; // the message to verify was signed. NB caip222StyleSignature.message.senderAddress must match senderAddress if both are defined
      signature: Caip222StyleSignature; // the actual signature to verify matches the message
    } | undefined;
  };
}

type TransferVerificationResult = {
  isVerified: boolean; // true iff the transfer verification was successful
  description: string; // description of verification result. Eg. if success, "0.023 ETH sent on Arbitrum One", if failure, "ChainID 3933 is not supported", "Insufficient confirmations, wanted=2, found=1"
  error?: Error;
  externalId?: string; // an optional external ID that may be provided by the client for tracking purposes. Not used by 3cities
  verificationFailedPermanently?: boolean; // true iff the verification is guaranteed to have failed permanently (eg. due to the transaction having reverted) and should not be retried
  // TODO consider a failureReason enum/structured type to complement `description`
  // TODO consider a structured successData
} & ({
  isVerified: true;
  description: string;
  error?: never;
  externalId?: string;
  verificationFailedPermanently?: never;
} | {
  isVerified: false;
  description: string;
  error?: Error; //  TODO should Error be unconditionally defined when isVerified=false? probably?
  externalId?: string;
  verificationFailedPermanently: boolean;
});

export async function verifyTransfer(params: {
  wagmiConfig: Config,
  req: TransferVerificationRequest,
}): Promise<TransferVerificationResult> {
  const res = await verifyTransferInternal(params);
  return {
    ...res,
    ...(params.req.trusted.externalId && { externalId: params.req.trusted.externalId } satisfies Pick<TransferVerificationResult, 'externalId'>),
  };
}

async function verifyTransferInternal({ wagmiConfig, req }: {
  wagmiConfig: Config,
  req: TransferVerificationRequest,
}): Promise<TransferVerificationResult> {
  const [senderAddress, senderAddressError]: [`0x${string}`, undefined] | [undefined, Error] = (() => {
    const a = req.untrustedToBeVerified.senderAddress;
    const b = req.untrustedToBeVerified.caip222StyleSignature?.message.senderAddress;
    if (a && b && a.toLowerCase() !== b.toLowerCase()) return [undefined, Error(`Sender address input mismatch: senderAddress=${a} and caip222StyleSignature.message.senderAddress=${b} are not equal`)];
    else {
      const c = a || b;
      if (!c) return [undefined, Error(`Sender address input missing: either senderAddress or caip222StyleSignature.message.senderAddress must be provided`)];
      else return [c, undefined];
    }
  })();

  const confirmationsToWait: number | undefined = getConfirmationsToWait(req.untrustedToBeVerified.chainId);

  if (senderAddressError) return {
    isVerified: false,
    description: `Invalid request: sender address error`,
    error: senderAddressError,
    verificationFailedPermanently: true,
  }; else if (chainsSupportedBy3cities.find(c => c.id === req.untrustedToBeVerified.chainId) === undefined) return {
    isVerified: false,
    description: `Chain ID ${req.untrustedToBeVerified.chainId} is unsupported by 3cities`,
    verificationFailedPermanently: false, // NB verification has not necessarily failed permanently as 3cities might be update to support this chain ID
  }; else if (confirmationsToWait === undefined) return {
    isVerified: false,
    description: `Chain ID ${req.untrustedToBeVerified.chainId} had undefined confirmationsToWait. This is a bug in 3cities`,
    verificationFailedPermanently: false,
  }; else {
    const getTransactionReceiptPromise = getTransactionReceipt(wagmiConfig, { hash: req.untrustedToBeVerified.transactionHash, chainId: req.untrustedToBeVerified.chainId });
    const getTransactionConfirmationsPromise = getTransactionConfirmations(wagmiConfig, { hash: req.untrustedToBeVerified.transactionHash, chainId: req.untrustedToBeVerified.chainId });
    const verifyTypedDataPromise: Promise<boolean> | undefined = req.untrustedToBeVerified.caip222StyleSignature && isHex(req.untrustedToBeVerified.caip222StyleSignature.signature) ? verifyTypedData(wagmiConfig, {
      chainId: chainIdOnWhichToSignMessagesAndVerifySignatures,
      address: req.untrustedToBeVerified.caip222StyleSignature.message.senderAddress,
      domain: caip222StyleSignatureMessageDomain,
      types: caip222StyleSignatureMessageTypes,
      primaryType: caip222StyleSignatureMessagePrimaryType,
      message: req.untrustedToBeVerified.caip222StyleSignature.message,
      signature: req.untrustedToBeVerified.caip222StyleSignature.signature,
    }) : undefined;

    const eip1271ChainId: number | undefined = req.untrustedToBeVerified.caip222StyleSignature && !isHex(req.untrustedToBeVerified.caip222StyleSignature.signature) ? parseInt(req.untrustedToBeVerified.caip222StyleSignature.signature.split('eip1271-chainId-')[1] || '') : undefined;
    const eip1271IsValidSignaturePromise = req.untrustedToBeVerified.caip222StyleSignature && eip1271ChainId && !isNaN(eip1271ChainId) ? readContract(wagmiConfig, { // NB here we know that caip222StyleSignature is defined if eip1271ChainId is defined, but the typescript compiler doesn't
      abi: erc1271SmartAccountAbi,
      chainId: eip1271ChainId,
      address: req.untrustedToBeVerified.caip222StyleSignature.message.senderAddress,
      functionName: 'isValidSignature',
      args: [hashTypedData({
        domain: caip222StyleSignatureMessageDomain,
        types: caip222StyleSignatureMessageTypes,
        primaryType: caip222StyleSignatureMessagePrimaryType,
        message: req.untrustedToBeVerified.caip222StyleSignature.message,
      }), '0x'],
    }) : undefined;

    // TODO consider adding a IEFE where the return type has zero or exactly one of verifyTypedDataPromise xor eip1271IsValidSignaturePromise defined

    const [tx, getTransactionReceiptError]: [Awaited<ReturnType<typeof getTransactionReceipt>>, undefined] | [undefined, Error] = await (async () => {
      try {
        return [await getTransactionReceiptPromise, undefined];
      } catch (e) {
        return [undefined, Error(`Failed to get transaction receipt hash=${req.untrustedToBeVerified.transactionHash} chainId=${req.untrustedToBeVerified.chainId}`, { cause: e })];
      }
    })();

    const [txConfirmations, getTransactionConfirmationsError]: [Awaited<ReturnType<typeof getTransactionConfirmations>>, undefined] | [undefined, Error] = await (async () => {
      try {
        return [await getTransactionConfirmationsPromise, undefined];
      } catch (e) {
        return [undefined, Error(`Failed to get transaction confirmations hash=${req.untrustedToBeVerified.transactionHash} chainId=${req.untrustedToBeVerified.chainId}`, { cause: e })];
      }
    })();

    const [verifyTypedDataIsVerified, verifyTypedDataError]: [Awaited<ReturnType<typeof verifyTypedData>> | undefined, undefined] | [undefined, Error] = await (async () => {
      try {
        return [await verifyTypedDataPromise, undefined];
      } catch (e) {
        return [undefined, Error(`Failed to verify caip222-style typed data. tx hash=${req.untrustedToBeVerified.transactionHash} chainId=${req.untrustedToBeVerified.chainId} caip222=${JSON.stringify(req.untrustedToBeVerified.caip222StyleSignature)}`, { cause: e })];
      }
    })();

    const [eip1271SignatureIsVerified, eip1271SignatureVerificationError]: [Awaited<ReturnType<typeof verifyTypedData>> | undefined, undefined] | [undefined, Error] = await (async () => {
      try {
        const v = await eip1271IsValidSignaturePromise;
        return [v === undefined ? undefined : v === erc1271MagicValue, undefined];
      } catch (e) {
        return [undefined, Error(`Failed to verify caip222-style eip1271 signature. tx hash=${req.untrustedToBeVerified.transactionHash} chainId=${req.untrustedToBeVerified.chainId} caip222=${JSON.stringify(req.untrustedToBeVerified.caip222StyleSignature)} eip1271ChainId=${eip1271ChainId}`, { cause: e })];
      }
    })();

    if (getTransactionReceiptError) return {
      isVerified: false,
      description: `Failed to get transaction receipt hash=${req.untrustedToBeVerified.transactionHash} chainId=${req.untrustedToBeVerified.chainId}`,
      error: getTransactionReceiptError,
      verificationFailedPermanently: false,
    }; else if (getTransactionConfirmationsError) return {
      isVerified: false,
      description: `Failed to get transaction confirmations hash=${req.untrustedToBeVerified.transactionHash} chainId=${req.untrustedToBeVerified.chainId}`,
      verificationFailedPermanently: false,
      error: getTransactionConfirmationsError,
    }; else if (tx.status !== 'success') return {
      isVerified: false,
      description: `Transaction reverted`,
      verificationFailedPermanently: true,
    }; else if (txConfirmations < confirmationsToWait) return {
      isVerified: false,
      description: `Transaction has insufficient confirmations, wanted=${confirmationsToWait}, found=${txConfirmations}`,
      verificationFailedPermanently: false,
    }; else if (verifyTypedDataError) return {
      isVerified: false,
      description: `caip222-style non-eip1271 signature verification error: ${verifyTypedDataError}`,
      error: verifyTypedDataError,
      verificationFailedPermanently: false,
    }; else if (verifyTypedDataIsVerified === false) return { // NB verifyTypedDataIsVerified will be undefined if signature verification by this method is disabled
      isVerified: false,
      description: `caip222-style non-eip1271 signature verification failed`,
      verificationFailedPermanently: true,
    }; else if (eip1271SignatureVerificationError) return {
      isVerified: false,
      description: `caip222-style eip1271 signature verification error: ${eip1271SignatureVerificationError}`,
      error: eip1271SignatureVerificationError,
      verificationFailedPermanently: false,
    }; else if (eip1271SignatureIsVerified === false) return { // NB eip1271SignatureIsVerified will be undefined if signature verification by this method is disabled
      isVerified: false,
      description: `caip222-style eip1271 signature verification failed`,
      verificationFailedPermanently: true,
    }; else {
      const ethTransferProxyContractAddress = getETHTransferProxyContractAddress(req.untrustedToBeVerified.chainId); // NB if ethTransferProxyContractAddress is undefined, then this chain does not support verifiable ETH transfers

      const ethTransferProxyLogs = ethTransferProxyContractAddress ? parseEventLogs({
        abi: ETHTransferProxyABI,
        eventName: 'Transfer',
        logs: tx.logs,
      }).filter(l => l.address.toLowerCase() === ethTransferProxyContractAddress.toLowerCase()) : [];

      const tokensAllowedOnThisChain = tokens.filter(t => t.chainId === req.untrustedToBeVerified.chainId).filter(t => req.trusted.tokenTickerAllowlist.map(tt => tt.toLowerCase()).includes(t.ticker.toLowerCase()));

      const erc20TransferLogs = parseEventLogs({
        abi: erc20Abi,
        eventName: 'Transfer',
        logs: tx.logs,
      }).filter(l => tokensAllowedOnThisChain.map(t => t.contractAddress.toLowerCase()).includes(l.address.toLowerCase())); // verify transferred token is permitted

      const logVerificationErrors: Error[] = [];
      let successTokenForLog: Token | NativeCurrency | undefined;
      let successTokenAmountForLog: bigint | undefined = undefined;
      const successfullyVerifiedLogs = [...ethTransferProxyLogs, ...erc20TransferLogs] // at this point, we know that any ethTransferProxyLogs come from the authentic proxy contract (and so any native currency transfers routed through this proxy are potentially verifiable) and we know that any erc20TransferLogs come from permitted tokens (and so any erc20 transfers on these tokens are potentially verifiable). Now we will verify specific transaction details that are common to both eth proxy transfers and eerc20 transfers. If details are good, the transfer will have been successfully verified
        .filter(l => l.transactionHash.toLowerCase() === req.untrustedToBeVerified.transactionHash.toLowerCase()) // verify Transfer log corresponds to transactionHash to be verified
        .filter(l => l.args.from.toLowerCase() === senderAddress.toLowerCase()) // verify Transfer came from expected senderAddress
        .filter(l => l.args.to.toLowerCase() === req.trusted.receiverAddress.toLowerCase()) // verify Transfer was send to expected receiverAddress
        .filter(l => {
          // for successful verification, all that remains is to verify that log matches the expected transfer amounts
          let tempSuccessTokenForLog: Token | NativeCurrency | undefined;
          switch (req.trusted.currency) {
            case 'USD': { // TODO support more req.trusted.currency than just 'USD'
              const expectedUsdAmountInFullPrecisionLogicalAssetUnits = req.trusted.logicalAssetAmount;
              const [expectedUsdAmountWithTransferDecimals, expectedUsdAmountWithTransferDecimalsError]: [bigint, undefined] | [undefined, Error] = (() => {
                if (ethTransferProxyContractAddress && l.address.toLowerCase() === ethTransferProxyContractAddress.toLowerCase()) {
                  // native currency transfer
                  const nc = nativeCurrencies.find(nc2 => nc2.chainId === req.untrustedToBeVerified.chainId);
                  if (!nc) return [undefined, Error(`unexpected: native currency not found chainId=${req.untrustedToBeVerified.chainId}`)];
                  else {
                    tempSuccessTokenForLog = nc;
                    return [convertFromLogicalAssetDecimalsToTokenDecimals(expectedUsdAmountInFullPrecisionLogicalAssetUnits, nc.decimals), undefined];
                  }
                } else {
                  // erc20 transfer
                  const t = tokens.find(t2 => t2.contractAddress.toLowerCase() === l.address.toLowerCase());
                  if (!t) return [undefined, Error(`unexpected: token not found when converting transfer amount decimals contractAddress=${l.address}`)];
                  else {
                    tempSuccessTokenForLog = t;
                    return [convertFromLogicalAssetDecimalsToTokenDecimals(expectedUsdAmountInFullPrecisionLogicalAssetUnits, t.decimals), undefined];
                  }
                }
              })();
              if (expectedUsdAmountWithTransferDecimalsError) {
                logVerificationErrors.push(expectedUsdAmountWithTransferDecimalsError);
                return false;
              } else {
                // at this point, the trusted expected amount has been securely converted into the untrusted transfer amount's decimals, but we haven't yet verified they are denominated in the same currency (ETH vs USD). We'll do so using our standard exchange rate conversion facilitiates

                const [toLogicalAssetTicker, toLogicalAssetTickerError]: [Uppercase<string>, undefined] | [undefined, Error] = (() => { // NB since our strategy is to securely convert the expected amount into the actual amount and then compare the "computed expected actual" with "actual", we know that fromTicker in the currency conversion below is always USD because this is a USD-denominated request, and so here we compute toTicker by determining the currency of the actual transfer
                  if (ethTransferProxyContractAddress && l.address.toLocaleLowerCase() === ethTransferProxyContractAddress.toLowerCase()) return ['ETH', undefined];
                  else {
                    const t = tokens.find(t2 => t2.contractAddress.toLowerCase() === l.address.toLowerCase());
                    if (!t) return [undefined, Error(`unexpected: token not found when computing exchange rate conversion toTicker contractAddress=${l.address}`)];
                    else {
                      const lat = getLogicalAssetTickerForTokenOrNativeCurrencyTicker(t.ticker);
                      if (!lat) return [undefined, Error(`unexpected: logical asset ticker not found for token ticker=${t.ticker}`)];
                      else return [lat, undefined];
                    }
                  }
                })();
                if (toLogicalAssetTickerError) {
                  logVerificationErrors.push(toLogicalAssetTickerError);
                  return false;
                } else {
                  const convertParams = {
                    er: { 'ETH': { 'USD': req.trusted.usdPerEth }, },
                    fromTicker: 'USD', // NB since our strategy is to securely convert the expected amount into the actual amount and then compare the "computed expected actual" with "actual", here the fromTicker is always USD as this is a USD-denominated request
                    toTicker: toLogicalAssetTicker,
                    fromAmount: expectedUsdAmountWithTransferDecimals,
                  } as const;
                  const expectedAmountWithTransferDecimalsAndCurrency = convert(convertParams);

                  if (expectedAmountWithTransferDecimalsAndCurrency === undefined) {
                    logVerificationErrors.push(Error(`unexpected: expectedAmountWithTransferDecimalsAndCurrency is undefined after currency conversion with params=${serialize(convertParams)}`)); // NB we mustn't use JSON.stringy as params contains a bigint
                    return false;
                  } else {
                    const amountsMatch = expectedAmountWithTransferDecimalsAndCurrency === l.args.value; // NB it might be that there is ordinary imprecision in expected vs actual amounts due to bigint truncations when dividing and/or floating point precision errors in the passed usdPerEth. If in production we observe imprecision leading to verification failures, then we can add a plus-or-minus tolerance here (eg. 0.01%) and any pending verifications should then succeed
                    if (amountsMatch) {
                      successTokenForLog = tempSuccessTokenForLog;
                      successTokenAmountForLog = l.args.value;
                    } else logVerificationErrors.push(Error(`Transfer amount mismatch: expected=${expectedAmountWithTransferDecimalsAndCurrency}, actual=${l.args.value}`));
                    return amountsMatch;
                  }
                }
              }
            }
          }
        });

      if (logVerificationErrors.length > 0) return {
        isVerified: false,
        description: `Transfer amount verification error(s): ${logVerificationErrors.map(e => e.message).join('; ')}`,
        error: new Error(`Transfer amount verification error(s): ${logVerificationErrors.map(e => e.message).join('; ')}`),
        verificationFailedPermanently: true,
      }; else if (successfullyVerifiedLogs.length < 1) return {
        isVerified: false,
        description: `Transaction contained no satisfactory asset transfer`,
        verificationFailedPermanently: true,
      }; else {
        const verificationSuccessReport = {
          senderAddress,
          tokenTicker: successTokenForLog?.ticker,
          chainName: successTokenForLog ? getSupportedChainName(successTokenForLog?.chainId) : undefined,
          tokenAmount: successTokenForLog && successTokenAmountForLog !== undefined ? formatUnits(successTokenAmountForLog, successTokenForLog.decimals) : undefined,
          txConfirmations: Number(txConfirmations),
          confirmationsToWait,
          verifyTypedDataIsVerified,
          eip1271SignatureIsVerified,
          eip1271ChainId,
          successfullyVerifiedLogs,
          // Some fields we comment out as they are redundant or may greatly increase the size of the success report:
          // txStatus: tx.status,
          // caip222StyleSignature: req.untrustedToBeVerified.caip222StyleSignature,
          // rawLogs: tx.logs,
          // ethTransferProxyLogs,
          // erc20TransferLogs,
          // tokensAllowedOnThisChain,
          // ethTransferProxyContractAddress,
        };
        const res: TransferVerificationResult = {
          isVerified: true,
          description: `Verification successful. ${verificationSuccessReport.tokenAmount} ${verificationSuccessReport.tokenTicker} sent on ${verificationSuccessReport.chainName}. Details: ${serialize(verificationSuccessReport)}`,
        };
        return res;
      }
    }
  }
}
