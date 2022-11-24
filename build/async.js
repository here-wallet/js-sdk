"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHereSign = void 0;
const uuid4_1 = __importDefault(require("uuid4"));
const utils_1 = require("./utils");
const asyncHereSign = (config, options, delegate = {}) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const requestId = (0, uuid4_1.default)();
    const hashsum = yield (0, utils_1.createRequest)(config, requestId, options);
    const socketApi = config.hereApi.replace("https", "wss");
    let fallbackHttpTimer = null;
    const deeplink = `${config.hereConnector}/approve?request_id=${requestId}&hash=${hashsum}`;
    (_a = delegate.onRequested) === null || _a === void 0 ? void 0 : _a.call(delegate, deeplink);
    (_c = delegate === null || delegate === void 0 ? void 0 : (_b = delegate.strategy).onRequested) === null || _c === void 0 ? void 0 : _c.call(_b, deeplink);
    return new Promise((resolve, reject) => {
        let socket = null;
        const clear = () => {
            fallbackHttpTimer = -1;
            clearInterval(fallbackHttpTimer);
            socket === null || socket === void 0 ? void 0 : socket.close();
        };
        const processApprove = (data) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            switch (data.status) {
                case 1:
                    (_a = delegate.onApproving) === null || _a === void 0 ? void 0 : _a.call(delegate);
                    (_c = delegate === null || delegate === void 0 ? void 0 : (_b = delegate.strategy).onApproving) === null || _c === void 0 ? void 0 : _c.call(_b);
                    return;
                case 2:
                    clear();
                    reject(data);
                    (_d = delegate.onFailed) === null || _d === void 0 ? void 0 : _d.call(delegate, data);
                    (_f = delegate === null || delegate === void 0 ? void 0 : (_e = delegate.strategy).onFailed) === null || _f === void 0 ? void 0 : _f.call(_e, data);
                    return;
                case 3:
                    clear();
                    resolve(data);
                    (_g = delegate.onSuccess) === null || _g === void 0 ? void 0 : _g.call(delegate, data);
                    (_j = delegate === null || delegate === void 0 ? void 0 : (_h = delegate.strategy).onSuccess) === null || _j === void 0 ? void 0 : _j.call(_h, data);
            }
        };
        const setupTimer = () => {
            if (fallbackHttpTimer === -1) {
                return;
            }
            fallbackHttpTimer = setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    const data = yield (0, utils_1.getTransactionStatus)(config.hereApi, requestId);
                    if (fallbackHttpTimer === -1)
                        return;
                    processApprove(data);
                }
                finally {
                    setupTimer();
                }
            }), 3000);
        };
        setupTimer();
        // Mobile flow doesn't support cross tabs socket background process
        if ((0, utils_1.isMobile)() === false) {
            const endpoint = `${socketApi}/api/v1/web/ws/transaction_approved/${requestId}`;
            socket = new WebSocket(endpoint);
            socket.onmessage = (e) => {
                if (e.data == null)
                    return;
                try {
                    const data = JSON.parse(e.data);
                    processApprove(data);
                }
                catch (_a) {
                    // nope
                }
            };
        }
    });
});
exports.asyncHereSign = asyncHereSign;
