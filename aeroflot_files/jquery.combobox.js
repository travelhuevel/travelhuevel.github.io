// TODO: проверка версий, вынести в общий файл
window.isSupportComboboxSelectArrow = function() {
    var userAgent = window.navigator.userAgent.toLowerCase(),
        matches = /(webkit|firefox)\/[\w.]+/.exec(userAgent) || /(trident)\/7.*rv:11/.exec(userAgent);
    return (window.combobox_isSupportSelectArrowHidden = !!matches);
};

(function($){

    $.widget('custom.combobox', {
        options: {
            trans: { choose: _('label.unspecified') },
            source: null,
            placeholder: true,
            clear: null,  // функция (событие), которая срабатывает при очистке поля, работает с опцией changeIfEmpty == true
            requestDelay: 0,
            minLength: 0,
            changeIfEmpty: false,  // вызывать принудительно событие change, если очистили input
            selectOnFocus: true,  // выделять ли при фокусе,

            // режим подстановки значения, если не был выбран пункт из списка
            // любое not true значение - ничего не делать
            // 'clear' - очищать
            // 'first' - заполнить первым элементом из списка
            fillMode: 'clear',

            showArrowButton: false,
            setMinDropdownHeight: true,
            maxDropdownRows: 10
        },

        _isSupportSelectArrowHidden: window.isSupportComboboxSelectArrow,

        _create: function(trans) {
            var that = this;

            this.options = $.extend({}, this.options, this.element.data());
            this.options.showArrowButton = this.options.showArrowButton && this._isSupportSelectArrowHidden();

            this.lastSelectedItem = null;
            this.tagName = this.element.prop('tagName');
            this.isSelect = this.tagName === 'SELECT';

            var elem_id = this.element.attr('id'),
                inputElemId = elem_id + '_input';

            this.wrapper = $('<span>').addClass('custom-combobox').insertAfter(this.element);
            this.wrapper.attr('id', elem_id + '_combobox');

            var value = this.element.val();
            if (this.isSelect) value = value ? this.element.children(':selected').text() : '';

            this.input = $('<input type="text">')
                .attr('style', this.element.attr('style'))
                .addClass(this.element.attr('class'))
                .attr('value', value)  // нужно для form.reset()
                .attr('id', inputElemId) // нужно для корректного for для label
                .attr('aria-autocomplete', 'inline')
                .attr('aria-owns', this.wrapper.attr('id'))
                .attr('name', this.element.attr('name') + '_input')
                .val(value);

            // копируем атрибуты, иначе неправильно работает валидатор
            $.each(this.element.prop('attributes'), function() {
                if (this.name.indexOf('data-rule') >= 0 || this.name.indexOf('aria') >= 0) {
                    that.input.attr(this.name, this.value);
                    that.element.removeAttr(this.name);
                }
            });

            // если вдруг присутствует ошибка для создаваемого поля
            if (elem_id) {
                var $errorElement = $('div.error_messages[for="' + elem_id + '"]');  // TODO: вынести в настройку
                $errorElement.length && $errorElement.attr('for', inputElemId);
            }

            // задаем имя для ошибки
            this.element.attr('data-custom-name', inputElemId);

            // хак для корректного for для label
            var container = this.element.parent();
            var label = container.find('label[for='+elem_id+']');
            if (label.length)
                label.attr('for', elem_id + '_input')

            if (this.options.placeholder) {
                this.input.prop('placeholder', this.options.trans.choose);
            }

            this.element.hide();

            this._createAutocomplete();
            this._createShowAllItems();

            if (this.options.showArrowButton) {
                this.wrapper.append('<span class="arrow"><span class="arrow-button"></span></span>');
            }

            if (this.element.attr('disabled')) {
                this.disable();
            }

    
            // проблема с фокусом в IE (#1487)
            setTimeout(function() { that.input.autocomplete('close'); }, 100);
        },

        _createAutocomplete: function() {
            var size = 8,
                that = this,
                source = this.options.source || $.proxy(this, '_source');

            this.input
                .appendTo(this.wrapper)
                .autocomplete({
                    delay: that.options.requestDelay || 0,
                    minLength: that.options.minLength || 0,
                    source: source,
                    autoFocus: false,
                    // position: {my : 'right top-1', at: 'right bottom'}, // пока проблема с мобильной версией
                    messages: {
                        noResults: '',
                        results: function() {}
                    }
                });

            // fix for https://trac.com.spb.ru/afl_site/ticket/1006
            $(window).load(function() {
                setTimeout(function() {
                    $('.ui-autocomplete-input').autocomplete('close');
                }, 150);
            });

            this._on(this.input, {
                autocompleteopen: function(event, ui) {
                    var $activeMenu = this.input.data('ui-autocomplete').menu.activeMenu,
                        $li = $activeMenu .find('li'),
                        liHeight = $li.first().outerHeight(),
                        liCount = $li.length;

                    if (this.options.setMinDropdownHeight && liCount < this.options.maxDropdownRows) {
                        $activeMenu.height(liHeight * liCount);
                    } else {
                        $activeMenu.height(liHeight * this.options.maxDropdownRows);
                    }
                },
                autocompleteselect: function(event, ui) {
                    if (ui.item.hasOwnProperty('option')) {
                        ui.item.option.selected = true;
                        this._trigger('select', event, {item: ui.item.option});
                    } else {
                        ui.item.donor_el && ui.item.donor_el.val(ui.item.value);
                        this._trigger('select', event, {item: ui.item});
                    }

                    that.element.change();
                    this.element.data('selected-item', ui.item);
                    this.lastSelectedItem = ui.item;
                },
                autocompletechange: function(event, ui) {
                    // нужно для обновления значения в элементе-родителе,
                    // чтобы, например, в валидаторе были актуальные данные
                    this.sync();

                    if (this.options.fillMode === 'clear') this._removeIfInvalid(event, ui);

                    this._trigger('change', event);
                    // this._valid();
                },
                autocompleteclose: function(event, ui) {
                    if (this.lastSelectedItem === null && this.options.fillMode === 'first') {
                        var data = this.input.data('ui-autocomplete');
                        if (data.term.length >= data.options.minLength) {
                            data.menu.activeMenu.children(':first').click();
                        }
                    }
                    this.lastSelectedItem = null;
                }
            });

             // IE11 bug with focus event on init component
            var autocomplete = this.input.data('ui-autocomplete');
            autocomplete.options['minLength'] = 0;
            autocomplete.term = autocomplete._value();

         },

        _createShowAllItems: function() {
            var that = this;

            this.input.mousedown(function(event) {
                if (that._isDisabled()) return false;
                $(event.target).focus().autocomplete('search', '');
            });

            if (this.options.selectOnFocus) {
                this.input.click(function(event) {
                    $(event.target).select();
                });
            }

            if (this.options.changeIfEmpty) {
                this._on(this.input, {
                    change: function(event) {
                        that.sync();

                        if ($(event.target).val() === '') {
                            that.element.val('');
                            that.element.change();
                            this._trigger('clear', event);
                        }
                    }
                });
            }

            this.element.change(function() {
                var values = that._getValues();
                if (values.input != values.element) that.input.val(values.element);
            });

            if (this.options.showArrowButton) {
                this.wrapper.on('click', 'span.arrow-button', function() {
                    that.input.trigger('mousedown');
                });
            }
        },

        _source: function(request, response) {
            var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), 'i');
            response(this.element.children('option').map(function() {
                var text = $(this).text();
                if (this.value && (!request.term || matcher.test(text))) {
                    return {
                        label: text,
                        value: text,
                        option: this
                    };
                }
            }));
        },

        _removeIfInvalid: function(event, ui) {
            if (ui.item) return;

            var valueLower = this.input.val().toLowerCase(),
                valid = false;

            this.element.children('option').each(function() {
                if ($(this).text().toLowerCase() === valueLower) {
                    valid = true;
                    return false;
                }
            });

            if (valid) return;

            this.clearInput();
            // this._valid();
        },

        _valid: function() {
            if ($.fn.validate) {
                var form = this.element[0].form;
                form && $.data(form, 'validator') && this.element.valid();
            }
        },

        _destroy: function() {
            this.wrapper.remove();
            this.element.show();
        },

        clearInput : function(unhighlight) {
            this.element.val('');
            this.input.val('');

            if (unhighlight && $.fn.validate) {
                var $form = this.input.closest('form'),
                    validateObj = $.data($form[0], 'validator');

                if (validateObj) {
                    var settingObj = validateObj.settings;
                    settingObj.unhighlight.call(validateObj, this.element.get(0));
                }
            }
        },

        _showArrow: function() {
            this.wrapper.find('span.arrow').show();
        },

        _hideArrow: function() {
            this.wrapper.find('span.arrow').hide();
        },

        toggleArrow: function() {
            if (arguments.length > 0 && typeof arguments[0] === 'boolean') {
                return arguments[0] ? this._showArrow() : this._hideArrow();
            }

            this.wrapper.find('span.arrow:visible').length ? this._hideArrow() : this._showArrow();
        },

        _isDisabled: function() {
            var attr = this.input.attr('disabled');
            return (attr != null && attr != false) || this.input.hasClass('disabled');
        },

        enable: function() {
            this.input.removeClass('disabled').removeAttr('disabled');
            return this._setOption('disabled', false);
        },

        disable: function() {
            this.input.addClass('disabled').attr('disabled', 'disabled');
		    return this._setOption('disabled', true);
	    },

        toggle: function() {
            if (arguments.length > 0 && typeof arguments[0] === 'boolean') {
                return arguments[0] ? this.enable() : this.disable();
            }

            this._isDisabled() ? this.enable() : this.disable();
        },

        setVal: function(value) {
            this.element.val(value);
            this.input.val(value);

            this.element.change();
        },

        _getText: function() {
            var value = this.isSelect ? this.element.children(':selected').text() : this.element.val();
            return value || '';
        },

        _getValues: function() {
            return { element: this._getText(), input: this.input.val() };
        },

        sync: function() {
            var inputValue = this.input.val();

            if (this.isSelect) {
                var selector = inputValue ? ':contains(' + inputValue + ')' : ':empty',
                    $options = this.element.children('option');
                $options.filter(selector).prop('selected', true);
            } else {
                this.element.val(inputValue);
            }
        }
    });

})(jQuery);
