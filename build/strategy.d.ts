export interface Strategy {
    onInitialized?: (link: string) => void;
    onCompleted?: () => void;
}
export declare const popupStrategy: () => Strategy;
export declare const iframeStrategy: () => Strategy;
