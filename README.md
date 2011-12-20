PostMessage Proxied XMLHttpRequest (PPX) is a simple [polyfill][] that allows browsers without support for cross-origin XMLHttpRequests to do so via postMessage.

The code has no dependencies and does not require JSON, which makes it about 2KB minified and gzipped.

A simple jQuery plugin that allows jQuery-based ajax requests to transparently use the polyfill is also available.

## Usage

Suppose you have a website at http://foo.com which exposes a cross-origin REST API that you'd like to access from http://bar.com.

Create a file at http://foo.com/server.html and put the following code in it:

```html
<!DOCTYPE html>
<meta charset="utf-8">
<title>PPX Server Frame</title>
<script src="ppx.js"></script>
<script>PPX.startServer();</script>
```

This is the host iframe which will proxy requests for you.

### Basic Use

From a page on bar.com, you can access foo.com like so:

```html
<script src="http://foo.com/ppx.js"></script>
<script>
  var FooXHR = PPX.buildClientConstructor("http://foo.com/server.html");
  var req = new FooXHR();
  req.open("GET", "http://foo.com/api/stuff");
  req.onreadystatechange = function() {
    if (req.readyState == 4 && req.status == 200)
      alert("the response is " + req.responseText);
  };
  req.send(null);
</script>
```

As you can probably guess, `PPX.buildClientConstructor()` returns an object much like `window.XMLHttpRequest`. This can then be used as-is, or given to another third-party library to make cross-origin communication as familiar as a normal ajax request.

### Using PPX with jQuery

The above example can be made simpler using the PPX jQuery plugin:

```html
<script src="http://code.jquery.com/jquery-1.7.1.js"></script>
<script src="http://foo.com/ppx.js"></script>
<script src="http://foo.com/ppx.jquery.js"></script>
<script>
  jQuery.proxyAjaxThroughPostMessage("http://foo.com/server.html");
  jQuery.get("http://foo.com/api/stuff", function(data) {
    alert("the response is " + data);
  });
</script>
```

The call `jQuery.proxyAjaxThroughPostMessage()` sets up an [ajax prefilter][] which will automatically proxy requests to foo.com if the host browser doesn't already support CORS.

### Using PPX with jQuery and yepnope.js

You can use PPX with [yepnope.js][] and jQuery, too:

```html
<script src="http://code.jquery.com/jquery-1.7.1.js"></script>
<script src="yepnope.js"></script>
<script>
  yepnope({
    test: jQuery.support.cors,
    nope: ["http://foo.com/ppx.js", "http://foo.com/ppx.jquery.js"],
    complete: function() {
      if (!jQuery.support.cors)
        jQuery.proxyAjaxThroughPostMessage("http://foo.com/server.html");
      jQuery.get("http://foo.com/api/stuff", function(data) {
        alert("the response is " + data);
      });
    }
  });
</script>
```

This will only load PPX's JS code if CORS support isn't detected in the host browser.

## Development

After cloning the git repository and entering its directory, you can start the development server by running:

    python server.py
    
This will start two local web servers on ports 9000 and 9001. The functional tests make CORS requests from one to the other to ensure that everything works as expected.

To start the tests, browse to http://localhost:9000/test/.

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
  [ajax prefilter]: http://api.jquery.com/extending-ajax/#Prefilters
  [yepnope.js]: http://yepnopejs.com/
  