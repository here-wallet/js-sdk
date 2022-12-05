import { createMinQRCode, drawModules } from "./core/utils";
import logo from "./logo";
const logoImage = new Image();
logoImage.src = logo;
class QRCodeLogo {
    constructor(settings, qr, img = logoImage) {
        this.settings = settings;
        this.qr = qr;
        this.img = img;
        this.quietModuleCount = 0;
        this.moduleSize = 0;
        this.dataPixels = 0;
        this.ratio = 0;
        this.area = 0;
        this.imageModuleWidth = 0;
        this.imageModuleHeight = 0;
        this.imageModuleLeft = 0;
        this.imageModuleTop = 0;
        this.imageFloatModuleWidth = 0;
        this.imageFloatModuleHeight = 0;
        this.imageLeft = 0;
        this.imageTop = 0;
        this.isLoaded = false;
        this.img.addEventListener("load", () => this.process());
        if (this.img.width > 0) {
            this.process();
        }
    }
    process() {
        var _a, _b;
        const quiet = (_a = this.settings.quiet) !== null && _a !== void 0 ? _a : 0;
        const imageEcCover = (_b = this.settings.imageEcCover) !== null && _b !== void 0 ? _b : 0.5;
        this.isLoaded = true;
        this.quietModuleCount = this.qr.moduleCount - quiet * 2;
        this.moduleSize = this.settings.size / this.quietModuleCount;
        this.dataPixels = this.quietModuleCount * this.quietModuleCount - (49 * 3 + 25);
        this.ratio = this.img.width / this.img.height;
        const quality = {
            L: 0.07,
            M: 0.15,
            Q: 0.25,
            H: 0.3,
        };
        this.area = (quality[this.settings.ecLevel] * imageEcCover * this.dataPixels) | 0;
        this.imageModuleWidth = Math.min(this.quietModuleCount, Math.sqrt(this.area * this.ratio) | 0);
        this.imageModuleHeight = (this.imageModuleWidth / this.ratio) | 0;
        if (this.imageModuleHeight > this.quietModuleCount) {
            this.imageModuleHeight = this.quietModuleCount;
            this.imageModuleWidth = (this.imageModuleHeight * this.ratio) | 0;
        }
        this.imageModuleLeft = (this.qr.moduleCount / 2 - this.imageModuleWidth / 2) | 0;
        this.imageModuleTop = (this.qr.moduleCount / 2 - this.imageModuleHeight / 2) | 0;
        this.imageFloatModuleWidth = Math.min(this.imageModuleWidth, this.imageModuleHeight * this.ratio) - quiet;
        this.imageFloatModuleHeight = Math.min(this.imageModuleHeight, this.imageModuleWidth / this.ratio) - quiet;
        this.imageLeft = this.imageModuleLeft + (this.imageModuleWidth - this.imageFloatModuleWidth) / 2 - quiet;
        this.imageTop = this.imageModuleTop + (this.imageModuleHeight - this.imageFloatModuleHeight) / 2 - quiet;
        const isDark = this.qr.isDark;
        this.qr.isDark = (row, col) => {
            if (this.isContains(row, col))
                return false;
            return isDark(row, col);
        };
    }
    render(context) {
        context.drawImage(this.img, this.imageLeft * this.moduleSize, this.imageTop * this.moduleSize, this.imageFloatModuleWidth * this.moduleSize, this.imageFloatModuleHeight * this.moduleSize);
    }
    isContains(row, col) {
        return (this.imageModuleLeft <= col &&
            col < this.imageModuleLeft + this.imageModuleWidth &&
            this.imageModuleTop <= row &&
            row < this.imageModuleTop + this.imageModuleHeight);
    }
}
class QRCode {
    constructor(settings) {
        var _a, _b, _c, _d;
        this.canvas = document.createElement("canvas");
        this.rafHandler = 0;
        this.animate = () => {
            this.render();
            this.rafHandler = window.requestAnimationFrame(this.animate);
        };
        this.qr = createMinQRCode(settings.value, (_a = settings.ecLevel) !== null && _a !== void 0 ? _a : "H", (_b = settings.minVersion) !== null && _b !== void 0 ? _b : 1, (_c = settings.maxVersion) !== null && _c !== void 0 ? _c : 40, (_d = settings.quiet) !== null && _d !== void 0 ? _d : 0);
        this.settings = settings;
        this.ctx = this.canvas.getContext("2d");
        this.canvas.style.width = settings.size + "px";
        this.canvas.style.height = settings.size + "px";
        settings.size = settings.size * 4;
        this.canvas.width = settings.size;
        this.canvas.height = settings.size;
        if (settings.withLogo) {
            this.logo = new QRCodeLogo(settings, this.qr);
            this.logo.img.addEventListener("load", () => this.render());
        }
    }
    render() {
        var _a;
        if (this.settings.background) {
            this.ctx.fillStyle = this.settings.background;
            this.ctx.fillRect(0, 0, this.settings.size, this.settings.size);
        }
        else {
            this.ctx.clearRect(0, 0, this.settings.size, this.settings.size);
        }
        drawModules(this.qr, this.ctx, this.settings);
        (_a = this.logo) === null || _a === void 0 ? void 0 : _a.render(this.ctx);
    }
    stopAnimate() {
        window.cancelAnimationFrame(this.rafHandler);
    }
}
export default QRCode;
//# sourceMappingURL=qrcode.js.map