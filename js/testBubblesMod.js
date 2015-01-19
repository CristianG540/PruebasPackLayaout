/*jshint camelcase: true, debug: true, browser: true, jquery: true*/
/*global d3 */
var testBubblesMod = (function (window, d3, undefined) {


    var _private = {
        COLOR           : d3.scale.category20c(),
        FORMAT          : d3.format(',d'),
        data            : '',
        width           : 960,
        height          : 510,
        margin          : { top: 5, right: 0, bottom: 0, left: 0 },
        label           : '',
        node            : '',
        // largest size for our bubbles
        maxRadius       : 65,
        // function to define the 'id' of a data element
        //  - used to bind the data uniquely to the force nodes
        //   and for url creation
        //  - should make it easier to switch out dataset
        //   for your own
        idValue         : function(d) {
            return d.className;
        },
        // function to define what to display in each bubble
        //  again, abstracted to ease migration to
        //  a different dataset if desired
        textValue       : function(d){
            return d.className;
        },
        // constants to control how
        // collision look and act
        COLLISION_PADDING : 4,
        MIN_COLLISION_RADIUS : 12,
        // variables that can be changed
        // to tweak how the force layout
        // acts
        // - jitter controls the 'jumpiness'
        //  of the collisions
        jitter          : 0.5,
        // ---
        // clears currently selected bubble
        // ---
        clear           : function(){
            location.replace('#');
        },
        rScale          : function(){
            var scope = this;
            return d3.scale.sqrt()
                .range([0, scope.maxRadius]);
        },
        // The force variable is the force layout controlling the bubbles
        // here we disable gravity and charge as we implement custom versions
        // of gravity and collisions for this visualization
        force           : function(){
            var scope = this;

            return d3.layout.force()
                .gravity(0)
                .charge(0)
                .size([scope.width, scope.height])
                .on('tick', scope.tick);

        },
        // ---
        // custom gravity to skew the bubble placement
        // ---
        gravity         : function(alpha){
            // start with the center of the display
            var scope = this,
                cx    = scope.width / 2,
                cy    = scope.height / 2,
                ax    = alpha / 8,
                ay    = alpha;

            // return a function that will modify the
            // node's x and y values
            return function(d){
                d.x += (cx - d.x) * ax;
                d.y += (cy - d.y) * ay;
            };


        },
        // ---
        // custom collision function to prevent
        // nodes from touching
        // This version is brute force
        // we could use quadtree to speed up implementation
        // (which is what Mike's original version does)
        // ---
        collide         : function(jitter){
            var scope = this;
            // return a function that modifies
            // the x and y of a node
            return function(d){
                scope.data.forEach(function(d2){
                    var x,y,distance,minDistance,moveX,moveY;
                    // check that we aren't comparing a node
                    // with itself

                    if(d != d2) {
                        // use distance formula to find distance
                        // between two nodes
                        x = d.x - d2.x;
                        y = d.y - d2.y;
                        distance = Math.sqrt(x * x + y * y);
                        // find current minimum space between two nodes
                        // using the forceR that was set to match the
                        // visible radius of the nodes
                        minDistance = d.forceR + d2.forceR + scope.COLLISION_PADDING;

                        // if the current distance is less then the minimum
                        // allowed then we need to push both nodes away from one another
                        if(distance < minDistance){
                            // scale the distance based on the jitter variabl
                            distance = (distance - minDistance) / distance * jitter;
                            // move our two nodes
                            moveX = x * distance;
                            moveY = y * distance;
                            d.x -= moveX;
                            d.y -= moveY;
                            d2.x += moveX;
                            d2.y += moveY;
                        }
                    }
                });
            };

        },
        // ---
        // tweaks our dataset to get it into the
        // format we want
        // - for this dataset, we just need to
        //  ensure the count is a number
        // - for your own dataset, you might want
        //  to tweak a bit more
        // ---
        transformData   : function(rawData){
            rawData.forEach(function(d) {
                d.count = parseInt(d.count);
                return rawData.sort(function() {
                    return 0.5 - Math.random();
                });
            });
            return rawData;
        },
        // ---
        // tick callback function will be executed for every
        // iteration of the force simulation
        // - moves force nodes towards their destinations
        // - deals with collisions of force nodes
        // - updates visual bubbles to reflect new force node locations
        // ---
        tick            : function (e) {
            var scope = this,
                dampenedAlpha = e.alpha * 0.1;

            // Most of the work is done by the gravity and collide
            // functions.
            scope.node
                .each(scope.gravity(dampenedAlpha))
                .each(scope.collide(scope.jitter))
                .attr('transform', function(d){
                    return 'translate('+d.x+', '+d.y+')';
                });

            // As the labels are created in raw html and not svg, we need
            // to ensure we specify the 'px' for moving based on pixels
            scope.label
                .style('left', function(d){
                    return ( (scope.margin.left + d.x) - d.dx / 2 ) + 'px';
                })
                .style('top', function(d){
                    return ( (scope.margin.top + d.y) - d.dy / 2 ) + 'px';
                });
        },
        chart           :  function(selection) {
            var scope = this;

            selection.each(function (d, i){

                var svg,
                    svgEnter,
                    maxDomainValue;

                //first, get the data in the right format
                scope.data = scope.transformData(d);

                // setup the radius scale's domain now that
                // we have some data
                maxDomainValue = d3.max(scope.data, function(d){
                    return parseInt(d.value);
                });
                scope.rScale
                    .domain([0, maxDomainValue]);

                // a fancy way to setup svg element
                svg = d3.select(this).selectAll('svg').data(scope.data);
                svgEnter =  svg.enter().append('svg');
                svg
                    .attr( 'width', scope.width + scope.margin.left + scope.margin.right )
                    .attr( 'height', scope.width + scope.margin.top + scope.margin.bottom );

                // node will be used to group the bubbles
                scope.node = svgEnter.append('g')
                    .attr('id', 'bubble-nodes')
                    .attr('transform', 'translate('+scope.margin.left+', '+scope.margin.right+')');

                // clickable background rect to clear the current selection
                scope.node.append('rect')
                    .attr('id', 'bubble-background')
                    .attr('width', scope.width)
                    .attr('height', scope.height)
                    .on('click', scope.clear);


                // label is the container div for all the labels that sit on top of
                // the bubbles
                // - remember that we are keeping the labels in plain html and
                //  the bubbles in svg

                scope.label = d3.select(this).selectAll('#bubble-labels')
                    .data(scope.data)
                    .enter()
                        .append('div')
                        .attr('id', 'bubble-labels');


            });
        },
        update  : function(){
            var scope = this;

            //add a radius to our data nodes that will serve to determine
            //when a collision has occurred. This uses the same scale as
            //the one used to size our bubbles, but it kicks up the minimum
            //size to make it so smaller bubbles have a slightly larger
            //collision 'sphere'
            scope.data.forEach(function(d, i){
                d.forceR = Math.max( scope.MIN_COLLISION_RADIUS, scope.rScale( parseInt(d.value) ) );
            });

            //start up the force layout
            scope.force
                .nodes(scope.data)
                .start();

            // call our update methods to do the creation and layout work
            scope.updateNodes();
            scope.updateLabels();

        },
        // ---
        // updateNodes creates a new bubble for each node in our dataset
        // ---
        updateNode  : function(){
            var scope = this;
            // here we are using the idValue function to uniquely bind our
            // data to the (currently) empty 'bubble-node selection'.
            // if you want to use your own data, you just need to modify what
            // idValue returns
            scope.node = scope.node.selectAll('.bubble-node')
                .data(scope.data, function(d){
                    return scope.idValue(d);
                });

            scope.node.exit().remove();

            // nodes are just links with circles inside.
            // the styling comes from the css
            scope.node.enter()
                .append('a')
                .attr('class', 'bubble-node')
                .attr('xlink:href', function(d){
                    return "#" + (encodeURIComponent(scope.idValue(d)));
                })
                .call(scope.force.drag)
                .call(scope.connectEvents)
                .append('circle')
                .attr('r', function(d){
                    scope.rScale(parseInt(d.value));
                });
        },
        // ---
        // updateLabels is more involved as we need to deal with getting the sizing
        // to work well with the font size
        // ---
        updateLabels : function() {
            var scope = this,
                labelEnter;

            // as in updateNodes, we use idValue to define what the unique id for each data
            // point is
            scope.label = scope.label.selectAll('.bubble-label')
                .data(scope.data, function(d) {
                    return scope.idValue(d);
                });

            scope.label.exit().remove();

            // labels are anchors with div's inside them
            // labelEnter holds our enter selection so it
            // is easier to append multiple elements to this selection
            labelEnter = scope.label.enter()
                .append('a')
                .attr('class', 'bubble-label')
                .attr('href', function(d) {
                    return '#' + (encodeURIComponent(scope.idValue(d)));
                })
                .call(scope.force.drag)
                .call(scope.connectEvents);

            labelEnter
                .append('div')
                .attr('class', 'bubble-label-name')
                .text(function(d) {
                    return scope.textValue(d);
                });

            labelEnter
                .append('div')
                .attr('class', 'bubble-label-value')
                .text(function(d) {
                    return parseInt(d.value);
                });

            // label font size is determined based on the size of the bubble
            // this sizing allows for a bit of overhang outside of the bubble
            // - remember to add the 'px' at the end as we are dealing with
            //  styling divs
            scope.label
                .style('font-size', function(d) {
                    return Math.max(8, scope.rScale(parseInt(d.value) / 2)) + 'px';
                })
                .style('width', function(d) {
                    return 2.5 * scope.rScale(parseInt(d.value)) + 'px';
                });

            // interesting hack to get the 'true' text width
            // - create a span inside the label
            // - add the text to this span
            // - use the span to compute the nodes 'dx' value
            //  which is how much to adjust the label by when
            //  positioning it
            // - remove the extra span
            scope.label
                .append('span')
                .text(function(d) {
                    return scope.textValue(d);
                })
                .each(function(d) {
                    d.dx = Math.max(2.5 * scope.rScale(parseInt(d.value)), this.getBoundingClientRect().width);
                })
                .remove();

            // reset the width of the label to the actual width
            scope.label
                .style("width", function(d) {
                    return d.dx + "px";
                });

            // compute and store each nodes 'dy' value - the
            // amount to shift the label down
            // 'this' inside of D3's each refers to the actual DOM element
            // connected to the data node
            scope.label.each(function(d) {
                d.dy = this.getBoundingClientRect().height;
            });

        },
        // ---
        // adds mouse events to element
        // ---
        connectEvents  : function(d){
            var scope = this;

            d.on("click", scope.click);
            d.on("mouseover", scope.mouseover);
            d.on("mouseout", scope.mouseout);
        },
        // ---
        // changes clicked bubble by modifying url
        // ---
        click          : function(d){
            var scope = this;
            location.replace("#" + encodeURIComponent(scope.idValue(d)));
            d3.event.preventDefault();
        },
        // ---
        // hover event
        // ---
        mouseover      : function(d) {
            var scope = this;
            scope.node
                .classed("bubble-hover", function(p) {
                    return p === d;
                });
        },
        // ---
        // remove hover class
        // ---
        mouseout       : function(d) {
            var scope = this;
            scope.node
                .classed("bubble-hover", false);
        },
        // ---
        // called when url after the # changes
        // ---
        hashchange     : function() {
            var scope = this,
                id;
            id = decodeURIComponent(location.hash.substring(1)).trim();
            scope.updateActive(id);
        },
        // ---
        // activates new node
        // ---
        updateActive   : function(id) {
            var scope = this;
            scope.node
                .classed("bubble-selected", function(d) {
                    return id === scope.idValue(d);
                });
            if (id.length > 0) {
                return d3.select("#status").html("<h3>The word <span class=\"active\">" + id + "</span> is now active</h3>");
            } else {
                return d3.select("#status").html("<h3>No word is active</h3>");
            }
        }

    };

    var public = {
        runGraphic  : function(selection){
            _private.chart(selection);
        },
        setDataTest : function(data) {
            _private.data = data;
        },
        // ---
        // public getter/setter for jitter variable
        // ---
        setJitter   : function(jitter){
            _private.jitter = jitter;
            _private.force.start();
        },
        getJitter   : function(){
            return _private.jitter;
        },
        // ---
        // public getter/setter for height variable
        // ---
        setHeight   : function(height){
            _private.height = height;
        },
        getHeight   : function(){
            return _private.height;
        },
        // ---
        // public getter/setter for width variable
        // ---
        setWidth   : function(width){
            _private.width = width;
        },
        getWidth   : function(){
            return _private.width;
        },
    };

    return public;

})(window, d3);



var graphicData = function(selector, data, graphic){
    d3.select(selector)
        .datum(data)
        .call(graphic.runGraphic);
};

$(function() {


});
