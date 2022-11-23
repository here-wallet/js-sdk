import { HereConfiguration } from "./utils";
export interface AsyncHereSignDelegate {
    onInitialized?: (link: string) => void;
    onApproving?: (link: string) => void;
}
export interface AsyncHereSignResult {
    public_key?: string;
    account_id: string;
    transaction_hash: string;
}
export declare const asyncHereSign: (config: HereConfiguration, options: Record<string, string>, delegate?: AsyncHereSignDelegate) => Promise<AsyncHereSignResult>;
