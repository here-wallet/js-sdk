import { HereWalletState } from "./state";
import { Strategy } from "./strategy";

export interface ProviderOptions extends Strategy {
  state: HereWalletState;
  args: Record<string, string>;
  strategy?: Strategy;
}

export enum HereProviderStatus {
  APPROVING = 1,
  FAILED = 2,
  SUCCESS = 3,
  REJECT = 4,
}

export interface HereProviderResult {
  account_id: string;
  payload?: string;
  status: HereProviderStatus;
}

export type HereProvider = (options: ProviderOptions) => Promise<HereProviderResult>;
