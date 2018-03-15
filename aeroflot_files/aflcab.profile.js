window.SignupModule = (function() {
    'use strict';

    var module = function($form) {
        this.$form = $form;
        this.isProfile = false;
        this.$addressForm = this.$form.find('#fs_id_addressform');
        this.$phonesFormset = this.$form.find('#formset_phones');
        this.$passportsFormset = this.$form.find('#formset_passports');
        this.$addressInputs = $();
        this.$country = this.$form.find('[name=country]');
    };

    module.prototype.init = function() {
        this.defaultDatepickerOptions = {
            minDate: '-100Y',
            maxDate: 0,
            yearRange: '-100:+0',
            defaultDate: 0,
            showOtherMonths: true,
            inputMask: true,
            altFieldEvents: 'focusout input',
            onChangeMonthYear: function(year, month, inst) {
                var curDate = $(this).datepicker('getDate');
                if (curDate == null) return;
                if (curDate.getYear() != year || curDate.getMonth() != month - 1) {
                    curDate.setYear(year);
                    curDate.setMonth(month - 1);
                    $(this).datepicker('setDate', curDate);
                }
            }
        };

        this.passportDatepickerOptions = $.extend({}, this.defaultDatepickerOptions, {
            minDate: 0,
            maxDate: '+50Y',
            yearRange: '+0:+50'
        });

        this.listen();
        this.initUI();
    };

    module.prototype.listen = function() {
        var that = this;

        this.$form.on('change keyup', 'select[id="id_aType"]', function(e) {
            var switcher = $(e.currentTarget).val().toUpperCase() !== 'B';
            UI.toggleFieldBoxShowState(that.$form.find('input[name="companyName"]'), switcher);
        }).on('change', 'select[name$="passportType"], select[name$="passportIssueCountry"]', function(e) {
            var $block = $(e.currentTarget).closest('.formset_row');
            that.checkPassportType($block);
            if (!$block.hasClass('already-changed')) {
                $block.addClass('already-changed');
                $block.find('input[name$="passportNumber"], input[name$="passportExpiry"]').val('');
            }
        }).on('change', 'select[name$="pType"]', function() {
            that.checkPhoneType();
        }).on('change', '[type="password"]', function() {
            $.validator && $(this).valid();
        });

        this.$country.on('change', function(e) {
            var value = $(this).val().toUpperCase();
            UI.toggleFieldBoxRequiredState(that.$form.find('[name=stateProvince]'), value === 'US');
            that.updateAddressInputs(value);
        });
    };

    module.prototype.initUI = function() {
        var that = this;

        $.fn.aflFormSet && this.$phonesFormset.aflFormSet({
            onInitFormset: function($forms) {
                $forms.each(function() {
                    var $this = $(this);
                    $this.find('[name$=phone]').aflPhoneBox({
                        countryElement: $this.find('[name$=country]')
                    });
                });
                that.checkPhoneType(this);
            },
            onAfterFormRemove: function() {
                that.checkPhoneType(this);
            },
            onAfterFormAdd: function($form) {
                $form.find('[name$=phone]').aflPhoneBox({
                    countryElement: $form.find('[name$=country]')
                });
                $form.initAllInputCheckers();
                that.checkPhoneType(this);
            }
        });

        $.fn.aflFormSet && this.$passportsFormset.aflFormSet({
            onInitFormset: function($forms) {
                $forms.each(function() {
                    var $this = $(this);
                    $this.find('[name$=passportIssueCountry]').combobox({
                        trans: { choose: _('lk.help.choose') }
                    });
                    $this.find('[name$=passportExpiry]').aflButtonDatepicker(that.passportDatepickerOptions);
                });
            },
            onAfterFormAdd: function($form) {
                $form.find('[name$=passportIssueCountry]').val('RU').combobox({
                    trans: { choose: _('lk.help.choose') }
                });
                $form.find('[name$=passportType]').val('FP');
                $form.find('[name$=passportExpiry]').aflButtonDatepicker(that.passportDatepickerOptions);
                $form.find('[role="title"]').text(_('lk.header.additional_passport'));
            }
        });

        this.$form.find('.icon-button').popover({
            container: '.main-content',
            trigger: 'hover, focus'
        });
        this.$form.find('[name="birthDate"]').aflButtonDatepicker(this.defaultDatepickerOptions);

        $.fn.collapse && this.$form.find('fieldset.expand').collapse({
            cookieName: param('cookie.collapse'),
            toggler: 'legend'
        });

        UI.fiasInit(this.$addressForm);
        this.$form.initAllInputCheckers();
        this.updateAddressInputs();
        this.$form.validate();
    };

    module.prototype.updateAddressInputs = function(value) {
        value = (value || this.$country.val() || '').toUpperCase();

        if (this.$addressInputs.length === 0) {
            var $form = this.$form,
                elements = $.map(['stateProvince', 'city', 'street'], function(x) {
                    var $element = $form.find('#id_' + x),
                        customName = $element.attr('data-custom-name');
                    if (customName) $element = $form.find('#' + customName);
                    return $element.length ? $element[0] : null;
                });
            this.$addressInputs = $(elements);
        }

        this.$addressInputs.inputChecker().attr('data-ic-chars', function() {
            return (value !== 'RU' ? 'A-Za-z' : '') + "А-Яа-яЁё\\d\"':;/\\?\\\\№\\-_\\., ";
        }).inputChecker('reload');
    };

    module.prototype.checkPhoneType = function(formsetObj) {
        if (!formsetObj) {
            formsetObj = $.aflFormSet.getData(this.$phonesFormset);
        }

        var $extCaption = formsetObj.header().find('.phone_ext_caption'),
            $phoneTypes = formsetObj.forms().find('[name$="pType"]'),
            needToShow = false;

        $phoneTypes.each(function() { if (this.value === 'B') needToShow = true; });
        $extCaption.toggleClass('hidden', !needToShow);

        $phoneTypes.each(function() {
            var $extInput = formsetObj.getForm(this).find('input[name$="ext"]');
            needToShow
                ? $extInput.addClass('hidden').parent().removeClass('hidden')
                : $extInput.removeClass('hidden').parent().addClass('hidden');
            $extInput.toggleClass('hidden', this.value !== 'B');
        });
    };

    module.prototype.checkPassportType = function($block) {
        var $type = $block.find('select[name$="passportType"]'),
            $country = $block.find('select[name$="passportIssueCountry"]'),
            $pExpiry = $block.find('input[name$="passportExpiry"]');

        var type = ($type.val() || '').toUpperCase(),
            country = ($country.val() || '').toUpperCase();

        UI.toggleFieldBoxShowState($pExpiry, (type === 'P' || type === 'BC') && country === 'RU');
    };

    $.fn.initSignUpPage = function() {
        return this.each(function() {
            new module($(this)).init();
        })
    };

    return module;
})();

