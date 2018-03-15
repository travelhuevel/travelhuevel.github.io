/**
 * Date: 27.01.14
 * Time: 19:01
 * Author: Bootstrap team
 * Plugin Popover. This plugin shows popover on hover event.
 * Based on Bootstrap ToolTip Plugin: http://getbootstrap.com/javascript/#tooltips
 *
 * Default settings:
 * animation=true        - Apply a CSS fade transition to the popover
 * placement='auto top'  - How to position the popover - top | bottom | left | right.
 * selector=false         - If a selector is provided, popover objects will be delegated to the specified targets.
 * title=''              - Default title value if data-title attribute isn't present.
 * content=''            - Default content value if data-content attribute isn't present.
 * html=false            - Insert HTML into the popover. If false, jQuery's text method will be
 *                         used to insert content into the DOM. Use text if you're worried about XSS attacks.
 * template='…'          - Template for popover. Does Not recommend to change.
 * container=false       - Appends the popover to a specific element. Example: container: 'body'.
 *                         This option is particularly useful in that it allows you to position the popover in
 *                         the flow of the document near the triggering element - which will prevent the popover
 *                         from floating away from the triggering element during a window resize
 * delay=0               - Delay showing and hiding the tooltip (ms). If a number is supplied, delay is applied to both hide/show
 *                         Object structure is: delay: { show: 500, hide: 100 }
 * trigger='hover'       - How tooltip is triggered - click or hover.
 */


