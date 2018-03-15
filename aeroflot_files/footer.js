'use strict';


var Footer = (function($) {
    var module = {};

    var settings = {};

    var ui = {};

    function init() {
        if (typeof($.colorbox) === 'undefined') {
            $('#cbx_footer').hide();
            return;
        }
        var colorbox_uri = window.location.protocol + '//' + window.location.host + $('#cbx_booking_common_1').attr('data-colorbox-uri');
        $('#cbx_booking, #cbx_booking_common_1').colorbox({href: colorbox_uri, width: 900, height: 600, scrolling: true});

        if (navigator.userAgent.match(/Android/i) ||
            navigator.userAgent.match(/iPhone/i) ||
            navigator.userAgent.match(/iPad/i) ||
            navigator.userAgent.match(/iPod/i) ||
            navigator.userAgent.match(/BlackBerry/) ||
            navigator.userAgent.match(/Windows Phone/i) ||
            navigator.userAgent.match(/iemobile/i) ||
            navigator.userAgent.match(/ZuneWP7/i)) {
            $('#cbx_footer').hide();
        } else {
            $('#cbx_footer').colorbox({inline: true, href: '#call_form', width: 550, height: 339, initialWidth: 500, initialHeight: 263});
        }
    }

    module.init = function(options) {
        for (var pr in options) {
            settings[pr] = options[pr];
        }

        if (settings.ui) {
            for (var pr in settings.ui) {
                ui[pr] = settings.ui[pr];
            }
        }

        $(document).ready(function() {
            for (var pr in ui) {
                ui[pr] = $(ui[pr]);
            }

            init();
        });
    };

    return module;
}(jQuery));
