/*
    Copyright (c) 2012 Jeremie Patonnier
    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
    
    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
*/

(function ($) {
    'use strict';

    $.fn.scrollPoint = function (params) {
        var $window = $(window);

        params = $.extend({
            up         : false,
            down       : false,
            offsetUp   : 0,
            offsetDown : 0
        }, params);

        return this.each(function () {
            var up         = params.up,
                down       = params.down,
                isIn       = false,
                element    = $(this);

            if (!up && up !== 0) {
                up = element.offset().top;
            }

            if (!down && down !== 0) {
                down = up + element.outerHeight();
            }

            up   -= params.offsetUp;
            down -= params.offsetDown;

            function triggerEvent(eventType, eventParams) {
                var n, Event = $.Event(eventType);

                for(n in eventParams) {
                    Event[n] = eventParams[n];
                }

                element.trigger(Event);
            }

            function checkScroll() {
                var pos   = $window.scrollTop(),
                    oldIn = isIn,
                    param = {
                        isUp   : pos <= up,
                        isDown : pos >= down,
                        isIn   : false
                    };

                isIn = param.isIn = !param.isUp && !param.isDown;

                if (oldIn !== isIn) {
                    triggerEvent("scrollPoint" + (isIn ? "Enter" : "Leave"), param);
                }

                triggerEvent("scrollPointMove", param);
            }

            $window.scroll(checkScroll);
        });
    };
})(jQuery);