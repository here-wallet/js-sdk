import { HereCall, HereStrategy } from "./types";

export type HereProviderSign = {
  network?: string;
  message: string;
  receiver: string;
  nonce: number[];
  type: "sign";
};

export type HereProviderCall = {
  network?: string;
  transactions: HereCall[];
  type: "call";
};

export type HereProviderImport = {
  type: "import";
  keystore: string;
  network?: string;
};

export type HereProviderRequest = HereProviderCall | HereProviderSign | HereProviderImport;

export interface HereProviderOptions extends HereStrategy {
  id?: string;
  request: HereProviderRequest;
  disableCleanupRequest?: boolean;
  strategy?: HereStrategy;
  signal?: AbortSignal;
}

export enum HereProviderStatus {
  APPROVING = 1,
  FAILED = 2,
  SUCCESS = 3,
}

export interface HereProviderResult {
  account_id?: string;
  payload?: string;
  status: HereProviderStatus;
}

export class HereProviderError extends Error {
  constructor(readonly payload?: string, readonly parentError?: Error) {
    super(payload ?? parentError?.message);
  }
}

export type HereProvider = (options: HereProviderOptions) => Promise<HereProviderResult>;
