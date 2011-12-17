var PPX = (function() {
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
    return parseUri("?" + string).queryKey;
  }

  function isSameOrigin(a, b) {
    a = parseUri(a);
    b = parseUri(b);
    return (a.protocol == b.protocol && a.authority == b.authority);
  }
  
  // parseUri 1.2.2
  // (c) Steven Levithan <stevenlevithan.com>
  // MIT License

  function parseUri(str) {
    var	o = parseUri.options,
        m = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
        uri = {},
        i = 14;

    while (i--) uri[o.key[i]] = m[i] || "";

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
      if ($1) uri[o.q.name][$1] = decodeURIComponent($2);
    });

    return uri;
  };

  parseUri.options = {
    strictMode: false,
    key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
    q: {
      name:   "queryKey",
      parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
      strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
      loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
  };

  // Taken from jQuery.
  function inArray(elem, array, i) {
    var len;
    var indexOf = Array.prototype.indexOf;

    if (array) {
      if (indexOf) {
        return indexOf.call(array, elem, i);
      }

      len = array.length;
      i = i ? i < 0 ? Math.max(0, len + i) : i : 0;

      for (;i < len; i++) {
        // Skip accessing in sparse arrays
        if (i in array && array[i] === elem) {
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
      inArray: inArray,
      isSameOrigin: isSameOrigin,
      absolutifyURL: absolutifyURL
    },
    alwaysAllowHeaders: alwaysAllowHeaders,
    startServer: function startServer(settings) {
      var origin = settings.allowOrigin;
      var otherWindow = settings.window || window.parent;
      var channel = SimpleChannel(otherWindow, origin, function(data) {
        switch (data.cmd) {
          case "send":
          var req = new XMLHttpRequest();
          var headers = decode(data.headers);
          var isValidMethod = (inArray(data.method.toUpperCase(),
                                       settings.allowMethods) != -1);

          if (!isValidMethod) {
            channel.error("method '" + data.method + "' is not allowed.");
            return;
          }

          if (!isSameOrigin(window.location.href, data.url)) {
            channel.error("url does not have same origin: " + data.url);
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
        var channel;
        var iframe;
        var headers = {};
        var responseHeaders = "";
        
        function cleanup() {
          if (channel) {
            channel.destroy();
            channel = null;
          }
          if (iframe) {
            document.body.removeChild(iframe);
            iframe = null;
          }
        }
        
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
            self.readyState = self.OPENED;
            if (self.onreadystatechange)
              self.onreadystatechange();
          },
          setRequestHeader: function(name, value) {
            headers[name] = value;
          },
          getAllResponseHeaders: function() {
            return responseHeaders;
          },
          abort: function() {
            if (iframe) {
              cleanup();
              self.readyState = self.DONE;
              if (self.onreadystatechange)
                self.onreadystatechange();
              self.readyState = self.UNSENT;
            }
          },
          send: function(body) {
            if (self.readyState == self.UNSENT)
              throw new Error("request not initialized");

            iframe = document.createElement("iframe");
            channel = SimpleChannel(iframe, "*", function(data) {
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
                if (self.readyState == 4)
                  cleanup();
                if (self.onreadystatechange)
                  self.onreadystatechange();
                break;
              }
            }, function onError(message) {
              if (window.console && window.console.warn)
                window.console.warn(message);
              self.responseText = message;
              self.readyState = self.DONE;
              cleanup();
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
