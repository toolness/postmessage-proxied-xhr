PostMessage Proxied XMLHttpRequest (PPX) is a simple [polyfill][] that allows browsers without support for cross-origin XMLHttpRequests to do so via postMessage.

The code has no dependencies and does not require JSON. A simple jQuery plugin that allows jQuery-based ajax requests to transparently use the polyfill is also available.

## Limitations

Currently, the following features of the [XMLHttpRequest API][] are unsupported:

* username and password arguments to `open()`
* `getResponseHeader()` (though `getAllResponseHeaders()` is supported)
* `responseXML`

Several features of the massive [CORS Specification][] are unsupported:

* Only [simple requests][] can be sent; anything requiring a preflighted request will be rejected for security purposes.

* Response headers aren't automatically culled down to the [simple response header][] list as prescribed by the spec.

* Because the `Origin` header can't be set by the same-origin proxied request, PPX sets an `X-Original-Origin` header with the origin of the window making the request. This may be used by servers in place of `Origin`, e.g. to set the appropriate value for `Access-Control-Allow-Origin` in the response.

* Because the same-origin proxied request can't control whether or not a cookie is transmitted during its request, all cross-origin requests sent should be assumed to have them. Note that we don't currently check the value of `Access-Control-Allow-Credentials` before returning responses, either, so be *very careful* if your site uses cookies.

## Similar Projects

[pmxdr][] provides similar functionality but doesn't provide an XMLHttpRequest API, so it can't necessarily be used as a drop-in replacement. It's also larger than PPX, but supports more features out-of-the-box.

  [Polyfill]: http://remysharp.com/2010/10/08/what-is-a-polyfill/
  [pmxdr]: https://github.com/eligrey/pmxdr
  [XMLHttpRequest API]: http://www.w3.org/TR/XMLHttpRequest/
  [CORS Specification]: http://www.w3.org/TR/cors/
  [simple requests]: https://developer.mozilla.org/En/HTTP_access_control#Simple_requests
  [simple response header]: http://www.w3.org/TR/cors/#simple-response-header
