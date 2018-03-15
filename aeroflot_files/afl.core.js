/* global $, jQuery */
/* global __LK_CURRENT_LANG__, __LK_AJAX_URLS__, __LK_LOCALES__, __LK_PARAMS__, __LK_PAGE_TIMESTAMP__ */

String.prototype.fmtByArgs = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
        return args[number] !== undefined ? args[number] : match;
    });
};

String.prototype.fmtByKwArgs = function(kw) {
    return this.replace(/{(\w+)}/g, function(match, word) {
        return kw[word] !== undefined ? kw[word] : match;
    });
};

String.prototype.toSnakeCase = function(){
	return this.replace(/\.?([A-Z])/g, function(s) {
	    return '_' + s.toLowerCase()
	}).replace(/^_/, '');
};

function lang() {
    return __LK_CURRENT_LANG__.toLowerCase();
}

function _(message) {
    return __LK_LOCALES__[message] || message;
}

function url(url) {
    return __LK_AJAX_URLS__[url];
}

function param(name) {
    return __LK_PARAMS__[name];
}

function timeForRequest() {
    var timeout = param('validator_services.response_timeout') * 1000,
        diffTime = Date.now() - __LK_PAGE_TIMESTAMP__;
    return timeout - diffTime;
}

function extend(child, parent, onlyPrototype) {
    onlyPrototype = onlyPrototype || true;

    for (var key in parent) {
        if (parent.hasOwnProperty(key)) child[key] = parent[key];
    }

    if (onlyPrototype) {
        var temp = function() {};
        temp.prototype = parent.prototype;
        child.prototype = new temp();
    } else {
        child.prototype = new parent();
    }

    child.prototype.constructor = child;
    child.__super__ = parent.prototype;

    return child;
}

function jsonCompare(firstObject, secondObject) {
    return JSON.stringify(firstObject) === JSON.stringify(secondObject);
}

function waitForCheckRequest(func, element, control){
    return function() {
        var timeout = timeForRequest();
        var options = {
            'elementWidth': $(element).width(),
            'elementHeight': $(element).height(),
            'left':'24%',
            'paddingTop': $(control).height() - $(element).height()
        };
        var error_msg = $(control).find('.error_messages');
        if (error_msg) 
            options['paddingTop'] -= $(error_msg).height();

        var loader_class = 'loader i-loader';
        // опции для контрола телефонов
        if ($(control).css('position') == 'relative'){
            options['top'] = '0px';
            options['left'] = '21%';
            options['addLoaderInside'] = true;
        }
        else{
            var btn = $(element).closest('.field_box').find('.icon-button');
            if ((btn).length)
                $(btn).addClass(loader_class);
        }

        var that = this,
            args = arguments,
            loader;

        if (timeout > 0){
            $(element).setDisable();
            loader = new _requestLoader(control, options);
        }

        setTimeout(function() {
            $(element).setEnable();
            var result = func.apply(that, args);
            if (btn) $(btn).removeClass(loader_class);
            if (loader) loader.remove();            
            return result 
           }, timeout);

        return 'pending';
    }
}

function _requestLoader (el, options) {
    var defaults = {
        duration        : 800,
        opacity         : 0.7,
        elementWidth    : 0,
        elementHeight   : 0,
        left            : 0,
        paddingTop      : 0,
        addLoaderInside :false
    };
    this.options = jQuery.extend(defaults, options);
    this.container = $(el);

    this.init = function() {
        var container = this.container;
        this.removeCur(); 
        var overlay_css = {
                'opacity': this.options.opacity,
                'width': this.options.elementWidth,
                'height': this.options.elementHeight,
                'position':'absolute',
                'z-index': 99999,
                'left': this.options.left,
                'padding-top': this.options.paddingTop
        };
        if (this.options.top)
            overlay_css['top'] = this.options.top;

        var request_loader_class = 'request_loader';
        if (this.options.addLoaderInside)
            request_loader_class ='request_loader_pic';

        var overlay = $('<div></div>').css(overlay_css).addClass('request_overlay');
        container.prepend(
            overlay.append(
                $('<div></div>').addClass(request_loader_class)
            ).fadeIn(this.options.duration)
        );
    };

    this.removeCur = function(){
        var overlay = this.container.children(".request_overlay");
        if (overlay.length)
            overlay.remove();
    };
    
    this.remove = function(){
        var overlay = $(".request_overlay");
        if (overlay.length)
            overlay.remove();
    };

    this.init();
}

