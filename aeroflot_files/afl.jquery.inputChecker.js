/* global jQuery */

(function($) {
    'use strict';

    var PROP_NAME = 'aflcab.inputChecker',
        DATA_PREFIX = 'ic';

    var REGEXP_ALIAS = {
        latinPersonName: 'latin,whitespace,hyphen,apostrophe',
        cyrillicPersonName: 'cyrillic,whitespace,hyphen,apostrophe',
        jobTitle: 'latin,cyrillic,whitespace,hyphen,comma,dot,apostrophe'
    };

    var DEFAULTS = {
        rule: '',
        chars: '',
        uppercase: false,
        trim: true,
        regexp: {
            cyrillic: 'А-Яа-яЁё',
            latin: 'A-Za-z',
            digit: '0-9',
            whitespace: '\\s',
            nonWhitespace: '\\S',
            hyphen: '\\-',
            quotes: '"',
            apostrophe: "'",
            comma: ',',
            dot: '\\.'
        }
    };

    var InputChecker = function(element, options) {
        this.$element = $(element);
        this.options = $.extend(true, {}, DEFAULTS, options, this.optFromData());
        this.re = null;
        this.init();
    };

    InputChecker.prototype.optFromData = function() {
        var prefix = 'data-' + DATA_PREFIX,
            re = new RegExp('^(' + prefix + ')\-(.)'),
            result = {};

        $.each(this.$element.getAttrs(), function(key, value) {
            if (key.indexOf(prefix) === 0) {
                key = key.replace(re, function(m, p1, p2) { return p2; });
                result[key] = value;
            }
        });

        return result;
    };

    InputChecker.prototype.hasInvalidChars = function(value) {
        return this.re && value.match(this.re);
    };

    InputChecker.prototype.onEvent = function(e) {
        var target = e.currentTarget,
            value = target.value;

        if (this.hasInvalidChars(value)) value = value.replace(this.re, '');
        if (this.options.trim && e.type === 'change') value = $.trim(value);
        if (this.options.uppercase) value = value.toUpperCase();

        if (value !== target.value) target.value = value;
    };

    InputChecker.prototype.getRegexp = function() {
        if (this.options.chars) {
            this.re = new RegExp('[^' + this.options.chars + ']', 'g');
        } else if (this.options.rule) {
            var options = this.options,
                result = [],
                rules = options.rule.split(',');

            $.each(rules, function () {
                var exactRules = REGEXP_ALIAS[this] ? REGEXP_ALIAS[this].split(',') : [this];
                $.each(exactRules, function () {
                    var value = options.regexp[this];
                    value && result.indexOf(value) < 0 && result.push(value);
                });
            });

            if (result.length) {
                var stringRe = result.join('');
                this.re = new RegExp('[^' + stringRe + ']', 'g');
            }
        }
    };

    InputChecker.prototype.init = function() {
        this.getRegexp();
        this.$element.bind('keyup paste change', $.proxy(this.onEvent, this));
    };

    InputChecker.prototype.reload = function() {
        this.options = $.extend(this.options, this.optFromData());
        this.getRegexp();
    };

    var Plugin = function(option) {
        return this.each(function() {
            var $this = $(this),
                data = $this.data(PROP_NAME),
                settings = typeof option == 'object' && option;

            if (!data) $this.data(PROP_NAME, (data = new InputChecker(this, settings)));
            if (typeof option == 'string') data[option]();
        });
    };

    $.fn.inputChecker = Plugin;
    $.fn.inputChecker.constructor = InputChecker;

    $.fn.initAllInputCheckers = function(option) {
        var selector = '[data-{0}-rule], [data-{0}-chars]'.fmtByArgs(DATA_PREFIX);
        Plugin.call(this.find(selector), option);
        return this;
    }
})(jQuery);
