(function() {
  module("request");

  var Request = PPX.buildClientConstructor("server.html");

  test("only non-preflighted request methods are supported", function() {
    var req = Request();
    req.open("PUT", "sample.txt");
    req.onreadystatechange = function() {
      equal(req.readyState, req.DONE);
      equal(req.responseText, "not a simple request method: PUT");
      start();
    };
    req.send(null);
    stop();
  });

  test("exception raised if send() called before open()", function() {
    raises(function() {
      var req = Request();
      req.send(null);
    }, new RegExp("request not initialized"));
  });

  test("same origin violation error works", function() {
    var req = Request();
    req.open("get", "http://example.com/foo");
    req.onreadystatechange = function() {
      equal(req.readyState, req.DONE);
      equal(req.responseText, "url does not have same origin: http://example.com/foo");
      start();
    };
    req.send(null);
    stop();
  });

  test("header not allowed error works", function() {
    var req = Request();
    req.open("GET", "sample.txt");
    req.setRequestHeader('X-blarg', 'hi');
    req.onreadystatechange = function() {
      equal(req.readyState, req.DONE);
      equal(req.responseText, "header 'X-blarg' is not allowed.");
      start();
    };
    req.send(null);
    stop();
  });

  test("abort() works", function() {
    var req = Request();
    var readyStates = [];
    req.open("get", "sample.txt");
    equal(req.readyState, 1);
    req.send(null);
    req.onreadystatechange = function() {
      readyStates.push(req.readyState);
    };
    equal(req.readyState, 1);
    req.abort();
    equal(req.readyState, 0);
    deepEqual(readyStates, [4]);
  });

  test("response '200 OK' works", function() {
    function checkTypes() {
      equal(typeof(req.responseText), 'string', 'responseText is a string');
      equal(typeof(req.statusText), 'string', 'statusText is a string');
      equal(typeof(req.status), 'number', 'status is a number');
      equal(typeof(req.readyState), 'number', 'readyState is a number');
      if (req.readyState >= req.HEADERS_RECEIVED)
        ok(req.getAllResponseHeaders().length,
           'getAllResponseHeaders() returns a non-empty string');
      else
        equal(typeof(req.getAllResponseHeaders()), 'string',
              'getAllResponseHeaders() returns a string');
    }

    var req = Request();
    req.open("GET", "sample.txt");
    req.onreadystatechange = function() {
      checkTypes();
      if (req.readyState == 4 && req.status == 200) {
        equal(req.responseText, "hello there, I am sample text.",
              "responseText is as expected.");
        start();
      }
    };
    checkTypes();
    req.send(null);
    stop();
  });

  test("response '404 Not Found' works", function() {
    var req = Request();
    req.open("GET", "nonexistent.txt");
    req.onreadystatechange = function() {
      if (req.readyState == 4 && req.status == 404) {
        ok(true, "Status 404 was returned.");
        start();
      }
    };
    req.send(null);
    stop();
  });
})();
