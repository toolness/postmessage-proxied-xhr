var PostMessageProxiedXHR = (function() {
  function on(element, event, cb) {
    if (element.attachEvent)
      element.attachEvent("on" + event, cb);
    else
      element.addEventListener(event, cb, false);
  }
  
  return function PostMessageProxiedXHR(baseURL) {
    if (typeof(baseURL) == "undefined")
      baseURL = "";

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
        iframe.setAttribute("src", iframeURL);
        on(iframe, "load", function() {
          var channel = Channel.build({
            window:  iframe.contentWindow,
            origin: "*",
            scope: "PostMessageProxiedXHR",
            onReady: function() {
              channel.call({
                method: "send",
                params: {
                  method: method,
                  url: url,
                  body: body
                },
                success: function(result) {
                  self.responseText = result.responseText;
                  if (self.onload)
                    self.onload();
                },
                error: function() {
                  if (self.onerror)
                    self.onerror();
                }
              });
            }
          });
        });
        document.body.appendChild(iframe);
      }
    };
    
    return self;
  };
})();
