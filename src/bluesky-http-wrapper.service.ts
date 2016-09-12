namespace bluesky.core.services {

    import UserRoleEntryDto = bluesky.core.models.userManagement.UserRoleEntryDto;
    import UserSsoDto = bluesky.core.models.userManagement.UserSsoDto;
    import BlueskyHttpRequestConfig = bluesky.core.models.blueskyHttpClient.IBlueskyHttpRequestConfig;
    import FileContent = bluesky.core.models.blueskyHttpClient.FileContent;
    import BlueskyAjaxClientConfigurationDto = bluesky.core.models.clientConfig.BlueskyAjaxClientConfigurationDto;
    import EndpointTypeEnum = bluesky.core.models.clientConfig.EndpointTypeEnum;

    enum HttpMethod { GET, POST, PUT, DELETE };

    /**
     * TODO MGA comment
     */
    export interface IBlueskyHttpWrapper {

        /**
         * All srv-side configuration of this http client, provided by the injected 'configInitializationURL' endpoint.
         * This configuration data is loaded upon initialization of this service (to be used as a singleton in the app). All other web calls are blocked as long as this one is not finished.
         */
        blueskyAjaxClientConfig: BlueskyAjaxClientConfigurationDto;

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

        public blueskyAjaxClientConfig: BlueskyAjaxClientConfigurationDto;

        //#endregion

        //#region ctor

        /* @ngInject */
        constructor(
            private _: UnderscoreStatic,
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

            var configurationEndpointUrl = this.buildUrlFromContext(configInitializationURL, EndpointTypeEnum.CurrentDomain);

            if (!configurationEndpointUrl) {
                this.$log.error(`[BlueskyHttpWrapper][Initialization] - Unable to build url from initialConfig url '${configInitializationURL}' with endpointType '${EndpointTypeEnum[EndpointTypeEnum.CurrentDomain]}'. Aborting blueskyHttpService init.`);
                return;
            }

            this.getConfigPromise = this.$http.get<BlueskyAjaxClientConfigurationDto>(configurationEndpointUrl)
                .then<BlueskyAjaxClientConfigurationDto>(
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
                .then<BlueskyAjaxClientConfigurationDto>(
                // success
                (blueskyClientConfig) => {
                    //TODO MGA: handle case where client-side userRole was provided and not == srv-side user role !
                    if (!blueskyClientConfig.currentUserRole) {
                        //If not provided by domain from which code was loaded, then try to fetch default userRole from CAPI endpoint
                        return this.get<UserSsoDto>('user-sso?profile=', { endpointType: EndpointTypeEnum.CoreApi }).then<BlueskyAjaxClientConfigurationDto>(
                            (userSso) => {
                                if (!userSso || !userSso.userRoleEntry) {
                                    var msg = 'Unable to retrieve CoreAPI default userSSO. Aborting httpWrapperService initialization.';
                                    this.$log.error(msg);
                                    return this.$q.reject(msg);
                                }

                                //TODO MGA: make sure selectedUserRole is available in the list of userSSO roles, otherwise select default !
                                //TODO MGA: how to inform back the DA that selectedUserRole was reset ? invert responsability & store userRole in localStorage from this service ?
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

                    return null; //TODO MGA: what to return ?
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
        public buildUrlFromContext(urlInput: string, endpointType?: EndpointTypeEnum): string {

            if (!urlInput) {
                this.$log.error('No URL input provided.');
                return null;
            }

            // If Url starts with http:// or https:// => return as is, even if endpointType is not external.
            if (urlInput.slice(0, 'http://'.length) === 'http://' ||
                urlInput.slice(0, 'https://'.length) === 'https://') {

                if (endpointType !== EndpointTypeEnum.External)
                    this.$log.warn('Full URL provided for a call that is not flagged as \'External\' endpointType, this is bad practice as only the blueskyWrapper should know about the baseURL of target endpoints (loaded from server, depending on the current env). Use partial URLs.');

                return urlInput;
            }

            // Else, we have a partial URL to complete: use provided endpoint type to determine how to complete url.

            // Default value for endpointType if not provided is origin. TODO MGA: rule to discuss, here for retro-compatibility.
            endpointType = endpointType || EndpointTypeEnum.CurrentDomain;

            var baseUrl: string;

            if (endpointType === EndpointTypeEnum.External) {
                this.$log.warn('Partial url provided for a call with endpointType flagged as \'External\': the call will probably fail.');

                // do not modify provided url if external (we cannot know how to complete it, even if partial).
                return urlInput;

            } else if (endpointType === EndpointTypeEnum.CurrentDomain) {

                // Regex trying to determine if the input fragment contains a / between two character suites => controller given as input, otherwise, action on same controller expected
                var controllerIsPresentRegex = /\w+\/\w+/;

                var actionIsOnSameController = !controllerIsPresentRegex.test(urlInput);

                baseUrl = this.getUrlPath(actionIsOnSameController);
            } else {
                // For all other endpointTypes: compute URL as a combination of baseURL & suffix if present, as provided by server-configuration.

                if (!this.blueskyAjaxClientConfig ||
                    !this.blueskyAjaxClientConfig.endpointConfigurationDictionnary) {
                    this.$log.error('Expected endpointConfigurationDictionnary provided but none found. Aborting.');
                    return null;
                }

                var endpointConfig = this.blueskyAjaxClientConfig.endpointConfigurationDictionnary[endpointType];

                if (!endpointConfig) {
                    this.$log.error(`EndpointType '${EndpointTypeEnum[endpointType]}' is not 'External' or 'CurrentDomain', expected corresponding endpointConfiguration provided in blueskyAjaxClientConfig.endpointConfigurationDictionnary but none found. Aborting.`);
                    return null;
                }

                baseUrl = endpointConfig.endpointBaseURL + (endpointConfig.endpointSuffix || '');
            }

            //TODO MGA: how to handle OM apps external calls without session provided ? will result in a redirect and call may fail ?

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

            config.endpointType = config.endpointType || EndpointTypeEnum.CurrentDomain; // default value: if not specified, endpoint to use is supposed to be the origin.

            //TODO MGA: hard cast is not safe, we may forget to set url & method parameters. TOFIX.
            // automatically get all non-filtered parameters & keep them for this new object.
            var configFull = <ng.IRequestConfig>config;

            //TODO MGA: support mapping between upload & post here ?
            configFull.method = HttpMethod[method];

            configFull.headers = config.headers || {};

            // configure default config flags based on target endpoint
            switch (config.endpointType) {
                case EndpointTypeEnum.CoreApi:
                case EndpointTypeEnum.MarketingApi:
                case EndpointTypeEnum.SelfcareApi:
                    // Reject explicitly wrong input configurations
                    if (config.disableXmlHttpRequestHeader) {
                        this.$log.warn(`[BlueskyHttpWrapper][configureHttpCall] [${configFull.method} / ${url}] - API call intended with incompatible configuration options. Aborting ajax call.`, config);
                        return null;
                    }

                    // config values for API endpoints are different from default, so we must specify them.
                    config.disableXmlHttpRequestHeader = false; // by default already enabled, but enfore this header as necessary for calls to WebAPI endpoints.
                    config.useCurrentUserRole = true; // for api calls, force this role to be passed around (should be mandatory to contextualize request to realm of current user).
                    break;
                case EndpointTypeEnum.QuoteWizard:
                case EndpointTypeEnum.OrderEntry:
                case EndpointTypeEnum.OrderTracking:
                    // for OM apps called as endpoints, make sure the XmlHttpRequest header is present (ASP.NET apps).
                    config.disableXmlHttpRequestHeader = false;
                    //TODO MGA: add currentUserRole by default so that OM apps can contextualise the request ?
                    break;
                case EndpointTypeEnum.Metranet:
                case EndpointTypeEnum.TechnicalInventory:
                case EndpointTypeEnum.TemplateGenerator:
                case EndpointTypeEnum.Salesforce:
                    //TODO MGA: no specific config for those external endpoints ? add custom ones if needed here.
                    break;
                case EndpointTypeEnum.CurrentDomain:
                    // for ajax calls, make sure the XmlHttpRequest header is present (ASP.NET apps).
                    config.disableXmlHttpRequestHeader = false;
                    break;
                case EndpointTypeEnum.External:
                    //TODO MGA to confirm
                    config.disableXmlHttpRequestHeader = true; // do not add XmlHttpRequest if external Url by default: might create conflicts on certain servers.
                    break;
                default:
                    this.$log.error(`[BlueskyHttpWrapper][configureHttpCall][${configFull.method} / ${url}] - Unsupported endpointType provided: '${EndpointTypeEnum[config.endpointType]}'. Aborting.`);
                    break;
            }

            //Reject ajax calls intended to external endpoints without necessary configuration loaded from the server.
            if (config.endpointType !== EndpointTypeEnum.CurrentDomain &&
                config.endpointType !== EndpointTypeEnum.External &&
                (!this.blueskyAjaxClientConfig ||
                    !this.blueskyAjaxClientConfig.endpointConfigurationDictionnary[config.endpointType])) {
                this.$log.error(`[BlueskyHttpWrapper][configureHttpCall] [${configFull.method} / ${url}] - Ajax call intended without expected endpoint configuration loaded from the server for endpointType '${EndpointTypeEnum[config.endpointType]}'. Aborting.`);
                return null;
            }

            //TODO MGA: set default values after endpoint-specific configurations
            config.disableXmlHttpRequestHeader = config.disableXmlHttpRequestHeader || false; // default value is enabled (ajax calls on .NET endpoints).
            config.useCurrentUserRole = config.useCurrentUserRole || false; // default value: don't transmit sensitive information to remote if not explicitly specified.
            config.disableToasterNotifications = config.disableToasterNotifications || false; //set default value for disableToasterNotifications to false as it's part of the normal behavior expected for this service.

            // Try to build a valid url from input & endpointType.
            configFull.url = this.buildUrlFromContext(url, config.endpointType);

            if (!configFull.url) {
                this.$log.error(`[BlueskyHttpWrapper][configureHttpCall] - Unable to build url from urlInput '${url}' with endpointType '${EndpointTypeEnum[config.endpointType]}'. Aborting ajax call.`);
                return null;
            }

            if (!config.disableXmlHttpRequestHeader)
                //TODO MGA: hard coded header to put in CONST
                configFull.headers['X-Requested-With'] = 'XMLHttpRequest';

            if (config.useCurrentUserRole) {
                // Reject call when missing mandatory information
                if (!this.blueskyAjaxClientConfig.currentUserRole) {
                    this.$log.error(`[BlueskyHttpWrapper][configureHttpCall] [${configFull.method} / ${url}] - Ajax call intended without necessary userRole set in config. Aborting.`);
                    return null;
                }
                //TODO MGA: hard coded header to put in CONST
                configFull.headers['OA-UserRole'] = this.blueskyAjaxClientConfig.currentUserRole;
            }

            var currentEndpointConfig = this.blueskyAjaxClientConfig && this.blueskyAjaxClientConfig.endpointConfigurationDictionnary[config.endpointType];
        
            // If auth token provided for target endpoint, add it in header
            if (currentEndpointConfig.authToken) {

                //TODO MGA: reject authToken for endpoints that are not 'safe' to share auth token with, such as External ones ? Or authorize this so that server can load an auth token for certain external endpoints ?

                //TODO MGA: handle token validity endDate: renew auth before the call ! What's the best moment to do it ?

                //TODO MGA: hard coded header to put in CONST
                configFull.headers['Authorization'] = 'Bearer ' + currentEndpointConfig.authToken;
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
        //TODO MGA: unrobust, needs solid refacto to make it more generic when on origin domain !
        private getUrlPath(actionIsOnSameController: boolean): string {

            var baseUrlOmAppsRegex = /(\/\w+\/\(S\(\w+\)\))\/\w+/;
            var baseUrlAspAppsRegex = /(\/\w+)\/\w+/;

            var url = this.$window.location.pathname;
            var baseUrlOmAppsMatches = baseUrlOmAppsRegex.exec(url);
            var baseUrlAspAppsMatches = baseUrlAspAppsRegex.exec(url);

            var baseUrlWithControllerName: string = null;
            var baseUrl: string = null;

            // 2 matches = regex matches + the capturing group
            if (baseUrlOmAppsMatches && baseUrlOmAppsMatches.length && baseUrlOmAppsMatches.length === 2) {

                baseUrlWithControllerName = baseUrlOmAppsMatches[0];
                baseUrl = baseUrlOmAppsMatches[1];
            }

            if (baseUrlAspAppsMatches && baseUrlAspAppsMatches.length && baseUrlAspAppsMatches.length === 2) {
                baseUrlWithControllerName = baseUrlAspAppsMatches[0];
                baseUrl = baseUrlAspAppsMatches[1];
            }

            if (actionIsOnSameController && baseUrlWithControllerName) {
                return baseUrlWithControllerName;
            } else if (baseUrl) {
                return baseUrl;
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