export var HereProviderStatus;
(function (HereProviderStatus) {
    HereProviderStatus[HereProviderStatus["APPROVING"] = 1] = "APPROVING";
    HereProviderStatus[HereProviderStatus["FAILED"] = 2] = "FAILED";
    HereProviderStatus[HereProviderStatus["SUCCESS"] = 3] = "SUCCESS";
})(HereProviderStatus || (HereProviderStatus = {}));
export class HereProviderError extends Error {
    constructor(payload, parentError) {
        super(payload !== null && payload !== void 0 ? payload : parentError === null || parentError === void 0 ? void 0 : parentError.message);
        this.payload = payload;
        this.parentError = parentError;
    }
}
//# sourceMappingURL=provider.js.map