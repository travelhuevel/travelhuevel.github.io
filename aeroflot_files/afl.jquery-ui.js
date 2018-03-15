String.prototype.fmt = function(kwargs) {
    return this.replace(/\${(\w+)}/g, function(match, name) {
        return kwargs[name] !== undefined ? kwargs[name] : match;
    });
};

/*
    Глобальные события
 */

(function($, undefined) {
    if (!$.datepicker) return;

    var PROP_NAME = 'datepicker';

    /*
        Генерирование id элемента в стиле datepicker
     */
    $.datepicker._checkElementId = function (target) {
        if (!target.id) target.id = 'dp' + ++this.uuid;
    };

    /*
        Добавлена опция customButton
     */
    $.datepicker._attachments = function (input, inst) {
        var appendText = this._get(inst, 'appendText'),
            isRTL = this._get(inst, 'isRTL');

        if (inst.append) inst.append.remove();

        if (appendText) {
            inst.append = $('<span class="' + this._appendClass + '">' + appendText + '</span>');
            input[isRTL ? 'before' : 'after'](inst.append);
        }

        input.unbind('focus', this._showDatepicker);

        var customButton = this._get(inst, 'customButton'),
            showOn = this._get(inst, 'showOn');

        if (inst.trigger.length > 0 && customButton) return;
        if (inst.trigger) inst.trigger.remove();

        if (showOn === 'focus' || showOn === 'both') input.focus(this._showDatepicker);
        if (showOn === 'button' || showOn === 'both') {
            if ($.isFunction(customButton)) {
                inst.trigger = customButton.call(input);
            } else if ($.type(customButton) === 'string') {
                inst.trigger = $(customButton);
                input.after(inst.trigger);
            } else {
                var buttonText = this._get(inst, 'buttonText'),
                    buttonImage = this._get(inst, 'buttonImage');
                inst.trigger = $(this._get(inst, 'buttonImageOnly')
                    ? $('<img/>').addClass(this._triggerClass).attr({ src: buttonImage, alt: buttonText, title: buttonText })
                    : $('<button type="button"></button>').addClass(this._triggerClass).html(
                        !buttonImage ? buttonText : $('<img/>').attr({ src: buttonImage, alt: buttonText, title: buttonText })
                    )
                );
                input[isRTL ? 'before' : 'after'](inst.trigger);
            }

            inst.trigger.click(function () {
                if ($.datepicker._datepickerShowing && $.datepicker._lastInput === input[0]) {
                    $.datepicker._hideDatepicker();
                } else if ($.datepicker._datepickerShowing && $.datepicker._lastInput !== input[0]) {
                    $.datepicker._hideDatepicker();
                    $.datepicker._showDatepicker(input[0]);
                } else {
                    $.datepicker._showDatepicker(input[0]);
                }
                return false;
            });
        }
    };

    /*
        Заменен вызов на _checkElementId
    */
    $.datepicker._attachDatepicker = function(target, settings) {
        var nodeName = target.nodeName.toLowerCase(),
            inline = nodeName === 'div' || nodeName === 'span';

        this._checkElementId(target);

        var inst = this._newInst($(target), inline);
        inst.settings = $.extend({}, settings || {});

        if (nodeName === 'input') {
            this._connectDatepicker(target, inst);
        } else if (inline) {
            this._inlineDatepicker(target, inst);
        }
    };

    /*
        Добавлена опция syncFromAltField
    */
    $.datepicker._connectDatepicker = function(target, inst) {
        var input = $(target);

        inst.append = $();
        inst.trigger = $();

        if (input.hasClass(this.markerClassName)) return;

        this._attachments(input, inst);
        input.addClass(this.markerClassName)
            .keydown(this._doKeyDown)
            .keypress(this._doKeyPress)
            .keyup(this._doKeyUp);

        var altField = this._get(inst, 'altField'),
            syncFromAltField = this._get(inst, 'syncFromAltField');

        if (altField && syncFromAltField) {
            $(altField).change(function(event) {
                $.datepicker._setDate(inst, event.target.value, true);
                $.datepicker._updateDatepicker(inst);
                $.datepicker._updateAlternate(inst);
            });
        }

        this._autoSize(inst);
        $.data(target, PROP_NAME, inst);

        //If disabled option is true, disable the datepicker once it has been attached to the input (see ticket #5665)
        if (inst.settings.disabled) this._disableDatepicker(target);
    };

    /*
        Добавлена опция altFieldEvents
    */
    $.datepicker._updateAlternate = function(inst) {
        var altField = this._get(inst, 'altField');

        if (altField) {
            var altFormat = this._get(inst, 'altFormat') || this._get(inst, 'dateFormat'),
                date = this._getDate(inst),
                dateStr = this.formatDate(altFormat, date, this._getFormatConfig(inst)),
                altFieldEvents = this._get(inst, 'altFieldEvents');

            $(altField).each(function() {
                var $this = $(this);
                $this.val(dateStr);
                if (typeof altFieldEvents === 'string') {
                    $.each(altFieldEvents.split(' '), function() { $this.trigger(this); });
                }
            });
        }
    };
})(jQuery);

