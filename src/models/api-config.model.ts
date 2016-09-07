declare namespace bluesky.core.models.blueskyHttpClient {

    import UserSsoDto = bluesky.core.models.userManagement.UserSsoDto;

    /**
     * TODO MGA: those parameters are specific to our auth & user role workflow in BS. A technical service should not be aware of them (inversion of responsability): create 2 services, one for technical behavior and one for functional behavior ?
     */
    export interface BlueskyAjaxClientConfig {
        // credentials management
        jwtAuthToken: string;
        currentUserRole: string;
        //TODO MGA: only used by the hub ATM, and not strongly typed to other apps: to factorize or change ?
        currentUser?: UserSsoDto;
        // base url of BS APIs & Apps.
        coreApiUrl?: string;
        marketingApiUrl?: string;
        quoteWizardUrl?: string;
        orderEntryUrl?: string;
        orderTrackingUrl?: string;
    }
}