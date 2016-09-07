declare namespace bluesky.core.models.blueskyHttpClient {
    //TODO MGA document
    export enum EndpointType {
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
        EXTERNAL
    }
}