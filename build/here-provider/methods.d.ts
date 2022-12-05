import { HereProviderResult } from "../provider";
export declare const proxyApi = "https://h4n.app";
export declare const getRequest: (id: string, signal?: AbortSignal | undefined) => Promise<Record<string, string>>;
export declare const getResponse: (id: string) => Promise<HereProviderResult>;
export declare const deleteRequest: (id: string) => Promise<void>;
export declare const createRequest: (args: Record<string, string>, signal?: AbortSignal | undefined) => Promise<string>;
