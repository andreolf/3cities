import React from "react";
import { Outlet } from "react-router-dom";
import { ConnectWalletButtonCustom } from "./ConnectWalletButton";
import { useActiveDemoAccount } from "./useActiveDemoAccount";
import { useAccount, useDisconnect } from "wagmi";

function ConversionHeader() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const activeDemoAccount: string | undefined = useActiveDemoAccount();
  return (
    <header className="relative bg-quaternary p-5 min-h-[80px] flex items-center">
      <div className="mx-auto flex w-full max-w-screen-lg items-center justify-between">
        <div className="flex flex-1 items-center justify-end gap-8">
          <div className="max-sm:min-w-[46vw] max-sm:max-w-48 sm:w-48 relative">
            <ConnectWalletButtonCustom
              disconnectedLabel=""
              hideIfDisconnected={true}
              className="rounded-md px-3.5 py-2 text-xs font-medium bg-white sm:enabled:hover:bg-gray-200 focus:outline-none enabled:active:scale-95 w-full"
              disabledClassName="text-quaternary-darker pointer-events-none"
              enabledClassName="text-quaternary"
              loadingSpinnerClassName="text-quaternary-darker fill-white"
            />
            {activeDemoAccount && <div className="absolute top-[-1.5em] right-1/2 transform translate-x-1/2 whitespace-nowrap z-1 text-black text-sm">demo account</div>}
            {address && <button onClick={() => disconnect()} className="absolute bottom-[-1.64em] right-1/2 transform translate-x-1/2 whitespace-nowrap z-1 text-gray-800 rounded-md px-3.5 py-0 text-xs font-medium  sm:enabled:hover:bg-gray-100 focus:outline-none enabled:active:scale-95">change wallet</button>}
          </div>
        </div>
      </div>
    </header>
  );
}

export const ConversionWrapper = () => {
  return <ConversionWrapperWithChildren>
    <Outlet />
  </ConversionWrapperWithChildren>;
};

type ConversionWrapperWithChildrenProps = {
  children?: React.ReactNode;
}

export const ConversionWrapperWithChildren: React.FC<ConversionWrapperWithChildrenProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col text-black">
      <ConversionHeader />
      <div className="grow flex flex-col items-center justify-start bg-gray-100">
        <div className="w-full max-w-sm overflow-hidden px-5 pb-5">
          {children}
        </div>
      </div>
    </div>
  );
};
