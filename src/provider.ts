import { HereStrategy } from "./strategy";

export interface HereProviderOptions extends HereStrategy {
  id?: string;
  network: string;
  signal?: AbortSignal;
  args: Record<string, string>;
  strategy?: HereStrategy;
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
