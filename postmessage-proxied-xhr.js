var PostMessageProxiedXHR = (function() {
  function absolutifyURL(url) {
    var a = document.createElement('a');
    a.setAttribute("href", url);
    return a.href;
  }
  
  function on(element, event, cb) {
    if (element.attachEvent)
      element.attachEvent("on" + event, cb);
    else
      element.addEventListener(event, cb, false);
  }

  function off(element, event, cb) {
    if (element.detachEvent)
      element.detachEvent("on" + event, cb);
    else
      element.removeEventListener(event, cb, false);
  };
  
  function encode(data) {
    var parts = [];
    for (var name in data) {
      parts.push(name + "=" + encodeURIComponent(data[name]));
    }
    return parts.join("&");
  }
  
  function decode(string) {
    var data = {};
    var re = new RegExp("([^?=&]+)(=([^&]*))?", "g");
    string.replace(re, function($0, $1, $2, $3) {
      data[$1] = decodeURIComponent($3);
    });
    return data;
  }
  
  // Taken from jQuery.
  function inArray( elem, array, i ) {
		var len;
    var indexOf = Array.prototype.indexOf;
    
		if ( array ) {
			if ( indexOf ) {
				return indexOf.call( array, elem, i );
			}

			len = array.length;
			i = i ? i < 0 ? Math.max( 0, len + i ) : i : 0;

			for ( ; i < len; i++ ) {
				// Skip accessing in sparse arrays
				if ( i in array && array[ i ] === elem ) {
					return i;
				}
			}
		}

		return -1;
	}
	
  function SimpleChannel(other, targetOrigin, onMessage, onError) {
    function getOtherWindow() {
      return ('contentWindow' in other) ? other.contentWindow : other;
    }
    
    var self = {
      onMessage: onMessage,
      onError: onError || function defaultOnError(message) {
        if (window.console && window.console.error)
          window.console.error(message);
      },
      destroy: function() {
        off(window, "message", messageHandler);
        other = null;
        onMessage = null;
      },
      send: function(data) {
        getOtherWindow().postMessage(encode(data), targetOrigin);
      },
      error: function(message) {
        getOtherWindow().postMessage(encode({
          __simpleChannelError: message
        }), targetOrigin);
      }
    };

    function messageHandler(event) {
      if (event.source != getOtherWindow())
        return;
      if (targetOrigin != "*")
        if (event.origin != targetOrigin) {
          self.error("message from invalid origin: " + event.origin);
          return;
        }
      var data = decode(event.data);
      if ('__simpleChannelError' in data)
        self.onError(data.__simpleChannelError);
      else
        self.onMessage(data);
    }
    
    on(window, "message", messageHandler);
    return self;
  }

  var alwaysAllowHeaders = [
    "Accept",
    /* Harmless header jQuery might add. */
    "X-Requested-With"
  ];

  return {
    utils: {
      decode: decode,
      encode: encode,
      inArray: inArray
    },
    alwaysAllowHeaders: alwaysAllowHeaders,
    startServer: function startServer(settings) {
      var origin = settings.allowOrigin;
      var otherWindow = settings.window || window.parent;
      var channel = SimpleChannel(otherWindow, origin, function(data) {
        switch (data.cmd) {
          case "send":
          // TODO: Validate URL, ensure it's on our domain.
          var req = new XMLHttpRequest();
          var headers = decode(data.headers);
          var isValidMethod = (inArray(data.method.toUpperCase(),
                                       settings.allowMethods) != -1);

          if (!isValidMethod) {
            channel.error("method '" + data.method + "' is not allowed.");
            return;
          }

          req.open(data.method, data.url);
          req.onreadystatechange = function() {
            channel.send({
              cmd: "readystatechange",
              readyState: req.readyState,
              status: req.status,
              statusText: req.statusText,
              responseText: req.responseText,
              responseHeaders: req.getAllResponseHeaders()
            });
          };

          for (var name in headers) {
            if (inArray(name, settings.allowHeaders) != -1 ||
                inArray(name, alwaysAllowHeaders) != -1)
              req.setRequestHeader(name, headers[name]);
            else {
              channel.error("header '" + name + "' is not allowed.");
              return;
            }
          }

          req.send(data.body || null);
          break;
        }
      });
      channel.send({cmd: "ready"});
    },
    buildClientConstructor: function buildClientConstructor(iframeURL) {
      return function PostMessageProxiedXMLHttpRequest() {
        var method;
        var url;
        var headers = {};
        var responseHeaders = "";
        
        var self = {
          UNSENT: 0,
          OPENED: 1,
          HEADERS_RECEIVED: 2,
          LOADING: 3,
          DONE: 4,
          readyState: 0,
          status: 0,
          statusText: "",
          responseText: "",
          open: function(aMethod, aUrl) {
            method = aMethod;
            url = aUrl;
          },
          setRequestHeader: function(name, value) {
            headers[name] = value;
          },
          getAllResponseHeaders: function() {
            return responseHeaders;
          },
          send: function(body) {
            var iframe = document.createElement("iframe");
            var channel = SimpleChannel(iframe, "*", function(data) {
              switch (data.cmd) {
                case "ready":
                channel.send({
                  cmd: "send",
                  method: method,
                  url: absolutifyURL(url),
                  headers: encode(headers),
                  body: body || ""
                });
                break;
                
                case "readystatechange":
                self.readyState = parseInt(data.readyState);
                self.status = parseInt(data.status);
                self.statusText = data.statusText;
                self.responseText = data.responseText;
                responseHeaders = data.responseHeaders;
                if (self.readyState == 4) {
                  channel.destroy();
                  document.body.removeChild(iframe);
                  channel = null;
                  iframe = null;
                }
                if (self.onreadystatechange)
                  self.onreadystatechange();
                break;
              }
            }, function onError(message) {
              if (window.console && window.console.warn)
                window.console.warn(message);
              self.statusText = message;
              channel.destroy();
              document.body.removeChild(iframe);
              channel = null;
              iframe = null;
              if (self.onreadystatechange)
                self.onreadystatechange();
            });

            iframe.setAttribute("src", absolutifyURL(iframeURL));
            iframe.style.display = "none";
            document.body.appendChild(iframe);
          }
        };

        return self;
      };
    }
  };
})();
