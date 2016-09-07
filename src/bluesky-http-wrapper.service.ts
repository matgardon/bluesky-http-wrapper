namespace bluesky.core.services {

    import UserRoleEntryDto = bluesky.core.models.userManagement.UserRoleEntryDto;
    import UserSsoDto = bluesky.core.models.userManagement.UserSsoDto;
    import BlueskyAjaxClientConfig = bluesky.core.models.blueskyHttpClient.BlueskyAjaxClientConfig;
    import BlueskyHttpRequestConfig = bluesky.core.models.blueskyHttpClient.IBlueskyHttpRequestConfig;
    import FileContent = bluesky.core.models.blueskyHttpClient.FileContent;
    import EndpointType = bluesky.core.models.blueskyHttpClient.EndpointType;

    enum HttpMethod { GET, POST, PUT, DELETE };

    //TODO MGA: make this injectable // configurable in config phase
    const CORE_API_ENDPOINT_SUFFIX = 'api';
    const MARKETING_API_ENDPOINT_SUFFIX = 'api';

    /**
     * TODO MGA comment
     */
    export interface IBlueskyHttpWrapper {

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

    export class BlueskyHttpWrapper implements IBlueskyHttpWrapper {

        //#region properties

        private getConfigPromise: ng.IPromise<any>;

        public blueskyAjaxClientConfig: BlueskyAjaxClientConfig;

        //#endregion

        //#region ctor

        /* @ngInject */
        constructor(
            private $http: ng.IHttpService,
            private $window: ng.IWindowService,
            private $log: ng.ILogService,
            private $q: ng.IQService,
            private $location: ng.ILocationService,
            private Upload: ng.angularFileUpload.IUploadService,
            private toaster: ngtoaster.IToasterService,
            private configInitializationURL: string,
            private selectedUserRole: UserRoleEntryDto
        ) {

            // 1 - fetch the configuration data necessary for this service to run from the provided endpoint

            var configurationEndpointUrl = this.buildUrlFromContext(configInitializationURL, EndpointType.ORIGIN);

            if (!configurationEndpointUrl) {
                this.$log.error(`[BlueskyHttpWrapper][Initialization] - Unable to build url from initialConfig url '${configInitializationURL}' with endpointType '${EndpointType[EndpointType.ORIGIN]}'. Aborting blueskyHttpService init.`);
                return;
            }

            this.getConfigPromise = this.$http.get<BlueskyAjaxClientConfig>(configurationEndpointUrl)
                .then<BlueskyAjaxClientConfig>(
                    // success
                    (clientConfigPromise) => {
                        //TODO MGA: reject status not in 2XX ?
                        if (!clientConfigPromise.data) {
                            var msg = `Unable to retrieve http config data from '${configInitializationURL}'. Aborting blueskyHttpWrapperService initialization.`;
                            this.$log.error(msg);
                            //TODO MGA: toaster ?
                            return this.$q.reject(msg);
                        }

                        this.blueskyAjaxClientConfig = clientConfigPromise.data;
                        return clientConfigPromise.data;
                    },
                    // error
                    (error) => {
                        this.$log.error('Unable to retrieve API config. Aborting blueskyHttpWrapperService initialization.');
                        return this.$q.reject(error);
                    })
                .then<BlueskyAjaxClientConfig>(
                    // success
                    (blueskyClientConfig) => {
                        //TODO MGA: handle case where client-side userRole was provided and not == srv-side user role ?
                        if (!blueskyClientConfig.currentUserRole) {
                            //If not provided by domain from which code was loaded, then try to fetch default userRole from CAPI endpoint
                            return this.get<UserSsoDto>('user-sso?profile=', { endpointType: EndpointType.CORE_API }).then<BlueskyAjaxClientConfig>(
                                (userSso) => {
                                    if (!userSso || !userSso.userRoleEntry) {
                                        var msg = 'Unable to retrieve CoreAPI default userSSO. Aborting httpWrapperService initialization.';
                                        this.$log.error(msg);
                                        return this.$q.reject(msg);
                                    }

                                    var userRoleToUse = selectedUserRole || userSso.userRoleEntry;

                                    //TODO MGA: this needs to be put in shared extension method / service
                                    this.blueskyAjaxClientConfig.currentUserRole = userRoleToUse.name + " " + userRoleToUse.role + " " + userRoleToUse.silo;

                                    this.blueskyAjaxClientConfig.currentUser = userSso;

                                    return blueskyClientConfig;
                                });
                        } else {

                            //TODO MGA: we only load userSSO if no userRole was provided srv-side, should we load it in all cases ?

                            // already defined userRole sent from origin app, use it & set it as default.
                            return blueskyClientConfig;
                        }
                });
        }


        //#endregion

        //#region public methods

        get<T>(url: string, config?: BlueskyHttpRequestConfig): ng.IPromise<T> {
            return this.ajax<T>(HttpMethod.GET, url, config);
        }

        delete<T>(url: string, config?: BlueskyHttpRequestConfig): ng.IPromise<T> {
            return this.ajax<T>(HttpMethod.DELETE, url, config);
        }

        post<T>(url: string, data: any, config?: BlueskyHttpRequestConfig): ng.IPromise<T> {
            config = config || {};
            config.data = data || config.data;;
            return this.ajax<T>(HttpMethod.POST, url, config);
        }

        put<T>(url: string, data: any, config?: BlueskyHttpRequestConfig): ng.IPromise<T> {
            config = config || {};
            config.data = data || config.data;
            return this.ajax<T>(HttpMethod.PUT, url, config);
        }

        /**
         * TODO MGA: not DRY with ajax method, how to keep it in sync ?
         * @param url
         * @param file
         * @param config
         */
        upload<T>(url: string, file: File, config?: BlueskyHttpRequestConfig): ng.IPromise<T> {

            if (!file && (!config || !config.file)) {
                this.$log.error('Cannot start upload with null {file} parameter.');
                return null;
            }

            config = config || {};
            config.file = file || config.file; //TODO MGA : do not expose file in IBlueskyHttpRequestConfig ?
            config.data = config.data || {};

            if (config.uploadInBase64Json) {
                //TODO MGA: make sure this delays next call and upload is not done before base64 encoding is finished, even if promise is already resolved ???
                return this.Upload.base64DataUrl(file).then((fileBase64Url) => {
                    //TODO MGA: hard-coded key to fetch base64 encoding, to parametrize with server-side !
                    config.data.fileBase64Url = fileBase64Url;
                    //normal post in case of base64-encoded data
                    return this.ajax<T>(HttpMethod.POST, url, config);
                });
            } else {
                config.data.fileFormDataName = 'file'; // file formData name ('Content-Disposition'), server side request form name

                //TODO MGA : do not block if not call to internal API ? (initCall)
                return this.getConfigPromise.then(() => {

                    //TODO MGA : behavior duplication with this.ajax, not DRY, to improve
                    var requestConfig = this.configureHttpCall(HttpMethod.POST, url, config);

                    if (requestConfig) // if no config returned, configuration failed, do not start ajax request
                        return this.Upload.upload<T>(<ng.angularFileUpload.IFileUploadConfigFile>requestConfig) //TODO MGA : not safe hard cast
                            .then<T>(this.onSuccess<T>(config), this.onError<T>(config), config.uploadProgress) //TODO MGA : uploadProgress callback ok ?
                            .finally(this.finally);
                });
            }
        }

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
        getFile(url: string, config?: BlueskyHttpRequestConfig): ng.IPromise<FileContent> {
            return this.getConfigPromise.then(() => {

                var angularHttpConfig = this.configureHttpCall(HttpMethod.GET, url, config);

                // if no config returned, configuration failed, do not start ajax request
                if (!angularHttpConfig) {
                    return this.$q.reject('Unable to configure request correctly. Aborting getFile ajax call.');
                }

                // specifically expect raw response type, otherwise byte stream responses are corrupted.
                angularHttpConfig.responseType = 'arraybuffer';

                //Expected ArrayBuffer response = byte array
                return this.$http<ArrayBuffer>(angularHttpConfig)
                    .then<FileContent>((httpResponse) => {

                        //benefit from successCallback validation before continuing
                        var arrayBuffer = this.onSuccess<ArrayBuffer>(config)(httpResponse);

                        //TODO MGA: promise rejection vs. return null ?
                        if (!arrayBuffer) return null; //stop processing if unable to retrieve byte array

                        //read file info from response-headers
                        var fileContent: FileContent = {
                            name: this.getFileNameFromHeaderContentDisposition(httpResponse.headers('content-disposition')) || null,
                            size: Number(httpResponse.headers('content-length')) || 0,
                            type: httpResponse.headers('content-type') || 'application/octet-stream',
                            content: arrayBuffer
                        };

                        return fileContent;

                    }, this.onError)
                    .finally(this.finally);
            });
        }

        /**
         * Tries to parse the input url :
         * If it seems to be a full URL, then return as is (considers it external Url) 
         * Otherwise, tries to find the base URL of the current BlueSky app with or without the included Controller and returns the full Url 
         * @param urlInput : TODO MGA: document different kind of urls that this method can take as input (full, partial etc)
         * @return null if not able to compute url. Otherwise, url of the request either partial or full based on endpointType.
         */
        public buildUrlFromContext(urlInput: string, endpointType?: EndpointType): string {

            if (!urlInput) {
                this.$log.error('No URL input provided.');
                return null;
            }

            // If Url starts with http:// or https:// => return as is, even if endpointType is not external.
            if (urlInput.slice(0, 'http://'.length) === 'http://' ||
                urlInput.slice(0, 'https://'.length) === 'https://') {
                return urlInput;
            }

            // Else, we have a partial URL to complete: use provided endpoint type to determine how to complete url.

            // Default value for endpointType if not provided is origin. TODO MGA: rule to discuss, here for retro-compatibility.
            endpointType = endpointType || EndpointType.ORIGIN;

            if (endpointType === EndpointType.EXTERNAL) {
                this.$log.warn('Partial url provided for an external endpoint: the call will probably fail.');
                // do not modify provided url if external (we cannot know how to complete it, even if partial).
                return urlInput;
            } else {
                //Compute url as combination of base url & url fragment given as input

                var baseUrl: string = null;

                if (endpointType === EndpointType.CORE_API) {

                    if (!this.blueskyAjaxClientConfig || !this.blueskyAjaxClientConfig.coreApiUrl) {
                        this.$log.error('Missing coreApiUrl in BlueskyAjaxClientConfig. cannot build valid url.');
                        return null;
                    }

                    baseUrl = this.blueskyAjaxClientConfig.coreApiUrl + CORE_API_ENDPOINT_SUFFIX;

                } else if (endpointType === EndpointType.MARKETING_API) {

                    if (!this.blueskyAjaxClientConfig || !this.blueskyAjaxClientConfig.marketingApiUrl) {
                        this.$log.error('Missing marketingApiUrl in BlueskyAjaxClientConfig. cannot build valid url.');
                        return null;
                    }

                    baseUrl = this.blueskyAjaxClientConfig.marketingApiUrl + MARKETING_API_ENDPOINT_SUFFIX;

                } else if (endpointType === EndpointType.QUOTE_WIZARD) {

                    if (!this.blueskyAjaxClientConfig || !this.blueskyAjaxClientConfig.quoteWizardUrl) {
                        this.$log.error('Missing quoteWizardUrl in BlueskyAjaxClientConfig. cannot build valid url.');
                        return null;
                    }

                    //TODO MGA: how to handle OM apps external calls without session provided ? will result in a redirect and call will probably fail ...
                    baseUrl = this.blueskyAjaxClientConfig.quoteWizardUrl;

                } else if (endpointType === EndpointType.ORDER_ENTRY) {

                    if (!this.blueskyAjaxClientConfig || !this.blueskyAjaxClientConfig.orderEntryUrl) {
                        this.$log.error('Missing orderEntryUrl in BlueskyAjaxClientConfig. cannot build valid url.');
                        return null;
                    }

                    //TODO MGA: how to handle OM apps external calls without session provided ? will result in a redirect and call will probably fail ...
                    baseUrl = this.blueskyAjaxClientConfig.orderEntryUrl;

                } else if (endpointType === EndpointType.ORDER_TRACKING) {

                    if (!this.blueskyAjaxClientConfig || !this.blueskyAjaxClientConfig.orderTrackingUrl) {
                        this.$log.error('Missing orderTrackingUrl in BlueskyAjaxClientConfig. cannot build valid url.');
                        return null;
                    }

                    //TODO MGA: how to handle OM apps external calls without session provided ? will result in a redirect and call will probably fail ...
                    baseUrl = this.blueskyAjaxClientConfig.orderTrackingUrl;

                } else if (endpointType === EndpointType.ORIGIN) {

                    // Regex trying to determine if the input fragment contains a / between two character suites => controller given as input, otherwise, action on same controller expected
                    var controllerIsPresentRegex = /\w+\/\w+/;

                    var actionIsOnSameController = !controllerIsPresentRegex.test(urlInput);

                    baseUrl = this.getUrlPath(actionIsOnSameController);

                } else {
                    this.$log.error('Unsupported endpointType provided. Should not happen (expected default value Origin). Aborting.');
                    return null;
                }

                // Boolean used to try to determine correct full url (add / or not before the url fragment depending on if found or not)
                var urlFragmentStartsWithSlash = urlInput.slice(0, 1) === '/';
                var baseUrlFragmentEndsWithSlash = baseUrl.slice(baseUrl.length - 1, baseUrl.length) === '/';

                //based on starting/trailing slashes, return full url.
                if (baseUrlFragmentEndsWithSlash && urlFragmentStartsWithSlash)
                    // remove last '/' on baseUrl
                    return baseUrl.slice(0, baseUrl.length - 1) + urlInput;
                else if (!baseUrlFragmentEndsWithSlash && !urlFragmentStartsWithSlash)
                    return baseUrl + '/' + urlInput;
                else if ((baseUrlFragmentEndsWithSlash && !urlFragmentStartsWithSlash) ||
                    (!baseUrlFragmentEndsWithSlash && urlFragmentStartsWithSlash))
                    return baseUrl + urlInput;
            }

            return null;
        }

        //#endregion

        //#region private methods

        /**
         * Utility method.
         * Main caller that all wrapper calls (get, delete, post, put) must use to share common behavior.
         * @param config
         */
        private ajax<T>(method: HttpMethod, url: string, config?: BlueskyHttpRequestConfig): ng.IPromise<T> {
            //TODO MGA : make sure getConfig resolve automatically without overhead once first call sucessfull.
            //TODO MGA : do not block if not call to internal API (initCall)
            return this.getConfigPromise.then(() => {
                var angularHttpConfig = this.configureHttpCall(method, url, config);

                if (angularHttpConfig) // if no config returned, configuration failed, do not start ajax request
                    return this.$http<T>(angularHttpConfig)
                        .then<T>(this.onSuccess<T>(config), this.onError<T>(config))
                        .finally(this.finally);
            });
        }

        /**
        * Prepares a {@link ng#$http#config config} object for $http call.
        * The operations include setting default values when not provided, and setting http headers if needed for :
        *  - Ajax calls
        *  - Authorization token
        *  - Current UserRole.   
        * @param options
        * @returns {ng.$http.config} the configuration object ready to be injected into a $http call. 
        */
        private configureHttpCall = (method: HttpMethod, url: string, config?: BlueskyHttpRequestConfig): ng.IRequestConfig => {

            // input validation

            if (!url || method === null || method === undefined) {
                this.$log.error('URL & METHOD parameters are necessary for httpWrapper calls. Aborting.');
                return null;
            }

            // set default config values and custom ones based on endpoints

            config = config || {};

            config.endpointType = config.endpointType || EndpointType.ORIGIN; // default value: if not specified, endpoint to use is supposed to be the origin. 

            //TODO MGA: hard cast is not safe, we may forget to set url & method parameters. TOFIX.
            // automatically get all non-filtered parameters & keep them for this new object.
            var configFull = <ng.IRequestConfig>config;

            //TODO MGA: support mapping between upload & post here ?
            configFull.method = HttpMethod[method];

            configFull.headers = config.headers || {};

            // configure default config flags based on target endpoint
            if (config.endpointType === EndpointType.CORE_API) {

                // Reject explicitly wrong input configurations
                if (config.disableXmlHttpRequestHeader ||
                    config.useCurrentUserRole === false ||
                    config.useJwtAuthToken === false) {
                    this.$log.warn(`[BlueskyHttpWrapper][configureHttpCall] [${configFull.method} / ${url}] - CoreAPI call intended with incompatible configuration options. Aborting ajax call.`, config);
                    return null;
                }

                // config values for CoreAPI endpoint are different from default, so we must specify them.
                config.disableXmlHttpRequestHeader = false;
                config.useJwtAuthToken = true;
                config.useCurrentUserRole = true;
            } else if (config.endpointType === EndpointType.MARKETING_API ||
                config.endpointType === EndpointType.ORIGIN ||
                config.endpointType === EndpointType.QUOTE_WIZARD ||
                config.endpointType === EndpointType.ORDER_ENTRY ||
                config.endpointType === EndpointType.ORDER_TRACKING) {
                // TODO MGA: provide more complete feedbacks on those specific endpoints ?
                if (config.useCurrentUserRole ||
                    config.useJwtAuthToken)
                    this.$log.warn('[BlueskyHttpWrapper][configureHttpCall] - UserRole & JwtToken should not be provided for target endpoint. ');

            } else if (config.endpointType === EndpointType.EXTERNAL) {
                config.disableXmlHttpRequestHeader = true; // do not add XmlHttpRequest if external Url by default: might create conflicts on certain servers. TODO MGA to confirm
            } else {
                this.$log.error(`[BlueskyHttpWrapper][configureHttpCall][${configFull.method} / ${url}] - Unsupported endpointType provided: '${EndpointType[config.endpointType]}'. Aborting.`);
            }

            //TODO MGA: set default values after endpoint-specific configurations
            config.disableXmlHttpRequestHeader = config.disableXmlHttpRequestHeader || false; // default value is enabled (ajax calls on .NET endpoints).
            config.useCurrentUserRole = config.useCurrentUserRole || false; // default value: don't transmit sensitive information to remote if not explicitly specified.
            config.useJwtAuthToken = config.useJwtAuthToken || false; // default value: don't transmit sensitive information to remote if not explicitly specified.
            config.disableToasterNotifications = config.disableToasterNotifications || false; //set default value for disableToasterNotifications to false as it's part of the normal behavior expected for this service.


            // Try to build a valid url from input & endpointType.
            configFull.url = this.buildUrlFromContext(url, config.endpointType);

            if (!configFull.url) {
                this.$log.error(`[BlueskyHttpWrapper][configureHttpCall] - Unable to build url from urlInput '${url}' with endpointType '${EndpointType[config.endpointType]}'. Aborting ajax call.`);
                return null;
            }

            if (!config.disableXmlHttpRequestHeader)
                //TODO MGA: hard coded header to put in CONST
                configFull.headers['X-Requested-With'] = 'XMLHttpRequest';

            if (config.useCurrentUserRole) {
                // Reject call when missing mandatory information
                if (!this.blueskyAjaxClientConfig || !this.blueskyAjaxClientConfig.currentUserRole) {
                    this.$log.error(`[BlueskyHttpWrapper][configureHttpCall] [${configFull.method} / ${url}] - Ajax call intended without necessary userRole in blueskyAjaxClientConfig. Aborting.`);
                    return null;
                }
                //TODO MGA: hard coded header to put in CONST
                configFull.headers['OA-UserRole'] = this.blueskyAjaxClientConfig.currentUserRole;
            }

            if (config.useJwtAuthToken) {
                // Reject call when missing mandatory information
                if (!this.blueskyAjaxClientConfig || !this.blueskyAjaxClientConfig.jwtAuthToken) {
                    this.$log.error(`[BlueskyHttpWrapper][configureHttpCall] [${configFull.method} / ${url}] - Ajax call intended without necessary jwtToken in blueskyAjaxClientConfig. Aborting.`);
                    return null;
                }
                //TODO MGA: hard coded header to put in CONST
                configFull.headers['Authorization'] = 'Bearer ' + this.blueskyAjaxClientConfig.jwtAuthToken;
            }

            //TODO MGA: OE specific code, to remove, or at least put in as config param
            if ((<any>this.$window).block_UI !== undefined)
                // TODO MGA : type casting, is it okay or not ? better approach ?
                (<any>this.$window).preventBlockUI = true;

            return configFull;
        }

        /**
         * Success handler.
         * Captures the input parameters at the moment of its declaration & return the real handler to be called upon promise completion.
         * Input parameters:
         *  - callingConfig: configuration used to make the ajax call, in case the returned promise is null/empty and doesn't contain necessary data for debugging.
         *  - getCompleteResponseObject: flag indication if we must return the full response object along with headers and status or only the inner data. By default & if not specified, only returns inner data.
         */
        private onSuccess = <T>(originalConfig: BlueskyHttpRequestConfig): (httpPromise: ng.IHttpPromiseCallbackArg<T>) => T => {
            return <T>(httpPromise: ng.IHttpPromiseCallbackArg<T>): T => {
                if (!httpPromise) {
                    this.$log.error(`[HTTP no-response] Unexpected $http error, no response promise returned.`);

                    if (!originalConfig.disableToasterNotifications)
                        this.toaster.error('Unexpected behavior', 'Please contact your local support team.');

                    return null;
                    //TODO MGA: handle multi-type return in case of rejection or do something else ? this method is currently used synchronously without promise waiting.
                    //return this.$q.reject(httpPromise); // Reject promise
                }

                //TODO MGA: reject if status != 2XX ?

                //TODO MGA: handle when API is fixed. See http://stackoverflow.com/questions/11746894/what-is-the-proper-rest-response-code-for-a-valid-request-but-an-empty-data
                //if ((promiseCallback.data === null || promiseCallback.data === undefined) && promiseCallback.status !== 204) {
                //    this.$log.error('Unexpected response from the server, expected response data but none found.');
                //    this.toaster.warning('Unexpected response', 'Please contact your local support team.');
                //    return this.$q.reject(promiseCallback); // Reject promise if not well-formed data
                //}
                //TODO MGA: same behavior also on a GET request ? if request is GET and response is 200 with no data, return error ? (pass in parameter request context to log this error).

                //TODO MGA: get full url of request
                this.$log.debug(`[HTTP ${httpPromise.config.method}] [${httpPromise.config.url}]`, httpPromise);

                // return only the data expected for caller
                return httpPromise.data;

            };
        }

        /**
         * Error handler
         * TODO MGA: angular signatures indicates that parameter is rejection reason, not necessarily httpPromise: investigate & fix if necessary
         * @param httpPromise 
         * @returns {} 
         */
        private onError = <T>(originalConfig: BlueskyHttpRequestConfig): (httpPromise: ng.IHttpPromiseCallbackArg<any>) => any => {

            return <T>(httpPromise: ng.IHttpPromiseCallbackArg<any>): any => {
                // We suppose in case of no response that the srv didn't send any response.
                // TODO MGA: may also be a fault in internal $http / ajax client side lib, to distinguish.
                if (!httpPromise || !httpPromise.data) {
                    httpPromise.data = 'Server not responding';
                    httpPromise.status = 503;
                }

                if (!originalConfig.disableToasterNotifications) {

                    var contentType = httpPromise.headers('Content-Type');


                    //check contentType to try to display error message
                    if (contentType && (contentType.indexOf('application/json') > -1 || contentType.indexOf('text/plain') > -1)) {

                        var message: string = ""; //default message

                        //TODO MGA: handle error handling more generically based on input error message contract instead of expecting specific error strcture.

                        //if (response.data.ModelState) {
                        //    //TODO MGA : handle this when well formatted server-side
                        //} else
                        if (httpPromise.data.Message && angular.isString(httpPromise.data.Message)) {
                            message = httpPromise.data.Message;
                        } else if (angular.isString(httpPromise.data)) {
                            message = httpPromise.data;
                        }

                        //TODO MGA: handle more response codes gracefully.
                        if (httpPromise.status === 404) {
                            this.toaster.warning('Not Found', message);
                        } else {
                            this.toaster.error('Server response error', message + '\n Status: ' + httpPromise.status);
                        }


                    } else {
                        this.toaster.error('Internal server error', 'Status: ' + httpPromise.status);
                    }
                }

                //TODO MGA: get full url of request
                this.$log.error(`[HTTP ${httpPromise.config.method}] [${httpPromise.config.url}]`, httpPromise);

                // We don't recover from error, so we propagate it : below handlers have the choice of reading the error with an error handler or not. See $q promises behavior here : https://github.com/kriskowal/q
                // This behavior is desired so that we show error inside specific server communication modals at specific places in the app, otherwise show a global alert message, or even do not show anything if not necessary (do not ad an error handler in below handlers of this promise).
                return this.$q.reject(httpPromise);
            }
        }

        /**
         * Function called at the end of an ajax call, regardless of it's success or failure.
         * @param response
         * TODO MGA inversion of responsability: make this extensible so that specifc apps can plug into this event workflow
         */
        private finally = (): void => {
            //TODO MGA: OE-specific code
            if ((<any>this.$window).block_UI !== undefined)
                // TODO MGA : type casting, is it okay or not ? better approach ?
                (<any>this.$window).preventBlockUI = false;
        }

        // TODO MGA : using method from Layout.js : to document to not handle duplicate code !!
        private getUrlPath(actionIsOnSameController: boolean): string {

            var baseUrlRegex = /(\/\w+\/\(S\(\w+\)\))\/\w+/;
            var url = this.$window.location.pathname;
            var baseUrlMatches = baseUrlRegex.exec(url);

            if (baseUrlMatches && baseUrlMatches.length && baseUrlMatches.length === 2) {

                var baseUrlWithControllerName = baseUrlMatches[0];
                var baseUrl = baseUrlMatches[1];

                if (actionIsOnSameController) {
                    return baseUrlWithControllerName;
                } else {
                    return baseUrl;
                }
            }

            return '';
        }

        //TODO MGA: OM-specific ASP MVC code, not used ATM, to remove
        private getCurrentSessionID(): string {

            //TODO MGA : magic regexp to fetch SessionID in URL, to store elsewhere !
            var sessionRegex = /https:\/\/[\w.]+\/[\w.]+\/(\(S\(\w+\)\))\/.*/;
            //var sessionRegex = /https:\/\/[\w.]+\/OrderEntry\/(\(S\(\w+\)\))\/.*/;

            // TODO MGA : update regexp to the one below
            //var baseUrlRegex = /(https:\/\/[\w.-]+\/[\w.-]+\/\(S\(\w+\)\)\/)\w+/;


            var path = this.$location.absUrl();

            var regexpArray = sessionRegex.exec(path);

            if (!regexpArray) {
                this.$log.error('Unable to recognized searched pattern in current url location to retrieve sessionID.');
                return '';
            }
            if (regexpArray.length === 1) {
                this.$log.error('Unable to find sessionID in searched pattern in current url.');
                return '';
            }
            if (regexpArray.length > 2) {
                this.$log.error('Too many matches found for the sessionID search in the current url.');
                return '';
            }

            return regexpArray[1];
        }

        /**
         * Trim the content-disposition header to return only the filename.
         * @param contentDispositionHeader
         */
        private getFileNameFromHeaderContentDisposition(contentDispositionHeader: string): string {
            if (!contentDispositionHeader) return null;

            var result = contentDispositionHeader.split(';')[1].trim().split('=')[1];

            return result.replace(/"/g, '');
        }

        //#endregion
    }
}