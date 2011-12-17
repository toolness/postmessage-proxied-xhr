(function(jQuery) {
  jQuery.extend({
    proxyAjaxThroughPostMessage: function(url) {
      var Request = PPX.buildClientConstructor(url);
      var utils = PPX.utils;
      url = utils.absolutifyURL(url);
      jQuery.ajaxPrefilter(function(options, originalOptions, jqXHR) {
        if (((options.crossDomain && !jQuery.support.cors) ||
             options.usePostMessage) &&
            utils.isSameOrigin(url, utils.absolutifyURL(options.url))) {
          options.xhr = Request;
          options.crossDomain = false;
          jqXHR.isProxiedThroughPostMessage = true;
        }
      });
    }
  });
})(jQuery);
