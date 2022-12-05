export function createMinQRCode(text: any, level: any, minVersion: any, maxVersion: any, quiet: any): {
    text: any;
    level: any;
    version: any;
    moduleCount: number;
    isDark: (row: any, col: any) => any;
} | undefined;
export function drawModuleRoundedDark(ctx: any, l: any, t: any, r: any, b: any, rad: any, nw: any, ne: any, se: any, sw: any): void;
export function drawModuleRoundendLight(ctx: any, l: any, t: any, r: any, b: any, rad: any, nw: any, ne: any, se: any, sw: any): void;
export function drawModuleRounded(qr: any, context: any, settings: any, left: any, top: any, width: any, row: any, col: any): void;
export function drawModules(qr: any, context: any, settings: any): void;
export function setFill(context: any, fill: any, size: any): void;
