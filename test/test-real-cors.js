(function() {
  var loc = window.location;
  
  if (!loc.port || !jQuery.support.cors)
    // We're not being run on a development server, just skip
    // these tests.
    return;

  module("real-cors");
  
  var corsURL = loc.protocol + "//" + loc.hostname + ":" +
                (parseInt(loc.port) + 1);

  function corsTest(options) {
    asyncTest(options.name || options.path, function() {
      var req = new XMLHttpRequest();
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
    });
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
    test: function(req) {
      equal(req.responseText, "received supdog");
    }
  });

  corsTest({
    name: "method unsupported by CORS fails",
    method: "OPTIONS",
    path: "/cors/origin-all",
    test: function(req) {
      equal(req.responseText, "");
      equal(req.status, 0);
    }
  });

  corsTest({
    name: "header unsupported by CORS fails",
    headers: {'X-blarg': 'hi'},
    path: "/cors/origin-all",
    test: function(req) {
      equal(req.responseText, "");
      equal(req.status, 0);
    }
  });

  corsTest({
    path: "/cors/origin-foo.com",
    test: function(req) {
      equal(req.responseText, "");
      equal(req.status, 0);
    }
  });
  
  corsTest({
    name: "CORS request to path w/ no CORS headers fails",
    path: "/test/sample.txt",
    test: function(req) {
      equal(req.responseText, "");
      equal(req.status, 0);
    }
  });
})();
