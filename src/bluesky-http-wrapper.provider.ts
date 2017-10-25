namespace bluesky.core.service {
    import UserRoleEntryDto = bluesky.core.model.userManagement.IUserRoleEntryDto;

    /**
     * Provider for the BlueskyHttpWrapper.
     * Enables per-consumer configuration of the http service to set custom configuration URL to fetch data from:
     *  - Client initial configuration URL from the origin the app was loaded from.
     *  - UserRole to use of already fetched from another place.
     */
    export class BlueskyHttpWrapperProvider implements ng.IServiceProvider {

        //#region private properties

        private getClientConfigInitializationUrl: string = 'BlueskyAjaxClientConfiguration/GetAjaxClientConfiguration'; // by default.
        private selectedUserRole: UserRoleEntryDto | undefined; // by default not-set.

        //#endregion

        //#region public configuration methods

        public setClientConfigURL(clientConfigUrlToUse: string | undefined): void {
            this.getClientConfigInitializationUrl = clientConfigUrlToUse || this.getClientConfigInitializationUrl;
        }

        public setUserRoleToUse(userRole: UserRoleEntryDto | undefined): void {
            this.selectedUserRole = userRole || undefined;
        }

        //#endregion

        // Provider's factory function
        /* @ngInject */
        public $get = (
            $http: ng.IHttpService,
            $window: ng.IWindowService,
            $log: ng.ILogService,
            $q: ng.IQService,
            Upload: ng.angularFileUpload.IUploadService,
            toaster: toaster.IToasterService): IBlueskyHttpWrapper => {

            return new BlueskyHttpWrapper($http, $window, $log, $q, Upload, toaster, this.selectedUserRole, this.getClientConfigInitializationUrl);
        }
    }

    angular.module('bluesky.httpWrapper', ['toaster', 'ngAnimate', 'ngFileUpload'])
        .constant<_.UnderscoreStatic>('_', window._)
        .constant<moment.MomentStatic>('moment', window.moment)
        .provider('blueskyHttpWrapper', BlueskyHttpWrapperProvider);
}