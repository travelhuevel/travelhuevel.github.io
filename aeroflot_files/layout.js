(function($) {
    $.browser = {};
    $.browser.msie = (navigator.appName == 'Microsoft Internet Explorer');
})(jQuery);

var Layout = (function($) {
    var module = {};

    var settings = {
        languageCookieName: 'language',
        ieWarningCookieName: 'iewarning',
        breakingNewsCookieName: 'breaking_news',
        topMenuDelay: 200,
        skipTopMenuFirstItem: false,
        menuServiceURL: ''
    };

    var ui = {
        bannerTopBlock: '.page-type-front_bonus >> .main-container >> .fl-down',
        bannerBlock: ':not(.page-type-front_bonus) >> .main-container >> .fl-down,:not(.main-container) >> .fl-down',
        bannerNavBlock: '#navToolbar',
        sidebarBannerBlock: '.block-right',
        languageSelectorBlock: '.language-selector',
        topMenuBlock: '#topmenu',
        ieAlarmBlock: '#ieAlarmBar',
        breakingNewsBlock: '#breakingNews',
        proxyParamLinkCollection: 'a[data-proxy-params]'
    };

    var bannerLoop = false;
    var bannerTopLoop = false;

    function _safeCalc(val) {
        return Math.ceil(parseFloat(val));
    }

    function safeWidth($el, exW, exP, exB, exM) {
        var result = 0;
        if (!exW) {
            result += _safeCalc($el.css('width'));
        }
        if (!exP) {
            result += _safeCalc($el.css('paddingLeft'));
            result += _safeCalc($el.css('paddingRight'));
        }
        if (!exB) {
            result += _safeCalc($el.css('borderLeftWidth'));
            result += _safeCalc($el.css('borderRightWidth'));
        }
        if (!exM) {
            result += _safeCalc($el.css('marginLeft'));
            result += _safeCalc($el.css('marginRight'));
        }
        return result;
    }

    function getCookie(name) {
        var nameEQ = name + '=';
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.substring(0, nameEQ.length) == nameEQ) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function setCookie(name, value, exdays) {
        var d = new Date();
        if (exdays) {
            d.setTime(d.getTime() + (exdays*24*60*60*1000));
            var expires = "expires=" + d.toGMTString();
            document.cookie = '' + name + '=' + value + ';' + expires + '; path=/';
        } else {
            document.cookie = '' + name + '=' + value + '; path=/';
        }
    }

    function getIEVersion() {
        var rv = -1;
        if (navigator.appName == 'Microsoft Internet Explorer') {
            var ua = navigator.userAgent;
            var re  = new RegExp('MSIE ([0-9]{1,}[\.0-9]{0,})');
            if (re.exec(ua) != null)
            rv = parseFloat(RegExp.$1);
        } else if (navigator.appName == 'Netscape') {
            var ua = navigator.userAgent;
            var re  = new RegExp("Trident/.*rv:([0-9]{1,}[\.0-9]{0,})");
            if (re.exec(ua) != null)
            rv = parseFloat(RegExp.$1);
        }
        return rv;
    }

    function getRequsetVar(name){
        if (name = (new RegExp('[?&]' + encodeURIComponent(name) + '=([^&]*)')).exec(location.search)) {
            return decodeURIComponent(name[1]);
        }
    }

    function initProxyParamLinks() {
        if (!ui.proxyParamLinkCollection.length) return;

        ui.proxyParamLinkCollection.each(function(i, el) {
            var params = $(el).attr('data-proxy-params');
            params = params.split(',');
            var qs = [];
            for (var i = 0; i < params.length; i++) {
                var val = getRequsetVar(params[i]);
                if (val) {
                    qs.push(params[i] + '=' + val);
                }
            }

            if (qs.length) {
                var href = $(el).attr('href');
                var sign = href.indexOf('?') > -1 ? '&' : '?';
                $(el).attr('href', href + sign + qs.join('&'));
            }
        });
    }

    function initIEWarning() {
        if (!ui.ieAlarmBlock.length) return;

        ui.ieAlarmBlock.prependTo($('body'));

        var ieVersion = getIEVersion();
        if (ieVersion > -1 && ieVersion < 9) {
            ui.ieAlarmBlock.find('#ieversion').text(ieVersion);

            if (getCookie(settings.ieWarningCookieName)) return;

            ui.ieAlarmBlock.addClass('visible');

            $('.btn', ui.ieAlarmBlock).on('click', function(evt) {
                evt.preventDefault();
                setCookie(settings.ieWarningCookieName, 1, 354);
                ui.ieAlarmBlock.removeClass('visible');
            });
        }
    }

    function initBreakingNews() {
        if (!ui.breakingNewsBlock.length) return;

        var hiddenIds = getCookie(settings.breakingNewsCookieName);
        if (hiddenIds) {
            hiddenIds = hiddenIds.split(',');
        } else {
            hiddenIds = [];
        }

        var ids = [];
        $('li', ui.breakingNewsBlock).each(function() {
            var id = $(this).attr('data-id');
            if ($.inArray(id, hiddenIds) == -1) {
                ids.push(id);
            }
        });

        if (!ids.length) return;

        for (var i = 0; i < hiddenIds.length; i++) {
            $('li[data-id="' + hiddenIds[i] + '"]', ui.breakingNewsBlock).hide();
        }

        ui.breakingNewsBlock.show();

        $('a.closeLink').on('click', function(evt) {
            evt.preventDefault();

            $('li', ui.breakingNewsBlock).each(function() {
                var id = $(this).attr('data-id');
                if ($.inArray(id, hiddenIds) == -1) {
                    hiddenIds.push(id);
                }
            });
            setCookie(settings.breakingNewsCookieName, hiddenIds.join(','), 354);
            ui.breakingNewsBlock.hide();
        });
    }

    function resizeTopMenu() {
        var pageWidth = $('body').width();
        if (pageWidth != parseInt(ui.topMenuBlock.attr('data-page-width'), 10)) {
            ui.topMenuBlock.attr('data-page-width', pageWidth);

            // zoom artefacts
            var $topLi = $('ul li', ui.topMenuBlock).not('ul li li', ui.topMenuBlock);
            var offset = $topLi.first().offset();
            var _offset = $topLi.last().offset();
            if (_offset.top > offset.top) {
                var k = 1;
                while (true) {
                    ui.topMenuBlock.width(ui.topMenuBlock.width() + k);
                    _offset = $topLi.last().offset();
                    if (_offset.top <= offset.top) break;
                    k += 1;
                    if (k > 30) break;
                }
                ui.topMenuBlock.attr('data-outer-width', ui.topMenuBlock.outerWidth(true));
            }

            // position
            if (!ui.topMenuBlock.attr('data-outer-width')) {
                ui.topMenuBlock.attr('data-outer-width', ui.topMenuBlock.outerWidth(true));
            }

            var pageWidth = $('body').width();
            var menuWidth = parseInt(ui.topMenuBlock.attr('data-outer-width'), 10);
            if (pageWidth < menuWidth) {
                ui.topMenuBlock.addClass('right');
            } else {
                ui.topMenuBlock.removeClass('right');
            }
        }
    }

    function buildTopMenu() {
        ui.topMenuBlock.attr('data-margin-left', parseInt(ui.topMenuBlock.css('marginLeft'), 10));
        ui.topMenuBlock.attr('data-skip-first-item', 0 + settings.skipTopMenuFirstItem);

        var $topLi = $('ul li', ui.topMenuBlock).not('ul li li', ui.topMenuBlock);

        var menuWidth = 0;
        var dropdownWidth = 0;
        $topLi.each(function(i, el) {
            var w = $(this).outerWidth(true);
            menuWidth += w;

            if (settings.skipTopMenuFirstItem && !i) {
                w = 0;
            }
            dropdownWidth += w;
        });

        ui.topMenuBlock.css('width', menuWidth + 1);

        if (menuWidth > parseInt($('body').css('minWidth'), 10)) {
            $('body').css('minWidth', menuWidth);
        }

        resizeTopMenu();
        $(window).resize(resizeTopMenu);

        var minLiWidth = (dropdownWidth / $topLi.length) * 1.27;
        var liWidth = 0;
        var k = 1;
        while (true) {
            var _w = Math.floor(dropdownWidth / k);
            if (_w < minLiWidth) break;
            liWidth = _w;
            k++;
            if (k > 100) break;
        }

        var offset = 0;
        if (settings.skipTopMenuFirstItem) {
            var offset = -$topLi.first().outerWidth(true);
        }

        var panelBack = function() {
            var $panel = $('#bookingPanel');
            if ($panel.length && !$panel.hasClass('closed')) {
                ui.topMenuBlock.addClass('foreground');
                if (!$panel.hasClass('statePad')) {
                    $('li', ui.topMenuBlock).first().css('visibility', 'hidden');
                }
            }
        };

        var panelForward = function() {
            ui.topMenuBlock.removeClass('foreground');
            $('li', ui.topMenuBlock).first().css('visibility', 'visible');
        };

        var timers = [];
        var t = new Date().getTime();
        $topLi.each(function(i, el) {
            var $ul = $('ul', $(this));

            var dw = safeWidth($ul, 1);

            $ul.css({
                position: 'absolute',
                left: -(offset + dw / 2) + 'px',
                width: dropdownWidth
            });

            offset += $(this).outerWidth();

            var $li = $('li', $ul);
            var dw = $li.outerWidth(true) - $li.width();
            $('li', $ul).css('width', liWidth - dw);

            $('i', $ul).each(function(i, el) {
                var bImg = $(el).css('backgroundImage');
            });

            timers[i] = 0;
            $(this).mouseenter(function() {
                if (new Date().getTime() - t < settings.topMenuDelay) {
                    $(this).addClass('hover');

                    panelBack();
                } else {
                    _this = $(this);
                    timers[i] = setTimeout(function() {
                        _this.addClass('hover');

                        panelBack();
                    }, settings.topMenuDelay);
                }
            }).mouseleave(function() {
                clearTimeout(timers[i]);
                t = new Date().getTime();
                $(this).removeClass('hover');

                panelForward();
            });
        });
    }

    function initTopMenu() {
        if (!ui.topMenuBlock.length) return;
        if (!$('ul', ui.topMenuBlock).length) {
            $.ajax({
                url: settings.menuServiceURL,
                cache: true,
                dataType: 'jsonp',
                jsonp: false,
                jsonpCallback: 'callback',
                data: {}
            }).success(function(data) {
                if (data.success) {
                    ui.topMenuBlock.prepend(data.data);
                    buildTopMenu();
                }
            });

            return;
        }

        buildTopMenu();
    }

    function initBannerNav() {
        //if (!ui.bannerBlock.length) return;
        if (!ui.bannerNavBlock.length) return;
		
		addBannerId();
        var c = $('a', ui.bannerBlock).add('a', ui.bannerTopBlock).length;
        if (c > 1) {
            for (var i = 0; i < c; i++) {
                var $a = $('<a>').attr({
                    id: ui.bannerNavBlock.attr('id') + (i + 1),
                    role: 'button',
                    'data-slide': (i + 1),
                    'aria-label': $('#banner-img-' + i, ui.bannerBlock).attr('alt'),
                    href: '#'
                });
                ui.bannerNavBlock.append($a);
            }
        }
    }

    function addBannerId() {
        $('.block-banner > .fl-down > a > img').each(function(i){
            $(this).attr('id', 'banner-img-' + i);
        });
    }

    function manageBannerLoop($container) {
        if ($('a', $container).length == $('a[data-no-loop="1"]', $container).length) {
            ui.bannerBlock.cycle('pause');
        }
    }

    function resizeBanners() {
        if (!ui.bannerBlock.length) return;

        if (bannerLoop) {
            try {
                ui.bannerBlock.cycle('pause');
            } catch (e) {}
        }

        var wp = ui.bannerBlock.width();

        var ratio = parseFloat(ui.bannerBlock.attr('data-ratio'));
        ui.bannerBlock.height(wp * ratio);
        var hp = ui.bannerBlock.height();

        var _wp = ui.bannerBlock.width();
        if (wp != _wp) {
            var wp = _wp > wp ? _wp : wp;

            ui.bannerBlock.height(wp * ratio);
            hp = ui.bannerBlock.height();
        }

        $('a', ui.bannerBlock).width(wp).height(hp);
        $('a img', ui.bannerBlock).width(wp).height(hp);

        if (!bannerLoop) {

            try {
                ui.bannerBlock.cycle({
                    timeout: 8000,
                    speed: 1000,
                    fastOnEvent: 1,
                    pager: '#' + ui.bannerNavBlock.attr('id'),
                    pagerAnchorBuilder: function(idx, slide) { return '#' + ui.bannerNavBlock.attr('id') + ' a:eq(' + idx + ')'; },
                    fx: 'fade',
                    slideExpr: 'a'
                });
            } catch (e) {}

            bannerLoop = true;
        } else {
            try {
                ui.bannerBlock.cycle('resume');
            } catch (e) {}
        }

        manageBannerLoop(ui.bannerBlock);
    }

    function resizeTopBanners() {
        if (!ui.bannerTopBlock.length) return;

        if (bannerTopLoop) {
            try {
                ui.bannerTopBlock.cycle('pause');
            } catch (e) {}
        }

        if (!bannerTopLoop) {
            try {
                ui.bannerTopBlock.cycle({
                    timeout: 8000,
                    speed: 1000,
                    fastOnEvent: 1,
                    pager: '#' + ui.bannerNavBlock.attr('id'),
                    pagerAnchorBuilder: function(idx, slide) { return '#' + ui.bannerNavBlock.attr('id') + ' a:eq(' + idx + ')'; },
                    fx: 'fade',
                    slideExpr: 'a'
                });
            } catch (e) {}

            bannerTopLoop = true;
        } else {
            try {
                ui.bannerTopBlock.cycle('resume');
            } catch (e) {}
        }

        var parentBlockWidth = ui.bannerTopBlock.parent().width();
        var wp = ui.bannerTopBlock.width();
        if (parentBlockWidth != wp) {
            ui.bannerTopBlock.width(parentBlockWidth);
        }

        manageBannerLoop(ui.bannerTopBlock);
    }

    function appendToBannerBlock($element) {
        if (!$('a', $element).length) {
            var $img = $('<img>').attr('src', $element.attr('data-default-image')),
                $a = $('<a>').attr('href', $element.attr('data-default-href'));

            var reImg = /^data-img-/,
                reA = /^data-a-/;

            $.each($element[0].attributes, function() {
                var attrName = this.name;
                if (reImg.test(attrName)) {
                    $img.attr(attrName.replace(reImg, ''), this.value)
                } else if (reA.test(attrName)) {
                    $a.attr(attrName.replace(reA, ''), this.value)
                }
            });

            $a.append($img);
            $element.append($a);
        }
    }

    function initTopBanner() {
        if (!ui.bannerTopBlock.length) return;

        appendToBannerBlock(ui.bannerTopBlock);
        $('a', ui.bannerTopBlock).css('position', 'static');

        initBannerNav();
        resizeTopBanners();
        $(window).resize(resizeTopBanners);
    }

    function initBanners() {
        if (!ui.bannerBlock.length) return;

        appendToBannerBlock(ui.bannerBlock);

        initBannerNav();
        resizeBanners();
        $(window).resize(resizeBanners);
    }

    function initSidebarBanners() {
        if (!ui.sidebarBannerBlock.length) return;

        $('a', ui.sidebarBannerBlock).attr('target', '_blank');
    }

    function initLanguageSelector() {
        if (!ui.languageSelectorBlock.length) return;

        $('img', ui.languageSelectorBlock).click(function() {
            $('div', ui.languageSelectorBlock).toggle();
        });
		
		$(ui.languageSelectorBlock).keyup(function(e) {
			var $div = $(this).children('div');
			if (e.which == '13'){
				$div.toggle();
			}
		});

        $('a', ui.languageSelectorBlock).each(function() {
            $(this).click(function(evt) {
                evt.preventDefault();
                document.cookie = settings.languageCookieName + '=' + $(this).attr('data-language') + '; path=/';

                var v = getIEVersion();
                if (v > 0 && v < 9) { // http://support.microsoft.com/kb/178066
                    var a = document.createElement('a');
                    a.href = $(this).attr('data-href');
                    document.body.appendChild(a);
                    a.click();
                } else {
                    window.location = $(this).attr('data-href');
                }
            });
        });

        $(document).click(function(evt) {
            var $el = $(evt.target);
            if (!$el.parents().hasClass(ui.languageSelectorBlock.attr('class'))) {
                $('div', ui.languageSelectorBlock).hide();
            }
        });
    }

    function initPage() {
        // footer
        if (typeof($.colorbox) != 'undefined') {
            $('#cbx_booking').colorbox({href: '/cms/en/booking/privacy_policy .node', width: 900, height: 600});
            $('#cbx_booking1').colorbox({href: '/cms/ru/booking/privacy_policy .node', width: 900, height: 900});
			$('#cbx_booking2').colorbox({href: '/cms/zh/booking/privacy_policy .node', width: 900, height: 600});
        }

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
            if (typeof($.colorbox) != 'undefined') {
                var $div = $('#colorbox');
                $('#cbx_footer').colorbox({
                    inline: true,
                    href: '#call_form',
                    width: 550, height: 339,
                    initialWidth: 500, initialHeight: 263,
                    onOpen: function() {
                        $div.attr({
                            "aria-labelledby": "cboxTitle",
                            "aria-describedby": "cboxLoadedContent",
                            "tabindex": "0",
                            "aria-hidden": "false"
                        });
                    },
                    onComplete: function(){
                        $div.focus();
                    },
                    onClosed: function() {
                        $div.attr({
                            "aria-hidden": "true",
                            "tabindex": "-1"
                        })
                    }
                })
            }
        }
    }

    function init() {
        initIEWarning();
        initTopMenu();
        initTopBanner();
        initBanners();
        initSidebarBanners();
        initLanguageSelector();
        initBreakingNews();
        initProxyParamLinks();
        initPage();
    }

    module.init = function(options) {
        for (pr in options) {
            settings[pr] = options[pr];
        }

        if (settings.ui) {
            for (pr in settings.ui) {
                ui[pr] = settings.ui[pr];
            }
        }

        for (pr in ui) {
            ui[pr] = $(ui[pr]);
        }

        init();
    };

    return module;
}(jQuery));

/* start https://trac.com.spb.ru/afl_site/ticket/2204 */
(function($, undefined) {
    if (!$.colorbox) return;

    var _oldFunc = $.fn.colorbox.position;

    var func = function(speed, loadedCallback) {
        if (loadedCallback) {
            var $colorbox = $('#colorbox');
            $colorbox.find('#cboxNext').html(this.settings['next'] || '');
            $colorbox.find('#cboxPrevious').html(this.settings['previous'] || '');
            $colorbox.find('#cboxSlideshow').html(this.settings['slideshowStart'] || '');
        }
        _oldFunc.call(this, speed, loadedCallback);
    };

    $.fn.colorbox.position = $.colorbox.position = func;
})(jQuery);
/* end https://trac.com.spb.ru/afl_site/ticket/2204 */
