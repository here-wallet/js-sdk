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
const strategy_1 = require("./strategy");
const utils_1 = require("./utils");
const asyncHereSign = (config, options, delegate = {}) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const requestId = (0, uuid4_1.default)();
    const deeplink = `${config.hereConnector}/approve?request_id=${requestId}`;
    yield (0, utils_1.createRequest)(config, requestId, options);
    const strategy = ((_a = delegate.strategy) !== null && _a !== void 0 ? _a : strategy_1.popupStrategy)();
    const socketApi = config.hereApi.replace("https", "wss");
    const endpoint = `${socketApi}/api/v1/web/ws/transaction_approved/${requestId}`;
    const socket = new WebSocket(endpoint);
    let fallbackHttpTimer;
    (_b = delegate.onInitialized) === null || _b === void 0 ? void 0 : _b.call(delegate, deeplink);
    if (delegate.forceRedirect == null || delegate.forceRedirect === true) {
        (_c = strategy.onInitialized) === null || _c === void 0 ? void 0 : _c.call(strategy, deeplink);
    }
    return new Promise((resolve, reject) => {
        const clear = () => {
            var _a;
            fallbackHttpTimer = -1;
            clearInterval(fallbackHttpTimer);
            (_a = strategy.onCompleted) === null || _a === void 0 ? void 0 : _a.call(strategy);
            socket.close();
        };
        const processApprove = (data) => {
            var _a;
            switch (data.status) {
                case 1:
                    (_a = delegate.onApproving) === null || _a === void 0 ? void 0 : _a.call(delegate, deeplink);
                    return;
                case 2:
                    clear();
                    reject(data);
                    return;
                case 3:
                    clear();
                    resolve(data);
            }
        };
        const setupTimer = () => {
            if (fallbackHttpTimer === -1)
                return;
            fallbackHttpTimer = setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                const data = yield (0, utils_1.getTransactionStatus)(config.hereApi, requestId).catch(() => { });
                if (fallbackHttpTimer === -1)
                    return;
                processApprove(data);
                setupTimer();
            }), 3000);
        };
        setupTimer();
        socket.onmessage = (e) => {
            console.log("Message", e);
            if (e.data == null)
                return;
            try {
                const data = JSON.parse(e.data);
                processApprove(data);
            }
            catch (e) {
                // backend return incorrect data = cancel signing
                reject(e);
                clear();
            }
        };
    });
});
exports.asyncHereSign = asyncHereSign;
