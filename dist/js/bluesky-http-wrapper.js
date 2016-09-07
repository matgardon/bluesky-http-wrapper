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
            angular.module('bluesky.HttpWrapper', ['toaster', 'ngAnimate', 'ngFileUpload'])
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
            var EndpointType = bluesky.core.models.EndpointType;
            var HttpMethod;
            (function (HttpMethod) {
                HttpMethod[HttpMethod["GET"] = 0] = "GET";
                HttpMethod[HttpMethod["POST"] = 1] = "POST";
                HttpMethod[HttpMethod["PUT"] = 2] = "PUT";
                HttpMethod[HttpMethod["DELETE"] = 3] = "DELETE";
            })(HttpMethod || (HttpMethod = {}));
            ;
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
                            baseUrl = this.blueskyAjaxClientConfig.coreApiUrl + 'api'; //TODO MGA: hard coded api/ token, to put in config !
                        }
                        else if (endpointType === EndpointType.MARKETING_API) {
                            if (!this.blueskyAjaxClientConfig || !this.blueskyAjaxClientConfig.marketingApiUrl) {
                                this.$log.error('Missing marketingApiUrl in BlueskyAjaxClientConfig. cannot build valid url.');
                                return null;
                            }
                            baseUrl = this.blueskyAjaxClientConfig.marketingApiUrl;
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















//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImJsdWVza3ktaHR0cC13cmFwcGVyLnByb3ZpZGVyLnRzIiwiYmx1ZXNreS1odHRwLXdyYXBwZXIuc2VydmljZS50cyIsIm1vZGVscy91c2VyLXNzby5tb2RlbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFVO0FBQVYsQ0FBQSxVQUFVLFNBQU87SUFBQyxJQUFBO0lBQUEsQ0FBQSxVQUFBLE1BQUk7UUFBQyxJQUFBO1FBQUEsQ0FBQSxVQUFBLFVBQVM7Ozs7Ozs7WUFVNUIsSUFBQSw4QkFBQSxZQUFBO2dCQUFBLFNBQUEsNkJBQUE7b0JBQUEsSUFBQSxRQUFBOztvQkFJWSxLQUFBLG1DQUEyQztvQkFDM0MsS0FBQSxtQkFBcUM7Ozs7b0JBa0J0QyxLQUFBLDRFQUFPLFVBQUMsT0FDWCxTQUNBLE1BQ0EsSUFDQSxXQUNBLFFBQ0EsU0FBa0M7d0JBRWxDLE9BQU8sSUFBSSxTQUFTLG1CQUFtQixPQUFPLFNBQVMsTUFBTSxJQUFJLFdBQVcsUUFBUSxTQUFTLE1BQUssa0NBQWtDLE1BQUs7Ozs7OztnQkFwQnRJLDJCQUFBLFVBQUEscUJBQVAsVUFBMEIsc0JBQTRCO29CQUNsRCxLQUFLLG1DQUFtQyx3QkFBd0IsS0FBSzs7Z0JBR2xFLDJCQUFBLFVBQUEsbUJBQVAsVUFBd0IsVUFBMEI7b0JBQzlDLEtBQUssbUJBQW1CLFlBQVk7O2dCQWlCNUMsT0FBQTs7WUFqQ2EsU0FBQSw2QkFBMEI7WUFtQ3ZDLFFBQVEsT0FBTyx1QkFBdUIsQ0FBQyxXQUFXLGFBQWE7aUJBQ3ZELFNBQVMsc0JBQXNCO1dBOUNwQixXQUFBLEtBQUEsYUFBQSxLQUFBLFdBQVE7T0FBYixPQUFBLFFBQUEsU0FBQSxRQUFBLE9BQUk7R0FBWixZQUFBLFVBQU87O0FDQWpCLElBQVU7QUFBVixDQUFBLFVBQVUsU0FBTztJQUFDLElBQUE7SUFBQSxDQUFBLFVBQUEsTUFBSTtRQUFDLElBQUE7UUFBQSxDQUFBLFVBQUEsVUFBUztZQU01QixJQUFPLGVBQWUsUUFBUSxLQUFLLE9B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QUFBLHNCQUFSLFlBQUE7O29CQUdJLElBQUksZUFBZTs7OztvQkFPbkIsSUFBSSxPQUFPLEtBQUssVUFBVTtvQkFFMUIsSUFBSSxjQUFjLGFBQWEsS0FBSztvQkFFcEMsSUFBSSxDQUFDLGFBQWE7d0JBQ2QsS0FBSyxLQUFLLE1BQU07d0JBQ2hCLE9BQU87O29CQUVYLElBQUksWUFBWSxXQUFXLEdBQUc7d0JBQzFCLEtBQUssS0FBSyxNQUFNO3dCQUNoQixPQUFPOztvQkFFWCxJQUFJLFlBQVksU0FBUyxHQUFHO3dCQUN4QixLQUFLLEtBQUssTUFBTTt3QkFDaEIsT0FBTzs7b0JBR1gsT0FBTyxZQUFZOzs7Ozs7Z0JBT2YsbUJBQUEsVUFBQSwwQ0FBUixVQUFnRCwwQkFBZ0M7b0JBQzVFLElBQUksQ0FBQzt3QkFBMEIsT0FBTztvQkFFdEMsSUFBSSxTQUFTLHlCQUF5QixNQUFNLEtBQUssR0FBRyxPQUFPLE1BQU0sS0FBSztvQkFFdEUsT0FBTyxPQUFPLFFBQVEsTUFBTTs7Z0JBSXBDLE9BQUE7O1lBam5CYSxTQUFBLHFCQUFrQjtXQXJDWixXQUFBLEtBQUEsYUFBQSxLQUFBLFdBQVE7T0FBYixPQUFBLFFBQUEsU0FBQSxRQUFBLE9BQUk7R0FBWixZQUFBLFVBQU87Ozs7Ozs7Ozs7Ozs7OztBQ0NqQiIsImZpbGUiOiJibHVlc2t5LWh0dHAtd3JhcHBlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIm5hbWVzcGFjZSBibHVlc2t5LmNvcmUuc2VydmljZXMge1xyXG5cclxuICAgIGltcG9ydCBVc2VyUm9sZUVudHJ5RHRvID0gYmx1ZXNreS5jb3JlLm1vZGVscy5Vc2VyUm9sZUVudHJ5RHRvO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUHJvdmlkZXIgZm9yIHRoZSBCbHVlc2t5SHR0cFdyYXBwZXIuXHJcbiAgICAgKiBFbmFibGVzIHBlci1jb25zdW1lciBjb25maWd1cmF0aW9uIG9mIHRoZSBodHRwIHNlcnZpY2UgdG8gc2V0IGN1c3RvbSBjb25maWd1cmF0aW9uIFVSTCB0byBmZXRjaCBkYXRhIGZyb206XHJcbiAgICAgKiAgLSBDbGllbnQgaW5pdGlhbCBjb25maWd1cmF0aW9uIFVSTCBmcm9tIHRoZSBvcmlnaW4gdGhlIGFwcCB3YXMgbG9hZGVkIGZyb20uXHJcbiAgICAgKiAgLSBVc2VyUm9sZSB0byB1c2Ugb2YgYWxyZWFkeSBmZXRjaGVkIGZyb20gYW5vdGhlciBwbGFjZS5cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEJsdWVza3lIdHRwV3JhcHBlclByb3ZpZGVyIGltcGxlbWVudHMgbmcuSVNlcnZpY2VQcm92aWRlciB7XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwcml2YXRlIHByb3BlcnRpZXNcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBnZXRDbGllbnRDb25maWdJbml0aWFsaXphdGlvblVybDogc3RyaW5nID0gJ0NvcmVBcGlBdXRoL0dldENvcmVBcGlDb25maWcnOyAvLyBieSBkZWZhdWx0OiBUT0RPIE1HQSBjaGFuZ2UgaXQgaW4gYWxsIE9NIGFwcHMgISBub3QgYSBtZWFuaW5nZnVsbCBuYW1lLlxyXG4gICAgICAgIHByaXZhdGUgc2VsZWN0ZWRVc2VyUm9sZTogVXNlclJvbGVFbnRyeUR0byA9IG51bGw7IC8vIGJ5IGRlZmF1bHQgbm90LXNldC5cclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwdWJsaWMgY29uZmlndXJhdGlvbiBtZXRob2RzXHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRDbGllbnRDb25maWdVUkwoY2xpZW50Q29uZmlnVXJsVG9Vc2U6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmdldENsaWVudENvbmZpZ0luaXRpYWxpemF0aW9uVXJsID0gY2xpZW50Q29uZmlnVXJsVG9Vc2UgfHwgdGhpcy5nZXRDbGllbnRDb25maWdJbml0aWFsaXphdGlvblVybDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRVc2VyUm9sZVRvVXNlKHVzZXJSb2xlOiBVc2VyUm9sZUVudHJ5RHRvKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRVc2VyUm9sZSA9IHVzZXJSb2xlIHx8IG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8gUHJvdmlkZXIncyBmYWN0b3J5IGZ1bmN0aW9uXHJcbiAgICAgICAgLyogQG5nSW5qZWN0ICovXHJcbiAgICAgICAgcHVibGljICRnZXQgPSAoJGh0dHA6IG5nLklIdHRwU2VydmljZSxcclxuICAgICAgICAgICAgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsXHJcbiAgICAgICAgICAgICRsb2c6IG5nLklMb2dTZXJ2aWNlLFxyXG4gICAgICAgICAgICAkcTogbmcuSVFTZXJ2aWNlLFxyXG4gICAgICAgICAgICAkbG9jYXRpb246IG5nLklMb2NhdGlvblNlcnZpY2UsXHJcbiAgICAgICAgICAgIFVwbG9hZDogbmcuYW5ndWxhckZpbGVVcGxvYWQuSVVwbG9hZFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHRvYXN0ZXI6IG5ndG9hc3Rlci5JVG9hc3RlclNlcnZpY2UpOiBzZXJ2aWNlcy5JQmx1ZXNreUh0dHBXcmFwcGVyID0+IHtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgc2VydmljZXMuQmx1ZXNreUh0dHBXcmFwcGVyKCRodHRwLCAkd2luZG93LCAkbG9nLCAkcSwgJGxvY2F0aW9uLCBVcGxvYWQsIHRvYXN0ZXIsIHRoaXMuZ2V0Q2xpZW50Q29uZmlnSW5pdGlhbGl6YXRpb25VcmwsIHRoaXMuc2VsZWN0ZWRVc2VyUm9sZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKCdibHVlc2t5Lkh0dHBXcmFwcGVyJywgWyd0b2FzdGVyJywgJ25nQW5pbWF0ZScsICduZ0ZpbGVVcGxvYWQnXSlcclxuICAgICAgICAgICAucHJvdmlkZXIoJ2JsdWVza3lIdHRwV3JhcHBlcicsIEJsdWVza3lIdHRwV3JhcHBlclByb3ZpZGVyKTtcclxufSIsIm5hbWVzcGFjZSBibHVlc2t5LmNvcmUuc2VydmljZXMge1xyXG5cclxuICAgIGltcG9ydCBCbHVlc2t5QWpheENsaWVudENvbmZpZyA9IGJsdWVza3kuY29yZS5tb2RlbHMuQmx1ZXNreUFqYXhDbGllbnRDb25maWc7XHJcbiAgICBpbXBvcnQgRmlsZUNvbnRlbnQgPSBibHVlc2t5LmNvcmUubW9kZWxzLkZpbGVDb250ZW50O1xyXG4gICAgaW1wb3J0IFVzZXJTc29EdG8gPSBibHVlc2t5LmNvcmUubW9kZWxzLlVzZXJTc29EdG87XHJcbiAgICBpbXBvcnQgQmx1ZXNreUh0dHBSZXF1ZXN0Q29uZmlnID0gYmx1ZXNreS5jb3JlLm1vZGVscy5JQmx1ZXNreUh0dHBSZXF1ZXN0Q29uZmlnO1xyXG4gICAgaW1wb3J0IEVuZHBvaW50VHlwZSA9IGJsdWVza3kuY29yZS5tb2RlbHMuRW5kcG9pbnRUeXBlO1xyXG4gICAgaW1wb3J0IFVzZXJSb2xlRW50cnlEdG8gPSBibHVlc2t5LmNvcmUubW9kZWxzLlVzZXJSb2xlRW50cnlEdG87XHJcblxyXG4gICAgZW51bSBIdHRwTWV0aG9kIHsgR0VULCBQT1NULCBQVVQsIERFTEVURSB9O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVE9ETyBNR0EgY29tbWVudFxyXG4gICAgICovXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElCbHVlc2t5SHR0cFdyYXBwZXIge1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBBbGwgc3J2LXNpZGUgY29uZmlndXJhdGlvbiBvZiB0aGlzIGh0dHAgY2xpZW50LCBwcm92aWRlZCBieSB0aGUgaW5qZWN0ZWQgJ2NvbmZpZ0luaXRpYWxpemF0aW9uVVJMJyBlbmRwb2ludC5cclxuICAgICAgICAgKiBUaGlzIGNvbmZpZ3VyYXRpb24gZGF0YSBpcyBsb2FkZWQgdXBvbiBpbml0aWFsaXphdGlvbiBvZiB0aGlzIHNlcnZpY2UgKHRvIGJlIHVzZWQgYXMgYSBzaW5nbGV0b24gaW4gdGhlIGFwcCkuIEFsbCBvdGhlciB3ZWIgY2FsbHMgYXJlIGJsb2NrZWQgYXMgbG9uZyBhcyB0aGlzIG9uZSBpcyBub3QgZmluaXNoZWQuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgYmx1ZXNreUFqYXhDbGllbnRDb25maWc6IEJsdWVza3lBamF4Q2xpZW50Q29uZmlnO1xyXG5cclxuICAgICAgICBnZXQ8VD4odXJsOiBzdHJpbmcsIGNvbmZpZz86IEJsdWVza3lIdHRwUmVxdWVzdENvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICBkZWxldGU8VD4odXJsOiBzdHJpbmcsIGNvbmZpZz86IEJsdWVza3lIdHRwUmVxdWVzdENvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICBwb3N0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IEJsdWVza3lIdHRwUmVxdWVzdENvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICBwdXQ8VD4odXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogQmx1ZXNreUh0dHBSZXF1ZXN0Q29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIHVwbG9hZDxUPih1cmw6IHN0cmluZywgZmlsZTogRmlsZSwgY29uZmlnPzogQmx1ZXNreUh0dHBSZXF1ZXN0Q29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIGdldEZpbGUodXJsOiBzdHJpbmcsIGNvbmZpZz86IEJsdWVza3lIdHRwUmVxdWVzdENvbmZpZyk6IG5nLklQcm9taXNlPEZpbGVDb250ZW50PjtcclxuXHJcbiAgICAgICAgYnVpbGRVcmxGcm9tQ29udGV4dCh1cmxJbnB1dDogc3RyaW5nKTogc3RyaW5nO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBCbHVlc2t5SHR0cFdyYXBwZXIgaW1wbGVtZW50cyBJQmx1ZXNreUh0dHBXcmFwcGVyIHtcclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIHByb3BlcnRpZXNcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBnZXRDb25maWdQcm9taXNlOiBuZy5JUHJvbWlzZTxhbnk+O1xyXG5cclxuICAgICAgICBwdWJsaWMgYmx1ZXNreUFqYXhDbGllbnRDb25maWc6IEJsdWVza3lBamF4Q2xpZW50Q29uZmlnO1xyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIGN0b3JcclxuXHJcbiAgICAgICAgLyogQG5nSW5qZWN0ICovXHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGh0dHA6IG5nLklIdHRwU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkbG9nOiBuZy5JTG9nU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRsb2NhdGlvbjogbmcuSUxvY2F0aW9uU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSBVcGxvYWQ6IG5nLmFuZ3VsYXJGaWxlVXBsb2FkLklVcGxvYWRTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlIHRvYXN0ZXI6IG5ndG9hc3Rlci5JVG9hc3RlclNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgY29uZmlnSW5pdGlhbGl6YXRpb25VUkw6IHN0cmluZyxcclxuICAgICAgICAgICAgcHJpdmF0ZSBzZWxlY3RlZFVzZXJSb2xlOiBVc2VyUm9sZUVudHJ5RHRvXHJcbiAgICAgICAgKSB7XHJcblxyXG4gICAgICAgICAgICAvLyAxIC0gZmV0Y2ggdGhlIGNvbmZpZ3VyYXRpb24gZGF0YSBuZWNlc3NhcnkgZm9yIHRoaXMgc2VydmljZSB0byBydW4gZnJvbSB0aGUgcHJvdmlkZWQgZW5kcG9pbnRcclxuXHJcbiAgICAgICAgICAgIHZhciBjb25maWd1cmF0aW9uRW5kcG9pbnRVcmwgPSB0aGlzLmJ1aWxkVXJsRnJvbUNvbnRleHQoY29uZmlnSW5pdGlhbGl6YXRpb25VUkwsIEVuZHBvaW50VHlwZS5PUklHSU4pO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFjb25maWd1cmF0aW9uRW5kcG9pbnRVcmwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihgW0JsdWVza3lIdHRwV3JhcHBlcl1bSW5pdGlhbGl6YXRpb25dIC0gVW5hYmxlIHRvIGJ1aWxkIHVybCBmcm9tIGluaXRpYWxDb25maWcgdXJsICcke2NvbmZpZ0luaXRpYWxpemF0aW9uVVJMfScgd2l0aCBlbmRwb2ludFR5cGUgJyR7RW5kcG9pbnRUeXBlW0VuZHBvaW50VHlwZS5PUklHSU5dfScuIEFib3J0aW5nIGJsdWVza3lIdHRwU2VydmljZSBpbml0LmApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmdldENvbmZpZ1Byb21pc2UgPSB0aGlzLiRodHRwLmdldDxCbHVlc2t5QWpheENsaWVudENvbmZpZz4oY29uZmlndXJhdGlvbkVuZHBvaW50VXJsKVxyXG4gICAgICAgICAgICAgICAgLnRoZW48Qmx1ZXNreUFqYXhDbGllbnRDb25maWc+KFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHN1Y2Nlc3NcclxuICAgICAgICAgICAgICAgICAgICAoY2xpZW50Q29uZmlnUHJvbWlzZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiByZWplY3Qgc3RhdHVzIG5vdCBpbiAyWFggP1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNsaWVudENvbmZpZ1Byb21pc2UuZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1zZyA9IGBVbmFibGUgdG8gcmV0cmlldmUgaHR0cCBjb25maWcgZGF0YSBmcm9tICcke2NvbmZpZ0luaXRpYWxpemF0aW9uVVJMfScuIEFib3J0aW5nIGJsdWVza3lIdHRwV3JhcHBlclNlcnZpY2UgaW5pdGlhbGl6YXRpb24uYDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihtc2cpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogdG9hc3RlciA/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kcS5yZWplY3QobXNnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZyA9IGNsaWVudENvbmZpZ1Byb21pc2UuZGF0YTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNsaWVudENvbmZpZ1Byb21pc2UuZGF0YTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgKGVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignVW5hYmxlIHRvIHJldHJpZXZlIEFQSSBjb25maWcuIEFib3J0aW5nIGJsdWVza3lIdHRwV3JhcHBlclNlcnZpY2UgaW5pdGlhbGl6YXRpb24uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRxLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC50aGVuPEJsdWVza3lBamF4Q2xpZW50Q29uZmlnPihcclxuICAgICAgICAgICAgICAgICAgICAvLyBzdWNjZXNzXHJcbiAgICAgICAgICAgICAgICAgICAgKGJsdWVza3lDbGllbnRDb25maWcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFuZGxlIGNhc2Ugd2hlcmUgY2xpZW50LXNpZGUgdXNlclJvbGUgd2FzIHByb3ZpZGVkIGFuZCBub3QgPT0gc3J2LXNpZGUgdXNlciByb2xlID9cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFibHVlc2t5Q2xpZW50Q29uZmlnLmN1cnJlbnRVc2VyUm9sZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9JZiBub3QgcHJvdmlkZWQgYnkgZG9tYWluIGZyb20gd2hpY2ggY29kZSB3YXMgbG9hZGVkLCB0aGVuIHRyeSB0byBmZXRjaCBkZWZhdWx0IHVzZXJSb2xlIGZyb20gQ0FQSSBlbmRwb2ludFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0PFVzZXJTc29EdG8+KCd1c2VyLXNzbz9wcm9maWxlPScsIHsgZW5kcG9pbnRUeXBlOiBFbmRwb2ludFR5cGUuQ09SRV9BUEkgfSkudGhlbjxCbHVlc2t5QWpheENsaWVudENvbmZpZz4oXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHVzZXJTc28pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF1c2VyU3NvIHx8ICF1c2VyU3NvLnVzZXJSb2xlRW50cnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtc2cgPSAnVW5hYmxlIHRvIHJldHJpZXZlIENvcmVBUEkgZGVmYXVsdCB1c2VyU1NPLiBBYm9ydGluZyBodHRwV3JhcHBlclNlcnZpY2UgaW5pdGlhbGl6YXRpb24uJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihtc2cpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHEucmVqZWN0KG1zZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1c2VyUm9sZVRvVXNlID0gc2VsZWN0ZWRVc2VyUm9sZSB8fCB1c2VyU3NvLnVzZXJSb2xlRW50cnk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiB0aGlzIG5lZWRzIHRvIGJlIHB1dCBpbiBzaGFyZWQgZXh0ZW5zaW9uIG1ldGhvZCAvIHNlcnZpY2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZy5jdXJyZW50VXNlclJvbGUgPSB1c2VyUm9sZVRvVXNlLm5hbWUgKyBcIiBcIiArIHVzZXJSb2xlVG9Vc2Uucm9sZSArIFwiIFwiICsgdXNlclJvbGVUb1VzZS5zaWxvO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZy5jdXJyZW50VXNlciA9IHVzZXJTc287XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmx1ZXNreUNsaWVudENvbmZpZztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiB3ZSBvbmx5IGxvYWQgdXNlclNTTyBpZiBubyB1c2VyUm9sZSB3YXMgcHJvdmlkZWQgc3J2LXNpZGUsIHNob3VsZCB3ZSBsb2FkIGl0IGluIGFsbCBjYXNlcyA/XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWxyZWFkeSBkZWZpbmVkIHVzZXJSb2xlIHNlbnQgZnJvbSBvcmlnaW4gYXBwLCB1c2UgaXQgJiBzZXQgaXQgYXMgZGVmYXVsdC5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBibHVlc2t5Q2xpZW50Q29uZmlnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIHB1YmxpYyBtZXRob2RzXHJcblxyXG4gICAgICAgIGdldDxUPih1cmw6IHN0cmluZywgY29uZmlnPzogQmx1ZXNreUh0dHBSZXF1ZXN0Q29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KEh0dHBNZXRob2QuR0VULCB1cmwsIGNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkZWxldGU8VD4odXJsOiBzdHJpbmcsIGNvbmZpZz86IEJsdWVza3lIdHRwUmVxdWVzdENvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWpheDxUPihIdHRwTWV0aG9kLkRFTEVURSwgdXJsLCBjb25maWcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcG9zdDxUPih1cmw6IHN0cmluZywgZGF0YTogYW55LCBjb25maWc/OiBCbHVlc2t5SHR0cFJlcXVlc3RDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcclxuICAgICAgICAgICAgY29uZmlnLmRhdGEgPSBkYXRhIHx8IGNvbmZpZy5kYXRhOztcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWpheDxUPihIdHRwTWV0aG9kLlBPU1QsIHVybCwgY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1dDxUPih1cmw6IHN0cmluZywgZGF0YTogYW55LCBjb25maWc/OiBCbHVlc2t5SHR0cFJlcXVlc3RDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcclxuICAgICAgICAgICAgY29uZmlnLmRhdGEgPSBkYXRhIHx8IGNvbmZpZy5kYXRhO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KEh0dHBNZXRob2QuUFVULCB1cmwsIGNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBUT0RPIE1HQTogbm90IERSWSB3aXRoIGFqYXggbWV0aG9kLCBob3cgdG8ga2VlcCBpdCBpbiBzeW5jID9cclxuICAgICAgICAgKiBAcGFyYW0gdXJsXHJcbiAgICAgICAgICogQHBhcmFtIGZpbGVcclxuICAgICAgICAgKiBAcGFyYW0gY29uZmlnXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdXBsb2FkPFQ+KHVybDogc3RyaW5nLCBmaWxlOiBGaWxlLCBjb25maWc/OiBCbHVlc2t5SHR0cFJlcXVlc3RDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWZpbGUgJiYgKCFjb25maWcgfHwgIWNvbmZpZy5maWxlKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKCdDYW5ub3Qgc3RhcnQgdXBsb2FkIHdpdGggbnVsbCB7ZmlsZX0gcGFyYW1ldGVyLicpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcclxuICAgICAgICAgICAgY29uZmlnLmZpbGUgPSBmaWxlIHx8IGNvbmZpZy5maWxlOyAvL1RPRE8gTUdBIDogZG8gbm90IGV4cG9zZSBmaWxlIGluIElCbHVlc2t5SHR0cFJlcXVlc3RDb25maWcgP1xyXG4gICAgICAgICAgICBjb25maWcuZGF0YSA9IGNvbmZpZy5kYXRhIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbmZpZy51cGxvYWRJbkJhc2U2NEpzb24pIHtcclxuICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IG1ha2Ugc3VyZSB0aGlzIGRlbGF5cyBuZXh0IGNhbGwgYW5kIHVwbG9hZCBpcyBub3QgZG9uZSBiZWZvcmUgYmFzZTY0IGVuY29kaW5nIGlzIGZpbmlzaGVkLCBldmVuIGlmIHByb21pc2UgaXMgYWxyZWFkeSByZXNvbHZlZCA/Pz9cclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLlVwbG9hZC5iYXNlNjREYXRhVXJsKGZpbGUpLnRoZW4oKGZpbGVCYXNlNjRVcmwpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYXJkLWNvZGVkIGtleSB0byBmZXRjaCBiYXNlNjQgZW5jb2RpbmcsIHRvIHBhcmFtZXRyaXplIHdpdGggc2VydmVyLXNpZGUgIVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5kYXRhLmZpbGVCYXNlNjRVcmwgPSBmaWxlQmFzZTY0VXJsO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vbm9ybWFsIHBvc3QgaW4gY2FzZSBvZiBiYXNlNjQtZW5jb2RlZCBkYXRhXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWpheDxUPihIdHRwTWV0aG9kLlBPU1QsIHVybCwgY29uZmlnKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uZmlnLmRhdGEuZmlsZUZvcm1EYXRhTmFtZSA9ICdmaWxlJzsgLy8gZmlsZSBmb3JtRGF0YSBuYW1lICgnQ29udGVudC1EaXNwb3NpdGlvbicpLCBzZXJ2ZXIgc2lkZSByZXF1ZXN0IGZvcm0gbmFtZVxyXG5cclxuICAgICAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBkbyBub3QgYmxvY2sgaWYgbm90IGNhbGwgdG8gaW50ZXJuYWwgQVBJID8gKGluaXRDYWxsKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Q29uZmlnUHJvbWlzZS50aGVuKCgpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGJlaGF2aW9yIGR1cGxpY2F0aW9uIHdpdGggdGhpcy5hamF4LCBub3QgRFJZLCB0byBpbXByb3ZlXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlcXVlc3RDb25maWcgPSB0aGlzLmNvbmZpZ3VyZUh0dHBDYWxsKEh0dHBNZXRob2QuUE9TVCwgdXJsLCBjb25maWcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVxdWVzdENvbmZpZykgLy8gaWYgbm8gY29uZmlnIHJldHVybmVkLCBjb25maWd1cmF0aW9uIGZhaWxlZCwgZG8gbm90IHN0YXJ0IGFqYXggcmVxdWVzdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5VcGxvYWQudXBsb2FkPFQ+KDxuZy5hbmd1bGFyRmlsZVVwbG9hZC5JRmlsZVVwbG9hZENvbmZpZ0ZpbGU+cmVxdWVzdENvbmZpZykgLy9UT0RPIE1HQSA6IG5vdCBzYWZlIGhhcmQgY2FzdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW48VD4odGhpcy5vblN1Y2Nlc3M8VD4oY29uZmlnKSwgdGhpcy5vbkVycm9yPFQ+KGNvbmZpZyksIGNvbmZpZy51cGxvYWRQcm9ncmVzcykgLy9UT0RPIE1HQSA6IHVwbG9hZFByb2dyZXNzIGNhbGxiYWNrIG9rID9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maW5hbGx5KHRoaXMuZmluYWxseSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVGhpcyBtZXRob2QgaXMgdXNlZCB0byBkb3dubG9hZCBhIGZpbGUgaW4gdGhlIGZvcm0gb2YgYSBieXRlLXN0cmVhbSBmcm9tIGFuIGVuZHBvaW50IGFuZCB3cmFwIGl0IGludG8gYSBGaWxlQ29udGVudCBvYmplY3Qgd2l0aCBuYW1lLCB0eXBlICYgc2l6ZSBwcm9wZXJ0aWVzIHJlYWQgZnJvbSB0aGUgSFRUUCByZXNwb25zZSBoZWFkZXJzIG9mIHRoZSBzZXJ2ZXVyLlxyXG4gICAgICAgICAqIEl0IGlzIHRoZSByZXNwb25zYWJpbGl0eSBvZiB0aGUgY29uc3VtZXIgdG8gZG8gc29tZXRoaW5nIHdpdGggdGhlIHdyYXBwZWQgYnl0ZUFycmF5IChmb3IgZXhhbXBsZSBkb3dubG9hZCB0aGUgZmlsZSwgb3Igc2hvdyBpdCBpbnNpZGUgdGhlIHdlYlBhZ2UgZXRjKS5cclxuICAgICAgICAgKiBUT0RPIE1HQTogbm90IERSWSB3aXRoIGFqYXggbWV0aG9kLCBob3cgdG8ga2VlcCBpdCBpbiBzeW5jID9cclxuICAgICAgICAgKiBAcGFyYW0gdXJsXHJcbiAgICAgICAgICogQHBhcmFtIGV4cGVjdGVkTmFtZVxyXG4gICAgICAgICAqIEBwYXJhbSBleHBlY3RlZFNpemVcclxuICAgICAgICAgKiBAcGFyYW0gZXhwZWN0ZWRUeXBlXHJcbiAgICAgICAgICogQHBhcmFtIGNvbmZpZ1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGdldEZpbGUodXJsOiBzdHJpbmcsIGNvbmZpZz86IEJsdWVza3lIdHRwUmVxdWVzdENvbmZpZyk6IG5nLklQcm9taXNlPEZpbGVDb250ZW50PiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldENvbmZpZ1Byb21pc2UudGhlbigoKSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGFuZ3VsYXJIdHRwQ29uZmlnID0gdGhpcy5jb25maWd1cmVIdHRwQ2FsbChIdHRwTWV0aG9kLkdFVCwgdXJsLCBjb25maWcpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGlmIG5vIGNvbmZpZyByZXR1cm5lZCwgY29uZmlndXJhdGlvbiBmYWlsZWQsIGRvIG5vdCBzdGFydCBhamF4IHJlcXVlc3RcclxuICAgICAgICAgICAgICAgIGlmICghYW5ndWxhckh0dHBDb25maWcpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kcS5yZWplY3QoJ1VuYWJsZSB0byBjb25maWd1cmUgcmVxdWVzdCBjb3JyZWN0bHkuIEFib3J0aW5nIGdldEZpbGUgYWpheCBjYWxsLicpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIHNwZWNpZmljYWxseSBleHBlY3QgcmF3IHJlc3BvbnNlIHR5cGUsIG90aGVyd2lzZSBieXRlIHN0cmVhbSByZXNwb25zZXMgYXJlIGNvcnJ1cHRlZC5cclxuICAgICAgICAgICAgICAgIGFuZ3VsYXJIdHRwQ29uZmlnLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XHJcblxyXG4gICAgICAgICAgICAgICAgLy9FeHBlY3RlZCBBcnJheUJ1ZmZlciByZXNwb25zZSA9IGJ5dGUgYXJyYXlcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRodHRwPEFycmF5QnVmZmVyPihhbmd1bGFySHR0cENvbmZpZylcclxuICAgICAgICAgICAgICAgICAgICAudGhlbjxGaWxlQ29udGVudD4oKGh0dHBSZXNwb25zZSkgPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9iZW5lZml0IGZyb20gc3VjY2Vzc0NhbGxiYWNrIHZhbGlkYXRpb24gYmVmb3JlIGNvbnRpbnVpbmdcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFycmF5QnVmZmVyID0gdGhpcy5vblN1Y2Nlc3M8QXJyYXlCdWZmZXI+KGNvbmZpZykoaHR0cFJlc3BvbnNlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IHByb21pc2UgcmVqZWN0aW9uIHZzLiByZXR1cm4gbnVsbCA/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghYXJyYXlCdWZmZXIpIHJldHVybiBudWxsOyAvL3N0b3AgcHJvY2Vzc2luZyBpZiB1bmFibGUgdG8gcmV0cmlldmUgYnl0ZSBhcnJheVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9yZWFkIGZpbGUgaW5mbyBmcm9tIHJlc3BvbnNlLWhlYWRlcnNcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZpbGVDb250ZW50OiBGaWxlQ29udGVudCA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMuZ2V0RmlsZU5hbWVGcm9tSGVhZGVyQ29udGVudERpc3Bvc2l0aW9uKGh0dHBSZXNwb25zZS5oZWFkZXJzKCdjb250ZW50LWRpc3Bvc2l0aW9uJykpIHx8IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaXplOiBOdW1iZXIoaHR0cFJlc3BvbnNlLmhlYWRlcnMoJ2NvbnRlbnQtbGVuZ3RoJykpIHx8IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBodHRwUmVzcG9uc2UuaGVhZGVycygnY29udGVudC10eXBlJykgfHwgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBhcnJheUJ1ZmZlclxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZpbGVDb250ZW50O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB9LCB0aGlzLm9uRXJyb3IpXHJcbiAgICAgICAgICAgICAgICAgICAgLmZpbmFsbHkodGhpcy5maW5hbGx5KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBUcmllcyB0byBwYXJzZSB0aGUgaW5wdXQgdXJsIDpcclxuICAgICAgICAgKiBJZiBpdCBzZWVtcyB0byBiZSBhIGZ1bGwgVVJMLCB0aGVuIHJldHVybiBhcyBpcyAoY29uc2lkZXJzIGl0IGV4dGVybmFsIFVybCkgXHJcbiAgICAgICAgICogT3RoZXJ3aXNlLCB0cmllcyB0byBmaW5kIHRoZSBiYXNlIFVSTCBvZiB0aGUgY3VycmVudCBCbHVlU2t5IGFwcCB3aXRoIG9yIHdpdGhvdXQgdGhlIGluY2x1ZGVkIENvbnRyb2xsZXIgYW5kIHJldHVybnMgdGhlIGZ1bGwgVXJsIFxyXG4gICAgICAgICAqIEBwYXJhbSB1cmxJbnB1dCA6IFRPRE8gTUdBOiBkb2N1bWVudCBkaWZmZXJlbnQga2luZCBvZiB1cmxzIHRoYXQgdGhpcyBtZXRob2QgY2FuIHRha2UgYXMgaW5wdXQgKGZ1bGwsIHBhcnRpYWwgZXRjKVxyXG4gICAgICAgICAqIEByZXR1cm4gbnVsbCBpZiBub3QgYWJsZSB0byBjb21wdXRlIHVybC4gT3RoZXJ3aXNlLCB1cmwgb2YgdGhlIHJlcXVlc3QgZWl0aGVyIHBhcnRpYWwgb3IgZnVsbCBiYXNlZCBvbiBlbmRwb2ludFR5cGUuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGJ1aWxkVXJsRnJvbUNvbnRleHQodXJsSW5wdXQ6IHN0cmluZywgZW5kcG9pbnRUeXBlPzogRW5kcG9pbnRUeXBlKTogc3RyaW5nIHtcclxuXHJcbiAgICAgICAgICAgIGlmICghdXJsSW5wdXQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignTm8gVVJMIGlucHV0IHByb3ZpZGVkLicpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIElmIFVybCBzdGFydHMgd2l0aCBodHRwOi8vIG9yIGh0dHBzOi8vID0+IHJldHVybiBhcyBpcywgZXZlbiBpZiBlbmRwb2ludFR5cGUgaXMgbm90IGV4dGVybmFsLlxyXG4gICAgICAgICAgICBpZiAodXJsSW5wdXQuc2xpY2UoMCwgJ2h0dHA6Ly8nLmxlbmd0aCkgPT09ICdodHRwOi8vJyB8fFxyXG4gICAgICAgICAgICAgICAgdXJsSW5wdXQuc2xpY2UoMCwgJ2h0dHBzOi8vJy5sZW5ndGgpID09PSAnaHR0cHM6Ly8nKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdXJsSW5wdXQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEVsc2UsIHdlIGhhdmUgYSBwYXJ0aWFsIFVSTCB0byBjb21wbGV0ZTogdXNlIHByb3ZpZGVkIGVuZHBvaW50IHR5cGUgdG8gZGV0ZXJtaW5lIGhvdyB0byBjb21wbGV0ZSB1cmwuXHJcblxyXG4gICAgICAgICAgICAvLyBEZWZhdWx0IHZhbHVlIGZvciBlbmRwb2ludFR5cGUgaWYgbm90IHByb3ZpZGVkIGlzIG9yaWdpbi4gVE9ETyBNR0E6IHJ1bGUgdG8gZGlzY3VzcywgaGVyZSBmb3IgcmV0cm8tY29tcGF0aWJpbGl0eS5cclxuICAgICAgICAgICAgZW5kcG9pbnRUeXBlID0gZW5kcG9pbnRUeXBlIHx8IEVuZHBvaW50VHlwZS5PUklHSU47XHJcblxyXG4gICAgICAgICAgICBpZiAoZW5kcG9pbnRUeXBlID09PSBFbmRwb2ludFR5cGUuRVhURVJOQUwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy53YXJuKCdQYXJ0aWFsIHVybCBwcm92aWRlZCBmb3IgYW4gZXh0ZXJuYWwgZW5kcG9pbnQ6IHRoZSBjYWxsIHdpbGwgcHJvYmFibHkgZmFpbC4nKTtcclxuICAgICAgICAgICAgICAgIC8vIGRvIG5vdCBtb2RpZnkgcHJvdmlkZWQgdXJsIGlmIGV4dGVybmFsICh3ZSBjYW5ub3Qga25vdyBob3cgdG8gY29tcGxldGUgaXQsIGV2ZW4gaWYgcGFydGlhbCkuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdXJsSW5wdXQ7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvL0NvbXB1dGUgdXJsIGFzIGNvbWJpbmF0aW9uIG9mIGJhc2UgdXJsICYgdXJsIGZyYWdtZW50IGdpdmVuIGFzIGlucHV0XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGJhc2VVcmw6IHN0cmluZyA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGVuZHBvaW50VHlwZSA9PT0gRW5kcG9pbnRUeXBlLkNPUkVfQVBJKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZyB8fCAhdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZy5jb3JlQXBpVXJsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignTWlzc2luZyBjb3JlQXBpVXJsIGluIEJsdWVza3lBamF4Q2xpZW50Q29uZmlnLiBjYW5ub3QgYnVpbGQgdmFsaWQgdXJsLicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJhc2VVcmwgPSB0aGlzLmJsdWVza3lBamF4Q2xpZW50Q29uZmlnLmNvcmVBcGlVcmwgKyAnYXBpJzsgLy9UT0RPIE1HQTogaGFyZCBjb2RlZCBhcGkvIHRva2VuLCB0byBwdXQgaW4gY29uZmlnICFcclxuXHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVuZHBvaW50VHlwZSA9PT0gRW5kcG9pbnRUeXBlLk1BUktFVElOR19BUEkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmJsdWVza3lBamF4Q2xpZW50Q29uZmlnIHx8ICF0aGlzLmJsdWVza3lBamF4Q2xpZW50Q29uZmlnLm1hcmtldGluZ0FwaVVybCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ01pc3NpbmcgbWFya2V0aW5nQXBpVXJsIGluIEJsdWVza3lBamF4Q2xpZW50Q29uZmlnLiBjYW5ub3QgYnVpbGQgdmFsaWQgdXJsLicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJhc2VVcmwgPSB0aGlzLmJsdWVza3lBamF4Q2xpZW50Q29uZmlnLm1hcmtldGluZ0FwaVVybDtcclxuXHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVuZHBvaW50VHlwZSA9PT0gRW5kcG9pbnRUeXBlLlFVT1RFX1dJWkFSRCkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcgfHwgIXRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcucXVvdGVXaXphcmRVcmwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKCdNaXNzaW5nIHF1b3RlV2l6YXJkVXJsIGluIEJsdWVza3lBamF4Q2xpZW50Q29uZmlnLiBjYW5ub3QgYnVpbGQgdmFsaWQgdXJsLicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhvdyB0byBoYW5kbGUgT00gYXBwcyBleHRlcm5hbCBjYWxscyB3aXRob3V0IHNlc3Npb24gcHJvdmlkZWQgPyB3aWxsIHJlc3VsdCBpbiBhIHJlZGlyZWN0IGFuZCBjYWxsIHdpbGwgcHJvYmFibHkgZmFpbCAuLi5cclxuICAgICAgICAgICAgICAgICAgICBiYXNlVXJsID0gdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZy5xdW90ZVdpemFyZFVybDtcclxuXHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVuZHBvaW50VHlwZSA9PT0gRW5kcG9pbnRUeXBlLk9SREVSX0VOVFJZKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZyB8fCAhdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZy5vcmRlckVudHJ5VXJsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignTWlzc2luZyBvcmRlckVudHJ5VXJsIGluIEJsdWVza3lBamF4Q2xpZW50Q29uZmlnLiBjYW5ub3QgYnVpbGQgdmFsaWQgdXJsLicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhvdyB0byBoYW5kbGUgT00gYXBwcyBleHRlcm5hbCBjYWxscyB3aXRob3V0IHNlc3Npb24gcHJvdmlkZWQgPyB3aWxsIHJlc3VsdCBpbiBhIHJlZGlyZWN0IGFuZCBjYWxsIHdpbGwgcHJvYmFibHkgZmFpbCAuLi5cclxuICAgICAgICAgICAgICAgICAgICBiYXNlVXJsID0gdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZy5vcmRlckVudHJ5VXJsO1xyXG5cclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZW5kcG9pbnRUeXBlID09PSBFbmRwb2ludFR5cGUuT1JERVJfVFJBQ0tJTkcpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmJsdWVza3lBamF4Q2xpZW50Q29uZmlnIHx8ICF0aGlzLmJsdWVza3lBamF4Q2xpZW50Q29uZmlnLm9yZGVyVHJhY2tpbmdVcmwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKCdNaXNzaW5nIG9yZGVyVHJhY2tpbmdVcmwgaW4gQmx1ZXNreUFqYXhDbGllbnRDb25maWcuIGNhbm5vdCBidWlsZCB2YWxpZCB1cmwuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogaG93IHRvIGhhbmRsZSBPTSBhcHBzIGV4dGVybmFsIGNhbGxzIHdpdGhvdXQgc2Vzc2lvbiBwcm92aWRlZCA/IHdpbGwgcmVzdWx0IGluIGEgcmVkaXJlY3QgYW5kIGNhbGwgd2lsbCBwcm9iYWJseSBmYWlsIC4uLlxyXG4gICAgICAgICAgICAgICAgICAgIGJhc2VVcmwgPSB0aGlzLmJsdWVza3lBamF4Q2xpZW50Q29uZmlnLm9yZGVyVHJhY2tpbmdVcmw7XHJcblxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlbmRwb2ludFR5cGUgPT09IEVuZHBvaW50VHlwZS5PUklHSU4pIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVnZXggdHJ5aW5nIHRvIGRldGVybWluZSBpZiB0aGUgaW5wdXQgZnJhZ21lbnQgY29udGFpbnMgYSAvIGJldHdlZW4gdHdvIGNoYXJhY3RlciBzdWl0ZXMgPT4gY29udHJvbGxlciBnaXZlbiBhcyBpbnB1dCwgb3RoZXJ3aXNlLCBhY3Rpb24gb24gc2FtZSBjb250cm9sbGVyIGV4cGVjdGVkXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnRyb2xsZXJJc1ByZXNlbnRSZWdleCA9IC9cXHcrXFwvXFx3Ky87XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhY3Rpb25Jc09uU2FtZUNvbnRyb2xsZXIgPSAhY29udHJvbGxlcklzUHJlc2VudFJlZ2V4LnRlc3QodXJsSW5wdXQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBiYXNlVXJsID0gdGhpcy5nZXRVcmxQYXRoKGFjdGlvbklzT25TYW1lQ29udHJvbGxlcik7XHJcblxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ1Vuc3VwcG9ydGVkIGVuZHBvaW50VHlwZSBwcm92aWRlZC4gU2hvdWxkIG5vdCBoYXBwZW4gKGV4cGVjdGVkIGRlZmF1bHQgdmFsdWUgT3JpZ2luKS4gQWJvcnRpbmcuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gQm9vbGVhbiB1c2VkIHRvIHRyeSB0byBkZXRlcm1pbmUgY29ycmVjdCBmdWxsIHVybCAoYWRkIC8gb3Igbm90IGJlZm9yZSB0aGUgdXJsIGZyYWdtZW50IGRlcGVuZGluZyBvbiBpZiBmb3VuZCBvciBub3QpXHJcbiAgICAgICAgICAgICAgICB2YXIgdXJsRnJhZ21lbnRTdGFydHNXaXRoU2xhc2ggPSB1cmxJbnB1dC5zbGljZSgwLCAxKSA9PT0gJy8nO1xyXG4gICAgICAgICAgICAgICAgdmFyIGJhc2VVcmxGcmFnbWVudEVuZHNXaXRoU2xhc2ggPSBiYXNlVXJsLnNsaWNlKGJhc2VVcmwubGVuZ3RoIC0gMSwgYmFzZVVybC5sZW5ndGgpID09PSAnLyc7XHJcblxyXG4gICAgICAgICAgICAgICAgLy9iYXNlZCBvbiBzdGFydGluZy90cmFpbGluZyBzbGFzaGVzLCByZXR1cm4gZnVsbCB1cmwuXHJcbiAgICAgICAgICAgICAgICBpZiAoYmFzZVVybEZyYWdtZW50RW5kc1dpdGhTbGFzaCAmJiB1cmxGcmFnbWVudFN0YXJ0c1dpdGhTbGFzaClcclxuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgbGFzdCAnLycgb24gYmFzZVVybFxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBiYXNlVXJsLnNsaWNlKDAsIGJhc2VVcmwubGVuZ3RoIC0gMSkgKyB1cmxJbnB1dDtcclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKCFiYXNlVXJsRnJhZ21lbnRFbmRzV2l0aFNsYXNoICYmICF1cmxGcmFnbWVudFN0YXJ0c1dpdGhTbGFzaClcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmFzZVVybCArICcvJyArIHVybElucHV0O1xyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoKGJhc2VVcmxGcmFnbWVudEVuZHNXaXRoU2xhc2ggJiYgIXVybEZyYWdtZW50U3RhcnRzV2l0aFNsYXNoKSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICghYmFzZVVybEZyYWdtZW50RW5kc1dpdGhTbGFzaCAmJiB1cmxGcmFnbWVudFN0YXJ0c1dpdGhTbGFzaCkpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJhc2VVcmwgKyB1cmxJbnB1dDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIHByaXZhdGUgbWV0aG9kc1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBVdGlsaXR5IG1ldGhvZC5cclxuICAgICAgICAgKiBNYWluIGNhbGxlciB0aGF0IGFsbCB3cmFwcGVyIGNhbGxzIChnZXQsIGRlbGV0ZSwgcG9zdCwgcHV0KSBtdXN0IHVzZSB0byBzaGFyZSBjb21tb24gYmVoYXZpb3IuXHJcbiAgICAgICAgICogQHBhcmFtIGNvbmZpZ1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgYWpheDxUPihtZXRob2Q6IEh0dHBNZXRob2QsIHVybDogc3RyaW5nLCBjb25maWc/OiBCbHVlc2t5SHR0cFJlcXVlc3RDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBtYWtlIHN1cmUgZ2V0Q29uZmlnIHJlc29sdmUgYXV0b21hdGljYWxseSB3aXRob3V0IG92ZXJoZWFkIG9uY2UgZmlyc3QgY2FsbCBzdWNlc3NmdWxsLlxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBIDogZG8gbm90IGJsb2NrIGlmIG5vdCBjYWxsIHRvIGludGVybmFsIEFQSSAoaW5pdENhbGwpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldENvbmZpZ1Byb21pc2UudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYW5ndWxhckh0dHBDb25maWcgPSB0aGlzLmNvbmZpZ3VyZUh0dHBDYWxsKG1ldGhvZCwgdXJsLCBjb25maWcpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhbmd1bGFySHR0cENvbmZpZykgLy8gaWYgbm8gY29uZmlnIHJldHVybmVkLCBjb25maWd1cmF0aW9uIGZhaWxlZCwgZG8gbm90IHN0YXJ0IGFqYXggcmVxdWVzdFxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRodHRwPFQ+KGFuZ3VsYXJIdHRwQ29uZmlnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbjxUPih0aGlzLm9uU3VjY2VzczxUPihjb25maWcpLCB0aGlzLm9uRXJyb3I8VD4oY29uZmlnKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmFsbHkodGhpcy5maW5hbGx5KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAqIFByZXBhcmVzIGEge0BsaW5rIG5nIyRodHRwI2NvbmZpZyBjb25maWd9IG9iamVjdCBmb3IgJGh0dHAgY2FsbC5cclxuICAgICAgICAqIFRoZSBvcGVyYXRpb25zIGluY2x1ZGUgc2V0dGluZyBkZWZhdWx0IHZhbHVlcyB3aGVuIG5vdCBwcm92aWRlZCwgYW5kIHNldHRpbmcgaHR0cCBoZWFkZXJzIGlmIG5lZWRlZCBmb3IgOlxyXG4gICAgICAgICogIC0gQWpheCBjYWxsc1xyXG4gICAgICAgICogIC0gQXV0aG9yaXphdGlvbiB0b2tlblxyXG4gICAgICAgICogIC0gQ3VycmVudCBVc2VyUm9sZS4gICBcclxuICAgICAgICAqIEBwYXJhbSBvcHRpb25zXHJcbiAgICAgICAgKiBAcmV0dXJucyB7bmcuJGh0dHAuY29uZmlnfSB0aGUgY29uZmlndXJhdGlvbiBvYmplY3QgcmVhZHkgdG8gYmUgaW5qZWN0ZWQgaW50byBhICRodHRwIGNhbGwuIFxyXG4gICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBjb25maWd1cmVIdHRwQ2FsbCA9IChtZXRob2Q6IEh0dHBNZXRob2QsIHVybDogc3RyaW5nLCBjb25maWc/OiBCbHVlc2t5SHR0cFJlcXVlc3RDb25maWcpOiBuZy5JUmVxdWVzdENvbmZpZyA9PiB7XHJcblxyXG4gICAgICAgICAgICAvLyBpbnB1dCB2YWxpZGF0aW9uXHJcblxyXG4gICAgICAgICAgICBpZiAoIXVybCB8fCBtZXRob2QgPT09IG51bGwgfHwgbWV0aG9kID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignVVJMICYgTUVUSE9EIHBhcmFtZXRlcnMgYXJlIG5lY2Vzc2FyeSBmb3IgaHR0cFdyYXBwZXIgY2FsbHMuIEFib3J0aW5nLicpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIHNldCBkZWZhdWx0IGNvbmZpZyB2YWx1ZXMgYW5kIGN1c3RvbSBvbmVzIGJhc2VkIG9uIGVuZHBvaW50c1xyXG5cclxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgY29uZmlnLmVuZHBvaW50VHlwZSA9IGNvbmZpZy5lbmRwb2ludFR5cGUgfHwgRW5kcG9pbnRUeXBlLk9SSUdJTjsgLy8gZGVmYXVsdCB2YWx1ZTogaWYgbm90IHNwZWNpZmllZCwgZW5kcG9pbnQgdG8gdXNlIGlzIHN1cHBvc2VkIHRvIGJlIHRoZSBvcmlnaW4uIFxyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFyZCBjYXN0IGlzIG5vdCBzYWZlLCB3ZSBtYXkgZm9yZ2V0IHRvIHNldCB1cmwgJiBtZXRob2QgcGFyYW1ldGVycy4gVE9GSVguXHJcbiAgICAgICAgICAgIC8vIGF1dG9tYXRpY2FsbHkgZ2V0IGFsbCBub24tZmlsdGVyZWQgcGFyYW1ldGVycyAmIGtlZXAgdGhlbSBmb3IgdGhpcyBuZXcgb2JqZWN0LlxyXG4gICAgICAgICAgICB2YXIgY29uZmlnRnVsbCA9IDxuZy5JUmVxdWVzdENvbmZpZz5jb25maWc7XHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBOiBzdXBwb3J0IG1hcHBpbmcgYmV0d2VlbiB1cGxvYWQgJiBwb3N0IGhlcmUgP1xyXG4gICAgICAgICAgICBjb25maWdGdWxsLm1ldGhvZCA9IEh0dHBNZXRob2RbbWV0aG9kXTtcclxuXHJcbiAgICAgICAgICAgIGNvbmZpZ0Z1bGwuaGVhZGVycyA9IGNvbmZpZy5oZWFkZXJzIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgLy8gY29uZmlndXJlIGRlZmF1bHQgY29uZmlnIGZsYWdzIGJhc2VkIG9uIHRhcmdldCBlbmRwb2ludFxyXG4gICAgICAgICAgICBpZiAoY29uZmlnLmVuZHBvaW50VHlwZSA9PT0gRW5kcG9pbnRUeXBlLkNPUkVfQVBJKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gUmVqZWN0IGV4cGxpY2l0bHkgd3JvbmcgaW5wdXQgY29uZmlndXJhdGlvbnNcclxuICAgICAgICAgICAgICAgIGlmIChjb25maWcuZGlzYWJsZVhtbEh0dHBSZXF1ZXN0SGVhZGVyIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLnVzZUN1cnJlbnRVc2VyUm9sZSA9PT0gZmFsc2UgfHxcclxuICAgICAgICAgICAgICAgICAgICBjb25maWcudXNlSnd0QXV0aFRva2VuID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGxvZy53YXJuKGBbQmx1ZXNreUh0dHBXcmFwcGVyXVtjb25maWd1cmVIdHRwQ2FsbF0gWyR7Y29uZmlnRnVsbC5tZXRob2R9IC8gJHt1cmx9XSAtIENvcmVBUEkgY2FsbCBpbnRlbmRlZCB3aXRoIGluY29tcGF0aWJsZSBjb25maWd1cmF0aW9uIG9wdGlvbnMuIEFib3J0aW5nIGFqYXggY2FsbC5gLCBjb25maWcpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIGNvbmZpZyB2YWx1ZXMgZm9yIENvcmVBUEkgZW5kcG9pbnQgYXJlIGRpZmZlcmVudCBmcm9tIGRlZmF1bHQsIHNvIHdlIG11c3Qgc3BlY2lmeSB0aGVtLlxyXG4gICAgICAgICAgICAgICAgY29uZmlnLmRpc2FibGVYbWxIdHRwUmVxdWVzdEhlYWRlciA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgY29uZmlnLnVzZUp3dEF1dGhUb2tlbiA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBjb25maWcudXNlQ3VycmVudFVzZXJSb2xlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChjb25maWcuZW5kcG9pbnRUeXBlID09PSBFbmRwb2ludFR5cGUuTUFSS0VUSU5HX0FQSSB8fFxyXG4gICAgICAgICAgICAgICAgY29uZmlnLmVuZHBvaW50VHlwZSA9PT0gRW5kcG9pbnRUeXBlLk9SSUdJTiB8fFxyXG4gICAgICAgICAgICAgICAgY29uZmlnLmVuZHBvaW50VHlwZSA9PT0gRW5kcG9pbnRUeXBlLlFVT1RFX1dJWkFSRCB8fFxyXG4gICAgICAgICAgICAgICAgY29uZmlnLmVuZHBvaW50VHlwZSA9PT0gRW5kcG9pbnRUeXBlLk9SREVSX0VOVFJZIHx8XHJcbiAgICAgICAgICAgICAgICBjb25maWcuZW5kcG9pbnRUeXBlID09PSBFbmRwb2ludFR5cGUuT1JERVJfVFJBQ0tJTkcpIHtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE8gTUdBOiBwcm92aWRlIG1vcmUgY29tcGxldGUgZmVlZGJhY2tzIG9uIHRob3NlIHNwZWNpZmljIGVuZHBvaW50cyA/XHJcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLnVzZUN1cnJlbnRVc2VyUm9sZSB8fFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy51c2VKd3RBdXRoVG9rZW4pXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kbG9nLndhcm4oJ1tCbHVlc2t5SHR0cFdyYXBwZXJdW2NvbmZpZ3VyZUh0dHBDYWxsXSAtIFVzZXJSb2xlICYgSnd0VG9rZW4gc2hvdWxkIG5vdCBiZSBwcm92aWRlZCBmb3IgdGFyZ2V0IGVuZHBvaW50LiAnKTtcclxuXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY29uZmlnLmVuZHBvaW50VHlwZSA9PT0gRW5kcG9pbnRUeXBlLkVYVEVSTkFMKSB7XHJcbiAgICAgICAgICAgICAgICBjb25maWcuZGlzYWJsZVhtbEh0dHBSZXF1ZXN0SGVhZGVyID0gdHJ1ZTsgLy8gZG8gbm90IGFkZCBYbWxIdHRwUmVxdWVzdCBpZiBleHRlcm5hbCBVcmwgYnkgZGVmYXVsdDogbWlnaHQgY3JlYXRlIGNvbmZsaWN0cyBvbiBjZXJ0YWluIHNlcnZlcnMuIFRPRE8gTUdBIHRvIGNvbmZpcm1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihgW0JsdWVza3lIdHRwV3JhcHBlcl1bY29uZmlndXJlSHR0cENhbGxdWyR7Y29uZmlnRnVsbC5tZXRob2R9IC8gJHt1cmx9XSAtIFVuc3VwcG9ydGVkIGVuZHBvaW50VHlwZSBwcm92aWRlZDogJyR7RW5kcG9pbnRUeXBlW2NvbmZpZy5lbmRwb2ludFR5cGVdfScuIEFib3J0aW5nLmApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBOiBzZXQgZGVmYXVsdCB2YWx1ZXMgYWZ0ZXIgZW5kcG9pbnQtc3BlY2lmaWMgY29uZmlndXJhdGlvbnNcclxuICAgICAgICAgICAgY29uZmlnLmRpc2FibGVYbWxIdHRwUmVxdWVzdEhlYWRlciA9IGNvbmZpZy5kaXNhYmxlWG1sSHR0cFJlcXVlc3RIZWFkZXIgfHwgZmFsc2U7IC8vIGRlZmF1bHQgdmFsdWUgaXMgZW5hYmxlZCAoYWpheCBjYWxscyBvbiAuTkVUIGVuZHBvaW50cykuXHJcbiAgICAgICAgICAgIGNvbmZpZy51c2VDdXJyZW50VXNlclJvbGUgPSBjb25maWcudXNlQ3VycmVudFVzZXJSb2xlIHx8IGZhbHNlOyAvLyBkZWZhdWx0IHZhbHVlOiBkb24ndCB0cmFuc21pdCBzZW5zaXRpdmUgaW5mb3JtYXRpb24gdG8gcmVtb3RlIGlmIG5vdCBleHBsaWNpdGx5IHNwZWNpZmllZC5cclxuICAgICAgICAgICAgY29uZmlnLnVzZUp3dEF1dGhUb2tlbiA9IGNvbmZpZy51c2VKd3RBdXRoVG9rZW4gfHwgZmFsc2U7IC8vIGRlZmF1bHQgdmFsdWU6IGRvbid0IHRyYW5zbWl0IHNlbnNpdGl2ZSBpbmZvcm1hdGlvbiB0byByZW1vdGUgaWYgbm90IGV4cGxpY2l0bHkgc3BlY2lmaWVkLlxyXG4gICAgICAgICAgICBjb25maWcuZGlzYWJsZVRvYXN0ZXJOb3RpZmljYXRpb25zID0gY29uZmlnLmRpc2FibGVUb2FzdGVyTm90aWZpY2F0aW9ucyB8fCBmYWxzZTsgLy9zZXQgZGVmYXVsdCB2YWx1ZSBmb3IgZGlzYWJsZVRvYXN0ZXJOb3RpZmljYXRpb25zIHRvIGZhbHNlIGFzIGl0J3MgcGFydCBvZiB0aGUgbm9ybWFsIGJlaGF2aW9yIGV4cGVjdGVkIGZvciB0aGlzIHNlcnZpY2UuXHJcblxyXG5cclxuICAgICAgICAgICAgLy8gVHJ5IHRvIGJ1aWxkIGEgdmFsaWQgdXJsIGZyb20gaW5wdXQgJiBlbmRwb2ludFR5cGUuXHJcbiAgICAgICAgICAgIGNvbmZpZ0Z1bGwudXJsID0gdGhpcy5idWlsZFVybEZyb21Db250ZXh0KHVybCwgY29uZmlnLmVuZHBvaW50VHlwZSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWNvbmZpZ0Z1bGwudXJsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoYFtCbHVlc2t5SHR0cFdyYXBwZXJdW2NvbmZpZ3VyZUh0dHBDYWxsXSAtIFVuYWJsZSB0byBidWlsZCB1cmwgZnJvbSB1cmxJbnB1dCAnJHt1cmx9JyB3aXRoIGVuZHBvaW50VHlwZSAnJHtFbmRwb2ludFR5cGVbY29uZmlnLmVuZHBvaW50VHlwZV19Jy4gQWJvcnRpbmcgYWpheCBjYWxsLmApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghY29uZmlnLmRpc2FibGVYbWxIdHRwUmVxdWVzdEhlYWRlcilcclxuICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhcmQgY29kZWQgaGVhZGVyIHRvIHB1dCBpbiBDT05TVFxyXG4gICAgICAgICAgICAgICAgY29uZmlnRnVsbC5oZWFkZXJzWydYLVJlcXVlc3RlZC1XaXRoJ10gPSAnWE1MSHR0cFJlcXVlc3QnO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbmZpZy51c2VDdXJyZW50VXNlclJvbGUpIHtcclxuICAgICAgICAgICAgICAgIC8vIFJlamVjdCBjYWxsIHdoZW4gbWlzc2luZyBtYW5kYXRvcnkgaW5mb3JtYXRpb25cclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZyB8fCAhdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZy5jdXJyZW50VXNlclJvbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoYFtCbHVlc2t5SHR0cFdyYXBwZXJdW2NvbmZpZ3VyZUh0dHBDYWxsXSBbJHtjb25maWdGdWxsLm1ldGhvZH0gLyAke3VybH1dIC0gQWpheCBjYWxsIGludGVuZGVkIHdpdGhvdXQgbmVjZXNzYXJ5IHVzZXJSb2xlIGluIGJsdWVza3lBamF4Q2xpZW50Q29uZmlnLiBBYm9ydGluZy5gKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhcmQgY29kZWQgaGVhZGVyIHRvIHB1dCBpbiBDT05TVFxyXG4gICAgICAgICAgICAgICAgY29uZmlnRnVsbC5oZWFkZXJzWydPQS1Vc2VyUm9sZSddID0gdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZy5jdXJyZW50VXNlclJvbGU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChjb25maWcudXNlSnd0QXV0aFRva2VuKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBSZWplY3QgY2FsbCB3aGVuIG1pc3NpbmcgbWFuZGF0b3J5IGluZm9ybWF0aW9uXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcgfHwgIXRoaXMuYmx1ZXNreUFqYXhDbGllbnRDb25maWcuand0QXV0aFRva2VuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKGBbQmx1ZXNreUh0dHBXcmFwcGVyXVtjb25maWd1cmVIdHRwQ2FsbF0gWyR7Y29uZmlnRnVsbC5tZXRob2R9IC8gJHt1cmx9XSAtIEFqYXggY2FsbCBpbnRlbmRlZCB3aXRob3V0IG5lY2Vzc2FyeSBqd3RUb2tlbiBpbiBibHVlc2t5QWpheENsaWVudENvbmZpZy4gQWJvcnRpbmcuYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYXJkIGNvZGVkIGhlYWRlciB0byBwdXQgaW4gQ09OU1RcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwuaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gJ0JlYXJlciAnICsgdGhpcy5ibHVlc2t5QWpheENsaWVudENvbmZpZy5qd3RBdXRoVG9rZW47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IE9FIHNwZWNpZmljIGNvZGUsIHRvIHJlbW92ZSwgb3IgYXQgbGVhc3QgcHV0IGluIGFzIGNvbmZpZyBwYXJhbVxyXG4gICAgICAgICAgICBpZiAoKDxhbnk+dGhpcy4kd2luZG93KS5ibG9ja19VSSAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgLy8gVE9ETyBNR0EgOiB0eXBlIGNhc3RpbmcsIGlzIGl0IG9rYXkgb3Igbm90ID8gYmV0dGVyIGFwcHJvYWNoID9cclxuICAgICAgICAgICAgICAgICg8YW55PnRoaXMuJHdpbmRvdykucHJldmVudEJsb2NrVUkgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZ0Z1bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTdWNjZXNzIGhhbmRsZXIuXHJcbiAgICAgICAgICogQ2FwdHVyZXMgdGhlIGlucHV0IHBhcmFtZXRlcnMgYXQgdGhlIG1vbWVudCBvZiBpdHMgZGVjbGFyYXRpb24gJiByZXR1cm4gdGhlIHJlYWwgaGFuZGxlciB0byBiZSBjYWxsZWQgdXBvbiBwcm9taXNlIGNvbXBsZXRpb24uXHJcbiAgICAgICAgICogSW5wdXQgcGFyYW1ldGVyczpcclxuICAgICAgICAgKiAgLSBjYWxsaW5nQ29uZmlnOiBjb25maWd1cmF0aW9uIHVzZWQgdG8gbWFrZSB0aGUgYWpheCBjYWxsLCBpbiBjYXNlIHRoZSByZXR1cm5lZCBwcm9taXNlIGlzIG51bGwvZW1wdHkgYW5kIGRvZXNuJ3QgY29udGFpbiBuZWNlc3NhcnkgZGF0YSBmb3IgZGVidWdnaW5nLlxyXG4gICAgICAgICAqICAtIGdldENvbXBsZXRlUmVzcG9uc2VPYmplY3Q6IGZsYWcgaW5kaWNhdGlvbiBpZiB3ZSBtdXN0IHJldHVybiB0aGUgZnVsbCByZXNwb25zZSBvYmplY3QgYWxvbmcgd2l0aCBoZWFkZXJzIGFuZCBzdGF0dXMgb3Igb25seSB0aGUgaW5uZXIgZGF0YS4gQnkgZGVmYXVsdCAmIGlmIG5vdCBzcGVjaWZpZWQsIG9ubHkgcmV0dXJucyBpbm5lciBkYXRhLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgb25TdWNjZXNzID0gPFQ+KG9yaWdpbmFsQ29uZmlnOiBCbHVlc2t5SHR0cFJlcXVlc3RDb25maWcpOiAoaHR0cFByb21pc2U6IG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPFQ+KSA9PiBUID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIDxUPihodHRwUHJvbWlzZTogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8VD4pOiBUID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghaHR0cFByb21pc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoYFtIVFRQIG5vLXJlc3BvbnNlXSBVbmV4cGVjdGVkICRodHRwIGVycm9yLCBubyByZXNwb25zZSBwcm9taXNlIHJldHVybmVkLmApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIW9yaWdpbmFsQ29uZmlnLmRpc2FibGVUb2FzdGVyTm90aWZpY2F0aW9ucylcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b2FzdGVyLmVycm9yKCdVbmV4cGVjdGVkIGJlaGF2aW9yJywgJ1BsZWFzZSBjb250YWN0IHlvdXIgbG9jYWwgc3VwcG9ydCB0ZWFtLicpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYW5kbGUgbXVsdGktdHlwZSByZXR1cm4gaW4gY2FzZSBvZiByZWplY3Rpb24gb3IgZG8gc29tZXRoaW5nIGVsc2UgPyB0aGlzIG1ldGhvZCBpcyBjdXJyZW50bHkgdXNlZCBzeW5jaHJvbm91c2x5IHdpdGhvdXQgcHJvbWlzZSB3YWl0aW5nLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vcmV0dXJuIHRoaXMuJHEucmVqZWN0KGh0dHBQcm9taXNlKTsgLy8gUmVqZWN0IHByb21pc2VcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiByZWplY3QgaWYgc3RhdHVzICE9IDJYWCA/XHJcblxyXG4gICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFuZGxlIHdoZW4gQVBJIGlzIGZpeGVkLiBTZWUgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMTc0Njg5NC93aGF0LWlzLXRoZS1wcm9wZXItcmVzdC1yZXNwb25zZS1jb2RlLWZvci1hLXZhbGlkLXJlcXVlc3QtYnV0LWFuLWVtcHR5LWRhdGFcclxuICAgICAgICAgICAgICAgIC8vaWYgKChwcm9taXNlQ2FsbGJhY2suZGF0YSA9PT0gbnVsbCB8fCBwcm9taXNlQ2FsbGJhY2suZGF0YSA9PT0gdW5kZWZpbmVkKSAmJiBwcm9taXNlQ2FsbGJhY2suc3RhdHVzICE9PSAyMDQpIHtcclxuICAgICAgICAgICAgICAgIC8vICAgIHRoaXMuJGxvZy5lcnJvcignVW5leHBlY3RlZCByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIsIGV4cGVjdGVkIHJlc3BvbnNlIGRhdGEgYnV0IG5vbmUgZm91bmQuJyk7XHJcbiAgICAgICAgICAgICAgICAvLyAgICB0aGlzLnRvYXN0ZXIud2FybmluZygnVW5leHBlY3RlZCByZXNwb25zZScsICdQbGVhc2UgY29udGFjdCB5b3VyIGxvY2FsIHN1cHBvcnQgdGVhbS4nKTtcclxuICAgICAgICAgICAgICAgIC8vICAgIHJldHVybiB0aGlzLiRxLnJlamVjdChwcm9taXNlQ2FsbGJhY2spOyAvLyBSZWplY3QgcHJvbWlzZSBpZiBub3Qgd2VsbC1mb3JtZWQgZGF0YVxyXG4gICAgICAgICAgICAgICAgLy99XHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBzYW1lIGJlaGF2aW9yIGFsc28gb24gYSBHRVQgcmVxdWVzdCA/IGlmIHJlcXVlc3QgaXMgR0VUIGFuZCByZXNwb25zZSBpcyAyMDAgd2l0aCBubyBkYXRhLCByZXR1cm4gZXJyb3IgPyAocGFzcyBpbiBwYXJhbWV0ZXIgcmVxdWVzdCBjb250ZXh0IHRvIGxvZyB0aGlzIGVycm9yKS5cclxuXHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBnZXQgZnVsbCB1cmwgb2YgcmVxdWVzdFxyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmRlYnVnKGBbSFRUUCAke2h0dHBQcm9taXNlLmNvbmZpZy5tZXRob2R9XSBbJHtodHRwUHJvbWlzZS5jb25maWcudXJsfV1gLCBodHRwUHJvbWlzZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gcmV0dXJuIG9ubHkgdGhlIGRhdGEgZXhwZWN0ZWQgZm9yIGNhbGxlclxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGh0dHBQcm9taXNlLmRhdGE7XHJcblxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRXJyb3IgaGFuZGxlclxyXG4gICAgICAgICAqIFRPRE8gTUdBOiBhbmd1bGFyIHNpZ25hdHVyZXMgaW5kaWNhdGVzIHRoYXQgcGFyYW1ldGVyIGlzIHJlamVjdGlvbiByZWFzb24sIG5vdCBuZWNlc3NhcmlseSBodHRwUHJvbWlzZTogaW52ZXN0aWdhdGUgJiBmaXggaWYgbmVjZXNzYXJ5XHJcbiAgICAgICAgICogQHBhcmFtIGh0dHBQcm9taXNlIFxyXG4gICAgICAgICAqIEByZXR1cm5zIHt9IFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgb25FcnJvciA9IDxUPihvcmlnaW5hbENvbmZpZzogQmx1ZXNreUh0dHBSZXF1ZXN0Q29uZmlnKTogKGh0dHBQcm9taXNlOiBuZy5JSHR0cFByb21pc2VDYWxsYmFja0FyZzxhbnk+KSA9PiBhbnkgPT4ge1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIDxUPihodHRwUHJvbWlzZTogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8YW55Pik6IGFueSA9PiB7XHJcbiAgICAgICAgICAgICAgICAvLyBXZSBzdXBwb3NlIGluIGNhc2Ugb2Ygbm8gcmVzcG9uc2UgdGhhdCB0aGUgc3J2IGRpZG4ndCBzZW5kIGFueSByZXNwb25zZS5cclxuICAgICAgICAgICAgICAgIC8vIFRPRE8gTUdBOiBtYXkgYWxzbyBiZSBhIGZhdWx0IGluIGludGVybmFsICRodHRwIC8gYWpheCBjbGllbnQgc2lkZSBsaWIsIHRvIGRpc3Rpbmd1aXNoLlxyXG4gICAgICAgICAgICAgICAgaWYgKCFodHRwUHJvbWlzZSB8fCAhaHR0cFByb21pc2UuZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGh0dHBQcm9taXNlLmRhdGEgPSAnU2VydmVyIG5vdCByZXNwb25kaW5nJztcclxuICAgICAgICAgICAgICAgICAgICBodHRwUHJvbWlzZS5zdGF0dXMgPSA1MDM7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFvcmlnaW5hbENvbmZpZy5kaXNhYmxlVG9hc3Rlck5vdGlmaWNhdGlvbnMpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnRlbnRUeXBlID0gaHR0cFByb21pc2UuaGVhZGVycygnQ29udGVudC1UeXBlJyk7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL2NoZWNrIGNvbnRlbnRUeXBlIHRvIHRyeSB0byBkaXNwbGF5IGVycm9yIG1lc3NhZ2VcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY29udGVudFR5cGUgJiYgKGNvbnRlbnRUeXBlLmluZGV4T2YoJ2FwcGxpY2F0aW9uL2pzb24nKSA+IC0xIHx8IGNvbnRlbnRUeXBlLmluZGV4T2YoJ3RleHQvcGxhaW4nKSA+IC0xKSkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2U6IHN0cmluZyA9IFwiXCI7IC8vZGVmYXVsdCBtZXNzYWdlXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYW5kbGUgZXJyb3IgaGFuZGxpbmcgbW9yZSBnZW5lcmljYWxseSBiYXNlZCBvbiBpbnB1dCBlcnJvciBtZXNzYWdlIGNvbnRyYWN0IGluc3RlYWQgb2YgZXhwZWN0aW5nIHNwZWNpZmljIGVycm9yIHN0cmN0dXJlLlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9pZiAocmVzcG9uc2UuZGF0YS5Nb2RlbFN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgIC8vVE9ETyBNR0EgOiBoYW5kbGUgdGhpcyB3aGVuIHdlbGwgZm9ybWF0dGVkIHNlcnZlci1zaWRlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vfSBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChodHRwUHJvbWlzZS5kYXRhLk1lc3NhZ2UgJiYgYW5ndWxhci5pc1N0cmluZyhodHRwUHJvbWlzZS5kYXRhLk1lc3NhZ2UpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gaHR0cFByb21pc2UuZGF0YS5NZXNzYWdlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFuZ3VsYXIuaXNTdHJpbmcoaHR0cFByb21pc2UuZGF0YSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBodHRwUHJvbWlzZS5kYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYW5kbGUgbW9yZSByZXNwb25zZSBjb2RlcyBncmFjZWZ1bGx5LlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaHR0cFByb21pc2Uuc3RhdHVzID09PSA0MDQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudG9hc3Rlci53YXJuaW5nKCdOb3QgRm91bmQnLCBtZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudG9hc3Rlci5lcnJvcignU2VydmVyIHJlc3BvbnNlIGVycm9yJywgbWVzc2FnZSArICdcXG4gU3RhdHVzOiAnICsgaHR0cFByb21pc2Uuc3RhdHVzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b2FzdGVyLmVycm9yKCdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InLCAnU3RhdHVzOiAnICsgaHR0cFByb21pc2Uuc3RhdHVzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogZ2V0IGZ1bGwgdXJsIG9mIHJlcXVlc3RcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihgW0hUVFAgJHtodHRwUHJvbWlzZS5jb25maWcubWV0aG9kfV0gWyR7aHR0cFByb21pc2UuY29uZmlnLnVybH1dYCwgaHR0cFByb21pc2UpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFdlIGRvbid0IHJlY292ZXIgZnJvbSBlcnJvciwgc28gd2UgcHJvcGFnYXRlIGl0IDogYmVsb3cgaGFuZGxlcnMgaGF2ZSB0aGUgY2hvaWNlIG9mIHJlYWRpbmcgdGhlIGVycm9yIHdpdGggYW4gZXJyb3IgaGFuZGxlciBvciBub3QuIFNlZSAkcSBwcm9taXNlcyBiZWhhdmlvciBoZXJlIDogaHR0cHM6Ly9naXRodWIuY29tL2tyaXNrb3dhbC9xXHJcbiAgICAgICAgICAgICAgICAvLyBUaGlzIGJlaGF2aW9yIGlzIGRlc2lyZWQgc28gdGhhdCB3ZSBzaG93IGVycm9yIGluc2lkZSBzcGVjaWZpYyBzZXJ2ZXIgY29tbXVuaWNhdGlvbiBtb2RhbHMgYXQgc3BlY2lmaWMgcGxhY2VzIGluIHRoZSBhcHAsIG90aGVyd2lzZSBzaG93IGEgZ2xvYmFsIGFsZXJ0IG1lc3NhZ2UsIG9yIGV2ZW4gZG8gbm90IHNob3cgYW55dGhpbmcgaWYgbm90IG5lY2Vzc2FyeSAoZG8gbm90IGFkIGFuIGVycm9yIGhhbmRsZXIgaW4gYmVsb3cgaGFuZGxlcnMgb2YgdGhpcyBwcm9taXNlKS5cclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRxLnJlamVjdChodHRwUHJvbWlzZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEZ1bmN0aW9uIGNhbGxlZCBhdCB0aGUgZW5kIG9mIGFuIGFqYXggY2FsbCwgcmVnYXJkbGVzcyBvZiBpdCdzIHN1Y2Nlc3Mgb3IgZmFpbHVyZS5cclxuICAgICAgICAgKiBAcGFyYW0gcmVzcG9uc2VcclxuICAgICAgICAgKiBUT0RPIE1HQSBpbnZlcnNpb24gb2YgcmVzcG9uc2FiaWxpdHk6IG1ha2UgdGhpcyBleHRlbnNpYmxlIHNvIHRoYXQgc3BlY2lmYyBhcHBzIGNhbiBwbHVnIGludG8gdGhpcyBldmVudCB3b3JrZmxvd1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgZmluYWxseSA9ICgpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogT0Utc3BlY2lmaWMgY29kZVxyXG4gICAgICAgICAgICBpZiAoKDxhbnk+dGhpcy4kd2luZG93KS5ibG9ja19VSSAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgLy8gVE9ETyBNR0EgOiB0eXBlIGNhc3RpbmcsIGlzIGl0IG9rYXkgb3Igbm90ID8gYmV0dGVyIGFwcHJvYWNoID9cclxuICAgICAgICAgICAgICAgICg8YW55PnRoaXMuJHdpbmRvdykucHJldmVudEJsb2NrVUkgPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFRPRE8gTUdBIDogdXNpbmcgbWV0aG9kIGZyb20gTGF5b3V0LmpzIDogdG8gZG9jdW1lbnQgdG8gbm90IGhhbmRsZSBkdXBsaWNhdGUgY29kZSAhIVxyXG4gICAgICAgIHByaXZhdGUgZ2V0VXJsUGF0aChhY3Rpb25Jc09uU2FtZUNvbnRyb2xsZXI6IGJvb2xlYW4pOiBzdHJpbmcge1xyXG5cclxuICAgICAgICAgICAgdmFyIGJhc2VVcmxSZWdleCA9IC8oXFwvXFx3K1xcL1xcKFNcXChcXHcrXFwpXFwpKVxcL1xcdysvO1xyXG4gICAgICAgICAgICB2YXIgdXJsID0gdGhpcy4kd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lO1xyXG4gICAgICAgICAgICB2YXIgYmFzZVVybE1hdGNoZXMgPSBiYXNlVXJsUmVnZXguZXhlYyh1cmwpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGJhc2VVcmxNYXRjaGVzICYmIGJhc2VVcmxNYXRjaGVzLmxlbmd0aCAmJiBiYXNlVXJsTWF0Y2hlcy5sZW5ndGggPT09IDIpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgYmFzZVVybFdpdGhDb250cm9sbGVyTmFtZSA9IGJhc2VVcmxNYXRjaGVzWzBdO1xyXG4gICAgICAgICAgICAgICAgdmFyIGJhc2VVcmwgPSBiYXNlVXJsTWF0Y2hlc1sxXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoYWN0aW9uSXNPblNhbWVDb250cm9sbGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJhc2VVcmxXaXRoQ29udHJvbGxlck5hbWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBiYXNlVXJsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gJyc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL1RPRE8gTUdBOiBPTS1zcGVjaWZpYyBBU1AgTVZDIGNvZGUsIG5vdCB1c2VkIEFUTSwgdG8gcmVtb3ZlXHJcbiAgICAgICAgcHJpdmF0ZSBnZXRDdXJyZW50U2Vzc2lvbklEKCk6IHN0cmluZyB7XHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBIDogbWFnaWMgcmVnZXhwIHRvIGZldGNoIFNlc3Npb25JRCBpbiBVUkwsIHRvIHN0b3JlIGVsc2V3aGVyZSAhXHJcbiAgICAgICAgICAgIHZhciBzZXNzaW9uUmVnZXggPSAvaHR0cHM6XFwvXFwvW1xcdy5dK1xcL1tcXHcuXStcXC8oXFwoU1xcKFxcdytcXClcXCkpXFwvLiovO1xyXG4gICAgICAgICAgICAvL3ZhciBzZXNzaW9uUmVnZXggPSAvaHR0cHM6XFwvXFwvW1xcdy5dK1xcL09yZGVyRW50cnlcXC8oXFwoU1xcKFxcdytcXClcXCkpXFwvLiovO1xyXG5cclxuICAgICAgICAgICAgLy8gVE9ETyBNR0EgOiB1cGRhdGUgcmVnZXhwIHRvIHRoZSBvbmUgYmVsb3dcclxuICAgICAgICAgICAgLy92YXIgYmFzZVVybFJlZ2V4ID0gLyhodHRwczpcXC9cXC9bXFx3Li1dK1xcL1tcXHcuLV0rXFwvXFwoU1xcKFxcdytcXClcXClcXC8pXFx3Ky87XHJcblxyXG5cclxuICAgICAgICAgICAgdmFyIHBhdGggPSB0aGlzLiRsb2NhdGlvbi5hYnNVcmwoKTtcclxuXHJcbiAgICAgICAgICAgIHZhciByZWdleHBBcnJheSA9IHNlc3Npb25SZWdleC5leGVjKHBhdGgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFyZWdleHBBcnJheSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKCdVbmFibGUgdG8gcmVjb2duaXplZCBzZWFyY2hlZCBwYXR0ZXJuIGluIGN1cnJlbnQgdXJsIGxvY2F0aW9uIHRvIHJldHJpZXZlIHNlc3Npb25JRC4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAnJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVnZXhwQXJyYXkubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ1VuYWJsZSB0byBmaW5kIHNlc3Npb25JRCBpbiBzZWFyY2hlZCBwYXR0ZXJuIGluIGN1cnJlbnQgdXJsLicpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICcnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyZWdleHBBcnJheS5sZW5ndGggPiAyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ1RvbyBtYW55IG1hdGNoZXMgZm91bmQgZm9yIHRoZSBzZXNzaW9uSUQgc2VhcmNoIGluIHRoZSBjdXJyZW50IHVybC4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAnJztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHJlZ2V4cEFycmF5WzFdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVHJpbSB0aGUgY29udGVudC1kaXNwb3NpdGlvbiBoZWFkZXIgdG8gcmV0dXJuIG9ubHkgdGhlIGZpbGVuYW1lLlxyXG4gICAgICAgICAqIEBwYXJhbSBjb250ZW50RGlzcG9zaXRpb25IZWFkZXJcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGdldEZpbGVOYW1lRnJvbUhlYWRlckNvbnRlbnREaXNwb3NpdGlvbihjb250ZW50RGlzcG9zaXRpb25IZWFkZXI6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgIGlmICghY29udGVudERpc3Bvc2l0aW9uSGVhZGVyKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBjb250ZW50RGlzcG9zaXRpb25IZWFkZXIuc3BsaXQoJzsnKVsxXS50cmltKCkuc3BsaXQoJz0nKVsxXTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQucmVwbGFjZSgvXCIvZywgJycpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcbiAgICB9XHJcbn0iLG51bGxdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