window.ProfileModule = (function() {
    'use strict';

    var module = function($form) {
        window.SignupModule.call(this, $form);

        this.isProfile = true;
        this.$tabs = $('#tabs');
        this.$homeAirports0 = this.$form.find('div#hair-0');
        this.$loyaltyPrograms0 = this.$form.find('div#lpro-0');
        this.$submitButton = this.$form.find(':submit');
    };

    extend(module, window.SignupModule);

    module.prototype.listen = function() {
        module.__super__.listen.call(this);

        var proxy = $.proxy(this.onFormChange, this),
            formsets = [this.$phonesFormset, this.$passportsFormset, this.$homeAirports0, this.$loyaltyPrograms0];

        this.$form.on('input', 'input[type=text]', proxy)
            .on('click', 'input[type=radio]', proxy)
            .on('change', 'select', proxy);

        $.each(formsets, function() {
            this.on('formset_change', proxy);
        });
    };

    module.prototype.initUI = function() {
        module.__super__.initUI.call(this);

        this.$loyaltyPrograms0.formset({
            translate: {
                addButtonTitle: _('lk.button.add_loyalty_prog'),
                delButtonTitle: _('lk.button.delete_loyalty_prog')
            },
            buttonContainer: 'div.field_box',
            onAfterFormAdd: function($form) {
                $form.find('[name$="loyaltyPrograms"]').val('');
            }
        });

        this.$homeAirports0.formset({
            translate: {
                addButtonTitle: _('lk.button.add_airport'),
                delButtonTitle: _('lk.button.delete_airport')
            },
            buttonContainer: 'div.field_box',
            onInitFormset: function($forms) {
                $forms.find('[name$=homeAirports]').combobox({
                    trans: { choose: _('lk.help.choose') }
                });
            },
            onAfterFormAdd: function($form) {
                $form.find('.custom-combobox').remove();
                $form.find('[name$=homeAirports]').val('').show()
                    .combobox({ trans: { choose: _('lk.help.choose') } });
            }
        });

        var cookieName = param('cookie.profileTab'),
            $tabContents = this.$tabs.children('div'),
            $tabWithError = $tabContents.find('div.error_messages:eq(0)').closest($tabContents),
            tabIndexWithError = $tabContents.index($tabWithError);

        this.$tabs.tabs({
            activate: function(e, ui) {
                $.cookie(cookieName, ui.newTab.index(), { path: '/' });
            },
            active: tabIndexWithError >= 0 ? tabIndexWithError : ($.cookie(cookieName) || 0)
        });

        this.$form.removeClass('hidden');
    };

    module.prototype.onFormChange = function() {
        this.$submitButton.removeAttr('disabled aria-disabled');
    };

    $.fn.initProfileInfoPage = function() {
        return this.each(function() {
            new module($(this)).init();
        })
    };
})();

