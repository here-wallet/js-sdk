import { NetworkId } from "@near-wallet-selector/core";
import { Strategy } from "./strategy";

export interface HereProviderOptions extends Strategy {
  id?: string;
  network: NetworkId;
  signal?: AbortSignal;
  args: Record<string, string>;
  strategy?: Strategy;
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
