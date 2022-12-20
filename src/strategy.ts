import { HereProviderRequest, HereProviderResult } from "./provider";

export interface HereStrategy {
  onInitialized?: () => void;
  onRequested?: (request: HereProviderRequest, reject: (p?: string) => void) => void;
  onApproving?: (result: HereProviderResult) => void;
  onSuccess?: (result: HereProviderResult) => void;
  onFailed?: (result: HereProviderResult) => void;
}

export class DefaultStrategy implements HereStrategy {
  constructor(readonly url = "https://h4n.app") {}

  signWindow: Window | null = null;
  unloadHandler?: () => void;
  timerHandler?: NodeJS.Timeout;

  onInitialized() {
    if (this.signWindow) return;

    const left = window.innerWidth / 2 - 420 / 2;
    const top = window.innerHeight / 2 - 700 / 2;
    this.signWindow = window.open(
      `${this.url}/loading`,
      "_blank",
      `popup=1,width=420,height=700,top=${top},left=${left}`
    );
  }

  onRequested(request: HereProviderRequest, reject: (p?: string) => void) {
    if (this.signWindow == null) return;

    this.unloadHandler = () => this.signWindow?.close();
    window.addEventListener("beforeunload", this.unloadHandler);

    this.signWindow.location = `${this.url}/${request.id}`;
    this.timerHandler = setInterval(() => {
      if (this.signWindow?.closed) reject("CLOSED");
    }, 1000);
  }

  close() {
    clearInterval(this.timerHandler);
    this.signWindow?.close();
    this.signWindow = null;

    if (this.unloadHandler) {
      window.removeEventListener("beforeunload", this.unloadHandler);
    }
  }

  onFailed = () => this.close();
  onSuccess = () => this.close();
}
