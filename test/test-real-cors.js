(function() {
  var loc = window.location;
  
  if (!loc.port)
    // We're not being run on a development server, just skip
    // these tests.
    return;

  module("real-cors");
  
  var myOrigin = loc.protocol + "//" + loc.hostname + ":" +
                 parseInt(loc.port);
  var corsURL = loc.protocol + "//" + loc.hostname + ":" +
                (parseInt(loc.port) + 1);
  var serverPath = "/test/real-cors-server.html";
  var Request = PPX.buildClientConstructor(corsURL + serverPath);

  function corsTest(options) {
    var name = options.name || options.path;
    
    function makeTest(xhr) {
      return function() {
        var req = new xhr();
        req.open(options.method || "GET", corsURL + options.path);
        if (options.headers)
          for (var name in options.headers)
            req.setRequestHeader(name, options.headers[name]);
        req.onreadystatechange = function() {
          if (req.readyState == 4) {
            options.test(req);
            start();
          }
        };
        req.send(options.body || null);
      }
    }
    
    if (jQuery.support.cors)
      asyncTest("(CORS XMLHttpRequest) " + name, makeTest(XMLHttpRequest));
    asyncTest("(PostMessage Proxied XHR) " + name, makeTest(Request));
  }

  corsTest({
    path: "/cors/origin-only-me",
    test: function(req) {
      equal(req.responseText, "hai2u");
    }
  });

  corsTest({
    path: "/cors/origin-all",
    test: function(req) {
      equal(req.responseText, "hai2u");
    }
  });

  corsTest({
    path: "/cors/origin-all/post",
    method: 'POST',
    body: 'supdog',
    headers: {'Content-Type': 'text/plain'},
    test: function(req) {
      equal(req.responseText, "received supdog");
    }
  });

  function expectCORSError(req, message) {
    if (req instanceof XMLHttpRequest)
      equal(req.responseText, "");
    else
      equal(req.responseText, message);
    equal(req.status, 0);
  }
  
  corsTest({
    name: "method unsupported by CORS fails",
    method: "OPTIONS",
    path: "/cors/origin-all",
    test: function(req) {
      expectCORSError(req, "method 'OPTIONS' is not allowed.");
    }
  });

  corsTest({
    path: "/cors/origin-foo.com",
    test: function(req) {
      expectCORSError(req, "message from invalid origin: " + myOrigin);
    }
  });
  
  corsTest({
    name: "CORS request to path w/ no CORS headers fails",
    path: "/test/sample.txt",
    test: function(req) {
      expectCORSError(req, "CORS is unsupported at that path.");
    }
  });
})();