(function($) {
    if (!$.datepicker) return;

    var PROP_NAME = 'afl.aflButtonDatepicker',
        PREFIX = 'afl_dp';

    var CLASSES = {
        container: 'dp_container',
        _container: '.dp_container',
        control: 'dp_control',
        _control: '.dp_control',
        button_container: 'dp_button_container',
        _button_container: '.dp_button_container'
    };

    var TEMPLATE =
        ('<div class="${container}">' +
            '<div class="${control}">' +
                '<span class="${button_container}">' +
                    '<label style="display: none;"></label>' +
                    '<input type="button" tabindex="-1" aria-hidden="true"/>' +
                '</span>' +
            '</div>' +
        '</div>').fmt(CLASSES);

    var DEFAULTS = {
        ariaLabelText: 'Day. Month. Year',
        inputLabelText: 'Calendar',
        altFieldEvents: 'focusout',
        buttonPostfix: '_btn',
        inputMask: false,
        tooltip: false
    };

    var DP_DEFAULTS = {
        dateFormat: 'dd.mm.yy',
        firstDay: 1,
        showOn: 'button',
        customButton: function() { return this.parent(CLASSES._button_container); },
        syncFromAltField: true
    };

    var AflButtonDatepicker = function(element, options) {
        this.element = element;
        this.$element = $(element);
        this.options = $.extend({}, DEFAULTS, options, this.optFromData());
        this.init();
    };

    AflButtonDatepicker.prototype.optFromData = function() {
        var re = new RegExp('^(' + PREFIX + ')(.)'),
            result = this.$element.data('json') || {};

        $.each(this.$element.data(), function(key, value) {
            if (key.indexOf(PREFIX) === 0) {
                key = key.replace(re, function(m, p1, p2) { return p2.toLowerCase(); });
                result[key] = value;
            }
        });

        return result;
    };

    AflButtonDatepicker.prototype.init = function() {
        $.datepicker._checkElementId(this.element);

        var options = $.extend({}, this.options, DP_DEFAULTS, { altField: '#' + this.element.id });

        this.$control = this.$element.parent(CLASSES._control);

        if (this.$control.length == 0) {
            // generate elements
            this.$container = $(TEMPLATE);
            this.$control = this.$container.children(CLASSES._control);

            // insert elements
            this.$container.insertAfter(this.$element);
            this.$element.prependTo(this.$control);
        } else {
            this.$container = this.$control.parent(CLASSES._container).attr('data-html-existed', true);
        }

        this.$buttonContainer = this.$control.children(CLASSES._button_container);
        this.$label = this.$buttonContainer.children('label');
        this.$button = this.$buttonContainer.children('input');

        // init attributes
        var buttonId = this.element.id + this.options.buttonPostfix;

        if (!this.$element.attr('aria-label')) {
            this.$element.attr('aria-label', this.options.ariaLabelText);
        }
        this.$button.attr('id', buttonId);
        this.$label.text(this.options.inputLabelText).attr('for', buttonId);
        if (this.options.tooltip) {
            this.$button.attr('data-title', this.options.inputLabelText).createTooltip();
        }
        if (this.options.inputMask && $.fn.inputmask) {
            this.$element.inputmask('dd.mm.yyyy', { placeholder: '_' });
        }
        this.$element.attr('data-button-field', this.$button[0].id);
        this.$button.attr('data-main-field', this.element.id).val(this.element.value).datepicker(options);
    };

    AflButtonDatepicker.prototype.getButton = function() {
        return this.$button;
    };

    $.fn.aflButtonDatepicker = function(option) {
        var args = Array.prototype.slice.call(arguments),
            result;

        this.each(function() {
            var $this = $(this),
                data = $this.data(PROP_NAME),
                settings = $.type(option) === 'object' && option;

            if (!data) {
                $this.data(PROP_NAME, (data = new AflButtonDatepicker(this, settings)));
                data.getButton().data(PROP_NAME, data);
            }

            if ($.type(option) === 'string') {
                var methodName = '_' + option + 'Datepicker',
                    $input = data.getButton();

                if ($.inArray(option, ['widget', 'getDate', 'widget']) >= 0 || option === 'option' && args.length === 2) {
                    result = $input.datepicker.apply($input, args);
                    return false;
                } else {
                    data[option] ? data[option]() : $input.datepicker.apply($input, args);
                }
            }
        });

        return $.type(result) !== 'undefined' ? result : this;
    };
    $.fn.aflButtonDatepicker.constructor = AflButtonDatepicker;

    function getData(element) {
        return $(element).data(PROP_NAME);
    }

    $.aflButtonDatepicker = {
        propName: PROP_NAME,
        getData: getData,
        getInst: function(element) {
            return getData(element).getButton().data('datepicker');
        },
        setDefaults: function(options) {
            $.extend(DEFAULTS, options);
        }
    }
})(jQuery);

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