(function($) {
    $.validator.addMethod('remote-is-email-unique', function(value, element) {
        return remoteCheck(this, 'check_email_unique', element.name, {
            assignRule: {from: /email/, to: 'email'}
        });
    });

    $.validator.addMethod('remote-is-mail-unique-not-siebel', function(value, element) {
        return remoteCheck(this, 'check_email_unique_not_siebel', element.name, {
            assignRule: {from: /email/, to: 'email'}
        });
    });

    $.validator.addMethod('remote-is-mail-unique-ignore-own', function(value, element) {
        return remoteCheck(this, 'check_email_unique_ignore_own', element.name, {
            assignRule: {from: /email/, to: 'email'}
        });
    });

    $.validator.addMethod('remote-is-preactivated-id', function() {
        return remoteCheck(this, 'is_preactivated_id', 'loyalty_id');
    });

    $.validator.addMethod('remote-is-preactivated-id-phone', function() {
        return remoteCheck(this, 'is_preactivated_id_phone', ['phone-0-phone', 'loyalty_id'], {assignRule: {from: 'phone-0-phone', to: 'phone'}});
    });

    $.validator.addMethod('remote-is-account-unique', function() {
        return remoteCheck(this, 'is_account_unique', ['lastName', 'firstName', 'birthDate']);
    });

    $.validator.addMethod('remote-verify-account', function() {
        return remoteCheck(this, 'verify_account_data', ['lastName', 'loyalty_id', 'birthDate']);
    });

    $.validator.addMethod('remote-is-cobrand-mail', function() {
        return remoteCheck(this, 'is_cobrand_email', ['email', 'loyalty_id'], {
            errorElement: function(message) {
                if (message === _('lk.text.enter_valid_card_num')) return 'loyalty_id';
            }
        });
    });

    $.validator.addMethod('remote-verify-phone', function(value, element) {
        return remoteCheck(this, 'verify_phone_number', element.name, {
            assignRule: {from: /phone/, to: 'phone'}
        });
    });
})(jQuery);