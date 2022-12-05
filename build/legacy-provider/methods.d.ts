import { HereProviderResult } from "../provider";
export declare const getRequest: (hereApi: string, id: string, signal?: AbortSignal | undefined) => Promise<Record<string, string>>;
export declare const getTransactionStatus: (api: string, request: string) => Promise<HereProviderResult>;
export declare const createRequest: (hereApi: string, hereConnector: string, request: string, options: Record<string, string>, signal?: AbortSignal | undefined) => Promise<void>;
