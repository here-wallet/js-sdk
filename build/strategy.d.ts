/// <reference types="node" />
import { HereProviderResult } from "./provider";
export interface HereStrategy {
    onInitialized?: () => void;
    onRequested?: (link: string, args: Record<string, string>, reject: (p?: string) => void) => void;
    onApproving?: (result: HereProviderResult) => void;
    onSuccess?: (result: HereProviderResult) => void;
    onFailed?: (result: HereProviderResult) => void;
}
export declare class DefaultStrategy implements HereStrategy {
    signWindow: Window | null;
    unloadHandler?: () => void;
    timerHandler?: NodeJS.Timeout;
    onInitialized(): void;
    onRequested(link: string, args: Record<string, string>, reject: (p?: string) => void): void;
    close(): void;
    onFailed: () => void;
    onSuccess: () => void;
}
