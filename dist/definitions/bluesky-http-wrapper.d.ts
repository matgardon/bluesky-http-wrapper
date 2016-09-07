declare namespace bluesky.core.services {
    import UserRoleEntryDto = bluesky.core.models.userManagement.UserRoleEntryDto;
    /**
     * Provider for the BlueskyHttpWrapper.
     * Enables per-consumer configuration of the http service to set custom configuration URL to fetch data from:
     *  - Client initial configuration URL from the origin the app was loaded from.
     *  - UserRole to use of already fetched from another place.
     */
    class BlueskyHttpWrapperProvider implements ng.IServiceProvider {
        private getClientConfigInitializationUrl;
        private selectedUserRole;
        setClientConfigURL(clientConfigUrlToUse: string): void;
        setUserRoleToUse(userRole: UserRoleEntryDto): void;
        $get: ($http: ng.IHttpService, $window: ng.IWindowService, $log: ng.ILogService, $q: ng.IQService, $location: ng.ILocationService, Upload: ng.angularFileUpload.IUploadService, toaster: ngtoaster.IToasterService) => IBlueskyHttpWrapper;
    }
}

declare namespace bluesky.core.services {
    import UserRoleEntryDto = bluesky.core.models.userManagement.UserRoleEntryDto;
    import BlueskyAjaxClientConfig = bluesky.core.models.blueskyHttpClient.BlueskyAjaxClientConfig;
    import BlueskyHttpRequestConfig = bluesky.core.models.blueskyHttpClient.IBlueskyHttpRequestConfig;
    import FileContent = bluesky.core.models.blueskyHttpClient.FileContent;
    import EndpointType = bluesky.core.models.blueskyHttpClient.EndpointType;
    /**
     * TODO MGA comment
     */
    interface IBlueskyHttpWrapper {
        /**
         * All srv-side configuration of this http client, provided by the injected 'configInitializationURL' endpoint.
         * This configuration data is loaded upon initialization of this service (to be used as a singleton in the app). All other web calls are blocked as long as this one is not finished.
         */
        blueskyAjaxClientConfig: BlueskyAjaxClientConfig;
        get<T>(url: string, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        delete<T>(url: string, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        post<T>(url: string, data: any, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        put<T>(url: string, data: any, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        upload<T>(url: string, file: File, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        getFile(url: string, config?: BlueskyHttpRequestConfig): ng.IPromise<FileContent>;
        buildUrlFromContext(urlInput: string): string;
    }
    class BlueskyHttpWrapper implements IBlueskyHttpWrapper {
        private $http;
        private $window;
        private $log;
        private $q;
        private $location;
        private Upload;
        private toaster;
        private configInitializationURL;
        private selectedUserRole;
        private getConfigPromise;
        blueskyAjaxClientConfig: BlueskyAjaxClientConfig;
        constructor($http: ng.IHttpService, $window: ng.IWindowService, $log: ng.ILogService, $q: ng.IQService, $location: ng.ILocationService, Upload: ng.angularFileUpload.IUploadService, toaster: ngtoaster.IToasterService, configInitializationURL: string, selectedUserRole: UserRoleEntryDto);
        get<T>(url: string, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        delete<T>(url: string, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        post<T>(url: string, data: any, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        put<T>(url: string, data: any, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        /**
         * TODO MGA: not DRY with ajax method, how to keep it in sync ?
         * @param url
         * @param file
         * @param config
         */
        upload<T>(url: string, file: File, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        /**
         * This method is used to download a file in the form of a byte-stream from an endpoint and wrap it into a FileContent object with name, type & size properties read from the HTTP response headers of the serveur.
         * It is the responsability of the consumer to do something with the wrapped byteArray (for example download the file, or show it inside the webPage etc).
         * TODO MGA: not DRY with ajax method, how to keep it in sync ?
         * @param url
         * @param expectedName
         * @param expectedSize
         * @param expectedType
         * @param config
         */
        getFile(url: string, config?: BlueskyHttpRequestConfig): ng.IPromise<FileContent>;
        /**
         * Tries to parse the input url :
         * If it seems to be a full URL, then return as is (considers it external Url)
         * Otherwise, tries to find the base URL of the current BlueSky app with or without the included Controller and returns the full Url
         * @param urlInput : TODO MGA: document different kind of urls that this method can take as input (full, partial etc)
         * @return null if not able to compute url. Otherwise, url of the request either partial or full based on endpointType.
         */
        buildUrlFromContext(urlInput: string, endpointType?: EndpointType): string;
        /**
         * Utility method.
         * Main caller that all wrapper calls (get, delete, post, put) must use to share common behavior.
         * @param config
         */
        private ajax<T>(method, url, config?);
        /**
        * Prepares a {@link ng#$http#config config} object for $http call.
        * The operations include setting default values when not provided, and setting http headers if needed for :
        *  - Ajax calls
        *  - Authorization token
        *  - Current UserRole.
        * @param options
        * @returns {ng.$http.config} the configuration object ready to be injected into a $http call.
        */
        private configureHttpCall;
        /**
         * Success handler.
         * Captures the input parameters at the moment of its declaration & return the real handler to be called upon promise completion.
         * Input parameters:
         *  - callingConfig: configuration used to make the ajax call, in case the returned promise is null/empty and doesn't contain necessary data for debugging.
         *  - getCompleteResponseObject: flag indication if we must return the full response object along with headers and status or only the inner data. By default & if not specified, only returns inner data.
         */
        private onSuccess;
        /**
         * Error handler
         * TODO MGA: angular signatures indicates that parameter is rejection reason, not necessarily httpPromise: investigate & fix if necessary
         * @param httpPromise
         * @returns {}
         */
        private onError;
        /**
         * Function called at the end of an ajax call, regardless of it's success or failure.
         * @param response
         * TODO MGA inversion of responsability: make this extensible so that specifc apps can plug into this event workflow
         */
        private finally;
        private getUrlPath(actionIsOnSameController);
        private getCurrentSessionID();
        /**
         * Trim the content-disposition header to return only the filename.
         * @param contentDispositionHeader
         */
        private getFileNameFromHeaderContentDisposition(contentDispositionHeader);
    }
}

declare namespace bluesky.core.models.blueskyHttpClient {
    import UserSsoDto = bluesky.core.models.userManagement.UserSsoDto;
    /**
     * TODO MGA: those parameters are specific to our auth & user role workflow in BS. A technical service should not be aware of them (inversion of responsability): create 2 services, one for technical behavior and one for functional behavior ?
     */
    interface BlueskyAjaxClientConfig {
        jwtAuthToken: string;
        currentUserRole: string;
        currentUser?: UserSsoDto;
        coreApiUrl?: string;
        marketingApiUrl?: string;
        quoteWizardUrl?: string;
        orderEntryUrl?: string;
        orderTrackingUrl?: string;
    }
}

declare namespace bluesky.core.models.blueskyHttpClient {
    interface IBlueskyHttpRequestConfig extends ng.IRequestShortcutConfig {
        /**
         * TODO MGA describe flags
         */
        endpointType?: EndpointType;
        useJwtAuthToken?: boolean;
        useCurrentUserRole?: boolean;
        disableXmlHttpRequestHeader?: boolean;
        disableToasterNotifications?: boolean;
        file?: File;
        uploadInBase64Json?: boolean;
        uploadProgress?: () => any;
    }
}

declare namespace bluesky.core.models.blueskyHttpClient {
    enum EndpointType {
        /** Use current domain from which the app was loaded. */
        ORIGIN,
        /** Use CoreAPI url. By default, handles auth & userRole. */
        CORE_API,
        /** Use MarketingAPI url. By default, ignores auth & userRole. */
        MARKETING_API,
        /** Use QuoteWizard url of the current env. By default, ignores auth, session & userRole. */
        QUOTE_WIZARD,
        /** Use OrderEntry url of the current env. By default, ignores auth, session & userRole. */
        ORDER_ENTRY,
        /** Use OrderTracking url of the current env. By default, ignores auth, session & userRole. */
        ORDER_TRACKING,
        /** External URL. By default, do nothing & pass it to $http service. */
        EXTERNAL,
    }
}

declare namespace bluesky.core.models.blueskyHttpClient {
    interface FileContent {
        name: string;
        size: number;
        type: string;
        content: ArrayBuffer;
    }
}
