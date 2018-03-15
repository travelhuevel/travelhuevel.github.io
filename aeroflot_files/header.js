'use strict';


function arrIntersection(arr1, arr2) {
    return arr1.filter(function (value) {return arr2.indexOf(value) > -1;});
}

var Header = (function($) {
    var module = {};

    var settings = {
        languageCookieName: 'AF_preferredLanguage',
        localeCookieName: 'AF_preferredLocale',
        cookieDomain: 'auto',
        defaultLocale: 'ru',
        defaultlanguage: 'en',
        setLocaleLangUrlPattern: '/personal/set_locale_lang/{locale}/{lang}',
        setLangUrlPattern: '/personal/set_lang/{lang}',
        allowedLanguages: [
                'ru', 'en', 'de', 'fr', 'es', 'it', 'zh', 'ko', 'ja'
        ],  // limit languages

        /* limit locales
        null - не ограничивать список локализаций
        [] - (пустой массив) не показывать локализации
        ['ru', 'xx'] - показывать только локализации с кодами 'ru' и 'xx'
        */
        allowedLocales: null,

        languageSelected: false,
        languageLink: function (language, localization,
                                defaultURL) {  // allow override language link
            return defaultURL;
        }
    };

    var ui = {
        languageSelectorBlock: '.language-selector2',
        languageSelectorBlock2: '#language-only-selector2',
        localeLanguageSelectorBlock: '.locale-with-language-selector'
    };

    var keyCodes = {
        enter: 13,
        tab: 9,
        space: 32,
        left : 37,
        up: 38,
        right: 39,
        down: 40,
        esc: 27
    };

    function getLocaleLangUrl(locale, lang){
        if (!locale) {
            locale = settings.defaultLocale;
        }
        if (!lang) {
            lang = settings.defaultlanguage;
        }
        // remove _preferredLanguage arg
        var pref_lang_re = /_preferredLanguage=..(&|$)/,
            current_uri = window.location.toString();
        current_uri = current_uri.replace(pref_lang_re, '');
        if (current_uri.indexOf('?', current_uri.length - 1) !== -1){
            current_uri = current_uri.slice(0, -1);
        }
        var url = locale + '/' + lang + '?return_url=' + encodeURIComponent(current_uri);
        return settings.setLocaleLangUrlPattern.replace(
                '{locale}/{lang}', url);
    }

    function getLangUrl(lang){
        if (!lang) {
            lang = settings.defaultlanguage;
        }
        // remove _preferredLanguage arg
        var pref_lang_re = /_preferredLanguage=..(&|$)/,
            current_uri = window.location.toString();
        current_uri = current_uri.replace(pref_lang_re, '');
        if (current_uri.indexOf('?', current_uri.length - 1) !== -1){
            current_uri = current_uri.slice(0, -1);
        }
        var url = lang + '?return_url=' + encodeURIComponent(current_uri);
        return settings.setLangUrlPattern.replace('{lang}', url);
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

    function goto_url(url) {
        var ie_version = getIEVersion();
        if (ie_version > 0 && ie_version < 9) { // http://support.microsoft.com/kb/178066
            var a = document.createElement('a');
            a.href = url;
            document.body.appendChild(a);
            a.click();
        } else {
            window.location = url;
        }
    }

    function initLocaleLanguageSelector() {
        if (!ui.localeLanguageSelectorBlock.length) return;

        function showRelatedLanguages($obj) {
            var needLocale = $obj.attr('data-locale');
            var localeLanguages = localeLangs[needLocale] || settings.allowedLanguages;
            var allowedLanguages = arrIntersection(localeLanguages, settings.allowedLanguages);

            if (allowedLanguages.length) {
                $('li[data-lang]').hide();
                $(allowedLanguages).each(function(i, lang) {
                    $('li[data-lang="' + lang + '"]').show();
                });
            }
        }

        function showLocaleLanguageSelectorBlock($curLocale, $curLang) {
            var visible = $(ui.localeLanguageSelectorBlock).toggle().is(":visible");
            if (visible) {
                // сбрасываем отмеченные значения
                toggleElements($("#locale>ul>li.selected"), $curLocale);
                showRelatedLanguages($curLocale);
                toggleElements($("#lang>ul>li.selected"), $curLang);
                $(ui.localeLanguageSelectorBlock).focus();
            }
        }

        function toggleElements($current_elem, $new_elem) {
            $current_elem.removeClass("selected").attr("aria-checked", "false").attr("tabindex", "-1");
            $new_elem.addClass("selected").attr("aria-checked", "true").attr("tabindex", "0");
        }

        function handleKeyDown($li_obj, $ul_container, e) {
            switch (e.keyCode) {
                case keyCodes.space:
                case keyCodes.enter: {
                    toggleElements($ul_container.find("li.selected"), $li_obj);
                    if ($ul_container.attr("aria-labelledby") == "rg1_label") {
                        showRelatedLanguages($li_obj);
                        toggleElements($("#lang>ul>li.selected"), $("#lang>ul>li:visible:first").focus());
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
                case keyCodes.left:
                case keyCodes.up: {
                    var $prev = $li_obj.prevAll("li:visible").eq(0);
                    if ($li_obj.is($ul_container.find("li:visible:first"))) {
                        $prev = $ul_container.find("li:visible:last");
                    }
                    $prev.focus();
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
                case keyCodes.right:
                case keyCodes.down: {
                    var $next = $li_obj.nextAll("li:visible").eq(0);
                    if ($li_obj.is($ul_container.find("li:visible:last"))) {
                        $next = $ul_container.find("li:visible:first");
                    }
                    $next.focus();
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
                case keyCodes.tab: {
                    if (e.shiftKey && $ul_container.attr("aria-labelledby") == "rg1_label") {
                        $('a#set_lang_locale').focus();
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                }
            }
            return true;
        }

        if ($(ui.localeLanguageSelectorBlock).length){
            // TODO переписать Весь диалог выбора языка и локализации на jquery плагин
            // global variable `localeLangs` declared in 'djcms.vars.js'
            var $localeBlock = $("#locale"),
                $currentLocale = $localeBlock.find("ul>li.selected"),
                $currentLang = $("#lang").find("ul>li.selected"),
                tabPressed = false,
                tabShiftPressed = false;

            $(ui.localeLanguageSelectorBlock).keydown(function(e){
                var keyCode = e.keyCode || e.which;
                tabPressed = (keyCode == keyCodes.tab && !e.shiftKey) ? true : false;
                tabShiftPressed = (keyCode == keyCodes.tab && e.shiftKey) ? true : false;
                if (keyCode == keyCodes.esc) {
                    $(ui.localeLanguageSelectorBlock).hide();
                    $(ui.languageSelectorBlock).focus();
                    return false;
                }
            });

            $localeBlock.find("ul li")
                .click(function() {
                    toggleElements($localeBlock.find("ul>li.selected"), $(this));
                    showRelatedLanguages($(this));
                    toggleElements($("#lang>ul>li.selected"), $("#lang>ul>li:visible:first").focus());
                })
                .keydown(function(e){
                    handleKeyDown($(this), $localeBlock.find("ul"), e);
                })
                .hover(
                    function() {
                        $(this).focus();
                    }, function() {
                        $(this).blur();
                    }
                )

            $("#lang ul li")
                .click(function(){
                    toggleElements($("#lang>ul>li.selected"), $(this));
                })
                .keydown(function(e){
                    handleKeyDown($(this), $("#lang ul"), e);
                })
                .hover(
                    function() {
                        $(this).focus();
                    }, function() {
                        $(this).blur();
                    }
                )

            $(ui.languageSelectorBlock)
                .click(function (e) {
                    e.stopPropagation();
                    showLocaleLanguageSelectorBlock($currentLocale, $currentLang);
                })
                .keydown(function(e) {
                    if (e.keyCode ==keyCodes.enter && e.target == this){
                        showLocaleLanguageSelectorBlock($currentLocale, $currentLang);
                    }
                });

            $('a#set_lang_locale').focusout(function(){
                if (tabPressed) {
                    $localeBlock.find("ul>li.selected").focus();
                } else if (tabShiftPressed) {
                    $("#lang ul").find("li.selected").focus();
                }
            });

            var currentLocale = $currentLocale ? $currentLocale.attr('data-locale') : null;

            var localeLanguages = localeLangs[currentLocale] || settings.allowedLanguages;
            var allowedLanguages = arrIntersection(localeLanguages, settings.allowedLanguages);

            if (allowedLanguages.length) {
                $('li[data-lang]').hide();
                $(allowedLanguages).each(function(i, lang) {
                    $('li[data-lang="' + lang + '"]').show();
                });
            }

            if (settings.allowedLocales === null)
                $('li[data-locale]').show();
            else if (settings.allowedLocales.length) {
                $('li[data-locale]').hide();
                $(settings.allowedLocales).each(function(i, lang) {
                    $('li[data-locale="' + lang + '"]').show();
                });
            }

            $(document).ready(function () {
                $('a#set_lang_locale').click(function (evt) {
                    evt.preventDefault();
                    var locale = $('#locale ul li.selected').attr('data-locale'),
                        lang = $('#lang ul li.selected').attr('data-lang');

                    var href = getLocaleLangUrl(locale, lang);
                    goto_url(href);
                })

                $("body").click(function(){
                    $(ui.localeLanguageSelectorBlock).hide();
                });

                $(ui.localeLanguageSelectorBlock).click(function(e){
                    e.stopPropagation();
                });
            });
        }
    }

    function initLanguageSelector() {
        if (ui.localeLanguageSelectorBlock.length || ui.languageSelectorBlock2.length) return;
        $('img', ui.languageSelectorBlock).click(function () {
            if ($('div>a[data-enabled=true]', ui.languageSelectorBlock).length)
                $('div', ui.languageSelectorBlock).toggle();
        });

        $(ui.languageSelectorBlock).keyup(function(e) {
            var $div = $(this).children('div');
            if (e.which == '13'){
                $div.toggle();
            }
        });

        $('div>a[data-language]', ui.languageSelectorBlock).each(function(i) {
            var $this = $(this);
            $this.removeAttr('data-enabled');
            $this.hide();
        });
        $(settings.allowedLanguages).each(function(i, lang) {
            var $a_lang = $('div>a[data-language="' + lang + '"]', ui.languageSelectorBlock);
            $a_lang.attr('data-enabled', 'true');
            $a_lang.show();
        });

        var _this = this;
        $('a', ui.languageSelectorBlock).each(function() {
            $(this).click(function(evt) {
                evt.preventDefault();
                var $el = $(this);
                var language = $el.attr('data-language');
                var localization = $el.attr('data-localization');
                var defaultURL = $el.attr('data-href');

                var url = settings.languageLink(language, localization, defaultURL);
                goto_url(url);
            });
        });
        $(document).click(function (evt) {
            var $el = $(evt.target);
            if (!$el.parents().hasClass(ui.languageSelectorBlock.attr('class'))) {
                $('div', ui.languageSelectorBlock).hide();
            }
        });
    }

    function getDomain(url) {
        var tmp = document.createElement('a');
        tmp.href = url;
        return tmp.hostname;
    }

    function initLanguageSelector2() {
        if (!ui.languageSelectorBlock2.length) return;
        $('img', ui.languageSelectorBlock2).click(function () {
            if ($('div>a[data-enabled=true]', ui.languageSelectorBlock2).length)
                $('div', ui.languageSelectorBlock2).toggle();
        });

        $(ui.languageSelectorBlock2).keyup(function(e) {
            var $div = $(this).children('div');
            if (e.which == '13'){
                $div.toggle();
            }
        });

        $('div>a[data-language]', ui.languageSelectorBlock2).each(function(i) {
            var $this = $(this);
            $this.removeAttr('data-enabled');
            $this.hide();
        });
        $(settings.allowedLanguages).each(function(i, lang) {
            var $a_lang = $('div>a[data-language="' + lang + '"]', ui.languageSelectorBlock2);
            $a_lang.attr('data-enabled', 'true');
            $a_lang.show();
        });

        $('a', ui.languageSelectorBlock2).each(function() {
            $(this).click(function(evt) {
                evt.preventDefault();
                var $el = $(this);
                var data_lang = $el.attr('data-language');
                var localization = $el.attr('data-localization');
                var url = getLangUrl(data_lang);
                goto_url(url);
            });
        });
        $(document).click(function (evt) {
            var $el = $(evt.target);
            if (!$el.parents().hasClass(ui.languageSelectorBlock2.attr('class'))) {
                $('div', ui.languageSelectorBlock2).hide();
            }
        });
    }

    function initLogoBorderToggle() {
        var logo_cls = $('a.logo');

        logo_cls.on('keyup', function(e) {
            if ( e.keyCode === 9 ) {
                $(this).addClass('focus');
            }
        });

        logo_cls.on('click blur', function(e) {
            $(this).removeClass('focus');
        });
    }

    function init() {
        initLanguageSelector();
        initLanguageSelector2();
        initLocaleLanguageSelector();
        initLogoBorderToggle();
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
