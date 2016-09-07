declare namespace bluesky.core.models {
    //TODO MGA: do not export so that we don't have a conflict with consumers using those definitions ?
    export interface UserRoleEntryDto {
        name: string;
        role: string;
        silo: string;
    }
}
