namespace bluesky.core.model.blueskyHttpClient {

    import EndpointTypeEnum = core.model.clientConfig.EndpointTypeEnum;

    /**
     * TODO MGA Doc
     */
    export interface IBlueskyHttpRequestConfig extends ng.IRequestShortcutConfig {

        endpointType?: EndpointTypeEnum;

        useCurrentUserRole?: boolean;
        disableXmlHttpRequestHeader?: boolean;
        disableToasterNotifications?: boolean;

        //TODO MGA: encapsulate in an UploadConfig object
        file?: File,
        uploadInBase64Json?: boolean;
        uploadProgress?: () => any;

    }
}