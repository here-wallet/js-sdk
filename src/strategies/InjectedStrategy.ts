import uuid4 from "uuid4";
import { HereStrategy } from "./HereStrategy";
import { HereProviderResult, HereProviderStatus, HereStrategyRequest, HereWalletProtocol } from "../types";
import { KeyPairEd25519 } from "@near-js/crypto";

type InjectedState = { accountId: string; network: string; publicKey: string };
export const waitInjectedHereWallet = new Promise<InjectedState | null>((resolve) => {
  if (typeof window === "undefined") return resolve(null);
  if (window.self === window.top) return resolve(null);

  const handler = (e: any) => {
    if (e.data.type !== "here-wallet-injected") return;
    window.parent.postMessage("here-sdk-init", "*");
    window.removeEventListener("message", handler);
    resolve({ accountId: e.data.accountId, publicKey: e.data.publicKey, network: e.data.network || "mainnet" });
  };

  window.addEventListener("message", handler);
  setTimeout(() => resolve(null), 2000);
});

export class InjectedStrategy extends HereStrategy {
  async connect(wallet: HereWalletProtocol): Promise<void> {
    this.wallet = wallet;
    const injected = await waitInjectedHereWallet;
    if (injected == null) return;

    await this.wallet.authStorage.setKey(injected.network, injected.accountId, KeyPairEd25519.fromRandom());
    await this.wallet.authStorage.setActiveAccount(injected.network, injected.accountId);
  }

  async request(conf: HereStrategyRequest) {
    return new Promise<HereProviderResult>((resolve) => {
      const id = uuid4();
      const handler = (e: any) => {
        if (e.data.id !== id) return;
        if (e.data.status === HereProviderStatus.SUCCESS || e.data.status === HereProviderStatus.FAILED) {
          window.removeEventListener("message", handler);
          return resolve(e.data);
        }
      };

      window.parent.postMessage({ $here: true, ...conf.request, id }, "*");
      window.addEventListener("message", handler);
    });
  }
}
