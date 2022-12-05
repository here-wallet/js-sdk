import { Strategy } from "../strategy";
import QRCode, { QRSettings } from "./qrcode";
import logo from "./logo";

export interface QRCodeStrategyOptions {
  element: HTMLElement;
  theme?: "dark" | "light";
  animate?: boolean;
}

export class QRCodeStrategy implements Strategy {
  private qrcode?: QRCode;
  constructor(public options: QRCodeStrategyOptions) {}

  get themeConfig() {
    return this.options.theme === "light" ? lightQR : darkQR;
  }

  onRequested(value) {
    this.qrcode = new QRCode({ ...this.themeConfig, value });
    this.options.element.appendChild(this.qrcode.canvas);
    this.options.animate ? this.qrcode.animate() : this.qrcode.render();
  }

  onSucessed() {
    if (this.qrcode == null) return;
    this.options.element.removeChild(this.qrcode.canvas);
    this.qrcode?.stopAnimate();
  }
}

const lightQR: QRSettings = {
  value: "",
  radius: 0.8,
  ecLevel: "H",
  fill: {
    type: "linear-gradient",
    position: [0, 0, 1, 1],
    colorStops: [
      [0, "#34302C"],
      [0.3, "#FD84E3"],
      [0.8, "#34302C"],
    ],
  },
  size: 256,
  image: logo,
  imageEcCover: 0.6,
  quiet: 1,
};

const darkQR: QRSettings = {
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
  background: "#2C3034",
  size: 256,
  image: logo,
  imageEcCover: 0.6,
  quiet: 1,
};
