# bluesky-http-wrapper

Basic wrapper around the $http service for all Bluesky client apps, handling auth & custom endpoints configuration.
Written in TS.

## Dependendcies
- angular
- [ng-file-upload](https://github.com/danialfarid/ng-file-upload)

## Features
- Common error handling based on toaster display
- Fluid upload method added to http calls (integration with ng-file-upload lib)
- Automatic partial & full url parsing for ASP.MVC based routes
- JWT token based authentication for ADFS authentication to WebAPI

## Roadmap
- Add karma TUs (non-regression testing)
- Improve error-handling based on custom business error codes shared between srv & client
- Make authentication process more generic to integrate with other kinds of auth mechanism on the API side