function remoteCheck(validator, route, fields, options) {
    var form = validator.currentForm,
        data = {};

    options = options || {};
    if (!$.isArray(fields)) fields = [fields];

    $.each(fields, function(i, name) {
        var value = form[name].value,
            placeholder = $(form[name]).inputmask('option', 'placeholder'),
            incorrect = placeholder && value.indexOf(placeholder) >= 0;

        if (value && !incorrect) {
            var remoteParams = validator.remoteCheckParams(form[name]);
            if (remoteParams) {
                $.extend(data, remoteParams);
            }
            var rules = options['assignRule'];
            if (rules) {
                if (!$.isArray(rules)) rules = [rules];
                $.each(rules, function(i, item) {
                    if (name.search(item['from']) >= 0) name = item['to'];
                });
            }
            data[name] = value;
        } else {
            return (data = false);
        }
    });

    var element = form[fields[0]];
    if (data) {
        var cached = validator.cachedValue(element, route),
            responseProcessing = function(element, response) {
                var result = response['data'] === true,
                    messageParams = {
                        quietRule: options['quietRule'],
                        route: route,
                        result: result
                    };

                if (result) {
                    validator.addSuccess(element, messageParams)
                } else {
                    var callback = options['errorElement'];
                    if (callback) {
                        var name = callback.call(validator, response['data']);
                        if (name) element = form[name];
                    }
                    validator.addError(element, response['data'], messageParams);
                }

                return result;
            };

        if (!validator.isPending(element, route)) {
            if (jsonCompare(cached.old, data)) {
                responseProcessing(element, cached.response);
                validator.showErrors();
            } else {
                cached.old = data;
                validator.startRouteRequest(element, route);

                $.ajax($.extend({}, options['ajaxOptions'], {
                    url: url(route),
                    data: data,
                    success: function (response) {
                        cached.response = response;
                        validator.stopRouteRequest(element, route);

                        responseProcessing(element, response);
                        if (validator.pendingRequest <= 0) validator.showErrors();
                    },
                    error: function() {
                        cached.old = null;
                        validator.stopRouteRequest(element, route);
                    }
                }));
            }
        }
    } else {
        validator.resetList.push({element: element, onlySuccess: true});
    }

    return 'pending';
}

