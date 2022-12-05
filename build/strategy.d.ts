import { HereProviderResult } from "./provider";
export interface Strategy {
    onInitialized?: () => void;
    onRequested?: (link: string, args: Record<string, string>) => void;
    onApproving?: (result: HereProviderResult) => void;
    onSuccess?: (result: HereProviderResult) => void;
    onFailed?: (result: HereProviderResult) => void;
}
export declare class DefaultStrategy implements Strategy {
    signWindow: Window | null;
    unloadHandler: () => void;
    onInitialized(): void;
    onRequested(link: string): void;
    close(): void;
    onFailed: () => void;
    onSuccess: () => void;
}
