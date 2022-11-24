import uuid4 from "uuid4";
import { AsyncHereSignResult, Strategy } from "./strategy";
import { createRequest, getTransactionStatus, HereConfiguration, isMobile } from "./utils";

export interface AsyncHereSignDelegate extends Strategy {
  strategy?: Strategy;
}

export const asyncHereSign = async (
  config: HereConfiguration,
  options: Record<string, string>,
  delegate: AsyncHereSignDelegate = {}
): Promise<AsyncHereSignResult> => {
  const requestId = uuid4();

  const hashsum = await createRequest(config, requestId, options);
  const socketApi = config.hereApi.replace("https", "wss");
  let fallbackHttpTimer: NodeJS.Timeout | number | null = null;

  const deeplink = `${config.hereConnector}/approve?request_id=${requestId}&hash=${hashsum}`;
  delegate.onRequested?.(deeplink);
  delegate?.strategy.onRequested?.(deeplink);

  return new Promise((resolve, reject) => {
    let socket: WebSocket | null = null;

    const clear = () => {
      fallbackHttpTimer = -1;
      clearInterval(fallbackHttpTimer);
      socket?.close();
    };

    const processApprove = (data: AsyncHereSignResult) => {
      switch (data.status) {
        case 1:
          delegate.onApproving?.();
          delegate?.strategy.onApproving?.();
          return;
        case 2:
          clear();
          reject(data);
          delegate.onFailed?.(data);
          delegate?.strategy.onFailed?.(data);
          return;
        case 3:
          clear();
          resolve(data);
          delegate.onSuccess?.(data);
          delegate?.strategy.onSuccess?.(data);
      }
    };

    const setupTimer = () => {
      if (fallbackHttpTimer === -1) {
        return;
      }

      fallbackHttpTimer = setTimeout(async () => {
        try {
          const data = await getTransactionStatus(config.hereApi, requestId);
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
