import QRCode from "./qrcode";
import logo from "./logo";
export { QRCode, logo };
export class QRCodeStrategy {
    constructor(options) {
        this.options = options;
        this.onFailed = () => this.close();
        this.onSuccess = () => this.close();
    }
    get themeConfig() {
        return this.options.theme === "light" ? lightQR : darkQR;
    }
    onRequested(value) {
        this.qrcode = new QRCode(Object.assign(Object.assign(Object.assign({}, this.themeConfig), this.options), { value }));
        this.options.element.appendChild(this.qrcode.canvas);
        this.options.animate ? this.qrcode.animate() : this.qrcode.render();
    }
    close() {
        var _a;
        if (this.qrcode == null)
            return;
        this.options.element.removeChild(this.qrcode.canvas);
        (_a = this.qrcode) === null || _a === void 0 ? void 0 : _a.stopAnimate();
    }
}
export const darkQR = {
    value: "",
    radius: 0.8,
    ecLevel: "Q",
    fill: {
        type: "linear-gradient",
        position: [0, 0, 1, 1],
        colorStops: [
            [0, "#FFC152"],
            [1, "#FF4D33"],
        ],
    },
    size: 256,
    withLogo: true,
    imageEcCover: 0.6,
    quiet: 1,
};
export const lightQR = {
    value: "",
    radius: 0.8,
    ecLevel: "Q",
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
    imageEcCover: 0.6,
    quiet: 1,
};
//# sourceMappingURL=index.js.map