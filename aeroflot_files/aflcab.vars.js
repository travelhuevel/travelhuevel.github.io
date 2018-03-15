var __LK_PARAMS__ = {
        'cookie.collapse': 'AF_new_collapse',
        'cookie.profileTab': 'AF_info_selected_tab',
        'datepicker.firstDay': 0,
        'fias.enabled': true,
        'validator_services.response_timeout': 5,
    },
    __LK_PAGE_TIMESTAMP__ = Date.now(),
    __DEFAULT_DATEPICKER_OPTIONS__ = {
        minDate: '-100Y',
        maxDate: 0,
        yearRange: '-100:+0',
        defaultDate: 0,
        showOtherMonths: true,
        inputMask: true,
        onChangeMonthYear: function (year, month, inst) {
            var curDate = $(this).datepicker('getDate');
            if (curDate == null) return;
            if (curDate.getYear() != year || curDate.getMonth() != month - 1) {
                curDate.setYear(year);
                curDate.setMonth(month - 1);
                $(this).datepicker('setDate', curDate);
            }
        }
    };