import { Strategy } from "./strategy";
import { HereConfiguration } from "./utils";
export interface AsyncHereSignDelegate {
    forceRedirect?: boolean;
    onInitialized?: (link: string) => void;
    onApproving?: (link: string) => void;
    strategy?: () => Strategy;
}
export interface AsyncHereSignResult {
    public_key?: string;
    account_id: string;
    transaction_hash?: string;
    status: number;
}
export declare const asyncHereSign: (config: HereConfiguration, options: Record<string, string>, delegate: AsyncHereSignDelegate, strategy: Strategy) => Promise<AsyncHereSignResult>;
