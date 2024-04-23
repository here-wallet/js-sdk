import { HereStrategyRequest, HereProviderError, HereProviderResult, HereProviderStatus, HereWalletProtocol, HereProviderRequest } from "../types";
import { createRequest, getResponse, deleteRequest, proxyApi, getRequest } from "../helpers/proxyMethods";

export { createRequest, getResponse, deleteRequest, proxyApi, getRequest };

export class HereStrategy {
  public wallet?: HereWalletProtocol;
  async connect(wallet: HereWalletProtocol) {
    this.wallet = wallet;
  }

  async onInitialized() {}
  async onRequested(id: string, request: HereProviderRequest, reject: (p?: string | undefined) => void) {}
  async onApproving(result: HereProviderResult) {}
  async onSuccess(result: HereProviderResult) {}
  async onFailed(result: HereProviderResult) {}

  async request(conf: HereStrategyRequest) {
    let { request, disableCleanupRequest, id, signal, ...delegate } = conf;
    if (id != null) request = await getRequest(id, signal);
    else id = await createRequest(request, signal);

    return new Promise<HereProviderResult>((resolve, reject: (e: HereProviderError) => void) => {
      let fallbackHttpTimer: NodeJS.Timeout | number | null = null;
      const clear = async () => {
        fallbackHttpTimer = -1;
        clearInterval(fallbackHttpTimer);
        if (disableCleanupRequest !== true) {
          await deleteRequest(id!);
        }
      };

      const processApprove = (data: HereProviderResult) => {
        switch (data.status) {
          case HereProviderStatus.APPROVING:
            this.onApproving(data);
            return;

          case HereProviderStatus.FAILED:
            clear();
            reject(new HereProviderError(data.payload));
            this.onFailed(data);
            return;

          case HereProviderStatus.SUCCESS:
            clear();
            resolve(data);
            this.onSuccess(data);
            return;
        }
      };

      const rejectAction = (payload?: string) => {
        processApprove({
          type: request.selector?.type || "web",
          status: HereProviderStatus.FAILED,
          payload,
        });
      };

      this.onRequested(id!, request, rejectAction);
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
            this.onFailed({ type: request.selector?.type || "web", status, payload });
          }
        }, 3000);
      };

      setupTimer();
    });
  }
}
