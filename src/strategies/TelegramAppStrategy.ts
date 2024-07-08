import { KeyPair, KeyPairEd25519 } from "@near-js/crypto";
import { baseDecode, baseEncode } from "@near-js/utils";

import { HereProviderStatus, HereStrategyRequest, HereWalletProtocol } from "../types";
import { computeRequestId, proxyApi } from "../helpers/proxyMethods";
import { HereStrategy, getResponse } from "./HereStrategy";
import { getDeviceId } from "../helpers/utils";

export class TelegramAppStrategy extends HereStrategy {
  constructor(public appId = "herewalletbot/app", public walletId = "herewalletbot/app") {
    super();
  }

  async connect(wallet: HereWalletProtocol): Promise<void> {
    if (typeof window === "undefined") return;
    this.wallet = wallet;

    const startapp = window?.Telegram?.WebApp?.initDataUnsafe?.start_param || "";
    window?.Telegram?.WebApp.ready?.();

    if (startapp.startsWith("hot")) {
      let requestId = startapp.split("-").pop() || "";
      requestId = Buffer.from(baseDecode(requestId)).toString("utf8");

      const requestPending = localStorage.getItem(`__telegramPendings:${requestId}`);
      if (requestPending == null) return;

      const data: any = await getResponse(requestId);
      if (data.status !== HereProviderStatus.SUCCESS) {
        localStorage.removeItem(`__telegramPendings:${requestId}`);
        return;
      }

      if (data.type === "sign") {
        await this.wallet.authStorage.setKey("mainnet", data.account_id!, KeyPairEd25519.fromRandom());
        await this.wallet.authStorage.setActiveAccount("mainnet", data.account_id!);
      }

      try {
        const pending = JSON.parse(requestPending);
        if (pending.privateKey) {
          await this.wallet.authStorage.setKey("mainnet", data.account_id!, KeyPair.fromString(pending.privateKey));
          await this.wallet.authStorage.setActiveAccount("mainnet", data.account_id!);
        }

        const url = new URL(location.origin + (pending.callbackUrl || ""));
        url.searchParams.set("payload", data.result!);

        localStorage.removeItem(`__telegramPendings:${requestId}`);
        location.assign(url.toString());
      } catch (e) {
        const url = new URL(location.href);
        url.searchParams.set("payload", data.result!);

        localStorage.removeItem(`__telegramPendings:${requestId}`);
        location.assign(url.toString());
      }
    }
  }

  async request(conf: HereStrategyRequest): Promise<any> {
    if (typeof window === "undefined") return;

    conf.request.telegramApp = this.appId;
    conf.request.callbackUrl = "";

    const { requestId, query } = await computeRequestId(conf.request);
    const res = await fetch(`${proxyApi}/${requestId}/request`, {
      method: "POST",
      body: JSON.stringify({ topic_id: getDeviceId(), data: query }),
      headers: { "content-type": "application/json" },
      signal: conf.signal,
    });

    if (res.ok === false) {
      throw Error(await res.text());
    }

    localStorage.setItem(
      `__telegramPendings:${requestId}`,
      JSON.stringify({ callbackUrl: conf.callbackUrl, privateKey: conf.accessKey?.toString() })
    );

    this.onRequested(requestId);
  }

  async onRequested(id: string) {
    if (typeof window === "undefined") return;

    id = baseEncode(id);
    window?.Telegram?.WebApp?.openTelegramLink(`https://t.me/${this.walletId}?startapp=h4n-${id}`);
    window?.Telegram?.WebApp?.close();
  }
}
