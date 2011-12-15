var PostMessageProxiedXHR = (function() {
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

  function error(msg) {
    if (window.console && window.console.error)
      window.console.error(msg);
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
	
  function SimpleChannel(other, targetOrigin, onMessage) {
    function getOtherWindow() {
      return ('contentWindow' in other) ? other.contentWindow : other;
    }
    
    var self = {
      onMessage: onMessage,
      destroy: function() {
        off(window, "message", messageHandler);
        other = null;
        onMessage = null;
      },
      send: function(data) {
        getOtherWindow().postMessage(encode(data), targetOrigin);
      }
    };

    function messageHandler(event) {
      if (event.source != getOtherWindow())
        return;
      if (targetOrigin != "*")
        if (event.origin != targetOrigin) {
          error("message from invalid origin: " + event.origin);
          return;
        }
      self.onMessage(decode(event.data));
    }
    
    on(window, "message", messageHandler);
    return self;
  }
  
  return {
    utils: {
      decode: decode,
      encode: encode,
      SimpleChannel: SimpleChannel,
      error: error,
      inArray: inArray
    },
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
            error("method '" + data.method + "' is not allowed");
            return;
          }

          req.open(data.method, data.url);
          req.onreadystatechange = function() {
            channel.send({
              cmd: "readystatechange",
              readyState: req.readyState,
              status: req.status,
              statusText: req.statusText,
              responseText: req.responseText
            });
          };

          for (var name in headers) {
            if (inArray(name, settings.allowHeaders) != -1)
              req.setRequestHeader(name, headers[name]);
            else {
              error("header '" + name + "' is not allowed.");
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
        
        var self = {
          open: function(aMethod, aUrl) {
            method = aMethod;
            url = aUrl;
          },
          setRequestHeader: function(name, value) {
            headers[name] = value;
          },
          send: function(body) {
            var iframe = document.createElement("iframe");
            var channel = SimpleChannel(iframe, "*", function(data) {
              switch (data.cmd) {
                case "ready":
                channel.send({
                  cmd: "send",
                  method: method,
                  url: url,
                  headers: encode(headers),
                  body: body || ""
                });
                break;
                
                case "readystatechange":
                self.readyState = parseInt(data.readyState);
                self.status = parseInt(data.status);
                self.statusText = data.statusText;
                self.responseText = data.responseText;
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
            });

            iframe.setAttribute("src", iframeURL);
            iframe.style.display = "none";
            document.body.appendChild(iframe);
          }
        };

        return self;
      };
    }
  };
})();
