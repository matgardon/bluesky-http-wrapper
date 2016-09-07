var bluesky;
(function (bluesky) {
    var core;
    (function (core) {
        var services;
        (function (services) {
            /**
             * Provider for the BlueskyHttpWrapper.
             * Enables per-consumer configuration of the http service to set custom configuration URL to fetch data from:
             *  - Client initial configuration URL from the origin the app was loaded from.
             *  - UserRole to use of already fetched from another place.
             */
            var BlueskyHttpWrapperProvider = (function () {
                function BlueskyHttpWrapperProvider() {
                    var _this = this;
                    //#region private properties
                    this.getClientConfigInitializationUrl = 'CoreApiAuth/GetCoreApiConfig'; // by default: TODO MGA change it in all OM apps ! not a meaningfull name.
                    this.selectedUserRole = null; // by default not-set.
                    //#endregion
                    // Provider's factory function
                    /* @ngInject */
                    this.$get = ["$http", "$window", "$log", "$q", "$location", "Upload", "toaster", function ($http, $window, $log, $q, $location, Upload, toaster) {
                        return new services.BlueskyHttpWrapper($http, $window, $log, $q, $location, Upload, toaster, _this.getClientConfigInitializationUrl, _this.selectedUserRole);
                    }];
                    this.$get.$inject = ["$http", "$window", "$log", "$q", "$location", "Upload", "toaster"];
                }
                //#endregion
                //#region public configuration methods
                BlueskyHttpWrapperProvider.prototype.setClientConfigURL = function (clientConfigUrlToUse) {
                    this.getClientConfigInitializationUrl = clientConfigUrlToUse || this.getClientConfigInitializationUrl;
                };
                BlueskyHttpWrapperProvider.prototype.setUserRoleToUse = function (userRole) {
                    this.selectedUserRole = userRole || null;
                };
                return BlueskyHttpWrapperProvider;
            }());
            services.BlueskyHttpWrapperProvider = BlueskyHttpWrapperProvider;
            angular.module('bluesky.httpWrapper', ['toaster', 'ngAnimate', 'ngFileUpload'])
                .provider('blueskyHttpWrapper', BlueskyHttpWrapperProvider);
        })(services = core.services || (core.services = {}));
    })(core = bluesky.core || (bluesky.core = {}));
})(bluesky || (bluesky = {}));

