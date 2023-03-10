import { HereStrategy } from "../types";
import { HereProviderRequest } from "../provider";
import QRCode, { QRSettings } from "./qrcode";
import logo from "./logo";

export { QRCode, logo };

export interface QRCodeStrategyOptions extends Partial<QRSettings> {
  element: HTMLElement;
  theme?: "dark" | "light";
  animate?: boolean;
  mainnet?: string;
  testnet?: string;
}

export class QRCodeStrategy implements HereStrategy {
  private qrcode?: QRCode;
  readonly mainnet: string = "https://h4n.app";
  readonly testnet: string = "https://my.herewallet.app";

  constructor(public options: QRCodeStrategyOptions) {
    this.mainnet = options.mainnet ?? this.mainnet;
    this.testnet = options.testnet ?? this.testnet;
  }

  get themeConfig() {
    return this.options.theme === "light" ? lightQR : darkQR;
  }

  onRequested(id: string, request: HereProviderRequest) {
    const network = request.network ?? "mainnet";

    this.qrcode = new QRCode({
      ...this.themeConfig,
      ...this.options,
      value: `${network === "mainnet" ? this.mainnet : this.testnet}/${id}`,
    });

    this.options.element.appendChild(this.qrcode.canvas);
    this.options.animate ? this.qrcode.animate() : this.qrcode.render();
  }

  close() {
    if (this.qrcode == null) return;
    this.options.element.removeChild(this.qrcode.canvas);
    this.qrcode?.stopAnimate();
  }

  onFailed = () => this.close();
  onSuccess = () => this.close();
}

export const darkQR: QRSettings = {
  value: "",
  radius: 0.8,
  ecLevel: "H",
  fill: {
    type: "linear-gradient",
    position: [0, 0, 1, 1],
    colorStops: [
      [0, "#2C3034"],
      [0.34, "#4F5256"],
      [1, "#2C3034"],
    ],
  },
  size: 256,
  withLogo: true,
  imageEcCover: 0.7,
  quiet: 1,
};

export const lightQR: QRSettings = {
  value: "",
  radius: 0.8,
  ecLevel: "H",
  fill: {
    type: "linear-gradient",
    position: [0.3, 0.3, 1, 1],
    colorStops: [
      [0, "#FDBF1C"],
      [1, "#FDA31C"],
    ],
  },
  size: 256,
  withLogo: true,
  imageEcCover: 0.7,
  quiet: 1,
};