var UI = {
    ERROR_ELEMENT: 'div',
    ERROR_CLASS: 'error_messages',
    REQUIRED_CLASS: 'mark_required',
    getCsrfToken: function($element) {
        if ($element === undefined) return $('#id_csrf_token').val();
        if ($element.length === 0) return null;

        return $element.is('form')
            ? $element[0].csrf_token.value
            : $element[0].form.csrf_token.value;
    },
    setErrorToForm: function($form, data) {
        var form = $form[0],
            validator = $.data(form, 'validator');

        if (!validator) {
            var Validator = function(form) {  // fake validator
                this.reset();
                this.groups = {};
                this.currentForm = form;
                this.successList = $(form).find('.field_box :input').toArray();
                this.settings = $.validator.defaults;
                this.labelContainer = $(this.settings.errorLabelContainer);
                this.successParameters = {};
                this.errorParameters = {};
                this.resetList = [];
            };
            Validator.prototype = $.validator.prototype;
            validator = new Validator(form);
        } else {
            validator.reset();
        }

        validator.showErrors(data);
    },
    toggleFieldBoxRequiredState: function($childElement, isRequired) {
        $childElement.closest('.field_box')
            .removeClass('optional ' + UI.REQUIRED_CLASS)
            .addClass(isRequired ? UI.REQUIRED_CLASS : 'optional');
    },
    toggleFieldBoxShowState: function($childElement, isShow) {
        $childElement.closest('.field_box').toggleClass('hidden', isShow);
    },
    fiasInit: function($element) {
        if (param('fias.enabled') && lang() === 'ru') {
            $.fn.fias && $element.fias({
                service_base_path: url('fias')
            });
        }
    },
    activeWaitingButton: function($target, setDisabled) {
        var func = $target.is(':input') ? 'val' : 'text';

        if ($target.hasClass('waiting-status')) return false;

        $target.data('oldButtonCaption', $target[func]());
        $target[func](_('button.please_wait')).addClass('waiting-status');
        setDisabled && $target.setDisable();
    },
    resetWaitingButton: function($target) {
        var oldCaption = $target.data('oldButtonCaption');
        if (oldCaption) {
            var func = $target.is(':input') ? 'val' : 'text';
            $target[func](oldCaption);
            $target.removeData('oldButtonCaption').removeClass('waiting-status');
        }
        $target.setEnable();
    },
    initRedirectToUrlElement: function() {
        var $element = $('#auto_redirect_message');
        if ($element.length === 0) return false;

        var seconds = +($element.attr('data-seconds') || 5),
            message = $element.attr('data-text') || '',
            url = $element.attr('data-redirect-url') || '';

        if (!seconds) {
            location.href = url;
            return true;
        }

        var timer = setInterval(function() {
           if (--seconds <= 0) {
               clearInterval(timer);
               location.href = url;
           } else {
               $element.html(message.fmtByArgs(seconds));
           }
        }, 1000)
    },
    setActiveTab: function($tabs, paramCookieName) {
        var cookieName = param(paramCookieName),
            $tabContents = $tabs.children('fieldset').children('div'),
            $tabWithError = $tabContents.find('div.error_messages:eq(0)').closest($tabContents),
            activeIndex = $tabContents.index($tabWithError);

        if (activeIndex < 0) {
            activeIndex = cookieName ? $.cookie(cookieName) : 0;
        }

        if ($tabs.data('ui-tabs')) {
            $tabs.tabs('option', 'active', activeIndex);
        } else {
            $tabs.tabs({
                activate: function (e, ui) {
                    cookieName && $.cookie(cookieName, ui.newTab.index(), { path: '/' });
                },
                active: activeIndex
            });
        }
    }
};

$(document).on('click', '.waiting-button', function(e) {
    var $target = $(e.currentTarget),
        func = $target.is(':input') ? 'val' : 'text';

    if ($target.hasClass('waiting-status')) return false;

    $target.data('oldButtonCaption', $target[func]());
    $target[func](_('button.please_wait')).addClass('waiting-status');
    $target.hasClass('set-disabled') && $target.setDisable();
});

(function($) {
    var disabledClass = 'disabled';

    $.fn.hasAttr = function(name) {
        var attr = this.attr(name);
        return attr !== null && attr !== false;
    };

    $.fn.getAttrs = function() {
        var attributes = {};
        this[0] && $.each(this[0].attributes, function() {
            attributes[this.name] = this.value;
        });
        return attributes;
    };

    $.fn.isDisabled = function() {
        return this.hasAttr(disabledClass) || this.hasClass(disabledClass);
    };

    $.fn.setEnable = function() {
        return this.removeClass(disabledClass).removeAttr(disabledClass, disabledClass);
    };

    $.fn.setDisable = function() {
        return this.addClass(disabledClass).attr(disabledClass, disabledClass);
    };

    $.fn.toggleDisabled = function() {
        var args = arguments;
        return this.each(function() {
            var $this = $(this),
                value = args.length > 0 ? !!args[0] : $this.isDisabled();
            value ? $this.setEnable() : $this.setDisable();
        });
    };

    $.fn.createTooltip = function(options) {
        return this.each(function() {
            var $this = $(this),
                title = $this.attr('aria-label') || $this.attr('data-title'),
                defOptions = $.extend({
                    container: 'body',
                    placement: 'auto top',
                    trigger: 'hover',
                    title: title,
                    delay: {show: 1000, hide: 100}
                }, options);

            $.fn.tooltip && defOptions['title'] && $this.tooltip(defOptions);
        });
    };

    $.eachAjaxErrors = function(response, callback) {
        $.each(response['errors'] || [], function(i, error) {
            if (error === 'auth_error') {
                location.reload(true);
                return false;
            }
            callback.call(this, error);
        })
    };
})(jQuery);

