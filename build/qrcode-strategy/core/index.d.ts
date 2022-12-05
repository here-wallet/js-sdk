export function qrcode(typeNumber: any, errorCorrectLevel: any): {
    addData(data: any): void;
    isDark(row: any, col: any): any;
    getModuleCount(): number;
    make(): void;
};
export namespace qrcode {
    function stringToBytes(s: any): any[];
}
