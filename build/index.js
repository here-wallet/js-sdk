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
exports.setupHereWallet = exports.iframeStrategy = exports.popupStrategy = void 0;
const selector_1 = require("./selector");
const utils_1 = require("./utils");
const icon_1 = __importDefault(require("./icon"));
var strategy_1 = require("./strategy");
Object.defineProperty(exports, "popupStrategy", { enumerable: true, get: function () { return strategy_1.popupStrategy; } });
Object.defineProperty(exports, "iframeStrategy", { enumerable: true, get: function () { return strategy_1.iframeStrategy; } });
function setupHereWallet({ deprecated = false, iconUrl = icon_1.default } = {}) {
    return ({ options }) => __awaiter(this, void 0, void 0, function* () {
        const configuration = utils_1.hereConfigurations[options.network.networkId];
        if (configuration == null) {
            return null;
        }
        return {
            id: "here-wallet",
            type: "injected",
            metadata: {
                name: "Here Wallet (mobile)",
                description: "Mobile wallet for NEAR Protocol",
                downloadUrl: configuration.download,
                iconUrl,
                deprecated,
                available: true,
            },
            init: (config) => (0, selector_1.initHereWallet)(Object.assign(Object.assign({}, config), { configuration })),
        };
    });
}
exports.setupHereWallet = setupHereWallet;
