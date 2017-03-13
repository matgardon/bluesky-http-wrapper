namespace bluesky.core.model.blueskyHttpClient {
    export interface FileContent {
        name: string;
        size: number;
        type: string;
        content: ArrayBuffer;
    }
}