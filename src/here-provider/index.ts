import { isMobile } from "../utils";
import { HereProvider, HereProviderResult, HereProviderStatus } from "../provider";
import { createRequest, getResponse, deleteRequest } from "./methods";

export const proxyProvider: HereProvider = async ({ strategy, state, args, ...delegate }) => {
  const requestId = await createRequest(state, args);
  const socketApi = state.proxyApi.replace("https", "wss");
  let fallbackHttpTimer: NodeJS.Timeout | number | null = null;

  const deeplink = `${state.proxyApi}/${requestId}`;
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
          const data = await getResponse(state, requestId);
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
      const endpoint = `${socketApi}/ws/${requestId}`;
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
