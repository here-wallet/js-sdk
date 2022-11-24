import { AsyncHereSignResult, Strategy } from "./strategy";
import { HereConfiguration } from "./utils";
export interface AsyncHereSignDelegate extends Strategy {
    strategy?: Strategy;
}
export declare const asyncHereSign: (config: HereConfiguration, options: Record<string, string>, delegate?: AsyncHereSignDelegate) => Promise<AsyncHereSignResult>;
