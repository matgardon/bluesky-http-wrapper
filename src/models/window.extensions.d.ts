/**
 * Partial interface augmenting the basic window type with global variable available on the current app DOM.
 * It is mostly used to expose global static objects // services to other parts of the app.
 */
//TODO MGA: .d.ts file so that it is not compiled and packaged with dist/ code (to not impact other apps).
//TODO MGA: investigate installing global typings (window.XXX etc) from typîngs as a possible solution to this ?
/// 
interface Window {
    angular: ng.IAngularStatic;
    _: _.UnderscoreStatic;
    moment: moment.MomentStatic;
}