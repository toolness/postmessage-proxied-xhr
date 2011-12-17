(function() {
  module("utils");

  var utils = PPX.utils;

  test("utils.inArray() works", function() {
    equal(utils.inArray("foo", ["bar", "foo", "baz"]), 1);
    ok(utils.inArray("foo", ["bar", "baz"]), -1);
  });

  test("utils.encode() works", function() {
    deepEqual(utils.encode({a: 'foo', b: 'blarg'}), "a=foo&b=blarg");
    deepEqual(utils.encode({a: '', b: 'blarg'}), "a=&b=blarg");
    deepEqual(utils.encode({a: 'foo&', b: 'b'}), "a=foo%26&b=b",
              "Ensure '&' is encoded properly");
  });

  test("utils.decode() works", function() {
    deepEqual(utils.decode("a=foo&b=blarg"), {a: 'foo', b: 'blarg'});
    deepEqual(utils.decode("a=&b=blarg"), {a: '', b: 'blarg'});
    deepEqual(utils.decode("a=foo%26&b=b"), {a: 'foo&', b: 'b'},
              "Ensure '&' is decoded properly");
  });

  test("utils.isSameOrigin() works", function() {
    ok(utils.isSameOrigin("http://foo.com/bar", "http://foo.com/baz"));
    ok(!utils.isSameOrigin("http://foo.com/bar", "https://foo.com/baz"));  
    ok(!utils.isSameOrigin("http://a.com/", "http://b.com/"));  
    ok(!utils.isSameOrigin("http://a.com:8000/", "http://a.com/"));  
  });
})();