(function() {
    if (!$.fn.inputmask) return;

    Inputmask.extendAliases({
        'dd.mm.yyyy': {
            mask: '1.2.y',
            placeholder: 'dd.mm.yyyy',
            leapday: '29.02.',
            separator: '.',
            alias: 'dd/mm/yyyy',
            yearrange: {minyear: 1900, maxyear: 2199}
        }
    });
})();

(function($) {
    if (!$.datepicker) return;

    $.datepicker.setDefaults({
        firstDay: param('datepicker.firstDay'),
        dateFormat: 'dd.mm.yy',
        closeText: _('lk.help.close'),
        prevText: _('lk.help.prev'),
        nextText: _('lk.help.next'),
        currentText: _('lk.help.today'),
        monthNames: [_('lk.label.months.january'), _('lk.label.months.february'), _('lk.label.months.march'), _('lk.label.months.april'), _('lk.label.months.may'), _('lk.label.months.june'), _('lk.label.months.july'), _('lk.label.months.august'), _('lk.label.months.september'), _('lk.label.months.october'), _('lk.label.months.november'), _('lk.label.months.december')],
        monthNamesShort: [_('lk.label.months.jan'), _('lk.label.months.feb'), _('lk.label.months.mar'), _('lk.label.months.apr'), _('lk.label.months.may'), _('lk.label.months.jun'), _('lk.label.months.jul'), _('lk.label.months.aug'), _('lk.label.months.sep'), _('lk.label.months.oct'), _('lk.label.months.nov'), _('lk.label.months.dec')],
        dayNames: [_('lk.label.weekday.sunday'), _('lk.label.weekday.monday'), _('lk.label.weekday.tuesday'), _('lk.label.weekday.wednesday'), _('lk.label.weekday.thursday'), _('lk.label.weekday.friday'), _('lk.label.weekday.saturday')],
        dayNamesShort: [_('lk.label.weekday.sun'), _('lk.label.weekday.mon'), _('lk.label.weekday.tue'), _('lk.label.weekday.wed'), _('lk.label.weekday.thu'), _('lk.label.weekday.fri'), _('lk.label.weekday.sat')],
        dayNamesMin: [_('lk.label.weekday.su'), _('lk.label.weekday.mo'), _('lk.label.weekday.tu'), _('lk.label.weekday.we'), _('lk.label.weekday.th'), _('lk.label.weekday.fr'), _('lk.label.weekday.sa')],
        weekHeader: _('lk.label.week')
    });
})(jQuery);

