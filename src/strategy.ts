export interface AsyncHereSignResult {
  public_key?: string;
  account_id: string;
  transaction_hash?: string;
  status: number;
}

export interface Strategy {
  onInitialized?: () => void;
  onRequested?: (link: string) => void;
  onApproving?: () => void;
  onSuccess?: (result: AsyncHereSignResult) => void;
  onFailed?: (e: unknown) => void;
}

export class DefaultStrategy implements Strategy {
  signWindow: Window;
  unloadHandler: () => void;

  onInitialized() {
    const left = window.innerWidth / 2 - 400 / 2;
    const top = window.innerHeight / 2 - 700 / 2 + 48;
    this.signWindow = window.open("about:blank", "_blank", `popup=1,width=400,height=700,top=${top},left=${left}`);
  }

  onRequested(link) {
    this.unloadHandler = () => this.signWindow?.close();
    window.addEventListener("beforeunload", this.unloadHandler);
    if (this.signWindow) {
      this.signWindow.location = link;
    }
  }

  onFailed() {
    this.signWindow?.close();
    window.removeEventListener("beforeunload", this.unloadHandler);
  }

  onSuccess() {
    this.signWindow?.close();
    window.removeEventListener("beforeunload", this.unloadHandler);
  }
}
