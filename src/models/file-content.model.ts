declare namespace bluesky.core.models {
    export interface FileContent {
        name: string;
        size: number;
        type: string;
        content: ArrayBuffer;
    }
}