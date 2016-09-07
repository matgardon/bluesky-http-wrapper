declare namespace bluesky.core.models.blueskyHttpClient {
    export interface IBlueskyHttpRequestConfig extends ng.IRequestShortcutConfig {
        /**
         * TODO MGA describe flags
         */
        endpointType?: EndpointType;
        useJwtAuthToken?: boolean;
        useCurrentUserRole?: boolean;
        disableXmlHttpRequestHeader?: boolean;
        disableToasterNotifications?: boolean;

        //TODO MGA: encapsulate in an UploadConfig object
        file?: File,
        uploadInBase64Json?: boolean;
        uploadProgress?: () => any;

    }
}