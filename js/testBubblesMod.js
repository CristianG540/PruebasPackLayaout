/*jshint camelcase: true, debug: true, browser: true, jquery: true*/
/*global d3 */
var testBubblesMod = (function (window, d3, undefined) {

    var _dataTest = '',
        _svg,
        _diameter = 960,
        _format = d3.format(",d");


    var _tick = function () {
        _svg.selectAll(".node")
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });
    };



    var setDataTest = function (data) {
        _dataTest = data;
    };

    var anotherMethod = function () {
        // public
    };

    return {
        setDataTest: setDataTest,
        anotherMethod: anotherMethod
    };

})(window, d3);