(function ($) {
    "use strict";

    // POPOVER PUBLIC CLASS DEFINITION
    // ===============================

    var Popover = function (element, options) {
        this.type       = null;
        this.options    = null;
        this.enabled    = null;
        this.timeout    = null;
        this.hoverState = null;
        this.$element   = null;
        this.activePopups = {};
        this.activePopupTriggers = 0;
        this.init('popover', element, options);
    };

    Popover.DEFAULTS = {
        animation: true,
        placement: 'auto top',
        selector: false,
        template: '<div class="popover"><div class="popover-arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>',
        title: '',
        content: '',
        trigger: 'hover',
        delay: 0,
        html: false,
        container: false,
        viewport: {selector: 'body', padding: 0},
        disableClick: true,
        setAriaLabel: true
    };

    Popover.prototype.init = function (type, element, options) {
        var self = this;
        this.enabled = true;
        this.type = type;
        this.$element = $(element);
        this.options = this.getOptions(options);
        this.$viewport = this.options.viewport && $(this.options.viewport.selector || this.options.viewport);

        var $e = this.$element;
        var triggers = this.options.trigger.split(/,\s*/);
        $.each(triggers, function (index, trigger) {
            if (trigger == 'click') {
                self.$element.on('click.' + self.type, $.proxy(self.toggle, self));
                $(document).on('click.' + self.type, function(e) {
                    $e.each(function () {
                        //the 'is' for buttons that trigger popups
                        //the 'has' for icons within a button that triggers a popup
                        if (!$(self).is(e.target) && $(self).has(e.target).length === 0 && $('.popover').has(e.target).length === 0) {
                            $(self).popover('fadeOut');
                        }
                    })
                })
            } else if (trigger == 'focus') {
                self.$element.on('focusin.' + self.type, $.proxy(self.enter, self, 'focus'));
                self.$element.on('focusout.' + self.type, $.proxy(self.leave, self, 'focus'));
            } else if (trigger == 'hover') {
                self.$element.on('mouseenter.' + self.type, $.proxy(self.enter, self, 'hover'));
                self.$element.on('mouseleave.' + self.type, $.proxy(self.leave, self, 'hover'));
            } else {
                throw new Error("Unknown trigger: " + trigger);
            }
        });
        if (this.options.disableClick) {
            this.$element.click(function () {
                // Stop click event
                return false;
            });
        }
        this.options.selector ? (this._options = $.extend({}, this.options, {selector: ''})) : this.fixTitle();
        this.updateAriaLabel();
    };

    Popover.prototype.updateAriaLabel = function () {
        if (this.options.setAriaLabel) {
            var ariaLabel = this.getContent().replace(/(<([^>]+)>)/ig, ' ').replace(/\s\s+/g, ' ');
            this.$element.attr('aria-label', ariaLabel);
        }
    };

    Popover.prototype.getDefaults = function () {
        return Popover.DEFAULTS
    };

    Popover.prototype.getOptions = function (options) {
        options = $.extend({}, this.getDefaults(), this.$element.data(), options);

        if (options.delay && typeof options.delay == 'number') {
            options.delay = {show: options.delay,
                             hide: options.delay}
        }

        return options
    };

    Popover.prototype.getDelegateOptions = function () {
        var options = {};
        var defaults = this.getDefaults();

        this._options && $.each(this._options, function (key, value) {
            if (defaults[key] != value) options[key] = value
        });

        return options
    };

    Popover.prototype.enter = function(trigger, obj) {
        if (trigger && obj === undefined) {
            obj = trigger;
            trigger = undefined;
        }
        var self = obj instanceof this.constructor ?
            obj : $(obj.currentTarget)[this.type](this.getDelegateOptions()).data('bs.' + this.type);

        if (trigger) {
            if (self.activePopups[trigger]) {
                return;
            } else {
                self.activePopups[trigger] = true;
            }
        }

        clearTimeout(self.timeout);

        self.hoverState = 'in';

        if (!self.options.delay || !self.options.delay.show) return self.show();

        self.timeout = setTimeout(function () {
            if (self.hoverState == 'in') self.show()
        }, self.options.delay.show)
    };

    Popover.prototype.leave = function(trigger, obj) {
        if (trigger && obj === undefined) {
            obj = trigger;
            trigger = undefined;
        }
        var self = obj instanceof this.constructor ?
            obj : $(obj.currentTarget)[this.type](this.getDelegateOptions()).data('bs.' + this.type);

        clearTimeout(self.timeout);

        self.hoverState = 'out';

        if (trigger) {
            if (self.activePopups[trigger]) {
                self.activePopups[trigger] = false;
            } else {
                return;
            }
        }

        if ((!self.options.delay || !self.options.delay.hide) && self.activePopupTriggers == 0) return self.hide();

        self.timeout = setTimeout(function () {
            if (self.hoverState == 'out' && self.activePopupTriggers === 0) self.hide()
        }, self.options.delay.hide)
    };

    Popover.prototype.show = function () {
        self.activePopupTriggers++;
        if (self.activePopupTriggers > 1) return;

        var e = $.Event('show.bs.' + this.type);

        if (this.hasData() && this.enabled) {
            if (e.isDefaultPrevented()) return;

            var $ppover = this.ppover();
            this.setData();
            if (this.options.animation) $ppover.addClass('fade');

            var placement = typeof this.options.placement == 'function' ?
                this.options.placement.call(this, $ppover[0], this.$element[0]) :
                this.options.placement;

            var autoToken = /\s?auto?\s?/i;
            var autoPlace = autoToken.test(placement);
            if (autoPlace) placement = placement.replace(autoToken, '') || 'top';

            $ppover.detach().css({top: 0, left: 0, display: 'block'}).addClass(placement);

            this.options.container ? $ppover.appendTo(this.options.container) : $ppover.insertAfter(this.$element);

            var pos = this.getPosition();
            var actualWidth = $ppover[0].offsetWidth;
            var actualHeight = $ppover[0].offsetHeight;

            if (autoPlace) {
                var $parent = this.$element.parent();

                var orgPlacement = placement;
                var docScroll = document.documentElement.scrollTop || document.body.scrollTop;
                var parentWidth = this.options.container == 'body' ? window.innerWidth : $parent.outerWidth();
                var parentHeight = this.options.container == 'body' ? window.innerHeight : $parent.outerHeight();
                var parentLeft = this.options.container == 'body' ? 0 : $parent.offset().left;

                placement = placement == 'bottom' && pos.top   + pos.height  + actualHeight - docScroll > parentHeight  ? 'top'    :
                            placement == 'top'    && pos.top   - docScroll   - actualHeight < 0                         ? 'bottom' :
                            placement == 'right'  && pos.right + actualWidth > parentWidth                              ? 'left'   :
                            placement == 'left'   && pos.left  - actualWidth < parentLeft                               ? 'right'  :
                            placement;

                $ppover.removeClass(orgPlacement).addClass(placement)
            }
            var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight);
            this.applyPlacement(calculatedOffset, placement);
        }
    };

    Popover.prototype.getViewportAdjustedDelta = function (placement, pos, actualWidth, actualHeight) {
        var delta = {top: 0, left: 0};
        if (!this.$viewport) return delta;

        var viewportPadding = this.options.viewport && this.options.viewport.padding || 0;
        var viewportDimensions = this.getPosition(this.$viewport);

        if (/right|left/.test(placement)) {
            var topEdgeOffset = pos.top - viewportPadding - viewportDimensions.scroll;
            var bottomEdgeOffset = pos.top + viewportPadding - viewportDimensions.scroll + actualHeight;
            if (topEdgeOffset < viewportDimensions.top) { // top overflow
                delta.top = viewportDimensions.top - topEdgeOffset
            } else if (bottomEdgeOffset > viewportDimensions.top + viewportDimensions.height) { // bottom overflow
                delta.top = viewportDimensions.top + viewportDimensions.height - bottomEdgeOffset
            }
        } else {
            var leftEdgeOffset = pos.left - viewportPadding;
            var rightEdgeOffset = pos.left + viewportPadding + actualWidth;
            if (leftEdgeOffset < viewportDimensions.left) { // left overflow
                delta.left = viewportDimensions.left - leftEdgeOffset
            } else if (rightEdgeOffset > viewportDimensions.width) { // right overflow
                delta.left = viewportDimensions.left + viewportDimensions.width - rightEdgeOffset
            }
        }
        return delta
    };

    Popover.prototype.applyPlacement = function (offset, placement) {
        var replace;
        var $ppover = this.ppover();
        var width = $ppover[0].offsetWidth;
        var height = $ppover[0].offsetHeight;

        // manually read margins because getBoundingClientRect includes difference
        var marginTop = parseInt($ppover.css('margin-top'), 10);
        var marginLeft = parseInt($ppover.css('margin-left'), 10);

        // we must check for NaN for ie 8/9
        if (isNaN(marginTop))  marginTop = 0;
        if (isNaN(marginLeft)) marginLeft = 0;

        offset.top = offset.top + marginTop;
        offset.left = offset.left + marginLeft;

        $ppover.offset(offset).addClass('in');

        // check to see if placing ppover in new offset caused the ppover to resize itself
        var actualWidth = $ppover[0].offsetWidth;
        var actualHeight = $ppover[0].offsetHeight;

        if (placement == 'top' && actualHeight != height) {
            offset.top = offset.top + height - actualHeight
        }

        var delta = this.getViewportAdjustedDelta(placement, offset, actualWidth, actualHeight);

        delta.left ? offset.left += delta.left : offset.top += delta.top;
        var isVertical = /top|bottom/.test(placement),
            arrowDelta = isVertical ? delta.left * 2 - width + actualWidth : delta.top * 2 - height + actualHeight,
            arrowOffsetPosition = isVertical ? 'offsetWidth' : 'offsetHeight';

        $ppover.offset(offset);
        this.replaceArrow(arrowDelta, $ppover[0][arrowOffsetPosition], isVertical);
    };

    Popover.prototype.replaceArrow = function (delta, dimension, isHorizontal) {
        this.arrow().css(isHorizontal ? 'left' : 'top', 50 * (1 - delta / dimension) + '%')
            .css(isHorizontal ? 'top' : 'left', '')
    };

    Popover.prototype.setData = function () {
        var $ppover = this.ppover();
        var title = this.getTitle();
        var content = this.getContent();
        if (title) {
            $ppover.find('.popover-title')[this.options.html ? 'html' : 'text'](title).css('display', 'block');
        }
        $ppover.find('.popover-content')[this.options.html ? 'html' : 'text'](content);
        $ppover.removeClass('fade in top bottom left right');
        this.updateAriaLabel();
    };

    Popover.prototype.hide = function () {
        if (self.activePopupTriggers == 0) return this;
        self.activePopupTriggers--;

        var that = this;
        var $ppover = this.ppover();
        var e = $.Event('hide.bs.' + this.type);

        function complete() {
            if (that.hoverState != 'in' && that.activePopupTriggers == 0) $ppover.detach()
        }

        if (e.isDefaultPrevented()) return;

        $ppover.removeClass('in');

        $.support.transition && this.$ppover.hasClass('fade') ?
            $ppover.one($.support.transition.end, complete).emulateTransitionEnd(150) : complete();
        return this
    };

    Popover.prototype.fixTitle = function () {
        var $e = this.$element;
        if ($e.attr('title') || typeof($e.attr('data-title')) != 'string') {
            $e.attr('data-title', $e.attr('title') || '').attr('title', '')
        }
    };

    Popover.prototype.hasData = function () {
        return this.getContent()
    };

    Popover.prototype.getPosition = function ($element) {
        $element = $element || this.$element;

        var el = $element[0],
            isBody = el.tagName == 'BODY',
            elRect = el.getBoundingClientRect();

        if (elRect.width == null) {
            elRect = $.extend({}, elRect, {width: elRect.right - elRect.left, height: elRect.bottom - elRect.top})
        }

        var elOffset = isBody ? {top: 0, left: 0} : $element.offset(),
            scroll = {scroll: isBody ? document.documentElement.scrollTop || document.body.scrollTop : $element.scrollTop()},
            outerDims = isBody ? {width: $(window).width(), height: $(window).height()} : null;

        return $.extend({}, elRect, scroll, outerDims, elOffset)
    };

    Popover.prototype.getCalculatedOffset = function (placement, pos, actualWidth, actualHeight) {
        return placement == 'bottom' ? {top: pos.top + pos.height, left: pos.left + pos.width / 2 - actualWidth / 2} :
               placement == 'top' ? {top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2} :
               placement == 'left' ? {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth} :
                    /* placement == 'right' */ {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width}
    };

    Popover.prototype.getTitle = function () {
        var title;
        var $e = this.$element;
        var o = this.options;
        title = $e.attr('data-title') || (typeof o.title == 'function' ? o.title.call($e[0]) : o.title);
        return title
    };
    Popover.prototype.getContent = function () {
        var content;
        var $e = this.$element;
        var o = this.options;
        content = $e.attr('data-content') || (typeof o.content == 'function' ? o.content.call($e[0]) : o.content);

        return content
    };

    Popover.prototype.ppover = function () {
        return this.$ppover = this.$ppover || $(this.options.template)
    };

    Popover.prototype.arrow = function () {
        return this.$arrow = this.$arrow || this.ppover().find('.popover-arrow')
    };

    Popover.prototype.validate = function () {
        if (!this.$element[0].parentNode) {
            this.hide();
            this.$element = null;
            this.options = null
        }
    };

    Popover.prototype.enable = function () {
        this.enabled = true
    };

    Popover.prototype.disable = function () {
        this.enabled = false
    };

    Popover.prototype.toggleEnabled = function () {
        this.enabled = !this.enabled
    };

    Popover.prototype.toggle = function (e) {
        var self = e ? $(e.currentTarget)[this.type](this.getDelegateOptions()).data('bs.' + this.type) : this;
        self.ppover().hasClass('in') ? self.leave(self) : self.enter(self)
    };

    Popover.prototype.fadeOut = function (e) {
        var self = e ? $(e.currentTarget)[this.type](this.getDelegateOptions()).data('bs.' + this.type) : this;
        if (self.ppover().hasClass('in')) {
            self.leave(self)
        }
    };

    Popover.prototype.destroy = function (removeHtml) {
        $(document).off('.' + self.type);
        this.hide().$element.off('.' + this.type).removeData('bs.' + this.type);
        if (removeHtml && this.$ppover.length) {
            this.$ppover.remove();
        }
    };

    // POPOVER PLUGIN DEFINITION
    // =========================

    var old = $.fn.popover;

    $.fn.popover = function (option) {
        return this.each(function () {
            var $this = $(this);
            var data = $this.data('bs.popover');
            var options = typeof option == 'object' && option;

            if (!data) $this.data('bs.popover', (data = new Popover(this, options)));
            if (typeof option == 'string') data[option]()
        })
    };

    $.fn.popover.Constructor = Popover;


    // POPOVER NO CONFLICT
    // ===================

    $.fn.popover.noConflict = function () {
        $.fn.popover = old;
        return this
    }

})(jQuery);
