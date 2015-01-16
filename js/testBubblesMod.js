/*jshint camelcase: true, debug: true, browser: true, jquery: true*/
/*global d3 */
var testBubblesMod = (function (window, d3, undefined) {


    var _private = {
        dataTest : '',
        svg      : '',
        diameter : '',
        format   : d3.format(',d'),


        tick     : function () {
            var scope = this;

            scope.svg.selectAll('.node')
                .attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });
        }
    };

    var public = {
        setDataTest : function(data) {
            _private.dataTest = data;
        }
    };

    return public;

})(window, d3);