var bluesky;
(function (bluesky) {
    var core;
    (function (core) {
        var services;
        (function (services) {
            var EndpointType = bluesky.core.models.blueskyHttpClient.EndpointType;
            var HttpMethod;
            (function (HttpMethod) {
                HttpMethod[HttpMethod["GET"] = 0] = "GET";
                HttpMethod[HttpMethod["POST"] = 1] = "POST";
                HttpMethod[HttpMethod["PUT"] = 2] = "PUT";
                HttpMethod[HttpMethod["DELETE"] = 3] = "DELETE";
            })(HttpMethod || (HttpMethod = {}));
            ;
            //TODO MGA: make this injectable // configurable in config phase
            var CORE_API_ENDPOINT_SUFFIX = 'api';
            var MARKETING_API_ENDPOINT_SUFFIX = 'api';
            var BlueskyHttpWrapper = (function () {
                //#endregion
                //#region ctor
                /* @ngInject */
                BlueskyHttpWrapper.$inject = ["$http", "$window", "$log", "$q", "$location", "Upload", "toaster", "configInitializationURL", "selectedUserRole"];
                function BlueskyHttpWrapper($http, $window, $log, $q, $location, Upload, toaster, configInitializationURL, selectedUserRole) {
                    // 1 - fetch the configuration data necessary for this service to run from the provided endpoint
                    var _this = this;
                    this.$http = $http;
                    this.$window = $window;
                    this.$log = $log;
                    this.$q = $q;
                    this.$location = $location;
                    this.Upload = Upload;
                    this.toaster = toaster;
                    this.configInitializationURL = configInitializationURL;
                    this.selectedUserRole = selectedUserRole;
                    /**
                    * Prepares a {@link ng#$http#config config} object for $http call.
                    * The operations include setting default values when not provided, and setting http headers if needed for :
                    *  - Ajax calls
                    *  - Authorization token
                    *  - Current UserRole.
                    * @param options
                    * @returns {ng.$http.config} the configuration object ready to be injected into a $http call.
                    */
                    this.configureHttpCall = function (method, url, config) {
                        // input validation
                        if (!url || method === null || method === undefined) {
                            _this.$log.error('URL & METHOD parameters are necessary for httpWrapper calls. Aborting.');
                            return null;
                        }
                        // set default config values and custom ones based on endpoints
                        config = config || {};
                        config.endpointType = config.endpointType || EndpointType.ORIGIN; // default value: if not specified, endpoint to use is supposed to be the origin. 
                        //TODO MGA: hard cast is not safe, we may forget to set url & method parameters. TOFIX.
                        // automatically get all non-filtered parameters & keep them for this new object.
                        var configFull = config;
                        //TODO MGA: support mapping between upload & post here ?
                        configFull.method = HttpMethod[method];
                        configFull.headers = config.headers || {};
                        // configure default config flags based on target endpoint
                        if (config.endpointType === EndpointType.CORE_API) {
                            // Reject explicitly wrong input configurations
                            if (config.disableXmlHttpRequestHeader ||
                                config.useCurrentUserRole === false ||
                                config.useJwtAuthToken === false) {
                                _this.$log.warn("[BlueskyHttpWrapper][configureHttpCall] [" + configFull.method + " / " + url + "] - CoreAPI call intended with incompatible configuration options. Aborting ajax call.", config);
                                return null;
                            }
                            // config values for CoreAPI endpoint are different from default, so we must specify them.
                            config.disableXmlHttpRequestHeader = false;
                            config.useJwtAuthToken = true;
                            config.useCurrentUserRole = true;
                        }
                        else if (config.endpointType === EndpointType.MARKETING_API ||
                            config.endpointType === EndpointType.ORIGIN ||
                            config.endpointType === EndpointType.QUOTE_WIZARD ||
                            config.endpointType === EndpointType.ORDER_ENTRY ||
                            config.endpointType === EndpointType.ORDER_TRACKING) {
                            // TODO MGA: provide more complete feedbacks on those specific endpoints ?
                            if (config.useCurrentUserRole ||
                                config.useJwtAuthToken)
                                _this.$log.warn('[BlueskyHttpWrapper][configureHttpCall] - UserRole & JwtToken should not be provided for target endpoint. ');
                        }
                        else if (config.endpointType === EndpointType.EXTERNAL) {
                            config.disableXmlHttpRequestHeader = true; // do not add XmlHttpRequest if external Url by default: might create conflicts on certain servers. TODO MGA to confirm
                        }
                        else {
                            _this.$log.error("[BlueskyHttpWrapper][configureHttpCall][" + configFull.method + " / " + url + "] - Unsupported endpointType provided: '" + EndpointType[config.endpointType] + "'. Aborting.");
                        }
                        //TODO MGA: set default values after endpoint-specific configurations
                        config.disableXmlHttpRequestHeader = config.disableXmlHttpRequestHeader || false; // default value is enabled (ajax calls on .NET endpoints).
                        config.useCurrentUserRole = config.useCurrentUserRole || false; // default value: don't transmit sensitive information to remote if not explicitly specified.
                        config.useJwtAuthToken = config.useJwtAuthToken || false; // default value: don't transmit sensitive information to remote if not explicitly specified.
                        config.disableToasterNotifications = config.disableToasterNotifications || false; //set default value for disableToasterNotifications to false as it's part of the normal behavior expected for this service.
                        // Try to build a valid url from input & endpointType.
                        configFull.url = _this.buildUrlFromContext(url, config.endpointType);
                        if (!configFull.url) {
                            _this.$log.error("[BlueskyHttpWrapper][configureHttpCall] - Unable to build url from urlInput '" + url + "' with endpointType '" + EndpointType[config.endpointType] + "'. Aborting ajax call.");
                            return null;
                        }
                        if (!config.disableXmlHttpRequestHeader)
                            //TODO MGA: hard coded header to put in CONST
                            configFull.headers['X-Requested-With'] = 'XMLHttpRequest';
                        if (config.useCurrentUserRole) {
                            // Reject call when missing mandatory information
                            if (!_this.blueskyAjaxClientConfig || !_this.blueskyAjaxClientConfig.currentUserRole) {
                                _this.$log.error("[BlueskyHttpWrapper][configureHttpCall] [" + configFull.method + " / " + url + "] - Ajax call intended without necessary userRole in blueskyAjaxClientConfig. Aborting.");
                                return null;
                            }
                            //TODO MGA: hard coded header to put in CONST
                            configFull.headers['OA-UserRole'] = _this.blueskyAjaxClientConfig.currentUserRole;
                        }
                        if (config.useJwtAuthToken) {
                            // Reject call when missing mandatory information
                            if (!_this.blueskyAjaxClientConfig || !_this.blueskyAjaxClientConfig.jwtAuthToken) {
                                _this.$log.error("[BlueskyHttpWrapper][configureHttpCall] [" + configFull.method + " / " + url + "] - Ajax call intended without necessary jwtToken in blueskyAjaxClientConfig. Aborting.");
                                return null;
                            }
                            //TODO MGA: hard coded header to put in CONST
                            configFull.headers['Authorization'] = 'Bearer ' + _this.blueskyAjaxClientConfig.jwtAuthToken;
                        }
                        //TODO MGA: OE specific code, to remove, or at least put in as config param
                        if (_this.$window.block_UI !== undefined)
                            // TODO MGA : type casting, is it okay or not ? better approach ?
                            _this.$window.preventBlockUI = true;
                        return configFull;
                    };
                    /**
                     * Success handler.
                     * Captures the input parameters at the moment of its declaration & return the real handler to be called upon promise completion.
                     * Input parameters:
                     *  - callingConfig: configuration used to make the ajax call, in case the returned promise is null/empty and doesn't contain necessary data for debugging.
                     *  - getCompleteResponseObject: flag indication if we must return the full response object along with headers and status or only the inner data. By default & if not specified, only returns inner data.
                     */
                    this.onSuccess = function (originalConfig) {
                        return function (httpPromise) {
                            if (!httpPromise) {
                                _this.$log.error("[HTTP no-response] Unexpected $http error, no response promise returned.");
                                if (!originalConfig.disableToasterNotifications)
                                    _this.toaster.error('Unexpected behavior', 'Please contact your local support team.');
                                return null;
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
                            _this.$log.debug("[HTTP " + httpPromise.config.method + "] [" + httpPromise.config.url + "]", httpPromise);
                            // return only the data expected for caller
                            return httpPromise.data;
                        };
                    };
                    /**
                     * Error handler
                     * TODO MGA: angular signatures indicates that parameter is rejection reason, not necessarily httpPromise: investigate & fix if necessary
                     * @param httpPromise
                     * @returns {}
                     */
                    this.onError = function (originalConfig) {
                        return function (httpPromise) {
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
                                    var message = ""; //default message
                                    //TODO MGA: handle error handling more generically based on input error message contract instead of expecting specific error strcture.
                                    //if (response.data.ModelState) {
                                    //    //TODO MGA : handle this when well formatted server-side
                                    //} else
                                    if (httpPromise.data.Message && angular.isString(httpPromise.data.Message)) {
                                        message = httpPromise.data.Message;
                                    }
                                    else if (angular.isString(httpPromise.data)) {
                                        message = httpPromise.data;
                                    }
                                    //TODO MGA: handle more response codes gracefully.
                                    if (httpPromise.status === 404) {
                                        _this.toaster.warning('Not Found', message);
                                    }
                                    else {
                                        _this.toaster.error('Server response error', message + '\n Status: ' + httpPromise.status);
                                    }
                                }
                                else {
                                    _this.toaster.error('Internal server error', 'Status: ' + httpPromise.status);
                                }
                            }
                            //TODO MGA: get full url of request
                            _this.$log.error("[HTTP " + httpPromise.config.method + "] [" + httpPromise.config.url + "]", httpPromise);
                            // We don't recover from error, so we propagate it : below handlers have the choice of reading the error with an error handler or not. See $q promises behavior here : https://github.com/kriskowal/q
                            // This behavior is desired so that we show error inside specific server communication modals at specific places in the app, otherwise show a global alert message, or even do not show anything if not necessary (do not ad an error handler in below handlers of this promise).
                            return _this.$q.reject(httpPromise);
                        };
                    };
                    /**
                     * Function called at the end of an ajax call, regardless of it's success or failure.
                     * @param response
                     * TODO MGA inversion of responsability: make this extensible so that specifc apps can plug into this event workflow
                     */
                    this.finally = function () {
                        //TODO MGA: OE-specific code
                        if (_this.$window.block_UI !== undefined)
                            // TODO MGA : type casting, is it okay or not ? better approach ?
                            _this.$window.preventBlockUI = false;
                    };
                    var configurationEndpointUrl = this.buildUrlFromContext(configInitializationURL, EndpointType.ORIGIN);
                    if (!configurationEndpointUrl) {
                        this.$log.error("[BlueskyHttpWrapper][Initialization] - Unable to build url from initialConfig url '" + configInitializationURL + "' with endpointType '" + EndpointType[EndpointType.ORIGIN] + "'. Aborting blueskyHttpService init.");
                        return;
                    }
                    this.getConfigPromise = this.$http.get(configurationEndpointUrl)
                        .then(
                    // success
                    function (clientConfigPromise) {
                        //TODO MGA: reject status not in 2XX ?
                        if (!clientConfigPromise.data) {
                            var msg = "Unable to retrieve http config data from '" + configInitializationURL + "'. Aborting blueskyHttpWrapperService initialization.";
                            _this.$log.error(msg);
                            //TODO MGA: toaster ?
                            return _this.$q.reject(msg);
                        }
                        _this.blueskyAjaxClientConfig = clientConfigPromise.data;
                        return clientConfigPromise.data;
                    }, 
                    // error
                    function (error) {
                        _this.$log.error('Unable to retrieve API config. Aborting blueskyHttpWrapperService initialization.');
                        return _this.$q.reject(error);
                    })
                        .then(
                    // success
                    function (blueskyClientConfig) {
                        //TODO MGA: handle case where client-side userRole was provided and not == srv-side user role ?
                        if (!blueskyClientConfig.currentUserRole) {
                            //If not provided by domain from which code was loaded, then try to fetch default userRole from CAPI endpoint
                            return _this.get('user-sso?profile=', { endpointType: EndpointType.CORE_API }).then(function (userSso) {
                                if (!userSso || !userSso.userRoleEntry) {
                                    var msg = 'Unable to retrieve CoreAPI default userSSO. Aborting httpWrapperService initialization.';
                                    _this.$log.error(msg);
                                    return _this.$q.reject(msg);
                                }
                                var userRoleToUse = selectedUserRole || userSso.userRoleEntry;
                                //TODO MGA: this needs to be put in shared extension method / service
                                _this.blueskyAjaxClientConfig.currentUserRole = userRoleToUse.name + " " + userRoleToUse.role + " " + userRoleToUse.silo;
                                _this.blueskyAjaxClientConfig.currentUser = userSso;
                                return blueskyClientConfig;
                            });
                        }
                        else {
                            //TODO MGA: we only load userSSO if no userRole was provided srv-side, should we load it in all cases ?
                            // already defined userRole sent from origin app, use it & set it as default.
                            return blueskyClientConfig;
                        }
                    });
                }
                //#endregion
                //#region public methods
                BlueskyHttpWrapper.prototype.get = function (url, config) {
                    return this.ajax(HttpMethod.GET, url, config);
                };
                BlueskyHttpWrapper.prototype.delete = function (url, config) {
                    return this.ajax(HttpMethod.DELETE, url, config);
                };
                BlueskyHttpWrapper.prototype.post = function (url, data, config) {
                    config = config || {};
                    config.data = data || config.data;
                    ;
                    return this.ajax(HttpMethod.POST, url, config);
                };
                BlueskyHttpWrapper.prototype.put = function (url, data, config) {
                    config = config || {};
                    config.data = data || config.data;
                    return this.ajax(HttpMethod.PUT, url, config);
                };
                /**
                 * TODO MGA: not DRY with ajax method, how to keep it in sync ?
                 * @param url
                 * @param file
                 * @param config
                 */
                BlueskyHttpWrapper.prototype.upload = function (url, file, config) {
                    var _this = this;
                    if (!file && (!config || !config.file)) {
                        this.$log.error('Cannot start upload with null {file} parameter.');
                        return null;
                    }
                    config = config || {};
                    config.file = file || config.file; //TODO MGA : do not expose file in IBlueskyHttpRequestConfig ?
                    config.data = config.data || {};
                    if (config.uploadInBase64Json) {
                        //TODO MGA: make sure this delays next call and upload is not done before base64 encoding is finished, even if promise is already resolved ???
                        return this.Upload.base64DataUrl(file).then(function (fileBase64Url) {
                            //TODO MGA: hard-coded key to fetch base64 encoding, to parametrize with server-side !
                            config.data.fileBase64Url = fileBase64Url;
                            //normal post in case of base64-encoded data
                            return _this.ajax(HttpMethod.POST, url, config);
                        });
                    }
                    else {
                        config.data.fileFormDataName = 'file'; // file formData name ('Content-Disposition'), server side request form name
                        //TODO MGA : do not block if not call to internal API ? (initCall)
                        return this.getConfigPromise.then(function () {
                            //TODO MGA : behavior duplication with this.ajax, not DRY, to improve
                            var requestConfig = _this.configureHttpCall(HttpMethod.POST, url, config);
                            if (requestConfig)
                                return _this.Upload.upload(requestConfig) //TODO MGA : not safe hard cast
                                    .then(_this.onSuccess(config), _this.onError(config), config.uploadProgress) //TODO MGA : uploadProgress callback ok ?
                                    .finally(_this.finally);
                        });
                    }
                };
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
                BlueskyHttpWrapper.prototype.getFile = function (url, config) {
                    var _this = this;
                    return this.getConfigPromise.then(function () {
                        var angularHttpConfig = _this.configureHttpCall(HttpMethod.GET, url, config);
                        // if no config returned, configuration failed, do not start ajax request
                        if (!angularHttpConfig) {
                            return _this.$q.reject('Unable to configure request correctly. Aborting getFile ajax call.');
                        }
                        // specifically expect raw response type, otherwise byte stream responses are corrupted.
                        angularHttpConfig.responseType = 'arraybuffer';
                        //Expected ArrayBuffer response = byte array
                        return _this.$http(angularHttpConfig)
                            .then(function (httpResponse) {
                            //benefit from successCallback validation before continuing
                            var arrayBuffer = _this.onSuccess(config)(httpResponse);
                            //TODO MGA: promise rejection vs. return null ?
                            if (!arrayBuffer)
                                return null; //stop processing if unable to retrieve byte array
                            //read file info from response-headers
                            var fileContent = {
                                name: _this.getFileNameFromHeaderContentDisposition(httpResponse.headers('content-disposition')) || null,
                                size: Number(httpResponse.headers('content-length')) || 0,
                                type: httpResponse.headers('content-type') || 'application/octet-stream',
                                content: arrayBuffer
                            };
                            return fileContent;
                        }, _this.onError)
                            .finally(_this.finally);
                    });
                };
                /**
                 * Tries to parse the input url :
                 * If it seems to be a full URL, then return as is (considers it external Url)
                 * Otherwise, tries to find the base URL of the current BlueSky app with or without the included Controller and returns the full Url
                 * @param urlInput : TODO MGA: document different kind of urls that this method can take as input (full, partial etc)
                 * @return null if not able to compute url. Otherwise, url of the request either partial or full based on endpointType.
                 */
                BlueskyHttpWrapper.prototype.buildUrlFromContext = function (urlInput, endpointType) {
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
                    }
                    else {
                        //Compute url as combination of base url & url fragment given as input
                        var baseUrl = null;
                        if (endpointType === EndpointType.CORE_API) {
                            if (!this.blueskyAjaxClientConfig || !this.blueskyAjaxClientConfig.coreApiUrl) {
                                this.$log.error('Missing coreApiUrl in BlueskyAjaxClientConfig. cannot build valid url.');
                                return null;
                            }
                            baseUrl = this.blueskyAjaxClientConfig.coreApiUrl + CORE_API_ENDPOINT_SUFFIX;
                        }
                        else if (endpointType === EndpointType.MARKETING_API) {
                            if (!this.blueskyAjaxClientConfig || !this.blueskyAjaxClientConfig.marketingApiUrl) {
                                this.$log.error('Missing marketingApiUrl in BlueskyAjaxClientConfig. cannot build valid url.');
                                return null;
                            }
                            baseUrl = this.blueskyAjaxClientConfig.marketingApiUrl + MARKETING_API_ENDPOINT_SUFFIX;
                        }
                        else if (endpointType === EndpointType.QUOTE_WIZARD) {
                            if (!this.blueskyAjaxClientConfig || !this.blueskyAjaxClientConfig.quoteWizardUrl) {
                                this.$log.error('Missing quoteWizardUrl in BlueskyAjaxClientConfig. cannot build valid url.');
                                return null;
                            }
                            //TODO MGA: how to handle OM apps external calls without session provided ? will result in a redirect and call will probably fail ...
                            baseUrl = this.blueskyAjaxClientConfig.quoteWizardUrl;
                        }
                        else if (endpointType === EndpointType.ORDER_ENTRY) {
                            if (!this.blueskyAjaxClientConfig || !this.blueskyAjaxClientConfig.orderEntryUrl) {
                                this.$log.error('Missing orderEntryUrl in BlueskyAjaxClientConfig. cannot build valid url.');
                                return null;
                            }
                            //TODO MGA: how to handle OM apps external calls without session provided ? will result in a redirect and call will probably fail ...
                            baseUrl = this.blueskyAjaxClientConfig.orderEntryUrl;
                        }
                        else if (endpointType === EndpointType.ORDER_TRACKING) {
                            if (!this.blueskyAjaxClientConfig || !this.blueskyAjaxClientConfig.orderTrackingUrl) {
                                this.$log.error('Missing orderTrackingUrl in BlueskyAjaxClientConfig. cannot build valid url.');
                                return null;
                            }
                            //TODO MGA: how to handle OM apps external calls without session provided ? will result in a redirect and call will probably fail ...
                            baseUrl = this.blueskyAjaxClientConfig.orderTrackingUrl;
                        }
                        else if (endpointType === EndpointType.ORIGIN) {
                            // Regex trying to determine if the input fragment contains a / between two character suites => controller given as input, otherwise, action on same controller expected
                            var controllerIsPresentRegex = /\w+\/\w+/;
                            var actionIsOnSameController = !controllerIsPresentRegex.test(urlInput);
                            baseUrl = this.getUrlPath(actionIsOnSameController);
                        }
                        else {
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
                };
                //#endregion
                //#region private methods
                /**
                 * Utility method.
                 * Main caller that all wrapper calls (get, delete, post, put) must use to share common behavior.
                 * @param config
                 */
                BlueskyHttpWrapper.prototype.ajax = function (method, url, config) {
                    var _this = this;
                    //TODO MGA : make sure getConfig resolve automatically without overhead once first call sucessfull.
                    //TODO MGA : do not block if not call to internal API (initCall)
                    return this.getConfigPromise.then(function () {
                        var angularHttpConfig = _this.configureHttpCall(method, url, config);
                        if (angularHttpConfig)
                            return _this.$http(angularHttpConfig)
                                .then(_this.onSuccess(config), _this.onError(config))
                                .finally(_this.finally);
                    });
                };
                // TODO MGA : using method from Layout.js : to document to not handle duplicate code !!
                BlueskyHttpWrapper.prototype.getUrlPath = function (actionIsOnSameController) {
                    var baseUrlRegex = /(\/\w+\/\(S\(\w+\)\))\/\w+/;
                    var url = this.$window.location.pathname;
                    var baseUrlMatches = baseUrlRegex.exec(url);
                    if (baseUrlMatches && baseUrlMatches.length && baseUrlMatches.length === 2) {
                        var baseUrlWithControllerName = baseUrlMatches[0];
                        var baseUrl = baseUrlMatches[1];
                        if (actionIsOnSameController) {
                            return baseUrlWithControllerName;
                        }
                        else {
                            return baseUrl;
                        }
                    }
                    return '';
                };
                //TODO MGA: OM-specific ASP MVC code, not used ATM, to remove
                BlueskyHttpWrapper.prototype.getCurrentSessionID = function () {
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
                };
                /**
                 * Trim the content-disposition header to return only the filename.
                 * @param contentDispositionHeader
                 */
                BlueskyHttpWrapper.prototype.getFileNameFromHeaderContentDisposition = function (contentDispositionHeader) {
                    if (!contentDispositionHeader)
                        return null;
                    var result = contentDispositionHeader.split(';')[1].trim().split('=')[1];
                    return result.replace(/"/g, '');
                };
                return BlueskyHttpWrapper;
            }());
            services.BlueskyHttpWrapper = BlueskyHttpWrapper;
        })(services = core.services || (core.services = {}));
    })(core = bluesky.core || (bluesky.core = {}));
})(bluesky || (bluesky = {}));









//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJsdWVza3ktaHR0cC13cmFwcGVyLnByb3ZpZGVyLnRzIiwiYmx1ZXNreS1odHRwLXdyYXBwZXIuc2VydmljZS50cyIsIm1vZGVscy9maWxlLWNvbnRlbnQubW9kZWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBVTtBQUFWLENBQUEsVUFBVSxTQUFPO0lBQUMsSUFBQTtJQUFBLENBQUEsVUFBQSxNQUFJO1FBQUMsSUFBQTtRQUFBLENBQUEsVUFBQSxVQUFTOzs7Ozs7O1lBUzVCLElBQUEsOEJBQUEsWUFBQTtnQkFBQSxTQUFBLDZCQUFBO29CQUFBLElBQUEsUUFBQTs7b0JBSVksS0FBQSxtQ0FBMkM7b0JBQzNDLEtBQUEsbUJBQXFDOzs7O29CQWtCdEMsS0FBQSw0RUFBTyxVQUFDLE9BQ1gsU0FDQSxNQUNBLElBQ0EsV0FDQSxRQUNBLFNBQWtDO3dCQUVsQyxPQUFPLElBQUksU0FBUyxtQkFBbUIsT0FBTyxTQUFTLE1BQU0sSUFBSSxXQUFXLFFBQVEsU0FBUyxNQUFLLGtDQUFrQyxNQUFLOzs7Ozs7Z0JBcEJ0SSwyQkFBQSxVQUFBLHFCQUFQLFVBQTBCLHNCQUE0QjtvQkFDbEQsS0FBSyxtQ0FBbUMsd0JBQXdCLEtBQUs7O2dCQUdsRSwyQkFBQSxVQUFBLG1CQUFQLFVBQXdCLFVBQTBCO29CQUM5QyxLQUFLLG1CQUFtQixZQUFZOztnQkFpQjVDLE9BQUE7O1lBakNhLFNBQUEsNkJBQTBCO1lBbUN2QyxRQUFRLE9BQU8sdUJBQXVCLENBQUMsV0FBVyxhQUFhO2lCQUN2RCxTQUFTLHNCQUFzQjtXQTdDcEIsV0FBQSxLQUFBLGFBQUEsS0FBQSxXQUFRO09BQWIsT0FBQSxRQUFBLFNBQUEsUUFBQSxPQUFJO0dBQVosWUFBQSxVQUFPOztBQ0FqQixJQUFVO0FBQVYsQ0FBQSxVQUFVLFNBQU87SUFBQyxJQUFBO0lBQUEsQ0FBQSxVQUFBLE1BQUk7UUFBQyxJQUFBO1FBQUEsQ0FBQSxVQUFBLFVBQVM7WUFPNUIsSUFBTyxlQUFlLFFBQVEsS0FB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QzFCLE9BQU87OzZCQUNKOzRCQUNILE9BQU87OztvQkFJZixPQUFPOzs7Z0JBSUgsbUJBQUEsVUFBQSxzQkFBUixZQUFBOztvQkFHSSxJQUFJLGVBQWU7Ozs7b0JBT25CLElBQUksT0FBTyxLQUFLLFVBQVU7b0JBRTFCLElBQUksY0FBYyxhQUFhLEtBQUs7b0JBRXBDLElBQUksQ0FBQyxhQUFhO3dCQUNkLEtBQUssS0FBSyxNQUFNO3dCQUNoQixPQUFPOztvQkFFWCxJQUFJLFlBQVksV0FBVyxHQUFHO3dCQUMxQixLQUFLLEtBQUssTUFBTTt3QkFDaEIsT0FBTzs7b0JBRVgsSUFBSSxZQUFZLFNBQVMsR0FBRzt3QkFDeEIsS0FBSyxLQUFLLE1BQU07d0JBQ2hCLE9BQU87O29CQUdYLE9BQU8sWUFBWTs7Ozs7O2dCQU9mLG1CQUFBLFVBQUEsMENBQVIsVUFBZ0QsMEJBQWdDO29CQUM1RSxJQUFJLENBQUM7d0JBQTBCLE9BQU87b0JBRXRDLElBQUksU0FBUyx5QkFBeUIsTUFBTSxLQUFLLEdBQUcsT0FBTyxNQUFNLEtBQUs7b0JBRXRFLE9BQU8sT0FBTyxRQUFRLE1BQU07O2dCQUlwQyxPQUFBOztZQWpuQmEsU0FBQSxxQkFBa0I7V0F6Q1osV0FBQSxLQUFBLGFBQUEsS0FBQSxXQUFRO09BQWIsT0FBQSxRQUFBLFNBQUEsUUFBQSxPQUFJO0dBQVosWUFBQSxVQUFPOzs7Ozs7Ozs7QUNDakIiLCJmaWxlIjoiYmx1ZXNreS1odHRwLXdyYXBwZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJuYW1lc3BhY2UgYmx1ZXNreS5jb3JlLnNlcnZpY2VzIHtcclxuICAgIGltcG9ydCBVc2VyUm9sZUVudHJ5RHRvID0gYmx1ZXNreS5jb3JlLm1vZGVscy51c2VyTWFuYWdlbWVudC5Vc2VyUm9sZUVudHJ5RHRvO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUHJvdmlkZXIgZm9yIHRoZSBCbHVlc2t5SHR0cFdyYXBwZXIuXHJcbiAgICAgKiBFbmFibGVzIHBlci1jb25zdW1lciBjb25maWd1cmF0aW9uIG9mIHRoZSBodHRwIHNlcnZpY2UgdG8gc2V0IGN1c3RvbSBjb25maWd1cmF0aW9uIFVSTCB0byBmZXRjaCBkYXRhIGZyb206XHJcbiAgICAgKiAgLSBDbGllbnQgaW5pdGlhbCBjb25maWd1cmF0aW9uIFVSTCBmcm9tIHRoZSBvcmlnaW4gdGhlIGFwcCB3YXMgbG9hZGVkIGZyb20uXHJcbiAgICAgKiAgLSBVc2VyUm9sZSB0byB1c2Ugb2YgYWxyZWFkeSBmZXRjaGVkIGZyb20gYW5vdGhlciBwbGFjZS5cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEJsdWVza3lIdHRwV3JhcHBlclByb3ZpZGVyIGltcGxlbWVudHMgbmcuSVNlcnZpY2VQcm92aWRlciB7XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwcml2YXRlIHByb3BlcnRpZXNcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBnZXRDbGllbnRDb25maWdJbml0aWFsaXphdGlvblVybDogc3RyaW5nID0gJ0NvcmVBcGlBdXRoL0dldENvcmVBcGlDb25maWcnOyAvLyBieSBkZWZhdWx0OiBUT0RPIE1HQSBjaGFuZ2UgaXQgaW4gYWxsIE9NIGFwcHMgISBub3QgYSBtZWFuaW5nZnVsbCBuYW1lLlxyXG4gICAgICAgIHByaXZhdGUgc2VsZWN0ZWRVc2VyUm9sZTogVXNlclJvbGVFbnRyeUR0byA9IG51bGw7IC8vIGJ5IGRlZmF1bHQgbm90LXNldC5cclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwdWJsaWMgY29uZmlndXJhdGlvbiBtZXRob2RzXHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRDbGllbnRDb25maWdVUkwoY2xpZW50Q29uZmlnVXJsVG9Vc2U6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmdldENsaWVudENvbmZpZ0luaXRpYWxpemF0aW9uVXJsID0gY2xpZW50Q29uZmlnVXJsVG9Vc2UgfHwgdGhpcy5nZXRDbGllbnRDb25maWdJbml0aWFsaXphdGlvblVybDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRVc2VyUm9sZVRvVXNlKHVzZXJSb2xlOiBVc2VyUm9sZUVudHJ5RHRvKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRVc2VyUm9sZSA9IHVzZXJSb2xlIHx8IG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8gUHJvdmlkZXIncyBmYWN0b3J5IGZ1bmN0aW9uXHJcbiAgICAgICAgLyogQG5nSW5qZWN0ICovXHJcbiAgICAgICAgcHVibGljICRnZXQgPSAoJGh0dHA6IG5nLklIdHRwU2VydmljZSxcclxuICAgICAgICAgICAgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsXHJcbiAgICAgICAgICAgICRsb2c6IG5nLklMb2dTZXJ2aWNlLFxyXG4gICAgICAgICAgICAkcTogbmcuSVFTZXJ2aWNlLFxyXG4gICAgICAgICAgICAkbG9jYXRpb246IG5nLklMb2NhdGlvblNlcnZpY2UsXHJcbiAgICAgICAgICAgIFVwbG9hZDogbmcuYW5ndWxhckZpbGVVcGxvYWQuSVVwbG9hZFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHRvYXN0ZXI6IG5ndG9hc3Rlci5JVG9hc3RlclNlcnZpY2UpOiBzZXJ2aWNlcy5JQmx1ZXNreUh0dHBXcmFwcGVyID0+IHtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgc2VydmljZXMuQmx1ZXNreUh0dHBXcmFwcGVyKCRodHRwLCAkd2luZG93LCAkbG9nLCAkcSwgJGxvY2F0aW9uLCBVcGxvYWQsIHRvYXN0ZXIsIHRoaXMuZ2V0Q2xpZW50Q29uZmlnSW5pdGlhbGl6YXRpb25VcmwsIHRoaXMuc2VsZWN0ZWRVc2VyUm9sZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKCdibHVlc2t5Lmh0dHBXcmFwcGVyJywgWyd0b2FzdGVyJywgJ25nQW5pbWF0ZScsICduZ0ZpbGVVcGxvYWQnXSlcclxuICAgICAgICAgICAucHJvdmlkZXIoJ2JsdWVza3lIdHRwV3JhcHBlcicsIEJsdWVza3lIdHRwV3JhcHBlclByb3ZpZGVyKTtcclxufSIsIm5hbWVzcGFjZSBibHVlc2t5LmNvcmUuc2VydmljZXMge1xyXG5cclxuICAgIGltcG9ydCBVc2VyUm9sZUVudHJ5RHRvID0gYmx1ZXNreS5jb3JlLm1vZGVscy51c2VyTWFuYWdlbWVudC5Vc2VyUm9sZUVudHJ5RHRvO1xyXG4gICAgaW1wb3J0IFVzZXJTc29EdG8gPSBibHVlc2t5LmNvcmUubW9kZWxzLnVzZXJNYW5hZ2VtZW50LlVzZXJTc29EdG87XHJcbiAgICBpbXBvcnQgQmx1ZXNreUFqYXhDbGllbnRDb25maWcgPSBibHVlc2t5LmNvcmUubW9kZWxzLmJsdWVza3lIdHRwQ2xpZW50LkJsdWVza3lBamF4Q2xpZW50Q29uZmlnO1xyXG4gICAgaW1wb3J0IEJsdWVza3lIdHRwUmVxdWVzdENvbmZpZyA9IGJsdWVza3kuY29yZS5tb2RlbHMuYmx1ZXNreUh0dHBDbGllbnQuSUJsdWVza3lIdHRwUmVxdWVzdENvbmZpZztcclxuICAgIGltcG9ydCBGaWxlQ29udGVudCA9IGJsdWVza3kuY29yZS5tb2RlbHMuYmx1ZXNreUh0dHBDbGllbnQuRmlsZUNvbnRlbnQ7XHJcbiAgICBpbXBvcnQgRW5kcG9pbnRUeXBlID0gYmx1ZXNreS5jb3JlLm1vZGVscy5ibHVlc2t5SHR0cENsaWVudC5FbmRwb2ludFR5cGU7XHJcblxyXG4gICAgZW51bSBIdHRwTWV0aG9kIHsgR0VULCBQT1NULCBQVVQsIERFTEVURSB9O1xyXG5cclxuICAgIC8vVE9ETyBNR0E6IG1ha2UgdGhpcyBpbmplY3RhYmxlIC8vIGNvbmZpZ3VyYWJsZSBpbiBjb25maWcgcGhhc2VcclxuICAgIGNvbnN0IENPUkVfQVBJX0VORFBPSU5UX1NVRkZJWCA9ICdhcGknO1xyXG4gICAgY29uc3QgTUFSS0VUSU5HX0FQSV9FTkRQT0lOVF9TVUZGSVggPSAnYXBpJztcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRPRE8gTUdBIGNvbW1lbnRcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJQmx1ZXNreUh0dHBXcmFwcGVyIHtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQWxsIHNydi1zaWRlIGNvbmZpZ3VyYXRpb24gb2YgdGhpcyBodHRwIGNsaWVudCwgcHJvdmlkZWQgYnkgdGhlIGluamVjdGVkICdjb25maWdJbml0aWFsaXphdGlvblVSTCcgZW5kcG9pbnQuXHJcbiAgICAgICAgICogVGhpcyBjb25maWd1cmF0aW9uIGRhdGEgaXMgbG9hZGVkIHVwb24gaW5pdGlhbGl6YXRpb24gb2YgdGhpcyBzZXJ2aWNlICh0byBiZSB1c2VkIGFzIGEgc2luZ2xldG9uIGluIHRoZSBhcHApLiBBbGwgb3RoZXIgd2ViIGNhbGxzIGFyZSBibG9ja2VkIGFzIGxvbmcgYXMgdGhpcyBvbmUgaXMgbm90IGZpbmlzaGVkLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGJsdWVza3lBamF4Q2xpZW50Q29uZmlnOiBCbHVlc2t5QWpheENsaWVudENvbmZpZztcclxuXHJcbiAgICAgICAgZ2V0PFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBCbHVlc2t5SHR0cFJlcXVlc3RDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgZGVsZXRlPFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBCbHVlc2t5SHR0cFJlcXVlc3RDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgcG9zdDxUPih1cmw6IHN0cmluZywgZGF0YTogYW55LCBjb25maWc/OiBCbHVlc2t5SHR0cFJlcXVlc3RDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgcHV0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IEJsdWVza3lIdHRwUmVxdWVzdENvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICB1cGxvYWQ8VD4odXJsOiBzdHJpbmcsIGZpbGU6IEZpbGUsIGNvbmZpZz86IEJsdWVza3lIdHRwUmVxdWVzdENvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICBnZXRGaWxlKHVybDogc3RyaW5nLCBjb25maWc/OiBCbHVlc2t5SHR0cFJlcXVlc3RDb25maWcpOiBuZy5JUHJvbWlzZTxGaWxlQ29udGVudD47XHJcblxyXG4gICAgICAgIGJ1aWxkVXJsRnJvbUNvbnRleHQodXJsSW5wdXQ6IHN0cmluZyk6IHN0cmluZztcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQmx1ZXNreUh0dHBXcmFwcGVyIGltcGxlbWVudHMgSUJsdWVza3lIdHRwV3JhcHBlciB7XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwcm9wZXJ0aWVzXHJcblxyXG4gICAgICAgIHByaXZhdGUgZ2V0Q29uZmlnUHJvbWlzZTogbmcuSVByb21pc2U8YW55PjtcclxuXHJcbiAgICAgICAgcHVibGljIGJsdWVza3lBamF4Q2xpZW50Q29uZmlnOiBCbHVlc2t5QWpheENsaWVudENvbmZpZztcclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBjdG9yXHJcblxyXG4gICAgICAgIC8qIEBuZ0luamVjdCAqL1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICBwcml2YXRlICRodHRwOiBuZy5JSHR0cFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGxvZzogbmcuSUxvZ1NlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkbG9jYXRpb246IG5nLklMb2NhdGlvblNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgVXBsb2FkOiBuZy5hbmd1bGFyRmlsZVVwbG9hZC5JVXBsb2FkU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSB0b2FzdGVyOiBuZ3RvYXN0ZXIuSVRvYXN0ZXJTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlIGNvbmZpZ0luaXRpYWxpemF0aW9uVVJMOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIHByaXZhdGUgc2VsZWN0ZWRVc2VyUm9sZTogVXNlclJvbGVFbnRyeUR0b1xyXG4gICAgICAgICkge1xyXG5cclxuICAgICAgICAgICAgLy8gMSAtIGZldGNoIHRoZSBjb25maWd1cmF0aW9uIGRhdGEgbmVjZXNzYXJ5IGZvciB0aGlzIHNlcnZpY2UgdG8gcnVuIGZyb20gdGhlIHByb3ZpZGVkIGVuZHBvaW50XHJcblxyXG4gICAgICAgICAgICB2YXIgY29uZmlndXJhdGlvbkVuZHBvaW50VXJsID0gdGhpcy5idWlsZFVybEZyb21Db250ZXh0KGNvbmZpZ0luaXRpYWxpemF0aW9uVVJMLCBFbmRwb2ludFR5cGUuT1JJR0lOKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghY29uZmlndXJhdGlvbkVuZHBvaW50VXJsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoYFtCbHVlc2t5SHR0cFdyYXBwZXJdW0luaXRpYWxpemF0aW9uXSAtIFVuYWJsZSB0byBidWlsZCB1cmwgZnJvbSBpbml0aWFsQ29uZmlnIHVybCAnJHtjb25maWdJbml0aWFsaXphdGlvblVSTH0nIHdpdGggZW5kcG9pbnRUeXBlICcke0VuZHBvaW50VHlwZVtFbmRwb2ludFR5cGUuT1JJR0lOXX0nLiBBYm9ydGluZyBibHVlc2t5SHR0cFNlcnZpY2UgaW5pdC5gKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5nZXRDb25maWdQcm9taXNlID0gdGhpcy4kaHR0cC5nZXQ8Qmx1ZXNreUFqYXhDbGllbnRDb25maWc+KGNvbmZpZ3VyYXRpb25FbmRwb2ludFVybClcclxuICAgICAgICAgICAgICAgIC50aGVuPEJsdWVza3lBamF4Q2xpZW50Q29uZmlnPihcclxuICAgICAgICAgICAgICAgICAgICAvLyBzdWNjZXNzXHJcbiAgICAgICAgICAgICAgICAgICAgKGNsaWVudENvbmZpZ1Byb21pc2UpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogcmVqZWN0IHN0YXR1cyBub3QgaW4gMlhYID9cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjbGllbnRDb25maWdQcm9taXNlLmRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtc2cgPSBgVW5hYmxlIHRvIHJldHJpZXZlIGh0dHAgY29uZmlnIGRhdGEgZnJvbSAnJHtjb25maWdJbml0aWFsaXphdGlvblVSTH0nLiBBYm9ydGluZyBibHVlc2t5SHR0cFdyYXBwZXJTZXJ2aWNlIGluaXRpYWxpemF0aW9uLmA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IobXNnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IHRvYXN0ZXIgP1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHEucmVqZWN0KG1zZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcgPSBjbGllbnRDb25maWdQcm9taXNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjbGllbnRDb25maWdQcm9taXNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAvLyBlcnJvclxyXG4gICAgICAgICAgICAgICAgICAgIChlcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ1VuYWJsZSB0byByZXRyaWV2ZSBBUEkgY29uZmlnLiBBYm9ydGluZyBibHVlc2t5SHR0cFdyYXBwZXJTZXJ2aWNlIGluaXRpYWxpemF0aW9uLicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kcS5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAudGhlbjxCbHVlc2t5QWpheENsaWVudENvbmZpZz4oXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc3VjY2Vzc1xyXG4gICAgICAgICAgICAgICAgICAgIChibHVlc2t5Q2xpZW50Q29uZmlnKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhbmRsZSBjYXNlIHdoZXJlIGNsaWVudC1zaWRlIHVzZXJSb2xlIHdhcyBwcm92aWRlZCBhbmQgbm90ID09IHNydi1zaWRlIHVzZXIgcm9sZSA/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghYmx1ZXNreUNsaWVudENvbmZpZy5jdXJyZW50VXNlclJvbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vSWYgbm90IHByb3ZpZGVkIGJ5IGRvbWFpbiBmcm9tIHdoaWNoIGNvZGUgd2FzIGxvYWRlZCwgdGhlbiB0cnkgdG8gZmV0Y2ggZGVmYXVsdCB1c2VyUm9sZSBmcm9tIENBUEkgZW5kcG9pbnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldDxVc2VyU3NvRHRvPigndXNlci1zc28/cHJvZmlsZT0nLCB7IGVuZHBvaW50VHlwZTogRW5kcG9pbnRUeXBlLkNPUkVfQVBJIH0pLnRoZW48Qmx1ZXNreUFqYXhDbGllbnRDb25maWc+KFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh1c2VyU3NvKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdXNlclNzbyB8fCAhdXNlclNzby51c2VyUm9sZUVudHJ5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbXNnID0gJ1VuYWJsZSB0byByZXRyaWV2ZSBDb3JlQVBJIGRlZmF1bHQgdXNlclNTTy4gQWJvcnRpbmcgaHR0cFdyYXBwZXJTZXJ2aWNlIGluaXRpYWxpemF0aW9uLic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IobXNnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRxLnJlamVjdChtc2cpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdXNlclJvbGVUb1VzZSA9IHNlbGVjdGVkVXNlclJvbGUgfHwgdXNlclNzby51c2VyUm9sZUVudHJ5O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogdGhpcyBuZWVkcyB0byBiZSBwdXQgaW4gc2hhcmVkIGV4dGVuc2lvbiBtZXRob2QgLyBzZXJ2aWNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcuY3VycmVudFVzZXJSb2xlID0gdXNlclJvbGVUb1VzZS5uYW1lICsgXCIgXCIgKyB1c2VyUm9sZVRvVXNlLnJvbGUgKyBcIiBcIiArIHVzZXJSb2xlVG9Vc2Uuc2lsbztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcuY3VycmVudFVzZXIgPSB1c2VyU3NvO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJsdWVza3lDbGllbnRDb25maWc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogd2Ugb25seSBsb2FkIHVzZXJTU08gaWYgbm8gdXNlclJvbGUgd2FzIHByb3ZpZGVkIHNydi1zaWRlLCBzaG91bGQgd2UgbG9hZCBpdCBpbiBhbGwgY2FzZXMgP1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFscmVhZHkgZGVmaW5lZCB1c2VyUm9sZSBzZW50IGZyb20gb3JpZ2luIGFwcCwgdXNlIGl0ICYgc2V0IGl0IGFzIGRlZmF1bHQuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmx1ZXNreUNsaWVudENvbmZpZztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwdWJsaWMgbWV0aG9kc1xyXG5cclxuICAgICAgICBnZXQ8VD4odXJsOiBzdHJpbmcsIGNvbmZpZz86IEJsdWVza3lIdHRwUmVxdWVzdENvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWpheDxUPihIdHRwTWV0aG9kLkdFVCwgdXJsLCBjb25maWcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGVsZXRlPFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBCbHVlc2t5SHR0cFJlcXVlc3RDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5ERUxFVEUsIHVybCwgY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHBvc3Q8VD4odXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogQmx1ZXNreUh0dHBSZXF1ZXN0Q29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwge307XHJcbiAgICAgICAgICAgIGNvbmZpZy5kYXRhID0gZGF0YSB8fCBjb25maWcuZGF0YTs7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5QT1NULCB1cmwsIGNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdXQ8VD4odXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogQmx1ZXNreUh0dHBSZXF1ZXN0Q29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwge307XHJcbiAgICAgICAgICAgIGNvbmZpZy5kYXRhID0gZGF0YSB8fCBjb25maWcuZGF0YTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWpheDxUPihIdHRwTWV0aG9kLlBVVCwgdXJsLCBjb25maWcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVE9ETyBNR0E6IG5vdCBEUlkgd2l0aCBhamF4IG1ldGhvZCwgaG93IHRvIGtlZXAgaXQgaW4gc3luYyA/XHJcbiAgICAgICAgICogQHBhcmFtIHVybFxyXG4gICAgICAgICAqIEBwYXJhbSBmaWxlXHJcbiAgICAgICAgICogQHBhcmFtIGNvbmZpZ1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHVwbG9hZDxUPih1cmw6IHN0cmluZywgZmlsZTogRmlsZSwgY29uZmlnPzogQmx1ZXNreUh0dHBSZXF1ZXN0Q29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG5cclxuICAgICAgICAgICAgaWYgKCFmaWxlICYmICghY29uZmlnIHx8ICFjb25maWcuZmlsZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignQ2Fubm90IHN0YXJ0IHVwbG9hZCB3aXRoIG51bGwge2ZpbGV9IHBhcmFtZXRlci4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwge307XHJcbiAgICAgICAgICAgIGNvbmZpZy5maWxlID0gZmlsZSB8fCBjb25maWcuZmlsZTsgLy9UT0RPIE1HQSA6IGRvIG5vdCBleHBvc2UgZmlsZSBpbiBJQmx1ZXNreUh0dHBSZXF1ZXN0Q29uZmlnID9cclxuICAgICAgICAgICAgY29uZmlnLmRhdGEgPSBjb25maWcuZGF0YSB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjb25maWcudXBsb2FkSW5CYXNlNjRKc29uKSB7XHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBtYWtlIHN1cmUgdGhpcyBkZWxheXMgbmV4dCBjYWxsIGFuZCB1cGxvYWQgaXMgbm90IGRvbmUgYmVmb3JlIGJhc2U2NCBlbmNvZGluZyBpcyBmaW5pc2hlZCwgZXZlbiBpZiBwcm9taXNlIGlzIGFscmVhZHkgcmVzb2x2ZWQgPz8/XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5VcGxvYWQuYmFzZTY0RGF0YVVybChmaWxlKS50aGVuKChmaWxlQmFzZTY0VXJsKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFyZC1jb2RlZCBrZXkgdG8gZmV0Y2ggYmFzZTY0IGVuY29kaW5nLCB0byBwYXJhbWV0cml6ZSB3aXRoIHNlcnZlci1zaWRlICFcclxuICAgICAgICAgICAgICAgICAgICBjb25maWcuZGF0YS5maWxlQmFzZTY0VXJsID0gZmlsZUJhc2U2NFVybDtcclxuICAgICAgICAgICAgICAgICAgICAvL25vcm1hbCBwb3N0IGluIGNhc2Ugb2YgYmFzZTY0LWVuY29kZWQgZGF0YVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5QT1NULCB1cmwsIGNvbmZpZyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbmZpZy5kYXRhLmZpbGVGb3JtRGF0YU5hbWUgPSAnZmlsZSc7IC8vIGZpbGUgZm9ybURhdGEgbmFtZSAoJ0NvbnRlbnQtRGlzcG9zaXRpb24nKSwgc2VydmVyIHNpZGUgcmVxdWVzdCBmb3JtIG5hbWVcclxuXHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBIDogZG8gbm90IGJsb2NrIGlmIG5vdCBjYWxsIHRvIGludGVybmFsIEFQSSA/IChpbml0Q2FsbClcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldENvbmZpZ1Byb21pc2UudGhlbigoKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBiZWhhdmlvciBkdXBsaWNhdGlvbiB3aXRoIHRoaXMuYWpheCwgbm90IERSWSwgdG8gaW1wcm92ZVxyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXF1ZXN0Q29uZmlnID0gdGhpcy5jb25maWd1cmVIdHRwQ2FsbChIdHRwTWV0aG9kLlBPU1QsIHVybCwgY29uZmlnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcXVlc3RDb25maWcpIC8vIGlmIG5vIGNvbmZpZyByZXR1cm5lZCwgY29uZmlndXJhdGlvbiBmYWlsZWQsIGRvIG5vdCBzdGFydCBhamF4IHJlcXVlc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuVXBsb2FkLnVwbG9hZDxUPig8bmcuYW5ndWxhckZpbGVVcGxvYWQuSUZpbGVVcGxvYWRDb25maWdGaWxlPnJlcXVlc3RDb25maWcpIC8vVE9ETyBNR0EgOiBub3Qgc2FmZSBoYXJkIGNhc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuPFQ+KHRoaXMub25TdWNjZXNzPFQ+KGNvbmZpZyksIHRoaXMub25FcnJvcjxUPihjb25maWcpLCBjb25maWcudXBsb2FkUHJvZ3Jlc3MpIC8vVE9ETyBNR0EgOiB1cGxvYWRQcm9ncmVzcyBjYWxsYmFjayBvayA/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmluYWxseSh0aGlzLmZpbmFsbHkpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFRoaXMgbWV0aG9kIGlzIHVzZWQgdG8gZG93bmxvYWQgYSBmaWxlIGluIHRoZSBmb3JtIG9mIGEgYnl0ZS1zdHJlYW0gZnJvbSBhbiBlbmRwb2ludCBhbmQgd3JhcCBpdCBpbnRvIGEgRmlsZUNvbnRlbnQgb2JqZWN0IHdpdGggbmFtZSwgdHlwZSAmIHNpemUgcHJvcGVydGllcyByZWFkIGZyb20gdGhlIEhUVFAgcmVzcG9uc2UgaGVhZGVycyBvZiB0aGUgc2VydmV1ci5cclxuICAgICAgICAgKiBJdCBpcyB0aGUgcmVzcG9uc2FiaWxpdHkgb2YgdGhlIGNvbnN1bWVyIHRvIGRvIHNvbWV0aGluZyB3aXRoIHRoZSB3cmFwcGVkIGJ5dGVBcnJheSAoZm9yIGV4YW1wbGUgZG93bmxvYWQgdGhlIGZpbGUsIG9yIHNob3cgaXQgaW5zaWRlIHRoZSB3ZWJQYWdlIGV0YykuXHJcbiAgICAgICAgICogVE9ETyBNR0E6IG5vdCBEUlkgd2l0aCBhamF4IG1ldGhvZCwgaG93IHRvIGtlZXAgaXQgaW4gc3luYyA/XHJcbiAgICAgICAgICogQHBhcmFtIHVybFxyXG4gICAgICAgICAqIEBwYXJhbSBleHBlY3RlZE5hbWVcclxuICAgICAgICAgKiBAcGFyYW0gZXhwZWN0ZWRTaXplXHJcbiAgICAgICAgICogQHBhcmFtIGV4cGVjdGVkVHlwZVxyXG4gICAgICAgICAqIEBwYXJhbSBjb25maWdcclxuICAgICAgICAgKi9cclxuICAgICAgICBnZXRGaWxlKHVybDogc3RyaW5nLCBjb25maWc/OiBCbHVlc2t5SHR0cFJlcXVlc3RDb25maWcpOiBuZy5JUHJvbWlzZTxGaWxlQ29udGVudD4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRDb25maWdQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBhbmd1bGFySHR0cENvbmZpZyA9IHRoaXMuY29uZmlndXJlSHR0cENhbGwoSHR0cE1ldGhvZC5HRVQsIHVybCwgY29uZmlnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBpZiBubyBjb25maWcgcmV0dXJuZWQsIGNvbmZpZ3VyYXRpb24gZmFpbGVkLCBkbyBub3Qgc3RhcnQgYWpheCByZXF1ZXN0XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFuZ3VsYXJIdHRwQ29uZmlnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHEucmVqZWN0KCdVbmFibGUgdG8gY29uZmlndXJlIHJlcXVlc3QgY29ycmVjdGx5LiBBYm9ydGluZyBnZXRGaWxlIGFqYXggY2FsbC4nKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBzcGVjaWZpY2FsbHkgZXhwZWN0IHJhdyByZXNwb25zZSB0eXBlLCBvdGhlcndpc2UgYnl0ZSBzdHJlYW0gcmVzcG9uc2VzIGFyZSBjb3JydXB0ZWQuXHJcbiAgICAgICAgICAgICAgICBhbmd1bGFySHR0cENvbmZpZy5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vRXhwZWN0ZWQgQXJyYXlCdWZmZXIgcmVzcG9uc2UgPSBieXRlIGFycmF5XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kaHR0cDxBcnJheUJ1ZmZlcj4oYW5ndWxhckh0dHBDb25maWcpXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW48RmlsZUNvbnRlbnQ+KChodHRwUmVzcG9uc2UpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vYmVuZWZpdCBmcm9tIHN1Y2Nlc3NDYWxsYmFjayB2YWxpZGF0aW9uIGJlZm9yZSBjb250aW51aW5nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcnJheUJ1ZmZlciA9IHRoaXMub25TdWNjZXNzPEFycmF5QnVmZmVyPihjb25maWcpKGh0dHBSZXNwb25zZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBwcm9taXNlIHJlamVjdGlvbiB2cy4gcmV0dXJuIG51bGwgP1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWFycmF5QnVmZmVyKSByZXR1cm4gbnVsbDsgLy9zdG9wIHByb2Nlc3NpbmcgaWYgdW5hYmxlIHRvIHJldHJpZXZlIGJ5dGUgYXJyYXlcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vcmVhZCBmaWxlIGluZm8gZnJvbSByZXNwb25zZS1oZWFkZXJzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmaWxlQ29udGVudDogRmlsZUNvbnRlbnQgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLmdldEZpbGVOYW1lRnJvbUhlYWRlckNvbnRlbnREaXNwb3NpdGlvbihodHRwUmVzcG9uc2UuaGVhZGVycygnY29udGVudC1kaXNwb3NpdGlvbicpKSB8fCBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogTnVtYmVyKGh0dHBSZXNwb25zZS5oZWFkZXJzKCdjb250ZW50LWxlbmd0aCcpKSB8fCAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogaHR0cFJlc3BvbnNlLmhlYWRlcnMoJ2NvbnRlbnQtdHlwZScpIHx8ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogYXJyYXlCdWZmZXJcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmaWxlQ29udGVudDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfSwgdGhpcy5vbkVycm9yKVxyXG4gICAgICAgICAgICAgICAgICAgIC5maW5hbGx5KHRoaXMuZmluYWxseSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVHJpZXMgdG8gcGFyc2UgdGhlIGlucHV0IHVybCA6XHJcbiAgICAgICAgICogSWYgaXQgc2VlbXMgdG8gYmUgYSBmdWxsIFVSTCwgdGhlbiByZXR1cm4gYXMgaXMgKGNvbnNpZGVycyBpdCBleHRlcm5hbCBVcmwpIFxyXG4gICAgICAgICAqIE90aGVyd2lzZSwgdHJpZXMgdG8gZmluZCB0aGUgYmFzZSBVUkwgb2YgdGhlIGN1cnJlbnQgQmx1ZVNreSBhcHAgd2l0aCBvciB3aXRob3V0IHRoZSBpbmNsdWRlZCBDb250cm9sbGVyIGFuZCByZXR1cm5zIHRoZSBmdWxsIFVybCBcclxuICAgICAgICAgKiBAcGFyYW0gdXJsSW5wdXQgOiBUT0RPIE1HQTogZG9jdW1lbnQgZGlmZmVyZW50IGtpbmQgb2YgdXJscyB0aGF0IHRoaXMgbWV0aG9kIGNhbiB0YWtlIGFzIGlucHV0IChmdWxsLCBwYXJ0aWFsIGV0YylcclxuICAgICAgICAgKiBAcmV0dXJuIG51bGwgaWYgbm90IGFibGUgdG8gY29tcHV0ZSB1cmwuIE90aGVyd2lzZSwgdXJsIG9mIHRoZSByZXF1ZXN0IGVpdGhlciBwYXJ0aWFsIG9yIGZ1bGwgYmFzZWQgb24gZW5kcG9pbnRUeXBlLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBidWlsZFVybEZyb21Db250ZXh0KHVybElucHV0OiBzdHJpbmcsIGVuZHBvaW50VHlwZT86IEVuZHBvaW50VHlwZSk6IHN0cmluZyB7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXVybElucHV0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ05vIFVSTCBpbnB1dCBwcm92aWRlZC4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBJZiBVcmwgc3RhcnRzIHdpdGggaHR0cDovLyBvciBodHRwczovLyA9PiByZXR1cm4gYXMgaXMsIGV2ZW4gaWYgZW5kcG9pbnRUeXBlIGlzIG5vdCBleHRlcm5hbC5cclxuICAgICAgICAgICAgaWYgKHVybElucHV0LnNsaWNlKDAsICdodHRwOi8vJy5sZW5ndGgpID09PSAnaHR0cDovLycgfHxcclxuICAgICAgICAgICAgICAgIHVybElucHV0LnNsaWNlKDAsICdodHRwczovLycubGVuZ3RoKSA9PT0gJ2h0dHBzOi8vJykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVybElucHV0O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBFbHNlLCB3ZSBoYXZlIGEgcGFydGlhbCBVUkwgdG8gY29tcGxldGU6IHVzZSBwcm92aWRlZCBlbmRwb2ludCB0eXBlIHRvIGRldGVybWluZSBob3cgdG8gY29tcGxldGUgdXJsLlxyXG5cclxuICAgICAgICAgICAgLy8gRGVmYXVsdCB2YWx1ZSBmb3IgZW5kcG9pbnRUeXBlIGlmIG5vdCBwcm92aWRlZCBpcyBvcmlnaW4uIFRPRE8gTUdBOiBydWxlIHRvIGRpc2N1c3MsIGhlcmUgZm9yIHJldHJvLWNvbXBhdGliaWxpdHkuXHJcbiAgICAgICAgICAgIGVuZHBvaW50VHlwZSA9IGVuZHBvaW50VHlwZSB8fCBFbmRwb2ludFR5cGUuT1JJR0lOO1xyXG5cclxuICAgICAgICAgICAgaWYgKGVuZHBvaW50VHlwZSA9PT0gRW5kcG9pbnRUeXBlLkVYVEVSTkFMKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cud2FybignUGFydGlhbCB1cmwgcHJvdmlkZWQgZm9yIGFuIGV4dGVybmFsIGVuZHBvaW50OiB0aGUgY2FsbCB3aWxsIHByb2JhYmx5IGZhaWwuJyk7XHJcbiAgICAgICAgICAgICAgICAvLyBkbyBub3QgbW9kaWZ5IHByb3ZpZGVkIHVybCBpZiBleHRlcm5hbCAod2UgY2Fubm90IGtub3cgaG93IHRvIGNvbXBsZXRlIGl0LCBldmVuIGlmIHBhcnRpYWwpLlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVybElucHV0O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy9Db21wdXRlIHVybCBhcyBjb21iaW5hdGlvbiBvZiBiYXNlIHVybCAmIHVybCBmcmFnbWVudCBnaXZlbiBhcyBpbnB1dFxyXG5cclxuICAgICAgICAgICAgICAgIHZhciBiYXNlVXJsOiBzdHJpbmcgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChlbmRwb2ludFR5cGUgPT09IEVuZHBvaW50VHlwZS5DT1JFX0FQSSkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcgfHwgIXRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcuY29yZUFwaVVybCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ01pc3NpbmcgY29yZUFwaVVybCBpbiBCbHVlc2t5QWpheENsaWVudENvbmZpZy4gY2Fubm90IGJ1aWxkIHZhbGlkIHVybC4nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBiYXNlVXJsID0gdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZy5jb3JlQXBpVXJsICsgQ09SRV9BUElfRU5EUE9JTlRfU1VGRklYO1xyXG5cclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZW5kcG9pbnRUeXBlID09PSBFbmRwb2ludFR5cGUuTUFSS0VUSU5HX0FQSSkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcgfHwgIXRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcubWFya2V0aW5nQXBpVXJsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignTWlzc2luZyBtYXJrZXRpbmdBcGlVcmwgaW4gQmx1ZXNreUFqYXhDbGllbnRDb25maWcuIGNhbm5vdCBidWlsZCB2YWxpZCB1cmwuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYmFzZVVybCA9IHRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcubWFya2V0aW5nQXBpVXJsICsgTUFSS0VUSU5HX0FQSV9FTkRQT0lOVF9TVUZGSVg7XHJcblxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlbmRwb2ludFR5cGUgPT09IEVuZHBvaW50VHlwZS5RVU9URV9XSVpBUkQpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmJsdWVza3lBamF4Q2xpZW50Q29uZmlnIHx8ICF0aGlzLmJsdWVza3lBamF4Q2xpZW50Q29uZmlnLnF1b3RlV2l6YXJkVXJsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignTWlzc2luZyBxdW90ZVdpemFyZFVybCBpbiBCbHVlc2t5QWpheENsaWVudENvbmZpZy4gY2Fubm90IGJ1aWxkIHZhbGlkIHVybC4nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBob3cgdG8gaGFuZGxlIE9NIGFwcHMgZXh0ZXJuYWwgY2FsbHMgd2l0aG91dCBzZXNzaW9uIHByb3ZpZGVkID8gd2lsbCByZXN1bHQgaW4gYSByZWRpcmVjdCBhbmQgY2FsbCB3aWxsIHByb2JhYmx5IGZhaWwgLi4uXHJcbiAgICAgICAgICAgICAgICAgICAgYmFzZVVybCA9IHRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcucXVvdGVXaXphcmRVcmw7XHJcblxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlbmRwb2ludFR5cGUgPT09IEVuZHBvaW50VHlwZS5PUkRFUl9FTlRSWSkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcgfHwgIXRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcub3JkZXJFbnRyeVVybCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ01pc3Npbmcgb3JkZXJFbnRyeVVybCBpbiBCbHVlc2t5QWpheENsaWVudENvbmZpZy4gY2Fubm90IGJ1aWxkIHZhbGlkIHVybC4nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBob3cgdG8gaGFuZGxlIE9NIGFwcHMgZXh0ZXJuYWwgY2FsbHMgd2l0aG91dCBzZXNzaW9uIHByb3ZpZGVkID8gd2lsbCByZXN1bHQgaW4gYSByZWRpcmVjdCBhbmQgY2FsbCB3aWxsIHByb2JhYmx5IGZhaWwgLi4uXHJcbiAgICAgICAgICAgICAgICAgICAgYmFzZVVybCA9IHRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcub3JkZXJFbnRyeVVybDtcclxuXHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVuZHBvaW50VHlwZSA9PT0gRW5kcG9pbnRUeXBlLk9SREVSX1RSQUNLSU5HKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZyB8fCAhdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZy5vcmRlclRyYWNraW5nVXJsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignTWlzc2luZyBvcmRlclRyYWNraW5nVXJsIGluIEJsdWVza3lBamF4Q2xpZW50Q29uZmlnLiBjYW5ub3QgYnVpbGQgdmFsaWQgdXJsLicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhvdyB0byBoYW5kbGUgT00gYXBwcyBleHRlcm5hbCBjYWxscyB3aXRob3V0IHNlc3Npb24gcHJvdmlkZWQgPyB3aWxsIHJlc3VsdCBpbiBhIHJlZGlyZWN0IGFuZCBjYWxsIHdpbGwgcHJvYmFibHkgZmFpbCAuLi5cclxuICAgICAgICAgICAgICAgICAgICBiYXNlVXJsID0gdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZy5vcmRlclRyYWNraW5nVXJsO1xyXG5cclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZW5kcG9pbnRUeXBlID09PSBFbmRwb2ludFR5cGUuT1JJR0lOKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlZ2V4IHRyeWluZyB0byBkZXRlcm1pbmUgaWYgdGhlIGlucHV0IGZyYWdtZW50IGNvbnRhaW5zIGEgLyBiZXR3ZWVuIHR3byBjaGFyYWN0ZXIgc3VpdGVzID0+IGNvbnRyb2xsZXIgZ2l2ZW4gYXMgaW5wdXQsIG90aGVyd2lzZSwgYWN0aW9uIG9uIHNhbWUgY29udHJvbGxlciBleHBlY3RlZFxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBjb250cm9sbGVySXNQcmVzZW50UmVnZXggPSAvXFx3K1xcL1xcdysvO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB2YXIgYWN0aW9uSXNPblNhbWVDb250cm9sbGVyID0gIWNvbnRyb2xsZXJJc1ByZXNlbnRSZWdleC50ZXN0KHVybElucHV0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYmFzZVVybCA9IHRoaXMuZ2V0VXJsUGF0aChhY3Rpb25Jc09uU2FtZUNvbnRyb2xsZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKCdVbnN1cHBvcnRlZCBlbmRwb2ludFR5cGUgcHJvdmlkZWQuIFNob3VsZCBub3QgaGFwcGVuIChleHBlY3RlZCBkZWZhdWx0IHZhbHVlIE9yaWdpbikuIEFib3J0aW5nLicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIEJvb2xlYW4gdXNlZCB0byB0cnkgdG8gZGV0ZXJtaW5lIGNvcnJlY3QgZnVsbCB1cmwgKGFkZCAvIG9yIG5vdCBiZWZvcmUgdGhlIHVybCBmcmFnbWVudCBkZXBlbmRpbmcgb24gaWYgZm91bmQgb3Igbm90KVxyXG4gICAgICAgICAgICAgICAgdmFyIHVybEZyYWdtZW50U3RhcnRzV2l0aFNsYXNoID0gdXJsSW5wdXQuc2xpY2UoMCwgMSkgPT09ICcvJztcclxuICAgICAgICAgICAgICAgIHZhciBiYXNlVXJsRnJhZ21lbnRFbmRzV2l0aFNsYXNoID0gYmFzZVVybC5zbGljZShiYXNlVXJsLmxlbmd0aCAtIDEsIGJhc2VVcmwubGVuZ3RoKSA9PT0gJy8nO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vYmFzZWQgb24gc3RhcnRpbmcvdHJhaWxpbmcgc2xhc2hlcywgcmV0dXJuIGZ1bGwgdXJsLlxyXG4gICAgICAgICAgICAgICAgaWYgKGJhc2VVcmxGcmFnbWVudEVuZHNXaXRoU2xhc2ggJiYgdXJsRnJhZ21lbnRTdGFydHNXaXRoU2xhc2gpXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVtb3ZlIGxhc3QgJy8nIG9uIGJhc2VVcmxcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmFzZVVybC5zbGljZSgwLCBiYXNlVXJsLmxlbmd0aCAtIDEpICsgdXJsSW5wdXQ7XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmICghYmFzZVVybEZyYWdtZW50RW5kc1dpdGhTbGFzaCAmJiAhdXJsRnJhZ21lbnRTdGFydHNXaXRoU2xhc2gpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJhc2VVcmwgKyAnLycgKyB1cmxJbnB1dDtcclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKChiYXNlVXJsRnJhZ21lbnRFbmRzV2l0aFNsYXNoICYmICF1cmxGcmFnbWVudFN0YXJ0c1dpdGhTbGFzaCkgfHxcclxuICAgICAgICAgICAgICAgICAgICAoIWJhc2VVcmxGcmFnbWVudEVuZHNXaXRoU2xhc2ggJiYgdXJsRnJhZ21lbnRTdGFydHNXaXRoU2xhc2gpKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBiYXNlVXJsICsgdXJsSW5wdXQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwcml2YXRlIG1ldGhvZHNcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVXRpbGl0eSBtZXRob2QuXHJcbiAgICAgICAgICogTWFpbiBjYWxsZXIgdGhhdCBhbGwgd3JhcHBlciBjYWxscyAoZ2V0LCBkZWxldGUsIHBvc3QsIHB1dCkgbXVzdCB1c2UgdG8gc2hhcmUgY29tbW9uIGJlaGF2aW9yLlxyXG4gICAgICAgICAqIEBwYXJhbSBjb25maWdcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGFqYXg8VD4obWV0aG9kOiBIdHRwTWV0aG9kLCB1cmw6IHN0cmluZywgY29uZmlnPzogQmx1ZXNreUh0dHBSZXF1ZXN0Q29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICAvL1RPRE8gTUdBIDogbWFrZSBzdXJlIGdldENvbmZpZyByZXNvbHZlIGF1dG9tYXRpY2FsbHkgd2l0aG91dCBvdmVyaGVhZCBvbmNlIGZpcnN0IGNhbGwgc3VjZXNzZnVsbC5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGRvIG5vdCBibG9jayBpZiBub3QgY2FsbCB0byBpbnRlcm5hbCBBUEkgKGluaXRDYWxsKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRDb25maWdQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdmFyIGFuZ3VsYXJIdHRwQ29uZmlnID0gdGhpcy5jb25maWd1cmVIdHRwQ2FsbChtZXRob2QsIHVybCwgY29uZmlnKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoYW5ndWxhckh0dHBDb25maWcpIC8vIGlmIG5vIGNvbmZpZyByZXR1cm5lZCwgY29uZmlndXJhdGlvbiBmYWlsZWQsIGRvIG5vdCBzdGFydCBhamF4IHJlcXVlc3RcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kaHR0cDxUPihhbmd1bGFySHR0cENvbmZpZylcclxuICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW48VD4odGhpcy5vblN1Y2Nlc3M8VD4oY29uZmlnKSwgdGhpcy5vbkVycm9yPFQ+KGNvbmZpZykpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maW5hbGx5KHRoaXMuZmluYWxseSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgKiBQcmVwYXJlcyBhIHtAbGluayBuZyMkaHR0cCNjb25maWcgY29uZmlnfSBvYmplY3QgZm9yICRodHRwIGNhbGwuXHJcbiAgICAgICAgKiBUaGUgb3BlcmF0aW9ucyBpbmNsdWRlIHNldHRpbmcgZGVmYXVsdCB2YWx1ZXMgd2hlbiBub3QgcHJvdmlkZWQsIGFuZCBzZXR0aW5nIGh0dHAgaGVhZGVycyBpZiBuZWVkZWQgZm9yIDpcclxuICAgICAgICAqICAtIEFqYXggY2FsbHNcclxuICAgICAgICAqICAtIEF1dGhvcml6YXRpb24gdG9rZW5cclxuICAgICAgICAqICAtIEN1cnJlbnQgVXNlclJvbGUuICAgXHJcbiAgICAgICAgKiBAcGFyYW0gb3B0aW9uc1xyXG4gICAgICAgICogQHJldHVybnMge25nLiRodHRwLmNvbmZpZ30gdGhlIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHJlYWR5IHRvIGJlIGluamVjdGVkIGludG8gYSAkaHR0cCBjYWxsLiBcclxuICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgY29uZmlndXJlSHR0cENhbGwgPSAobWV0aG9kOiBIdHRwTWV0aG9kLCB1cmw6IHN0cmluZywgY29uZmlnPzogQmx1ZXNreUh0dHBSZXF1ZXN0Q29uZmlnKTogbmcuSVJlcXVlc3RDb25maWcgPT4ge1xyXG5cclxuICAgICAgICAgICAgLy8gaW5wdXQgdmFsaWRhdGlvblxyXG5cclxuICAgICAgICAgICAgaWYgKCF1cmwgfHwgbWV0aG9kID09PSBudWxsIHx8IG1ldGhvZCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ1VSTCAmIE1FVEhPRCBwYXJhbWV0ZXJzIGFyZSBuZWNlc3NhcnkgZm9yIGh0dHBXcmFwcGVyIGNhbGxzLiBBYm9ydGluZy4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBzZXQgZGVmYXVsdCBjb25maWcgdmFsdWVzIGFuZCBjdXN0b20gb25lcyBiYXNlZCBvbiBlbmRwb2ludHNcclxuXHJcbiAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgIGNvbmZpZy5lbmRwb2ludFR5cGUgPSBjb25maWcuZW5kcG9pbnRUeXBlIHx8IEVuZHBvaW50VHlwZS5PUklHSU47IC8vIGRlZmF1bHQgdmFsdWU6IGlmIG5vdCBzcGVjaWZpZWQsIGVuZHBvaW50IHRvIHVzZSBpcyBzdXBwb3NlZCB0byBiZSB0aGUgb3JpZ2luLiBcclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhcmQgY2FzdCBpcyBub3Qgc2FmZSwgd2UgbWF5IGZvcmdldCB0byBzZXQgdXJsICYgbWV0aG9kIHBhcmFtZXRlcnMuIFRPRklYLlxyXG4gICAgICAgICAgICAvLyBhdXRvbWF0aWNhbGx5IGdldCBhbGwgbm9uLWZpbHRlcmVkIHBhcmFtZXRlcnMgJiBrZWVwIHRoZW0gZm9yIHRoaXMgbmV3IG9iamVjdC5cclxuICAgICAgICAgICAgdmFyIGNvbmZpZ0Z1bGwgPSA8bmcuSVJlcXVlc3RDb25maWc+Y29uZmlnO1xyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogc3VwcG9ydCBtYXBwaW5nIGJldHdlZW4gdXBsb2FkICYgcG9zdCBoZXJlID9cclxuICAgICAgICAgICAgY29uZmlnRnVsbC5tZXRob2QgPSBIdHRwTWV0aG9kW21ldGhvZF07XHJcblxyXG4gICAgICAgICAgICBjb25maWdGdWxsLmhlYWRlcnMgPSBjb25maWcuaGVhZGVycyB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgIC8vIGNvbmZpZ3VyZSBkZWZhdWx0IGNvbmZpZyBmbGFncyBiYXNlZCBvbiB0YXJnZXQgZW5kcG9pbnRcclxuICAgICAgICAgICAgaWYgKGNvbmZpZy5lbmRwb2ludFR5cGUgPT09IEVuZHBvaW50VHlwZS5DT1JFX0FQSSkge1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFJlamVjdCBleHBsaWNpdGx5IHdyb25nIGlucHV0IGNvbmZpZ3VyYXRpb25zXHJcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLmRpc2FibGVYbWxIdHRwUmVxdWVzdEhlYWRlciB8fFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy51c2VDdXJyZW50VXNlclJvbGUgPT09IGZhbHNlIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLnVzZUp3dEF1dGhUb2tlbiA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cud2FybihgW0JsdWVza3lIdHRwV3JhcHBlcl1bY29uZmlndXJlSHR0cENhbGxdIFske2NvbmZpZ0Z1bGwubWV0aG9kfSAvICR7dXJsfV0gLSBDb3JlQVBJIGNhbGwgaW50ZW5kZWQgd2l0aCBpbmNvbXBhdGlibGUgY29uZmlndXJhdGlvbiBvcHRpb25zLiBBYm9ydGluZyBhamF4IGNhbGwuYCwgY29uZmlnKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBjb25maWcgdmFsdWVzIGZvciBDb3JlQVBJIGVuZHBvaW50IGFyZSBkaWZmZXJlbnQgZnJvbSBkZWZhdWx0LCBzbyB3ZSBtdXN0IHNwZWNpZnkgdGhlbS5cclxuICAgICAgICAgICAgICAgIGNvbmZpZy5kaXNhYmxlWG1sSHR0cFJlcXVlc3RIZWFkZXIgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGNvbmZpZy51c2VKd3RBdXRoVG9rZW4gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgY29uZmlnLnVzZUN1cnJlbnRVc2VyUm9sZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY29uZmlnLmVuZHBvaW50VHlwZSA9PT0gRW5kcG9pbnRUeXBlLk1BUktFVElOR19BUEkgfHxcclxuICAgICAgICAgICAgICAgIGNvbmZpZy5lbmRwb2ludFR5cGUgPT09IEVuZHBvaW50VHlwZS5PUklHSU4gfHxcclxuICAgICAgICAgICAgICAgIGNvbmZpZy5lbmRwb2ludFR5cGUgPT09IEVuZHBvaW50VHlwZS5RVU9URV9XSVpBUkQgfHxcclxuICAgICAgICAgICAgICAgIGNvbmZpZy5lbmRwb2ludFR5cGUgPT09IEVuZHBvaW50VHlwZS5PUkRFUl9FTlRSWSB8fFxyXG4gICAgICAgICAgICAgICAgY29uZmlnLmVuZHBvaW50VHlwZSA9PT0gRW5kcG9pbnRUeXBlLk9SREVSX1RSQUNLSU5HKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPIE1HQTogcHJvdmlkZSBtb3JlIGNvbXBsZXRlIGZlZWRiYWNrcyBvbiB0aG9zZSBzcGVjaWZpYyBlbmRwb2ludHMgP1xyXG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpZy51c2VDdXJyZW50VXNlclJvbGUgfHxcclxuICAgICAgICAgICAgICAgICAgICBjb25maWcudXNlSnd0QXV0aFRva2VuKVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGxvZy53YXJuKCdbQmx1ZXNreUh0dHBXcmFwcGVyXVtjb25maWd1cmVIdHRwQ2FsbF0gLSBVc2VyUm9sZSAmIEp3dFRva2VuIHNob3VsZCBub3QgYmUgcHJvdmlkZWQgZm9yIHRhcmdldCBlbmRwb2ludC4gJyk7XHJcblxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvbmZpZy5lbmRwb2ludFR5cGUgPT09IEVuZHBvaW50VHlwZS5FWFRFUk5BTCkge1xyXG4gICAgICAgICAgICAgICAgY29uZmlnLmRpc2FibGVYbWxIdHRwUmVxdWVzdEhlYWRlciA9IHRydWU7IC8vIGRvIG5vdCBhZGQgWG1sSHR0cFJlcXVlc3QgaWYgZXh0ZXJuYWwgVXJsIGJ5IGRlZmF1bHQ6IG1pZ2h0IGNyZWF0ZSBjb25mbGljdHMgb24gY2VydGFpbiBzZXJ2ZXJzLiBUT0RPIE1HQSB0byBjb25maXJtXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoYFtCbHVlc2t5SHR0cFdyYXBwZXJdW2NvbmZpZ3VyZUh0dHBDYWxsXVske2NvbmZpZ0Z1bGwubWV0aG9kfSAvICR7dXJsfV0gLSBVbnN1cHBvcnRlZCBlbmRwb2ludFR5cGUgcHJvdmlkZWQ6ICcke0VuZHBvaW50VHlwZVtjb25maWcuZW5kcG9pbnRUeXBlXX0nLiBBYm9ydGluZy5gKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogc2V0IGRlZmF1bHQgdmFsdWVzIGFmdGVyIGVuZHBvaW50LXNwZWNpZmljIGNvbmZpZ3VyYXRpb25zXHJcbiAgICAgICAgICAgIGNvbmZpZy5kaXNhYmxlWG1sSHR0cFJlcXVlc3RIZWFkZXIgPSBjb25maWcuZGlzYWJsZVhtbEh0dHBSZXF1ZXN0SGVhZGVyIHx8IGZhbHNlOyAvLyBkZWZhdWx0IHZhbHVlIGlzIGVuYWJsZWQgKGFqYXggY2FsbHMgb24gLk5FVCBlbmRwb2ludHMpLlxyXG4gICAgICAgICAgICBjb25maWcudXNlQ3VycmVudFVzZXJSb2xlID0gY29uZmlnLnVzZUN1cnJlbnRVc2VyUm9sZSB8fCBmYWxzZTsgLy8gZGVmYXVsdCB2YWx1ZTogZG9uJ3QgdHJhbnNtaXQgc2Vuc2l0aXZlIGluZm9ybWF0aW9uIHRvIHJlbW90ZSBpZiBub3QgZXhwbGljaXRseSBzcGVjaWZpZWQuXHJcbiAgICAgICAgICAgIGNvbmZpZy51c2VKd3RBdXRoVG9rZW4gPSBjb25maWcudXNlSnd0QXV0aFRva2VuIHx8IGZhbHNlOyAvLyBkZWZhdWx0IHZhbHVlOiBkb24ndCB0cmFuc21pdCBzZW5zaXRpdmUgaW5mb3JtYXRpb24gdG8gcmVtb3RlIGlmIG5vdCBleHBsaWNpdGx5IHNwZWNpZmllZC5cclxuICAgICAgICAgICAgY29uZmlnLmRpc2FibGVUb2FzdGVyTm90aWZpY2F0aW9ucyA9IGNvbmZpZy5kaXNhYmxlVG9hc3Rlck5vdGlmaWNhdGlvbnMgfHwgZmFsc2U7IC8vc2V0IGRlZmF1bHQgdmFsdWUgZm9yIGRpc2FibGVUb2FzdGVyTm90aWZpY2F0aW9ucyB0byBmYWxzZSBhcyBpdCdzIHBhcnQgb2YgdGhlIG5vcm1hbCBiZWhhdmlvciBleHBlY3RlZCBmb3IgdGhpcyBzZXJ2aWNlLlxyXG5cclxuXHJcbiAgICAgICAgICAgIC8vIFRyeSB0byBidWlsZCBhIHZhbGlkIHVybCBmcm9tIGlucHV0ICYgZW5kcG9pbnRUeXBlLlxyXG4gICAgICAgICAgICBjb25maWdGdWxsLnVybCA9IHRoaXMuYnVpbGRVcmxGcm9tQ29udGV4dCh1cmwsIGNvbmZpZy5lbmRwb2ludFR5cGUpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFjb25maWdGdWxsLnVybCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKGBbQmx1ZXNreUh0dHBXcmFwcGVyXVtjb25maWd1cmVIdHRwQ2FsbF0gLSBVbmFibGUgdG8gYnVpbGQgdXJsIGZyb20gdXJsSW5wdXQgJyR7dXJsfScgd2l0aCBlbmRwb2ludFR5cGUgJyR7RW5kcG9pbnRUeXBlW2NvbmZpZy5lbmRwb2ludFR5cGVdfScuIEFib3J0aW5nIGFqYXggY2FsbC5gKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIWNvbmZpZy5kaXNhYmxlWG1sSHR0cFJlcXVlc3RIZWFkZXIpXHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYXJkIGNvZGVkIGhlYWRlciB0byBwdXQgaW4gQ09OU1RcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwuaGVhZGVyc1snWC1SZXF1ZXN0ZWQtV2l0aCddID0gJ1hNTEh0dHBSZXF1ZXN0JztcclxuXHJcbiAgICAgICAgICAgIGlmIChjb25maWcudXNlQ3VycmVudFVzZXJSb2xlKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBSZWplY3QgY2FsbCB3aGVuIG1pc3NpbmcgbWFuZGF0b3J5IGluZm9ybWF0aW9uXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcgfHwgIXRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcuY3VycmVudFVzZXJSb2xlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKGBbQmx1ZXNreUh0dHBXcmFwcGVyXVtjb25maWd1cmVIdHRwQ2FsbF0gWyR7Y29uZmlnRnVsbC5tZXRob2R9IC8gJHt1cmx9XSAtIEFqYXggY2FsbCBpbnRlbmRlZCB3aXRob3V0IG5lY2Vzc2FyeSB1c2VyUm9sZSBpbiBibHVlc2t5QWpheENsaWVudENvbmZpZy4gQWJvcnRpbmcuYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYXJkIGNvZGVkIGhlYWRlciB0byBwdXQgaW4gQ09OU1RcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwuaGVhZGVyc1snT0EtVXNlclJvbGUnXSA9IHRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcuY3VycmVudFVzZXJSb2xlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoY29uZmlnLnVzZUp3dEF1dGhUb2tlbikge1xyXG4gICAgICAgICAgICAgICAgLy8gUmVqZWN0IGNhbGwgd2hlbiBtaXNzaW5nIG1hbmRhdG9yeSBpbmZvcm1hdGlvblxyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmJsdWVza3lBamF4Q2xpZW50Q29uZmlnIHx8ICF0aGlzLmJsdWVza3lBamF4Q2xpZW50Q29uZmlnLmp3dEF1dGhUb2tlbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihgW0JsdWVza3lIdHRwV3JhcHBlcl1bY29uZmlndXJlSHR0cENhbGxdIFske2NvbmZpZ0Z1bGwubWV0aG9kfSAvICR7dXJsfV0gLSBBamF4IGNhbGwgaW50ZW5kZWQgd2l0aG91dCBuZWNlc3Nhcnkgand0VG9rZW4gaW4gYmx1ZXNreUFqYXhDbGllbnRDb25maWcuIEFib3J0aW5nLmApO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFyZCBjb2RlZCBoZWFkZXIgdG8gcHV0IGluIENPTlNUXHJcbiAgICAgICAgICAgICAgICBjb25maWdGdWxsLmhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9ICdCZWFyZXIgJyArIHRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcuand0QXV0aFRva2VuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBOiBPRSBzcGVjaWZpYyBjb2RlLCB0byByZW1vdmUsIG9yIGF0IGxlYXN0IHB1dCBpbiBhcyBjb25maWcgcGFyYW1cclxuICAgICAgICAgICAgaWYgKCg8YW55PnRoaXMuJHdpbmRvdykuYmxvY2tfVUkgIT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgIC8vIFRPRE8gTUdBIDogdHlwZSBjYXN0aW5nLCBpcyBpdCBva2F5IG9yIG5vdCA/IGJldHRlciBhcHByb2FjaCA/XHJcbiAgICAgICAgICAgICAgICAoPGFueT50aGlzLiR3aW5kb3cpLnByZXZlbnRCbG9ja1VJID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBjb25maWdGdWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU3VjY2VzcyBoYW5kbGVyLlxyXG4gICAgICAgICAqIENhcHR1cmVzIHRoZSBpbnB1dCBwYXJhbWV0ZXJzIGF0IHRoZSBtb21lbnQgb2YgaXRzIGRlY2xhcmF0aW9uICYgcmV0dXJuIHRoZSByZWFsIGhhbmRsZXIgdG8gYmUgY2FsbGVkIHVwb24gcHJvbWlzZSBjb21wbGV0aW9uLlxyXG4gICAgICAgICAqIElucHV0IHBhcmFtZXRlcnM6XHJcbiAgICAgICAgICogIC0gY2FsbGluZ0NvbmZpZzogY29uZmlndXJhdGlvbiB1c2VkIHRvIG1ha2UgdGhlIGFqYXggY2FsbCwgaW4gY2FzZSB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpcyBudWxsL2VtcHR5IGFuZCBkb2Vzbid0IGNvbnRhaW4gbmVjZXNzYXJ5IGRhdGEgZm9yIGRlYnVnZ2luZy5cclxuICAgICAgICAgKiAgLSBnZXRDb21wbGV0ZVJlc3BvbnNlT2JqZWN0OiBmbGFnIGluZGljYXRpb24gaWYgd2UgbXVzdCByZXR1cm4gdGhlIGZ1bGwgcmVzcG9uc2Ugb2JqZWN0IGFsb25nIHdpdGggaGVhZGVycyBhbmQgc3RhdHVzIG9yIG9ubHkgdGhlIGlubmVyIGRhdGEuIEJ5IGRlZmF1bHQgJiBpZiBub3Qgc3BlY2lmaWVkLCBvbmx5IHJldHVybnMgaW5uZXIgZGF0YS5cclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIG9uU3VjY2VzcyA9IDxUPihvcmlnaW5hbENvbmZpZzogQmx1ZXNreUh0dHBSZXF1ZXN0Q29uZmlnKTogKGh0dHBQcm9taXNlOiBuZy5JSHR0cFByb21pc2VDYWxsYmFja0FyZzxUPikgPT4gVCA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiA8VD4oaHR0cFByb21pc2U6IG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPFQ+KTogVCA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWh0dHBQcm9taXNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKGBbSFRUUCBuby1yZXNwb25zZV0gVW5leHBlY3RlZCAkaHR0cCBlcnJvciwgbm8gcmVzcG9uc2UgcHJvbWlzZSByZXR1cm5lZC5gKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFvcmlnaW5hbENvbmZpZy5kaXNhYmxlVG9hc3Rlck5vdGlmaWNhdGlvbnMpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudG9hc3Rlci5lcnJvcignVW5leHBlY3RlZCBiZWhhdmlvcicsICdQbGVhc2UgY29udGFjdCB5b3VyIGxvY2FsIHN1cHBvcnQgdGVhbS4nKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFuZGxlIG11bHRpLXR5cGUgcmV0dXJuIGluIGNhc2Ugb2YgcmVqZWN0aW9uIG9yIGRvIHNvbWV0aGluZyBlbHNlID8gdGhpcyBtZXRob2QgaXMgY3VycmVudGx5IHVzZWQgc3luY2hyb25vdXNseSB3aXRob3V0IHByb21pc2Ugd2FpdGluZy5cclxuICAgICAgICAgICAgICAgICAgICAvL3JldHVybiB0aGlzLiRxLnJlamVjdChodHRwUHJvbWlzZSk7IC8vIFJlamVjdCBwcm9taXNlXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogcmVqZWN0IGlmIHN0YXR1cyAhPSAyWFggP1xyXG5cclxuICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhbmRsZSB3aGVuIEFQSSBpcyBmaXhlZC4gU2VlIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTE3NDY4OTQvd2hhdC1pcy10aGUtcHJvcGVyLXJlc3QtcmVzcG9uc2UtY29kZS1mb3ItYS12YWxpZC1yZXF1ZXN0LWJ1dC1hbi1lbXB0eS1kYXRhXHJcbiAgICAgICAgICAgICAgICAvL2lmICgocHJvbWlzZUNhbGxiYWNrLmRhdGEgPT09IG51bGwgfHwgcHJvbWlzZUNhbGxiYWNrLmRhdGEgPT09IHVuZGVmaW5lZCkgJiYgcHJvbWlzZUNhbGxiYWNrLnN0YXR1cyAhPT0gMjA0KSB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICB0aGlzLiRsb2cuZXJyb3IoJ1VuZXhwZWN0ZWQgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLCBleHBlY3RlZCByZXNwb25zZSBkYXRhIGJ1dCBub25lIGZvdW5kLicpO1xyXG4gICAgICAgICAgICAgICAgLy8gICAgdGhpcy50b2FzdGVyLndhcm5pbmcoJ1VuZXhwZWN0ZWQgcmVzcG9uc2UnLCAnUGxlYXNlIGNvbnRhY3QgeW91ciBsb2NhbCBzdXBwb3J0IHRlYW0uJyk7XHJcbiAgICAgICAgICAgICAgICAvLyAgICByZXR1cm4gdGhpcy4kcS5yZWplY3QocHJvbWlzZUNhbGxiYWNrKTsgLy8gUmVqZWN0IHByb21pc2UgaWYgbm90IHdlbGwtZm9ybWVkIGRhdGFcclxuICAgICAgICAgICAgICAgIC8vfVxyXG4gICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogc2FtZSBiZWhhdmlvciBhbHNvIG9uIGEgR0VUIHJlcXVlc3QgPyBpZiByZXF1ZXN0IGlzIEdFVCBhbmQgcmVzcG9uc2UgaXMgMjAwIHdpdGggbm8gZGF0YSwgcmV0dXJuIGVycm9yID8gKHBhc3MgaW4gcGFyYW1ldGVyIHJlcXVlc3QgY29udGV4dCB0byBsb2cgdGhpcyBlcnJvcikuXHJcblxyXG4gICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogZ2V0IGZ1bGwgdXJsIG9mIHJlcXVlc3RcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5kZWJ1ZyhgW0hUVFAgJHtodHRwUHJvbWlzZS5jb25maWcubWV0aG9kfV0gWyR7aHR0cFByb21pc2UuY29uZmlnLnVybH1dYCwgaHR0cFByb21pc2UpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHJldHVybiBvbmx5IHRoZSBkYXRhIGV4cGVjdGVkIGZvciBjYWxsZXJcclxuICAgICAgICAgICAgICAgIHJldHVybiBodHRwUHJvbWlzZS5kYXRhO1xyXG5cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEVycm9yIGhhbmRsZXJcclxuICAgICAgICAgKiBUT0RPIE1HQTogYW5ndWxhciBzaWduYXR1cmVzIGluZGljYXRlcyB0aGF0IHBhcmFtZXRlciBpcyByZWplY3Rpb24gcmVhc29uLCBub3QgbmVjZXNzYXJpbHkgaHR0cFByb21pc2U6IGludmVzdGlnYXRlICYgZml4IGlmIG5lY2Vzc2FyeVxyXG4gICAgICAgICAqIEBwYXJhbSBodHRwUHJvbWlzZSBcclxuICAgICAgICAgKiBAcmV0dXJucyB7fSBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIG9uRXJyb3IgPSA8VD4ob3JpZ2luYWxDb25maWc6IEJsdWVza3lIdHRwUmVxdWVzdENvbmZpZyk6IChodHRwUHJvbWlzZTogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8YW55PikgPT4gYW55ID0+IHtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiA8VD4oaHR0cFByb21pc2U6IG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPGFueT4pOiBhbnkgPT4ge1xyXG4gICAgICAgICAgICAgICAgLy8gV2Ugc3VwcG9zZSBpbiBjYXNlIG9mIG5vIHJlc3BvbnNlIHRoYXQgdGhlIHNydiBkaWRuJ3Qgc2VuZCBhbnkgcmVzcG9uc2UuXHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPIE1HQTogbWF5IGFsc28gYmUgYSBmYXVsdCBpbiBpbnRlcm5hbCAkaHR0cCAvIGFqYXggY2xpZW50IHNpZGUgbGliLCB0byBkaXN0aW5ndWlzaC5cclxuICAgICAgICAgICAgICAgIGlmICghaHR0cFByb21pc2UgfHwgIWh0dHBQcm9taXNlLmRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICBodHRwUHJvbWlzZS5kYXRhID0gJ1NlcnZlciBub3QgcmVzcG9uZGluZyc7XHJcbiAgICAgICAgICAgICAgICAgICAgaHR0cFByb21pc2Uuc3RhdHVzID0gNTAzO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICghb3JpZ2luYWxDb25maWcuZGlzYWJsZVRvYXN0ZXJOb3RpZmljYXRpb25zKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBjb250ZW50VHlwZSA9IGh0dHBQcm9taXNlLmhlYWRlcnMoJ0NvbnRlbnQtVHlwZScpO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9jaGVjayBjb250ZW50VHlwZSB0byB0cnkgdG8gZGlzcGxheSBlcnJvciBtZXNzYWdlXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRlbnRUeXBlICYmIChjb250ZW50VHlwZS5pbmRleE9mKCdhcHBsaWNhdGlvbi9qc29uJykgPiAtMSB8fCBjb250ZW50VHlwZS5pbmRleE9mKCd0ZXh0L3BsYWluJykgPiAtMSkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlOiBzdHJpbmcgPSBcIlwiOyAvL2RlZmF1bHQgbWVzc2FnZVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFuZGxlIGVycm9yIGhhbmRsaW5nIG1vcmUgZ2VuZXJpY2FsbHkgYmFzZWQgb24gaW5wdXQgZXJyb3IgbWVzc2FnZSBjb250cmFjdCBpbnN0ZWFkIG9mIGV4cGVjdGluZyBzcGVjaWZpYyBlcnJvciBzdHJjdHVyZS5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vaWYgKHJlc3BvbnNlLmRhdGEuTW9kZWxTdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAvL1RPRE8gTUdBIDogaGFuZGxlIHRoaXMgd2hlbiB3ZWxsIGZvcm1hdHRlZCBzZXJ2ZXItc2lkZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL30gZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaHR0cFByb21pc2UuZGF0YS5NZXNzYWdlICYmIGFuZ3VsYXIuaXNTdHJpbmcoaHR0cFByb21pc2UuZGF0YS5NZXNzYWdlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGh0dHBQcm9taXNlLmRhdGEuTWVzc2FnZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhbmd1bGFyLmlzU3RyaW5nKGh0dHBQcm9taXNlLmRhdGEpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gaHR0cFByb21pc2UuZGF0YTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFuZGxlIG1vcmUgcmVzcG9uc2UgY29kZXMgZ3JhY2VmdWxseS5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGh0dHBQcm9taXNlLnN0YXR1cyA9PT0gNDA0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRvYXN0ZXIud2FybmluZygnTm90IEZvdW5kJywgbWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRvYXN0ZXIuZXJyb3IoJ1NlcnZlciByZXNwb25zZSBlcnJvcicsIG1lc3NhZ2UgKyAnXFxuIFN0YXR1czogJyArIGh0dHBQcm9taXNlLnN0YXR1cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudG9hc3Rlci5lcnJvcignSW50ZXJuYWwgc2VydmVyIGVycm9yJywgJ1N0YXR1czogJyArIGh0dHBQcm9taXNlLnN0YXR1cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGdldCBmdWxsIHVybCBvZiByZXF1ZXN0XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoYFtIVFRQICR7aHR0cFByb21pc2UuY29uZmlnLm1ldGhvZH1dIFske2h0dHBQcm9taXNlLmNvbmZpZy51cmx9XWAsIGh0dHBQcm9taXNlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBXZSBkb24ndCByZWNvdmVyIGZyb20gZXJyb3IsIHNvIHdlIHByb3BhZ2F0ZSBpdCA6IGJlbG93IGhhbmRsZXJzIGhhdmUgdGhlIGNob2ljZSBvZiByZWFkaW5nIHRoZSBlcnJvciB3aXRoIGFuIGVycm9yIGhhbmRsZXIgb3Igbm90LiBTZWUgJHEgcHJvbWlzZXMgYmVoYXZpb3IgaGVyZSA6IGh0dHBzOi8vZ2l0aHViLmNvbS9rcmlza293YWwvcVxyXG4gICAgICAgICAgICAgICAgLy8gVGhpcyBiZWhhdmlvciBpcyBkZXNpcmVkIHNvIHRoYXQgd2Ugc2hvdyBlcnJvciBpbnNpZGUgc3BlY2lmaWMgc2VydmVyIGNvbW11bmljYXRpb24gbW9kYWxzIGF0IHNwZWNpZmljIHBsYWNlcyBpbiB0aGUgYXBwLCBvdGhlcndpc2Ugc2hvdyBhIGdsb2JhbCBhbGVydCBtZXNzYWdlLCBvciBldmVuIGRvIG5vdCBzaG93IGFueXRoaW5nIGlmIG5vdCBuZWNlc3NhcnkgKGRvIG5vdCBhZCBhbiBlcnJvciBoYW5kbGVyIGluIGJlbG93IGhhbmRsZXJzIG9mIHRoaXMgcHJvbWlzZSkuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kcS5yZWplY3QoaHR0cFByb21pc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBGdW5jdGlvbiBjYWxsZWQgYXQgdGhlIGVuZCBvZiBhbiBhamF4IGNhbGwsIHJlZ2FyZGxlc3Mgb2YgaXQncyBzdWNjZXNzIG9yIGZhaWx1cmUuXHJcbiAgICAgICAgICogQHBhcmFtIHJlc3BvbnNlXHJcbiAgICAgICAgICogVE9ETyBNR0EgaW52ZXJzaW9uIG9mIHJlc3BvbnNhYmlsaXR5OiBtYWtlIHRoaXMgZXh0ZW5zaWJsZSBzbyB0aGF0IHNwZWNpZmMgYXBwcyBjYW4gcGx1ZyBpbnRvIHRoaXMgZXZlbnQgd29ya2Zsb3dcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGZpbmFsbHkgPSAoKTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IE9FLXNwZWNpZmljIGNvZGVcclxuICAgICAgICAgICAgaWYgKCg8YW55PnRoaXMuJHdpbmRvdykuYmxvY2tfVUkgIT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgIC8vIFRPRE8gTUdBIDogdHlwZSBjYXN0aW5nLCBpcyBpdCBva2F5IG9yIG5vdCA/IGJldHRlciBhcHByb2FjaCA/XHJcbiAgICAgICAgICAgICAgICAoPGFueT50aGlzLiR3aW5kb3cpLnByZXZlbnRCbG9ja1VJID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBUT0RPIE1HQSA6IHVzaW5nIG1ldGhvZCBmcm9tIExheW91dC5qcyA6IHRvIGRvY3VtZW50IHRvIG5vdCBoYW5kbGUgZHVwbGljYXRlIGNvZGUgISFcclxuICAgICAgICBwcml2YXRlIGdldFVybFBhdGgoYWN0aW9uSXNPblNhbWVDb250cm9sbGVyOiBib29sZWFuKTogc3RyaW5nIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXNlVXJsUmVnZXggPSAvKFxcL1xcdytcXC9cXChTXFwoXFx3K1xcKVxcKSlcXC9cXHcrLztcclxuICAgICAgICAgICAgdmFyIHVybCA9IHRoaXMuJHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZTtcclxuICAgICAgICAgICAgdmFyIGJhc2VVcmxNYXRjaGVzID0gYmFzZVVybFJlZ2V4LmV4ZWModXJsKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChiYXNlVXJsTWF0Y2hlcyAmJiBiYXNlVXJsTWF0Y2hlcy5sZW5ndGggJiYgYmFzZVVybE1hdGNoZXMubGVuZ3RoID09PSAyKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGJhc2VVcmxXaXRoQ29udHJvbGxlck5hbWUgPSBiYXNlVXJsTWF0Y2hlc1swXTtcclxuICAgICAgICAgICAgICAgIHZhciBiYXNlVXJsID0gYmFzZVVybE1hdGNoZXNbMV07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGFjdGlvbklzT25TYW1lQ29udHJvbGxlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBiYXNlVXJsV2l0aENvbnRyb2xsZXJOYW1lO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmFzZVVybDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuICcnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQTogT00tc3BlY2lmaWMgQVNQIE1WQyBjb2RlLCBub3QgdXNlZCBBVE0sIHRvIHJlbW92ZVxyXG4gICAgICAgIHByaXZhdGUgZ2V0Q3VycmVudFNlc3Npb25JRCgpOiBzdHJpbmcge1xyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQSA6IG1hZ2ljIHJlZ2V4cCB0byBmZXRjaCBTZXNzaW9uSUQgaW4gVVJMLCB0byBzdG9yZSBlbHNld2hlcmUgIVxyXG4gICAgICAgICAgICB2YXIgc2Vzc2lvblJlZ2V4ID0gL2h0dHBzOlxcL1xcL1tcXHcuXStcXC9bXFx3Ll0rXFwvKFxcKFNcXChcXHcrXFwpXFwpKVxcLy4qLztcclxuICAgICAgICAgICAgLy92YXIgc2Vzc2lvblJlZ2V4ID0gL2h0dHBzOlxcL1xcL1tcXHcuXStcXC9PcmRlckVudHJ5XFwvKFxcKFNcXChcXHcrXFwpXFwpKVxcLy4qLztcclxuXHJcbiAgICAgICAgICAgIC8vIFRPRE8gTUdBIDogdXBkYXRlIHJlZ2V4cCB0byB0aGUgb25lIGJlbG93XHJcbiAgICAgICAgICAgIC8vdmFyIGJhc2VVcmxSZWdleCA9IC8oaHR0cHM6XFwvXFwvW1xcdy4tXStcXC9bXFx3Li1dK1xcL1xcKFNcXChcXHcrXFwpXFwpXFwvKVxcdysvO1xyXG5cclxuXHJcbiAgICAgICAgICAgIHZhciBwYXRoID0gdGhpcy4kbG9jYXRpb24uYWJzVXJsKCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgcmVnZXhwQXJyYXkgPSBzZXNzaW9uUmVnZXguZXhlYyhwYXRoKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghcmVnZXhwQXJyYXkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignVW5hYmxlIHRvIHJlY29nbml6ZWQgc2VhcmNoZWQgcGF0dGVybiBpbiBjdXJyZW50IHVybCBsb2NhdGlvbiB0byByZXRyaWV2ZSBzZXNzaW9uSUQuJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJlZ2V4cEFycmF5Lmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKCdVbmFibGUgdG8gZmluZCBzZXNzaW9uSUQgaW4gc2VhcmNoZWQgcGF0dGVybiBpbiBjdXJyZW50IHVybC4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAnJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVnZXhwQXJyYXkubGVuZ3RoID4gMikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKCdUb28gbWFueSBtYXRjaGVzIGZvdW5kIGZvciB0aGUgc2Vzc2lvbklEIHNlYXJjaCBpbiB0aGUgY3VycmVudCB1cmwuJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiByZWdleHBBcnJheVsxXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFRyaW0gdGhlIGNvbnRlbnQtZGlzcG9zaXRpb24gaGVhZGVyIHRvIHJldHVybiBvbmx5IHRoZSBmaWxlbmFtZS5cclxuICAgICAgICAgKiBAcGFyYW0gY29udGVudERpc3Bvc2l0aW9uSGVhZGVyXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBnZXRGaWxlTmFtZUZyb21IZWFkZXJDb250ZW50RGlzcG9zaXRpb24oY29udGVudERpc3Bvc2l0aW9uSGVhZGVyOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICBpZiAoIWNvbnRlbnREaXNwb3NpdGlvbkhlYWRlcikgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gY29udGVudERpc3Bvc2l0aW9uSGVhZGVyLnNwbGl0KCc7JylbMV0udHJpbSgpLnNwbGl0KCc9JylbMV07XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0LnJlcGxhY2UoL1wiL2csICcnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgfVxyXG59IixudWxsXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
