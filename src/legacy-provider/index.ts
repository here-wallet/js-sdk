import uuid4 from "uuid4";
import { isMobile } from "../utils";
import { HereProvider, HereProviderResult, HereProviderStatus } from "../provider";
import { createRequest, getTransactionStatus } from "./methods";

export const legacyProvider: HereProvider = async ({ strategy, state, args, ...delegate }) => {
  const requestId = uuid4();

  await createRequest(state, requestId, args);
  const socketApi = state.hereApi.replace("https", "wss");
  let fallbackHttpTimer: NodeJS.Timeout | number | null = null;

  const deeplink = `${state.hereConnector}/approve?request_id=${requestId}`;
  delegate.onRequested?.(deeplink);
  strategy.onRequested?.(deeplink);

  return new Promise<HereProviderResult>((resolve, reject) => {
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
          strategy.onApproving?.(data);
          return;

        case HereProviderStatus.FAILED:
          clear();
          reject(data);
          delegate.onFailed?.(data);
          strategy.onFailed?.(data);
          return;

        case HereProviderStatus.SUCCESS:
          clear();
          resolve(data);
          delegate.onSuccess?.(data);
          strategy.onSuccess?.(data);
          return;

        case HereProviderStatus.REJECT:
          clear();
          resolve(data);
          delegate.onReject?.(data);
          strategy.onReject?.(data);
          return;
      }
    };

    const setupTimer = () => {
      if (fallbackHttpTimer === -1) {
        return;
      }

      fallbackHttpTimer = setTimeout(async () => {
        try {
          const data = await getTransactionStatus(state.hereApi, requestId);
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
      const endpoint = `${socketApi}/api/v1/web/ws/transaction_approved/${requestId}`;
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
