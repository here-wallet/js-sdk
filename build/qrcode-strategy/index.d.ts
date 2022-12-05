import { Strategy } from "../strategy";
import QRCode, { QRSettings } from "./qrcode";
import logo from "./logo";
export { QRCode, logo };
export interface QRCodeStrategyOptions extends Partial<QRSettings> {
    element: HTMLElement;
    theme?: "dark" | "light";
    animate?: boolean;
}
export declare class QRCodeStrategy implements Strategy {
    options: QRCodeStrategyOptions;
    private qrcode?;
    constructor(options: QRCodeStrategyOptions);
    get themeConfig(): QRSettings;
    onRequested(value: string): void;
    close(): void;
    onFailed: () => void;
    onSuccess: () => void;
}
export declare const darkQR: QRSettings;
export declare const lightQR: QRSettings;
