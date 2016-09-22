namespace bluesky.core.services {
    import UserRoleEntryDto = bluesky.core.models.userManagement.IUserRoleEntryDto;

    /**
     * Provider for the BlueskyHttpWrapper.
     * Enables per-consumer configuration of the http service to set custom configuration URL to fetch data from:
     *  - Client initial configuration URL from the origin the app was loaded from.
     *  - UserRole to use of already fetched from another place.
     */
    export class BlueskyHttpWrapperProvider implements ng.IServiceProvider {

        //#region private properties

        private getClientConfigInitializationUrl: string = 'BlueskyAjaxClientConfiguration/GetAjaxClientConfiguration'; // by default.
        private selectedUserRole: UserRoleEntryDto = null; // by default not-set.

        //#endregion

        //#region public configuration methods

        public setClientConfigURL(clientConfigUrlToUse: string): void {
            this.getClientConfigInitializationUrl = clientConfigUrlToUse || this.getClientConfigInitializationUrl;
        }

        public setUserRoleToUse(userRole: UserRoleEntryDto): void {
            this.selectedUserRole = userRole || null;
        }

        //#endregion

        // Provider's factory function
        /* @ngInject */
        public $get = (_: UnderscoreStatic,
            $http: ng.IHttpService,
            $window: ng.IWindowService,
            $log: ng.ILogService,
            $q: ng.IQService,
            $location: ng.ILocationService,
            Upload: ng.angularFileUpload.IUploadService,
            toaster: ngtoaster.IToasterService): services.IBlueskyHttpWrapper => {

            return new services.BlueskyHttpWrapper(_, $http, $window, $log, $q, $location, Upload, toaster, this.getClientConfigInitializationUrl, this.selectedUserRole);
        }
    }

    angular.module('bluesky.httpWrapper', ['toaster', 'ngAnimate', 'ngFileUpload'])
        .constant<UnderscoreStatic>('_', window._)
        .constant<moment.MomentStatic>('moment', window.moment)
        .provider('blueskyHttpWrapper', BlueskyHttpWrapperProvider);
}