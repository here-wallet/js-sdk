import { HereCall, HereStrategy, SignMessageOptionsLegacy, SignMessageOptionsNEP0413 } from "./types";

export type SelectorType = { id?: string; type?: string };
export type HereProviderSign =
  | ({ network?: string; type: "sign"; selector?: SelectorType } & SignMessageOptionsLegacy)
  | {
      network?: string;
      type: "sign";
      nonce: number[];
      message: string;
      recipient: string;
      selector: SelectorType;
    };

export type HereProviderCall = {
  network?: string;
  transactions: HereCall[];
  type: "call";
  selector: SelectorType;
};

export type HereProviderImport = {
  type: "import";
  keystore: string;
  network?: string;
  selector: SelectorType;
};

export type HereProviderKeypom = {
  type: "keypom";
  contract: string;
  secret: string;
  selector: SelectorType;
};

export type HereProviderRequest = HereProviderCall | HereProviderSign | HereProviderImport | HereProviderKeypom;

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
  type: string;
  path?: string;
  public_key?: string;
  account_id?: string;
  payload?: string;
  topic?: string;
  status: HereProviderStatus;
}

export class HereProviderError extends Error {
  constructor(readonly payload?: string, readonly parentError?: Error) {
    super(payload ?? parentError?.message);
  }
}

export type HereProvider = (options: HereProviderOptions) => Promise<HereProviderResult>;
