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
      if (targetOrigin != "*" && event.origin != targetOrigin)
        return;
      self.onMessage(decode(event.data));
    }
    
    on(window, "message", messageHandler);
    return self;
  }
  
  return {
    utils: {
      decode: decode,
      encode: encode,
      SimpleChannel: SimpleChannel
    },
    buildConstructor: function buildConstructor(baseURL) {
      if (typeof(baseURL) == "undefined")
        baseURL = "";

      return function PostMessageProxiedXMLHttpRequest() {
        var method;
        var url;

        var self = {
          open: function(aMethod, aUrl) {
            method = aMethod;
            url = aUrl;
          },
          send: function(body) {
            var iframeURL = baseURL + "postmessage-proxy.html";
            var iframe = document.createElement("iframe");
            var channel = SimpleChannel(iframe, "*", function(data) {
              switch (data.cmd) {
                case "ready":
                channel.send({
                  cmd: "send",
                  method: method,
                  url: url,
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
