import type {
  SignInParams,
  WalletBehaviourFactory,
  Account,
  FinalExecutionOutcome,
  Network,
} from "@near-wallet-selector/core";
import {
  InjectedWallet,
  SignAndSendTransactionParams,
  SignAndSendTransactionsParams,
} from "@near-wallet-selector/core/lib/wallet";
import { Signature } from "near-api-js/lib/utils/key_pair";
import { connect, keyStores, WalletConnection } from "near-api-js";
import BN from "bn.js";

import { Strategy } from "./strategy";
import { HereProvider } from "./provider";

export interface HereConfiguration {
  hereConnector: string;
  hereContract: string;
  download: string;
}

export const hereConfigurations: Record<string, HereConfiguration> = {
  mainnet: {
    hereConnector: "https://web.herewallet.app",
    hereContract: "storage.herewallet.near",
    download: "https://appstore.herewallet.app/selector",
  },
  testnet: {
    hereConnector: "https://web.testnet.herewallet.app",
    hereContract: "storage.herewallet.testnet",
    download: "https://testflight.apple.com/join/LwvGXAK8",
  },
};

export interface HereAsyncOptions extends Strategy {
  signal?: AbortSignal;
  strategy?: Strategy;
}

export type HereWallet = InjectedWallet & {
  getHereBalance: () => Promise<BN>;
  getAvailableBalance: () => Promise<BN>;
  signMessage: (data: { message: Uint8Array; signerId: string }) => Promise<Signature>;
  signIn: (data: SignInParams & HereAsyncOptions) => Promise<Array<Account>>;
  signAndSendTransaction: (data: SignAndSendTransactionParams & HereAsyncOptions) => Promise<FinalExecutionOutcome>;
  signAndSendTransactions: (
    data: SignAndSendTransactionsParams & HereAsyncOptions
  ) => Promise<Array<FinalExecutionOutcome>>;
};

export interface HereWalletState extends HereConfiguration {
  wallet: WalletConnection;
  keyStore: keyStores.BrowserLocalStorageKeyStore;
}

export type SelectorInit = WalletBehaviourFactory<
  HereWallet,
  {
    configuration: HereConfiguration;
    hereProvider: HereProvider;
    strategy: () => Strategy;
  }
>;

export const setupWalletState = async (config: HereConfiguration, network: Network): Promise<HereWalletState> => {
  const keyStore = new keyStores.BrowserLocalStorageKeyStore();
  const near = await connect({
    keyStore,
    walletUrl: config.hereConnector,
    headers: {},
    ...network,
  });

  const wallet = new WalletConnection(near, "here_app");
  return { wallet, keyStore, ...config };
};
