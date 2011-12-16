(function(jQuery) {
  var utils = PostMessageProxiedXHR.utils;
  jQuery.extend({
    proxyAjaxThroughPostMessage: function(url) {
      var Request = PostMessageProxiedXHR.buildClientConstructor(url);
      jQuery.ajaxPrefilter(function(options, originalOptions, jqXHR) {
        if (((options.crossDomain && !jQuery.support.cors) ||
             options.usePostMessage) &&
            utils.isSameOrigin(url, options.url)) {
          options.xhr = Request;
          options.crossDomain = false;
        }
      });
    }
  });
})(jQuery);
