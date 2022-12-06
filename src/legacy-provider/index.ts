import uuid4 from "uuid4";
import { isMobile } from "../utils";
import { HereProvider, HereProviderError, HereProviderResult, HereProviderStatus } from "../provider";
import { createRequest, getRequest, getTransactionStatus } from "./methods";

export const hereConfigurations = {
  mainnet: {
    hereApi: "https://api.herewallet.app",
    hereConnector: "https://web.herewallet.app",
  },
  testnet: {
    hereApi: "https://api.testnet.herewallet.app",
    hereConnector: "https://web.testnet.herewallet.app",
  },
} as const;

export const legacyProvider: HereProvider = async ({ id, strategy, signal, network, args, ...delegate }) => {
  const { hereApi, hereConnector } = hereConfigurations[network as "mainnet" | "testnet"] ?? hereConfigurations.testnet;

  if (id != null) args = await getRequest(hereApi, id, signal);
  else {
    id = uuid4();
    await createRequest(hereApi, hereConnector, id, args, signal);
  }

  return new Promise<HereProviderResult>((resolve, reject: (e: HereProviderError) => void) => {
    const socketApi = hereApi.replace("https", "wss");
    let fallbackHttpTimer: NodeJS.Timeout | number | null = null;
    let socket: WebSocket | null = null;

    const clear = () => {
      fallbackHttpTimer = -1;
      clearInterval(fallbackHttpTimer);
      socket?.close();
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
      processApprove({ status: HereProviderStatus.FAILED, payload });
    };

    const deeplink = `${hereConnector}?request_id=${id}`;
    delegate.onRequested?.(deeplink, args, rejectAction);
    strategy?.onRequested?.(deeplink, args, rejectAction);
    signal?.addEventListener("abort", () => rejectAction());

    const setupTimer = () => {
      if (fallbackHttpTimer === -1) {
        return;
      }

      fallbackHttpTimer = setTimeout(async () => {
        try {
          const data = await getTransactionStatus(hereApi, id!);
          if (fallbackHttpTimer === -1) return;
          processApprove(data);
          setupTimer();
        } catch (e) {
          const status = HereProviderStatus.FAILED;
          const error = e instanceof Error ? e : undefined;
          const payload = error?.message;

          clear();
          reject(new HereProviderError(payload, error));
          delegate.onFailed?.({ status, payload });
          strategy?.onFailed?.({ status, payload });
        }
      }, 3000);
    };

    setupTimer();

    // Mobile flow doesn't support cross tabs socket background process
    if (isMobile() === false) {
      const endpoint = `${socketApi}/api/v1/web/ws/transaction_approved/${id!}`;
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
