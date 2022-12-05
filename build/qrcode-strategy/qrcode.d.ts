interface QR {
    moduleCount: number;
    isDark: (row: number, col: number) => boolean;
}
export interface QRSettings {
    ecLevel: "L" | "M" | "Q" | "H";
    value: string;
    radius: number;
    fill: any;
    imageEcCover?: number;
    minVersion?: number;
    maxVersion?: number;
    quiet?: number;
    background?: string;
    withLogo: boolean;
    size: number;
}
declare class QRCodeLogo {
    readonly settings: QRSettings;
    readonly qr: QR;
    readonly img: HTMLImageElement;
    private quietModuleCount;
    private moduleSize;
    private dataPixels;
    private ratio;
    private area;
    private imageModuleWidth;
    private imageModuleHeight;
    private imageModuleLeft;
    private imageModuleTop;
    private imageFloatModuleWidth;
    private imageFloatModuleHeight;
    private imageLeft;
    private imageTop;
    isLoaded: boolean;
    constructor(settings: QRSettings, qr: QR, img?: HTMLImageElement);
    private process;
    render(context: CanvasRenderingContext2D): void;
    isContains(row: number, col: number): boolean;
}
declare class QRCode {
    readonly canvas: HTMLCanvasElement;
    readonly ctx: CanvasRenderingContext2D;
    readonly settings: QRSettings;
    readonly logo?: QRCodeLogo;
    readonly qr: QR;
    private rafHandler;
    constructor(settings: QRSettings);
    render(): void;
    animate: () => void;
    stopAnimate(): void;
}
export default QRCode;
