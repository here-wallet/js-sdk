import uuid4 from "uuid4";
import { isMobile } from "../utils";
import { HereProvider, HereProviderResult, HereProviderStatus } from "../provider";
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
  const { hereApi, hereConnector } = hereConfigurations[network];

  if (id != null) args = await getRequest(hereApi, id, signal);
  else {
    id = uuid4();
    await createRequest(hereApi, hereConnector, id, args, signal);
  }

  const socketApi = hereApi.replace("https", "wss");
  let fallbackHttpTimer: NodeJS.Timeout | number | null = null;

  const deeplink = `${hereConnector}?request_id=${id}`;
  delegate.onRequested?.(deeplink, args);
  strategy?.onRequested?.(deeplink, args);

  return new Promise<HereProviderResult>((resolve, reject) => {
    let socket: WebSocket | null = null;

    const clear = () => {
      fallbackHttpTimer = -1;
      clearInterval(fallbackHttpTimer);
      socket?.close();
    };

    signal?.addEventListener("abort", () =>
      processApprove({
        account_id: "",
        status: HereProviderStatus.FAILED,
      })
    );

    const processApprove = (data: HereProviderResult) => {
      switch (data.status) {
        case HereProviderStatus.APPROVING:
          delegate.onApproving?.(data);
          strategy?.onApproving?.(data);
          return;

        case HereProviderStatus.FAILED:
          clear();
          reject(data);
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

    const setupTimer = () => {
      if (fallbackHttpTimer === -1) {
        return;
      }

      fallbackHttpTimer = setTimeout(async () => {
        try {
          const data = await getTransactionStatus(hereApi, id!);
          if (fallbackHttpTimer === -1) return;
          processApprove(data);
        } finally {
          setupTimer();
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
