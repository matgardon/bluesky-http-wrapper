declare namespace bluesky.core.model.blueskyHttpClient {
    import EndpointTypeEnum = core.model.clientConfig.EndpointTypeEnum;
    /**
     * TODO MGA Doc
     */
    interface IBlueskyHttpRequestConfig extends ng.IRequestShortcutConfig {
        endpointType?: EndpointTypeEnum;
        useCurrentUserRole?: boolean;
        disableXmlHttpRequestHeader?: boolean;
        disableToasterNotifications?: boolean;
        file?: File;
        uploadInBase64Json?: boolean;
        uploadProgress?: () => any;
    }
}

declare namespace bluesky.core.model.blueskyHttpClient {
    interface FileContent {
        name: string;
        size: number;
        type: string;
        content: ArrayBuffer;
    }
}

/// <reference types="angular" />
/// <reference types="angular-mocks" />
/// <reference types="ng-file-upload" />
/// <reference types="ngtoaster" />
declare namespace bluesky.core.service {
    import UserRoleEntryDto = bluesky.core.model.userManagement.IUserRoleEntryDto;
    /**
     * Provider for the BlueskyHttpWrapper.
     * Enables per-consumer configuration of the http service to set custom configuration URL to fetch data from:
     *  - Client initial configuration URL from the origin the app was loaded from.
     *  - UserRole to use of already fetched from another place.
     */
    class BlueskyHttpWrapperProvider implements ng.IServiceProvider {
        private getClientConfigInitializationUrl;
        private selectedUserRole;
        setClientConfigURL(clientConfigUrlToUse: string | undefined): void;
        setUserRoleToUse(userRole: UserRoleEntryDto | undefined): void;
        $get: ($http: angular.IHttpService, $window: angular.IWindowService, $log: angular.ILogService, $q: angular.IQService, Upload: angular.angularFileUpload.IUploadService, toaster: toaster.IToasterService) => IBlueskyHttpWrapper;
    }
}

/// <reference types="angular" />
/// <reference types="angular-mocks" />
/// <reference types="ng-file-upload" />
/// <reference types="ngtoaster" />
declare namespace bluesky.core.service {
    import UserRoleEntryDto = bluesky.core.model.userManagement.IUserRoleEntryDto;
    import BlueskyHttpRequestConfig = bluesky.core.model.blueskyHttpClient.IBlueskyHttpRequestConfig;
    import FileContent = bluesky.core.model.blueskyHttpClient.FileContent;
    import BlueskyAjaxClientConfigurationDto = bluesky.core.model.clientConfig.IBlueskyAjaxClientConfigurationDto;
    import EndpointTypeEnum = bluesky.core.model.clientConfig.EndpointTypeEnum;
    enum HttpMethod {
        GET = 0,
        POST = 1,
        PUT = 2,
        PATCH = 3,
        DELETE = 4,
    }
    /**
     * TODO MGA comment
     */
    interface IBlueskyHttpWrapper {
        /**
         * All srv-side configuration of this http client, provided by the injected 'configInitializationURL' endpoint.
         * This configuration data is loaded upon initialization of this service (to be used as a singleton in the app). All other web calls are blocked as long as this one is not finished.
         */
        blueskyAjaxClientConfig: BlueskyAjaxClientConfigurationDto;
        /**
         * Promise resolved only once the ajaxConfig has been correctly fetched from server & the current user & user role has been loaded (if needed) & set.
         */
        getAjaxConfigFromServerPromise: ng.IPromise<BlueskyAjaxClientConfigurationDto>;
        get<T>(url: string, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        delete<T>(url: string, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        post<T>(url: string, data: any, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        put<T>(url: string, data: any, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        patch<T>(url: string, data: any, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        upload<T>(url: string, file: File, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        getFile(url: string, config?: BlueskyHttpRequestConfig): ng.IPromise<FileContent>;
        buildUrlFromContext(urlInput: string): string | undefined;
    }
    class BlueskyHttpWrapper implements IBlueskyHttpWrapper {
        private $http;
        private $window;
        private $log;
        private $q;
        private Upload;
        private toaster;
        private selectedUserRole;
        getAjaxConfigFromServerPromise: ng.IPromise<BlueskyAjaxClientConfigurationDto>;
        blueskyAjaxClientConfig: BlueskyAjaxClientConfigurationDto;
        constructor($http: ng.IHttpService, $window: ng.IWindowService, $log: ng.ILogService, $q: ng.IQService, Upload: ng.angularFileUpload.IUploadService, toaster: toaster.IToasterService, selectedUserRole: UserRoleEntryDto | undefined, configInitializationURL: string);
        get<T>(url: string, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        delete<T>(url: string, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        post<T>(url: string, data: any, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        put<T>(url: string, data: any, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        patch<T>(url: string, data: any, config?: BlueskyHttpRequestConfig): ng.IPromise<T>;
        /**
         * TODO MGA: not DRY with ajax method, how to keep it in sync ?
         * @param url
         * @param file
         * @param config
         */
        upload<T>(url: string, file: File, config?: BlueskyHttpRequestConfig): ng.IPromise<T> | ng.IPromise<never>;
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
        getFile(url: string, config?: BlueskyHttpRequestConfig): ng.IPromise<FileContent> | ng.IPromise<never>;
        /**
         * Tries to parse the input url :
         * If it seems to be a full URL, then return as is (considers it external Url)
         * Otherwise, tries to find the base URL of the current BlueSky app with or without the included Controller and returns the full Url
         * @param urlInput : TODO MGA: document different kind of urls that this method can take as input (full, partial etc)
         * @return null if not able to compute url. Otherwise, url of the request either partial or full based on endpointType.
         */
        buildUrlFromContext(urlInput: string, endpointType?: EndpointTypeEnum): string | undefined;
        /**
         * Utility method.
         * Main caller that all wrapper calls (get, delete, post, put) must use to share common behavior.
         * @param config
         */
        private ajax<T>(method, url, config?);
        /**
         * Prepares bluesky-specific configuration based on provided inputs.
         * The operations include setting default values when not provided, and setting http headers if needed for :
         *  - Ajax calls
         *  - Authorization token
         *  - Current UserRole.
         * @param config user input config if provided.
         * @returns the configuration object with automatic rules applied.
         */
        private setupBlueskyConfig;
        private extractAngularConfigFromBlueskyConfig;
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
        /**
         * Trim the content-disposition header to return only the filename.
         * @param contentDispositionHeader
         */
        private getFileNameFromHeaderContentDisposition(contentDispositionHeader);
    }
}