(function($) {
    if (!$.validator) return;

    $.extend($.validator.messages, {
        required: _('error.field_is_required'),
        'check-re': _('lk.error.entered_invalid_chars')
    });

    function updateIconTabIndex(validator, element) {
        var $icon = $(element).siblings('a.icon-button');
        if ($icon.length) {
            var valid = validator.silentCheck(element);
            $icon.attr('tabindex', valid ? -1 : 0);
        }
    }

    $.validator.setDefaults({
        errorElement: UI.ERROR_ELEMENT,
        errorClass: UI.ERROR_CLASS,
        ignoreTitle: true,
        errorContainer: $('#warning, #summary'),
        errorPlacement: function($label, $element) {
            $element.closest('.field_box').append($label);
        },
        success: function($label, element, parameters) {
            parameters = parameters || {};

            var $element = $(element),
                $icon = $element.siblings('a.icon-button');

            $element.closest('.field_box').removeClass('has_errors');
            var quiet = parameters['quietRule'] === true || $element.hasClass('always_quiet_icon');
            !quiet && $icon.removeClass('i-question i-times error').addClass('i-check success');
        },
        highlight: function(element, parameters) {
            parameters = parameters || {};

            var $element = $(element),
                $icon = $element.siblings('a.icon-button');

            $element.closest('.field_box').addClass('has_errors');
            var quiet = parameters['quietRule'] === true || $element.hasClass('always_quiet_icon');
            !quiet && $icon.removeClass('i-question i-check success').addClass('i-times error');
        },
        unhighlight: function(element) {
            var $element = $(element),
                $parent = $element.closest('.has_errors');

            $parent.removeClass('has_errors').find('.' + this.settings.errorClass).remove();
            var $helpText = $element.next('.help_text');
            $helpText.length
                ? $element.attr('aria-describedby', $helpText.attr('id'))
                : $element.removeAttr('aria-describedby');
        },
        reset: function(parameters) {
            var $element = $(parameters.element),
                $icon = $element.siblings('a.icon-button');

            var resetIcon = (parameters['onlyError'] && $icon.hasClass('error'))
                || (parameters['onlySuccess'] && $icon.hasClass('success'));

            if (resetIcon) {
                $icon.addClass('i-question').removeClass('i-check success i-times error');
            }
        },
        showErrors: function(errorMap, errorList) {
            this.errorList = $.map(errorList, function(item) {
                if ($.isArray(item.message)) item.message = item.message.join('<br/>');
                return item;
            });

            this.toHide = this.toHide.not(this.toShow);
            this.hideErrors();
            this.addWrapper(this.toShow).show();

            if (this.settings.success) {
                for (i = 0; this.successList[i]; i++) {
                    this.showLabel(this.successList[i]);
                }
            }

            for (var i = 0; this.errorList[i]; i++) {
                var error = this.errorList[i];
                if (this.settings.highlight) {
                    var parameters = this.errorParameters[error.element.name];
                    this.settings.highlight.call(this, error.element, parameters);
                }
                this.showLabel(error.element, error.message);
            }
            if (this.errorList.length) this.toShow = this.toShow.add(this.containers);

            if (this.settings.unhighlight) {
                var elements = this.validElements();
                for (i = 0; elements[i]; i++) {
                    this.settings.unhighlight.call(this, elements[i]);
                }
            }

            if (this.settings.reset) {
                for (i = 0; this.resetList[i]; i++) {
                    this.settings.reset.call(this, this.resetList[i]);
                }
            }

            this.toHide = this.toHide.not(this.toShow);
            this.hideErrors();
            this.addWrapper(this.toShow).show();
        },
        onsubmit: false,
        onfocusin: function(element) {
            updateIconTabIndex(this, element);
        },
        onkeyup: function(element) {
            updateIconTabIndex(this, element);
        },
        onfocusout: function(element, event) {
            var $element = $(element),
                isOpenedDatepicker = $.datepicker && $element.hasClass($.datepicker.markerClassName)
                    && $.datepicker._datepickerShowing;

            var skip = !$element.is('select, input, textarea') || isOpenedDatepicker;
            if (skip) return;
            $element.valid();
        },
        onclick: function(element) {
            if (element.type === "radio") {
                var $element = $(element);
                if ($element.valid()) {
                    $element.closest('.field_box').removeClass('has_errors').find('div.error_messages').remove();
                }
            }
        }
    });

    $.fn.rules = function(onlyLocal) {
        var element = this[0],
            result = [],
            rules = $.validator.normalizeRules($.extend({},
                $.validator.classRules(element),
                $.validator.attributeRules(element),
                $.validator.dataRules(element),
                $.validator.staticRules(element)
            ), element);

        $.each(rules, function(k, v) {
            result.push({ name: k, params: v, remote: k.indexOf('remote') === 0, required: k === 'required' });
        });

        result = result.sort(function(x, y) {
            if (x.remote && y.remote) {
                return 0;
            } else if (x.remote || y.required) {
                return 1;
            } else if (x.required || y.remote) {
                return -1;
            }
            return 0
        });

        if (onlyLocal) {
            result = $.grep(result, function(item) { return !item.remote })
        }

        return result;
    };

    $.validator.dataRules = function(element) {
        var rules = {},
            $element = $(element),
            altRules = $element.attr('data-rule');

        if (altRules) {
            $.each(altRules.split(' '), function() {
                if ($.validator.methods[this]) rules[this] = true;
            })
        }

        $.each($.validator.methods, function(method) {
            var value = $element.data('rule' + method[0].toUpperCase() + method.substring(1).toLowerCase());
            if (value !== undefined) rules[method] = value;
        });

        return rules;
    };

    $.validator.prototype.cachedValue = function(element, route) {
        var keyName = 'cached_' + route;
        return $.data(element, keyName) || $.data(element, keyName, {
            old: null,
            response: null
        });
    };

    $.validator.prototype.remoteCheckParams = function(element) {
        var $element = $(element),
            dataAttrs = $element.data(),
            filter = /remoteParam(.*)/, params = {}, param;
        for (param in dataAttrs) {
            if (dataAttrs.hasOwnProperty(param)) {
                var remoteParam = param.match(filter);
                if (remoteParam && remoteParam.length > 1) {
                    params[remoteParam[1].toSnakeCase()] = dataAttrs[param];
                }
            }
        }
        return params;
    };

    $.validator.prototype.startRouteRequest = function(element, route) {
        var pendingKey = element.name + '_' + route;
        if (!this.pending[pendingKey]) {
            this.pendingRequest++;
            this.pending[pendingKey] = true;
        }
    };

    $.validator.prototype.stopRouteRequest = function(element, route) {
        var pendingKey = element.name + '_' + route;
        this.pendingRequest--;
        if (this.pendingRequest < 0) this.pendingRequest = 0;
        delete this.pending[pendingKey];
    };

    $.validator.prototype.isPending = function(element, route) {
        var pendingKey = element.name + '_' + route;
        return !!this.pending[pendingKey];
    };

    $.validator.prototype.silentCheck = function(element) {
        element = this.validationTargetFor(this.clean(element));

        var sortRules = $(element).rules(true),
            val = this.elementValue(element);

        for (var i = 0; i < sortRules.length; i++) {
            var item = sortRules[i],
                result = $.validator.methods[item.name].call(this, val, element, item.params);
            if (!result) return false;
        }

        return true;
    };

    $.validator.prototype.check = function(element, onlyLocal) {
        element = this.validationTargetFor(this.clean(element));

        var sortRules = $(element).rules(onlyLocal),
            rulesCount = sortRules.length,
            dependencyMismatch = false,
            val = this.elementValue(element);

        for (var i = 0; i < rulesCount; i++) {
            var item = sortRules[i],
                rule = { method: item.name, parameters: item.params };

            try {
                var timeout = timeForRequest(),
                    result;

                if (item.remote && timeout > 0) {
                    var curMethod = function(item) {
                        return function(context, val, element, parameters) {
                            return $.validator.methods[item.name].call(context, val, element, parameters);
                        }
                    }(item);

                    var check = waitForCheckRequest(curMethod, element, $(element).parent());
                    result = check(this, val, element, rule.parameters)
                } else {
                    result = $.validator.methods[item.name].call(this, val, element, rule.parameters);
                }
    
                if (result === 'dependency-mismatch' && rulesCount === 1) {
                    dependencyMismatch = true;
                    continue;
                }
                dependencyMismatch = false;

                if (result === 'pending') {
                    this.toHide = this.toHide.not(this.errorsFor(element));
                    if (i === rulesCount - 1) return;
                }

                if (!result) {
                    this.formatAndAdd(element, rule);
                    return false;
                }
            } catch(e) {
                throw e;
            }
        }

        if (dependencyMismatch) return;
        if (rulesCount) this.successList.push(element);

        return true;
    };

    $.validator.prototype.addError = function(element, messages, parameters) {
        if (this.errorMap[element.name]) {
            var curMessage = this.errorMap[element.name];

            if (!$.isArray(messages)) messages = [messages];
            messages = $.isArray(curMessage) ? curMessage.concat(messages) : [curMessage].concat(messages);
            if (messages.length > 1) {
                var uniqueMessages = [];
                $.each(messages, function(i, e) {
                    if ($.inArray(e, uniqueMessages) === -1) uniqueMessages.push(e);
                });
                messages = uniqueMessages;
            }
            if (messages.length === 1) messages = messages[0];

            this.errorList = $.grep(this.errorList, function(item) {
                return item.element.name !== element.name;
            });
        }
        this.errorList.push({ element: element, message: messages });
        this.errorParameters[element.name] = parameters;
        this.errorMap[element.name] = messages;
    };

    $.validator.prototype.addSuccess = function(element, parameters) {
        this.successList.push(element);
        this.successParameters[element.name] = parameters;
    };

    /************************* validator methods *************************/

    $.validator.addMethod('check-re', function(value, element) {
        var reChars = $(element).attr('data-ic-chars');
        return (value && reChars)
            ? new RegExp('^[' + reChars + ']+$', 'g').test(value)
            : true;
    });

    $.validator.addMethod('lettersonly', function(value, element) {
        return this.optional(element) || /[A-Za-z]+([\-\s'][A-Za-z']+)*$/i.test(value);
    }, _('lk.error.field_letters_eng_alphabet_apostrophe_hyphen'));

    $.validator.addMethod('cyrillic', function(value, element) {
        return this.optional(element) || /^[а-яёЁА-Я-\s]+$/.test(value);
    }, _('lk.error.cyrill_letters_only'));

    $.validator.addMethod('digit_latin', function(value, element) {
        return this.optional(element) || /^[A-Za-z0-9]+$/.test(value);
    }, _('error.digits_and_latin_letters_only'));

    $.validator.addMethod('jobtitle', function(value, element) {
        return this.optional(element) || /^[a-zA-Z,.а-яёЁА-Я\s0-9-]+$/.test(value);
    }, _('lk.error.cyrill_and_latin_letters_only'));

    $.validator.addMethod('normdate', function(value, element, params) {
        if (this.optional(element)) return true;
        if (value !== 'dd.mm.yyyy'.replace(/[\w]/g, '_')) {
            var validator = this;
            try {
                var dt = $.datepicker.parseDate('dd.mm.yy', value);
                if (element.id === 'id_birthDate') {
                    var twoYr = new Date();
                    twoYr.setYear(twoYr.getFullYear() - 2);
                    if (dt > twoYr) {
                        $.validator.messages.normdate = _('lk.error.afl_bonus_members_least_2_years');
                        return false;
                    }
                }
                if (dt) return true;
            } catch(e) {
                if (e === 'Invalid date') {
                    $.validator.messages.normdate = _('lk.error.invalid_date');
                } else {
                    $.validator.messages.normdate = _('lk.error.data_format_DD.MM.YYYY');
                }
                return false;
            }
        }
        return true;
    }, $.validator.messages.normdate);

    $.validator.addMethod('need-us-state', function(value, element) {
        var form = this.currentForm,
            $country = $(form.country);
        return $country.val().toLowerCase() === 'us' ? !!value : true;
    }, _('error.field_is_required'));

    $.validator.addMethod('fias-cyrillic', function(value, element) {
        var form = this.currentForm,
            country = form.country.value.toLowerCase();

        return country === 'ru' && value ? !/[A-Za-z]/g.test(value) : true;
    }, _('lk.error.cyrill_letters_only'));

    $.validator.addMethod('email', function(value, element) {
        var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        return regex.test(value);
    }, _('lk.error.enter_valid_email'));

    $.validator.addMethod('real_name', function(value, element) {
        return this.optional(element) || /^[a-zа-яё\s\-\.']+$/gi.test(value);
    }, _('lk.error.cyrill_and_latin_letters_only'));

    $.validator.addMethod('loyalty_id', function (value) {
        return /^\s*[0-9]+[0-9 ]*$/.test(value);
    }, _('lk.error.invalid_afl_bonus_num'));

    $.validator.addMethod('date_required', function(value, element) {
        return this.optional(element) || !/[_]/g.test(value);
    }, _('error.field_is_required'));

    $.validator.addMethod('phone', function(value) {
        return /^\+\d+$/.test(value);
    }, _('lk.error.phone.invalid_number'));

    $.validator.addMethod('remote-check-password', function(value, element) {
        return remoteCheck(this, 'check_password', element.name, {
            assignRule: {from: /password/, to: 'password'},
            ajaxOptions: {type: 'POST'}
        });
    });

    $.validator.addMethod('remote-verify-name-value', function(value, element) {
        return remoteCheck(this, 'verify_name_value', element.name, {
            assignRule: {from: /name/i, to: 'name'},
            quietRule: true
        });
    });
})(jQuery);
