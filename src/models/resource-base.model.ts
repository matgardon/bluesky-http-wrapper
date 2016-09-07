declare namespace bluesky.core.models {
    //TODO MGA: do not export so that we don't have a conflict with consumers using those definitions ?
    export interface ResourceBase {
        /** Links to related resources. */
        //TODO MGA handle strong typings on what constitue a link to use them correctly with _self, _parent etc
        links: any[];
    }
}