(function() {
  module("jquery-plugin");

  jQuery.proxyAjaxThroughPostMessage("server.html");

  test("success works", function() {
    jQuery.ajax({
      url: "sample.txt",
      usePostMessage: true,
      success: function(data, textStatus, req) {
        ok(req.isProxiedThroughPostMessage);
        equal(data, "hello there, I am sample text.");
        start();
      }
    });
    stop();
  });

  test("error works for 404", function() {
    jQuery.ajax({
      url: "nonexistent.txt",
      usePostMessage: true,
      error: function(req) {
        ok(req.isProxiedThroughPostMessage);
        equal(req.status, 404);
        start();
      }
    });
    stop();
  });

  test("error works for header not allowed", function() {
    jQuery.ajax({
      url: "nonexistent.txt",
      usePostMessage: true,
      headers: {'X-blarg': 'hi'},
      error: function(req) {
        ok(req.isProxiedThroughPostMessage);
        equal(req.status, 0);
        equal(req.responseText, "header 'X-blarg' is not allowed.");
        start();
      }
    });
    stop();
  });
})();
