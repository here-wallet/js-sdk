import uuid4 from "uuid4";
import { KeyPair } from "near-api-js";

import { isMobile } from "../utils";
import { HereProvider, HereProviderError, HereProviderResult, HereProviderStatus } from "../provider";
import { createRequest, getResponse, deleteRequest, proxyApi, getRequest } from "./methods";

export { createRequest, getResponse, deleteRequest, proxyApi, getRequest };

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

export const proxyProvider: HereProvider = async (conf) => {
  const isInjected = await waitInjectedHereWallet;

  if (isInjected && typeof window !== "undefined") {
    return new Promise((resolve) => {
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

  let { strategy, request, disableCleanupRequest, id, signal, ...delegate } = conf;
  if (id != null) request = await getRequest(id, signal);
  else id = await createRequest(request, signal);

  return new Promise<HereProviderResult>((resolve, reject: (e: HereProviderError) => void) => {
    const socketApi = proxyApi.replace("https", "wss");
    let fallbackHttpTimer: NodeJS.Timeout | number | null = null;
    let socket: WebSocket | null = null;

    const clear = async () => {
      fallbackHttpTimer = -1;
      clearInterval(fallbackHttpTimer);
      socket?.close();
      if (disableCleanupRequest !== true) {
        await deleteRequest(id!);
      }
    };

    const processApprove = (data: HereProviderResult) => {
      switch (data.status) {
        case HereProviderStatus.APPROVING:
          delegate.onApproving?.(data);
          strategy?.onApproving?.(data);
          return;

        case HereProviderStatus.FAILED:
          clear();
          reject(new HereProviderError(data.payload));
          delegate.onFailed?.(data);
          strategy?.onFailed?.(data);
          return;

        case HereProviderStatus.SUCCESS:
          clear();
          resolve(data);
          delegate.onSuccess?.(data);
          strategy?.onSuccess?.(data);
          return;
      }
    };

    const rejectAction = (payload?: string) => {
      processApprove({
        type: request.selector?.type || "local",
        status: HereProviderStatus.FAILED,
        payload,
      });
    };

    delegate.onRequested?.(id!, request, rejectAction);
    strategy?.onRequested?.(id!, request, rejectAction);
    signal?.addEventListener("abort", () => rejectAction());

    const setupTimer = () => {
      if (fallbackHttpTimer === -1) {
        return;
      }

      fallbackHttpTimer = setTimeout(async () => {
        try {
          const data = await getResponse(id!);
          if (fallbackHttpTimer === -1) return;
          processApprove(data);
          setupTimer();
        } catch (e) {
          const status = HereProviderStatus.FAILED;
          const error = e instanceof Error ? e : undefined;
          const payload = error?.message;

          clear();
          reject(new HereProviderError(payload, error));
          delegate.onFailed?.({ type: request.selector?.type || "local", status, payload });
          strategy?.onFailed?.({ type: request.selector?.type || "local", status, payload });
        }
      }, 3000);
    };

    setupTimer();

    // Mobile flow doesn't support cross tabs socket background process
    if (isMobile() === false) {
      const endpoint = `${socketApi}/ws/${id}`;
      socket = new WebSocket(endpoint);
      socket.onmessage = (e) => {
        if (e.data == null) return;
        try {
          const data = JSON.parse(e.data);
          processApprove(data);
        } catch {
          // nope
        }
      };
    }
  });
};
