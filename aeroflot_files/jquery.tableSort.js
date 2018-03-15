!function($) {
    var dataKey = 'tableSort';

    var TableSort = function(element, options) {
        this.element = this.e = element;
        this.$element = this.$e = $(element);

        this.options = this.o = $.extend(true, {}, TableSort.DEFAULTS, options);

        this.init();
        this.listen();

        if (this.o.columnIndexOrder != null) {
            this.sort(this.o.columnIndexOrder);
        }
    };

    TableSort.sortType = {
        simple: function(x, y, sorting) {
            if (x == y) {
                return 0
            } else {
                return (x > y ? 1 : -1) * (sorting === 'asc' ? 1 : -1)
            }
        },
        int: function(x, y, sorting) {
            var int1 = +x,
                int2 = +y,
                minus = '‒';

            // если конвертация не получилась, скорее всего это из-за минуса
            if (isNaN(int1)) int1 = +x.replace(minus, '-');
            if (isNaN(int2)) int2 = +y.replace(minus, '-');

            return (int1 > int2 ? 1 : int1 < int2 ? -1 : 0) * (sorting === 'asc' ? 1 : -1);
        },
        dateRu: function dateRuAsc(x, y, sorting) {
            var date1 = x ? x.split('.') : 0,
                date2 = y ? y.split('.') : 0;

            if (date1) date1 = +new Date(date1[2], date1[1] - 1, date1[0]);
            if (date2) date2 = +new Date(date2[2], date2[1] - 1, date2[0]);

            if (date1 == date2) {
                return 0;
            } else {
                return (date1 > date2 ? 1 : -1) * (sorting === 'asc' ? 1 : -1)
            }
        }
    };

    TableSort.DEFAULTS = {
        columnIndexOrder: null,
        columns: {}
    };

    TableSort.prototype.init = function() {
        var that = this;

        this.$columns = this.$e.find('thead th');
        if (this.$columns.length === 0) {
            throw new Error('Table structure must have "thead" and "th" tags');
        }

        this.$rows = this.$e.find('tbody tr');
        this.$columns.not('.not-sortable').addClass('sortable unselect');
        this.$columns.each(function(index) {
            that.o.columns[index] = {
                type: $(this).data('sort_type') || 'simple',
                direction: 'desc'
            };
        });
    };

    TableSort.prototype.listen = function() {
        this.$columns.bind('click', $.proxy(this.clickColumnEvent, this));
    };

    TableSort.prototype.refresh = function() {
        this.$columns.unbind('click', $.proxy(this.clickColumnEvent, this));
        this.init();
        this.listen();
    };

    TableSort.prototype.sort = function(columnIndex) {
        this.$columns.eq(columnIndex).click();
    };

    TableSort.prototype.clickColumnEvent = function(event) {
        var that = this,
            $target = $(event.target),
            colIndex = this.$columns.index($target),
            colOptions = this.o.columns[colIndex],
            content = [];

        if ($target.hasClass('not-sortable')) return false;

        // сборка данных
        this.$rows.each(function() {
            content.push(
                $(this).children('td').map(function() { return $(this).text() }).get()
            );
        });

        // определение сортировки
        var direction;
        if ($target.hasClass('desc')) {
            direction = 'asc';
        } else if ($target.hasClass('asc')) {
            direction = 'desc'
        } else {
            direction = colOptions['direction'];
        }

        this.$columns.removeClass('asc desc');
        $target.addClass(direction);

        var sorter = TableSort.sortType[colOptions['type']];
        content.sort(function(x, y) {
            return sorter(x[colIndex], y[colIndex], direction);
        });

        // рендеринг
        this.$rows.each(function(rowIndex) {
            var $cells = $(this).children('td');

            that.$columns.each(function(index) {
                $cells.eq(index).text(content[rowIndex][index]);
            });
        });
    };

    $.fn.tableSort = function(option) {
        var args = arguments;

        return this.each(function() {
            var $this = $(this),
                data = $this.data(dataKey),
                options = typeof option == 'object' && option;

            if (!data) $this.data(dataKey, (data = new TableSort(this, options)));

            if (typeof options === 'string') {
                args.length > 1 ? data[option].apply(data, [].slice.call(args, 1)) : data[option]();
            }
        })
    };
    $.fn.tableSort.Constructor = TableSort;

}(jQuery);
