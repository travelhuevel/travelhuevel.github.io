'use strict';


var Menu = (function($) {
    var module = {};

    var settings = {
        topMenuDelay: 200,
        skipTopMenuFirstItem: false,
        activeItemIdx: -1
    };

    var ui = {
        menuBlock: '#topmenu',
        bookingBlock: '#bookingPanel'
    };

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

    function resizeTopMenu() {
        var pageWidth = $('body').width();
        if (pageWidth != parseInt(ui.menuBlock.attr('data-page-width'), 10)) {
            ui.menuBlock.attr('data-page-width', pageWidth);

            // remove zoom artefacts
            var $topLi = $('ul li', ui.menuBlock).not('ul li li', ui.menuBlock);
            var offset = $topLi.first().offset();
            var _offset = $topLi.last().offset();
            if(!_offset)
                return;
            if (_offset.top > offset.top) {
                var k = 1;
                while (true) {
                    ui.menuBlock.width(ui.menuBlock.width() + k);
                    _offset = $topLi.last().offset();
                    if (_offset.top <= offset.top) break;
                    k += 1;
                    if (k > 30) break;
                }
                ui.menuBlock.attr('data-outer-width', ui.menuBlock.outerWidth(true));
            }

            // position
            if (!ui.menuBlock.attr('data-outer-width')) {
                ui.menuBlock.attr('data-outer-width', ui.menuBlock.outerWidth(true));
            }

            var pageWidth = $('body').width();
            var menuWidth = parseInt(ui.menuBlock.attr('data-outer-width'), 10);

            var maxWidth = 1366;

            if ( pageWidth <= maxWidth ) {
                ui.menuBlock.addClass('center');
            } else {
                ui.menuBlock.removeClass('center');
            }

            if (pageWidth < menuWidth) {
                ui.menuBlock.addClass('right');
            } else {
                ui.menuBlock.removeClass('right');
            }
        }
    }

    function init() {
        if (!ui.menuBlock.length) return;
        if (!$('ul', ui.menuBlock).length) return;

        ui.menuBlock.attr('data-margin-left', parseInt(ui.menuBlock.css('marginLeft'), 10));
        ui.menuBlock.attr('data-skip-first-item', 0 + settings.skipTopMenuFirstItem);

        var $topLi = $('ul li', ui.menuBlock).not('ul li li', ui.menuBlock);

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

        ui.menuBlock.css('width', menuWidth + 1);

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

        if (settings.activeItemIdx >= 0){
            if (settings.activeItemIdx < $topLi.length) {
                var $li = $($topLi[settings.activeItemIdx]);
                $li.addClass('active-trail');
            }
            else {
                console.log(
                    'settings.activeItemIdx='+
                    settings.activeItemIdx+
                    ' should be less than '+$topLi.length);
            }
        }

        var panelBack = function() {
            if (!ui.bookingBlock.length) return;

            if (ui.bookingBlock.hasClass('closed')) {
                ui.menuBlock.addClass('foreground');
                if (!ui.bookingBlock.hasClass('statePad')) {
                    $('li', ui.menuBlock).first().css('visibility', 'hidden');
                }
            }
        };

        var panelForward = function() {
            ui.menuBlock.removeClass('foreground');
            $('li', ui.menuBlock).first().css('visibility', 'visible');
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

            // preload images
            $('i', $ul).each(function(i, el) {
                var bImg = $(el).css('backgroundImage');
            });

            timers[i] = 0;
            $(this).mouseenter(function() {
                if (new Date().getTime() - t < settings.topMenuDelay) {
                    $(this).addClass('hover');

                    panelBack();
                } else {
                    var _this = $(this);
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