(function($, undefined) {
    if (!$.validator) return;

	$.validator.prototype.init = function() {
        this.labelContainer = $(this.settings.errorLabelContainer);
        this.errorContext = this.labelContainer.length && this.labelContainer || $(this.currentForm);
        this.containers = $(this.settings.errorContainer).add( this.settings.errorLabelContainer );
        this.submitted = {};
        this.pendingRequest = 0;
        this.pending = {};
        this.invalid = {};
        this.reset();

        var groups = (this.groups = {});
        $.each(this.settings.groups, function(key, value) {
            if (typeof value === 'string') value = value.split(/\s/);
            $.each(value, function( index, name ) { groups[name] = key; });
        });

        var rules = this.settings.rules;
        $.each(rules, function(key, value) { rules[key] = $.validator.normalizeRule(value); });

        function delegate(event) {
            var validator = $.data(this[0].form, 'validator'),
                eventType = 'on' + event.type.replace(/^validate/, ''),
                settings = validator.settings;
            if ( settings[eventType] && !this.is( settings.ignore ) ) {
                settings[eventType].call(validator, this[0], event);
            }
        }
        $(this.currentForm)
            .validateDelegate(":text, [type='password'], [type='file'], select, textarea, " +
                "[type='number'], [type='search'] ,[type='tel'], [type='url'], " +
                "[type='email'], [type='datetime'], [type='date'], [type='month'], " +
                "[type='week'], [type='time'], [type='datetime-local'], " +
                "[type='range'], [type='color'] ",
                "focusin focusout keyup", delegate)
            .validateDelegate("[type='radio'], [type='checkbox'], select, option", "click", delegate);

        if (this.settings.invalidHandler) $(this.currentForm).bind('invalid-form.validate', this.settings.invalidHandler);
        $(this.currentForm).find('[required], [data-rule-required], .required').not('[type="checkbox"]').attr('aria-required', true);
    };

	$.validator.prototype.reset = function() {
        this.successList = [];
        this.successParameters = {};
        this.errorList = [];
        this.errorMap = {};
        this.errorParameters = {};
        this.toShow = $([]);
        this.toHide = $([]);
        this.formSubmitted = false;
        this.currentElements = $([]);
        this.resetList = [];
    };

    $.validator.prototype.idOrName = function(element) {
        var customName = $(element).attr('data-custom-name');
        return customName || this.groups[element.name] || (this.checkable(element) ? element.name : element.id || element.name);
    };

    $.validator.prototype.showLabel = function(element, message) {
        var $element = $(element),
            $label = this.errorsFor(element);

        if ($label.length) {
            $label.removeClass(this.settings.validClass).addClass(this.settings.errorClass);
            $label.html(message);
        } else {
            $label = $('<' + this.settings.errorElement + '>')
                .attr('for', this.idOrName(element))
                .addClass(this.settings.errorClass)
                .html(message || '');

            if (this.settings.wrapper) {
                $label = $label.hide().show().wrap('<' + this.settings.wrapper + '/>').parent();
            }
            if (!this.labelContainer.append($label).length) {
                if (this.settings.errorPlacement) {
                    this.settings.errorPlacement($label, $element);
                } else {
                    $label.insertAfter(element);
                }
            }
        }

        var idOrName = this.idOrName(element),
            errorTextId = idOrName + '_error_text';

        $label.attr('id', errorTextId);
        if (message){
            var ariaDesc = $element.attr('aria-describedby') || '';
            if (-1 == ariaDesc.indexOf(errorTextId))
                ariaDesc = errorTextId + ' ' + ariaDesc;
            $element.attr({ 'aria-describedby': ariaDesc, 'aria-invalid': true });
        }

        if (!message && this.settings.success) {
            $label.text('');
            if (typeof this.settings.success === 'string') {
                $label.addClass( this.settings.success );
            } else {
                var parameters = this.successParameters[element.name];
                this.settings.success.call(this, $label, element, parameters);
            }
        }
        this.toShow = this.toShow.add($label);
    };
})(jQuery);

(function($, undefined) {
    var loaderClass = 'resultloader',
        busyAttr = 'aria-busy',
        uuidCounter = new Date().getTime();

    var DEFAULTS = {
        attributes: {},
        doNotEmpty: false
    };

    $.fn.showLoader = function(options) {
        options = $.extend({}, DEFAULTS, options);

        return this.each(function() {
            if (!this.id) this.id = 'content' + ++uuidCounter;
            var $loader = $('<div/>')
                .attr(options['attributes'])
                .addClass(loaderClass)
                .attr('aria-describedby', this.id)
                .attr('role', 'progressbar');

            var $this = $(this);
            $this.attr(busyAttr, 'true');
            options['doNotEmpty'] !== true && $this.empty();
            $this.append($loader);
        });
    };

    $.fn.hideLoader = function() {
        this.removeAttr(busyAttr).find('.' + loaderClass).remove();
    };

    $.fn.hasLoader = function() {
        return this.find('.' + loaderClass).length > 0;
    }
})(jQuery);
