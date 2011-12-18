var PPX = (function() {
  var config = {
    requestHeaders: [
      "Accept",
      "Content-Type"
    ],
    requestMethods: [
      "GET",
      "POST"
    ],
    requestContentTypes: [
      "application/x-www-form-urlencoded",
      "multipart/form-data",
      "text/plain"
    ]
  };
  
  var utils = {
    warn: function warn(msg) {
      if (window.console && window.console.warn)
        window.console.warn(msg);
    },
    absolutifyURL: function absolutifyURL(url) {
      var a = document.createElement('a');
      a.setAttribute("href", url);
      return a.href;
    },
    on: function on(element, event, cb) {
      if (element.attachEvent)
        element.attachEvent("on" + event, cb);
      else
        element.addEventListener(event, cb, false);
    },
    off: function off(element, event, cb) {
      if (element.detachEvent)
        element.detachEvent("on" + event, cb);
      else
        element.removeEventListener(event, cb, false);
    },
    encode: function encode(data) {
      var parts = [];
      for (var name in data) {
        parts.push(name + "=" + encodeURIComponent(data[name]));
      }
      return parts.join("&");
    },
    decode: function decode(string) {
      return utils.parseUri("?" + string).queryKey;
    },
    isSameOrigin: function isSameOrigin(a, b) {
      a = utils.parseUri(a);
      b = utils.parseUri(b);
      return (a.protocol == b.protocol && a.authority == b.authority);
    },
    map: function map(array, cb) {
      var result = [];
      for (var i = 0; i < array.length; i++)
        result.push(cb(array[i]));
      return result;
    },
    trim: function trim(str) {
      return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    },
    // parseUri 1.2.2
    // (c) Steven Levithan <stevenlevithan.com>
    // MIT License
    parseUri: function parseUri(str) {
      var	o = utils.parseUriOptions,
          m = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
          uri = {},
          i = 14;

      while (i--) uri[o.key[i]] = m[i] || "";

      uri[o.q.name] = {};
      uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) uri[o.q.name][$1] = decodeURIComponent($2);
      });

      return uri;
    },
    parseUriOptions: {
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
    },
    // Taken from jQuery.
    inArray: function inArray(elem, array, i) {
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
  };
  
  function validateRequest(data, access, channel) {
    if (!access.allowOrigin) {
      channel.error("CORS is unsupported at that path.");
      return false;
    }

    if (access.allowOrigin != "*" && data.origin != access.allowOrigin) {
      channel.error("message from invalid origin: " + data.origin);
      return;
    }
    
    return true;
  }

  function parseAccessControlHeaders(req) {
    return {
      allowOrigin: req.getResponseHeader('Access-Control-Allow-Origin'),
    };
  }

  function SimpleChannel(other, onMessage, onError) {
    function getOtherWindow() {
      return other.postMessage ? other : other.contentWindow;
    }
    
    var self = {
      onMessage: onMessage,
      onError: onError || function defaultOnError(message) {
        if (window.console && window.console.error)
          window.console.error(message);
      },
      destroy: function() {
        utils.off(window, "message", messageHandler);
        other = null;
        onMessage = null;
      },
      send: function(data) {
        getOtherWindow().postMessage(utils.encode(data), "*");
      },
      error: function(message) {
        getOtherWindow().postMessage(utils.encode({
          __simpleChannelError: message
        }), "*");
      }
    };

    function messageHandler(event) {
      if (event.source != getOtherWindow())
        return;
      var data = utils.decode(event.data);
      if ('__simpleChannelError' in data)
        self.onError(data.__simpleChannelError, event.origin);
      else
        self.onMessage(data, event.origin);
    }
    
    utils.on(window, "message", messageHandler);
    return self;
  }

  return {
    utils: utils,
    config: config,
    startServer: function startServer(options) {
      options = options || {};

      var otherWindow = options.window || window.parent;
      var channel = SimpleChannel(otherWindow, function(data, origin) {
        if (data.cmd == "send") {
          var req = new XMLHttpRequest();
          data.origin = origin;
          data.headers = utils.decode(data.headers);

          if (!utils.isSameOrigin(window.location.href, data.url)) {
            channel.error("url does not have same origin: " + data.url);
            return;
          }
          if (utils.inArray(data.method, config.requestMethods) == -1) {
            channel.error("not a simple request method: " + data.method);
            return;
          }

          req.open(data.method, data.url);
          req.onreadystatechange = function() {
            if (req.readyState == 2) {
              var access = parseAccessControlHeaders(req);
              if (options.modifyAccessControl)
                options.modifyAccessControl(access, data);
              if (!validateRequest(data, access, channel)) {
                req.abort();
                return;
              }
            }
            channel.send({
              cmd: "readystatechange",
              readyState: req.readyState,
              status: req.status,
              statusText: req.statusText,
              responseText: req.responseText,
              responseHeaders: req.getAllResponseHeaders()
            });
          };

          var contentType = data.headers['Content-Type'];
          if (contentType &&
              utils.inArray(contentType, config.requestContentTypes) == -1) {
            channel.error("invalid content type for a simple request: " +
                          contentType);
            return;
          }

          for (var name in data.headers)
            if (utils.inArray(name, config.requestHeaders) == -1) {
              if (name == 'X-Requested-With') {
                /* Just ignore jQuery's X-Requested-With header. */
              } else {
                channel.error("header '" + name + "' is not allowed.");
                return;
              }
            } else
              req.setRequestHeader(name, data.headers[name]);

          req.setRequestHeader("X-Original-Origin", data.origin);
          req.send(data.body || null);
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
            channel = SimpleChannel(iframe, function(data) {
              switch (data.cmd) {
                case "ready":
                channel.send({
                  cmd: "send",
                  method: method,
                  url: utils.absolutifyURL(url),
                  headers: utils.encode(headers),
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
              utils.warn(message);
              self.responseText = message;
              self.readyState = self.DONE;
              cleanup();
              if (self.onreadystatechange)
                self.onreadystatechange();
            });

            iframe.setAttribute("src", utils.absolutifyURL(iframeURL));
            iframe.style.display = "none";
            document.body.appendChild(iframe);
          }
        };

        return self;
      };
    }
  };
})();
