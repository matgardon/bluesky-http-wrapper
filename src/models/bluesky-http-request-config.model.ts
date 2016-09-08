namespace bluesky.core.models.blueskyHttpClient {
    export interface IBlueskyHttpRequestConfig extends ng.IRequestShortcutConfig {
        /**
         * TODO MGA describe flags
         */
        endpointType?: EndpointType;

        useCoreApiJwtAuthToken?: boolean;
        //TODO MGA: use flags for other APIs using auth token ! &/or remove auth token param from this, as it's mandatory for apis using it ?

        useCurrentUserRole?: boolean;
        disableXmlHttpRequestHeader?: boolean;
        disableToasterNotifications?: boolean;

        //TODO MGA: encapsulate in an UploadConfig object
        file?: File,
        uploadInBase64Json?: boolean;
        uploadProgress?: () => any;

    }
}