import { HereProviderRequest } from "../types";
import { HereStrategy } from "./HereStrategy";

export class WindowStrategy extends HereStrategy {
  constructor(readonly endpoint = "https://my.herewallet.app") {
    super();
  }

  signWindow: Window | null = null;
  unloadHandler?: () => void;
  timerHandler?: NodeJS.Timeout;

  async onInitialized() {
    if (this.signWindow) return;

    const left = window.innerWidth / 2 - 420 / 2;
    const top = window.innerHeight / 2 - 700 / 2;
    this.signWindow = window.open(`${this.endpoint}/loading`, "_blank", `popup=1,width=420,height=700,top=${top},left=${left}`);
  }

  async onRequested(id: string, request: HereProviderRequest, reject: (p?: string) => void) {
    if (this.signWindow == null) return;

    this.unloadHandler = () => this.signWindow?.close();
    window.addEventListener("beforeunload", this.unloadHandler);

    this.signWindow.location = `${this.endpoint}/request/${id}`;
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

  async onFailed() {
    this.close();
  }

  async onSuccess() {
    this.close();
  }
}
