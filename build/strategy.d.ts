export interface AsyncHereSignResult {
    public_key?: string;
    account_id: string;
    transaction_hash?: string;
    status: number;
}
export interface Strategy {
    onInitialized?: () => void;
    onRequested?: (link: string) => void;
    onApproving?: () => void;
    onSuccess?: (result: AsyncHereSignResult) => void;
    onFailed?: (e: unknown) => void;
}
export declare class DefaultStrategy implements Strategy {
    signWindow: Window;
    unloadHandler: () => void;
    onInitialized(): void;
    onRequested(link: any): void;
    onFailed(): void;
    onSuccess(): void;
}
