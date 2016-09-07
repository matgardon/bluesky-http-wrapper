declare namespace bluesky.core.models.blueskyHttpClient {
    export interface FileContent {
        name: string;
        size: number;
        type: string;
        content: ArrayBuffer;
    }
}