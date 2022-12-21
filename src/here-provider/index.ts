import { isMobile } from "../utils";
import { HereProvider, HereProviderError, HereProviderResult, HereProviderStatus } from "../provider";
import { createRequest, getResponse, deleteRequest, proxyApi, getRequest } from "./methods";

export { createRequest, getResponse, deleteRequest, proxyApi, getRequest };

export const proxyProvider: HereProvider = async (conf) => {
  let { strategy, network, disableCleanupRequest, id, transactions = [], signal, ...delegate } = conf;
  if (id != null) {
    const request = await getRequest(id, signal);
    transactions = request.transactions;
    network = request.network ?? network ?? "mainnet";
  } else id = await createRequest({ transactions, network }, signal);

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
      processApprove({ status: HereProviderStatus.FAILED, payload });
    };

    delegate.onRequested?.({ transactions, network, id }, rejectAction);
    strategy?.onRequested?.({ transactions, network, id }, rejectAction);
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
          delegate.onFailed?.({ status, payload });
          strategy?.onFailed?.({ status, payload });
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
