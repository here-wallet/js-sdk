import { isMobile } from "../utils";
import { HereProvider, HereProviderResult, HereProviderStatus } from "../provider";
import { createRequest, getResponse, deleteRequest, proxyApi, getRequest } from "./methods";

export const proxyProvider: HereProvider = async ({ strategy, id, args, signal, ...delegate }) => {
  if (id != null) args = await getRequest(id, signal);
  else id = await createRequest(args, signal);

  const socketApi = proxyApi.replace("https", "wss");
  let fallbackHttpTimer: NodeJS.Timeout | number | null = null;

  const deeplink = `${proxyApi}/${id}`;
  delegate.onRequested?.(deeplink, args);
  strategy?.onRequested?.(deeplink, args);

  return new Promise<HereProviderResult>((resolve, reject) => {
    let socket: WebSocket | null = null;

    const clear = async () => {
      fallbackHttpTimer = -1;
      clearInterval(fallbackHttpTimer);
      socket?.close();
      await deleteRequest(id!);
    };

    signal?.addEventListener("abort", () =>
      processApprove({
        account_id: "",
        status: HereProviderStatus.FAILED,
        payload: "abort",
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
          const data = await getResponse(id!);
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
