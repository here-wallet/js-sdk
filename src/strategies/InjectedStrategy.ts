import uuid4 from "uuid4";
import { KeyPairEd25519 } from "@near-js/crypto";
import { HereProviderResult, HereProviderStatus, HereStrategyRequest, HereWalletProtocol } from "../types";
import { waitInjectedHereWallet } from "../helpers/waitInjected";
import { HereStrategy } from "./HereStrategy";

export class InjectedStrategy extends HereStrategy {
  async connect(wallet: HereWalletProtocol): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();

    this.wallet = wallet;
    const injected = await waitInjectedHereWallet;
    if (injected == null) return;

    await this.wallet.authStorage.setKey(injected.network, injected.accountId, KeyPairEd25519.fromRandom());
    await this.wallet.authStorage.setActiveAccount(injected.network, injected.accountId);
  }

  async request(conf: HereStrategyRequest) {
    if (typeof window === "undefined") return Promise.reject("SSR");

    return new Promise<HereProviderResult>((resolve) => {
      const id = uuid4();
      const handler = (e: any) => {
        if (e.data.id !== id) return;
        if (e.data.status === HereProviderStatus.SUCCESS || e.data.status === HereProviderStatus.FAILED) {
          window?.removeEventListener("message", handler);
          return resolve(e.data);
        }
      };

      window?.parent.postMessage({ $here: true, ...conf.request, id }, "*");
      window?.addEventListener("message", handler);
    });
  }
}
