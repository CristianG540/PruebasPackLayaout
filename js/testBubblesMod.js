/*jshint camelcase: true, debug: true, browser: true, jquery: true, indent: 4*/
/*global d3, _ */
var testBubblesMod = (function (window, d3, _, SidebarMenuEffects, undefined) {

    var _private = {
        COLOR           : d3.scale.category20c(),
        FORMAT          : d3.format(',d'),
        data            : '',
        dataLinks       : '',
        margin          : { top: 50, right: 50, bottom: 0, left: 50 },
        width           : 1400,
        height          : 800,
        label           : '',
        node            : '',
        links           : '',
        //Toggle stores whether the highlighting is on
        toggle          : 0,
        activeNodes     : [],
        /**
         * Esta funcion realiza dos acciones diferentes dependiendo de los
         * parametros que se le envien:
         * 1: Si el atributo 'search' no se envia y el objeto en el
         * atributo 'data' no existe en el array 'activeNodes' entonces
         * la funcion agrega el objeto que se le paso en el atributo 'data'
         * al array 'activeNodes'.
         * 2: Si el atrubuto 'search' se pasa entonces la funcion devuelve un
         * numero que informa si el objeto dentro atributo 'data' ya existe en
         * el array 'activeNodes'.
         * @param   {Object} data   Este atributo recibe un objeto que contiene un nodo de la grafica
         * @param   {Boolean} search Este atributo le indica a la funcion si debe agregar un objeto al array 'activeNodes' o simplemente decir si el objeto en el atributo 'data' ya existe dentro del array 'activeNodes'
         * @returns {Number} retorna el resultado de un indexOf del atributo 'data' al array 'activeNodes'
         */
        calcActiveNodes  : function(data, search){
            var scope = this,
                ifExist = scope.activeNodes.indexOf(data);

            if(!search && ifExist === -1){
                scope.activeNodes.push(data);
            }

            return ifExist;

        },
        //Create an array logging what is connected to what
        linkedByIndex   : {},
        //This function looks up whether a pair are neighbours
        neighboring     : function(a, b) {
            return this.linkedByIndex[a.index + "," + b.index];
        },
        connectedNodes  : function(element) {
            var scope = this,
                d;

            function computeRelations(evalRel, data){
                if(evalRel == 1){
                    scope.calcActiveNodes(data);
                }
                if(scope.calcActiveNodes(data, true) !== -1){
                    evalRel = 1;
                }
                return evalRel;
            }

            d = d3.select(element).node().__data__;

            scope.node
                .transition(500)
                .style('opacity', function (o) {
                    var evalRel = scope.neighboring(d, o) || scope.neighboring(o, d) ? 1 : 0.1;
                    return computeRelations(evalRel, o);
                });

            scope.label
                .transition(500)
                .style('opacity', function (o) {
                    var evalRel = scope.neighboring(d, o) || scope.neighboring(o, d) ? 1 : 0.1;
                    return computeRelations(evalRel, o);
                });

            scope.links
                .transition(500)
                .style('stroke-opacity', function (o) {
                    var evalRel = d.index==o.source.index || d.index==o.target.index ? 1 : 0;
                    return computeRelations(evalRel, o);
                });

            //Reduce the op
            scope.toggle = 1;

        },
        // Busca el nodo seleccionado en el autocomplete
        searchNode : function() {
            var selectedNode,
                selectedLabel,
                scope = this,
                selectedVal = document.getElementById('search').value;

            function resetOpacity(element){
                element
                    .transition()
                    .duration(5000)
                    .style("opacity", 1);
            }

            selectedNode = scope.node
                .filter(function (d, i) {
                    return scope.idValue(d) != selectedVal;
                });

            selectedLabel = scope.label
                .filter(function (d, i) {
                    return scope.idValue(d) != selectedVal;
                });

            selectedNode
                .style("opacity", "0");
            selectedLabel
                .style("opacity", "0");
            scope.links
                .style("opacity", "0");

            scope.node
                .call(resetOpacity);
            scope.label
                .call(resetOpacity);
            scope.links
                .call(resetOpacity);

        },
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
            return d.name;
        },
        /**
         * funcion para definir el tipo de nodo, con esto puedo darle propiedades diferente a cada
         * nodo y la funcion me permite cambiar el key del data set con facilidad
         * @param   {Object}   d [[Description]]
         * @returns {[[Type]]} [[Description]]
         */
        nodeType        : function(d){
            return d.packageName;
        },
        // constants to control how
        // collision look and act
        COLLISION_PADDING : 24,
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
            var scope = this;
            location.replace('#');

            scope.node
                .transition(500)
                .style('opacity', 1);
            scope.label
                .transition(500)
                .style('opacity', 1);
            scope.links
                .transition(500)
                .style('stroke-opacity', 0);

            scope.activeNodes = [];
            scope.toggle = 0;

        },
        // this scale will be used to size our bubbles
        rScale          : function(){
            var scope = this;
            return  d3.scale.sqrt()
                        .range([0, scope.maxRadius]);
        },
        // The force variable is the force layout controlling the bubbles
        // here we disable gravity and charge as we implement custom versions
        // of gravity and collisions for this visualization
        force           : function(){
            var scope = this;

            // Para un poco mas de info y snnipets de codigo mirar es ta url http://www.coppelia.io/2014/07/an-a-to-z-of-extra-features-for-the-d3-force-layout/

            return d3.layout.force()
                .gravity(0)
                .charge(0)
                .size([scope.width, scope.height])
                // Aqui llamo la funcion tick desde una funcion anonima, por q si la llamo desde el .on cuando este dentro de la funcion tick el this de la funcion se remplasa por el elemento html en la seleccion del .on
                .on('tick', function(e){
                    scope.tick(e, scope);
                });

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
                d.value = parseInt(d.value);
                return rawData.sort(function() {
                    return 0.5 - Math.random();
                });
            });
            return rawData;
        },

        getLinks        : function(links, nodes){
            var scope = this;
            /**
             * Este map esta haciendo un findwhere en el objeto con los nodos, esto me devuelve el nodo al que
             * hago referencia en el objeto de links ej. en links tengo el key source, si le mando el valor de
             * source al findWhere este me devuelve el nodo donde el nombre sea el mismo y ya con ese nodo puedo
             * hacer un indexOf al objeto de nodos y asi saber q posicion tiene ese nodo en el array.
             * nodo y la funcion me permite cambiar el key del data set con facilidad
             * @returns {Object} Me devuelve un objeto con la siguiente estructura { 'source' : 0, 'target' : 0 }
             * donde 'source' tiene el nodo donde se inicia la conexion del link
             * y 'target' tiene el node con el que se conectara
             */
            var linksByIndex = _.map(links, function(link, key, list){

                var originalSrcNode = _.findWhere(nodes, link.source);
                var originalTrgtNode = _.findWhere(nodes, link.target);

                var linkIndex = {
                    'source' : _.indexOf(nodes, originalSrcNode),
                    'target' : _.indexOf(nodes, originalTrgtNode)
                };

                return linkIndex;
            });

            return linksByIndex;

        },
        // ---
        // tick callback function will be executed for every
        // iteration of the force simulation
        // - moves force nodes towards their destinations
        // - deals with collisions of force nodes
        // - updates visual bubbles to reflect new force node locations
        // ---
        tick            : function (e, scope) {

            var dampenedAlpha = e.alpha * 0.1;

            // Most of the work is done by the gravity and collide
            // functions.
            scope.node
                .each(scope.gravity(dampenedAlpha))
                .each(scope.collide(scope.jitter))
                .attr('transform', function(d){

                    // Aqui lo que hago es encerrar los nodos en un rectangulo por asi decirlo
                    // en el siguiente enlace hay mas info http://stackoverflow.com/questions/13488862/bounding-box-in-d3-js
                    var radius = scope.rScale(parseInt(d.value));
                    d.x = Math.max(radius, Math.min(scope.width - radius, d.x));
                    d.y = Math.max(radius, Math.min(scope.height - radius, d.y));

                    return 'translate('+d.x+', '+d.y+')';
                });

                //return scope.rScale(parseInt(d.value));


            // Se agregan los links a las graficas 'las lineas de las imagenes jajaja'
            scope.links
                .attr("x1", function (d) {
                    return d.source.x;
                })
                .attr("y1", function (d) {
                    return d.source.y;
                })
                .attr("x2", function (d) {
                    return d.target.x;
                })
                .attr("y2", function (d) {
                    return d.target.y;
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
                scope.rScale = scope.rScale();
                scope.force = scope.force();

                scope.width = scope.width - scope.margin.left - scope.margin.right;
                scope.height = scope.height - scope.margin.top - scope.margin.bottom;


                //first, get the data in the right format
                scope.data = scope.transformData(d.nodes);

                scope.dataLinks = d.links;

                // setup the radius scale's domain now that
                // we have some data
                maxDomainValue = d3.max(scope.data, function(d){
                    return parseInt(d.value);
                });

                scope.rScale
                    .domain([0, maxDomainValue]);

                // a fancy way to setup svg element
                svg = d3.select(this).selectAll('svg').data([scope.data]);
                svgEnter =  svg.enter().append('svg');
                svg
                    .attr( 'width', scope.width + scope.margin.left + scope.margin.right )
                    .attr( 'height', scope.height + scope.margin.top + scope.margin.bottom );

                // node will be used to group the bubbles
                scope.node = svgEnter.append('g')
                    .attr('id', 'bubble-nodes')
                    .attr('transform', 'translate('+scope.margin.left+', '+scope.margin.right+')');

                // clickable background rect to clear the current selection
                scope.node.append('rect')
                    .attr('id', 'bubble-background')
                    .attr('width', scope.width)
                    .attr('height', scope.height)
                    .style("stroke", "#000")
                    .on('click', function(){
                        scope.clear();
                    });


                // label is the container div for all the labels that sit on top of
                // the bubbles
                // - remember that we are keeping the labels in plain html and
                //  the bubbles in svg

                scope.label = d3.select(this).selectAll('#bubble-labels')
                    .data([scope.data])
                    .enter()
                        .append('div')
                        .attr('id', 'bubble-labels');

                scope.update();

                // see if url includes an id already
                scope.hashchange();

                // automatically call hashchange when the url has changed
                d3.select(window)
                    .on('hashchange', function(){
                        scope.hashchange();
                    });

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


            scope.dataLinks = scope.getLinks(scope.dataLinks, scope.data);

            //start up the force layout
            scope.force
                .nodes(scope.data)
                .links(scope.dataLinks)
                .linkDistance(50)
                .start();

            // call our update methods to do the creation and layout work
            scope.updateNodes();
            scope.updateLabels();

        },
        // ---
        // updateNodes creates a new bubble for each node in our dataset
        // ---
        updateNodes  : function(){
            var scope = this;

            scope.links = scope.node
                .append('g')
                .classed('group-links', true)
                .selectAll('.bubble-links')
                    .data(scope.force.links());

            scope.links.exit().remove();

            scope.links.enter()
                .append('line')
                .attr('class', 'bubble-links');

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
                .attr('id', function(d){
                    return scope.nodeType(d);
                })
                .attr('xlink:href', function(d){
                    return "#" + (encodeURIComponent(scope.idValue(d)));
                })
                .call(scope.force.drag)
                .call(scope.connectEvents, scope)
                .append('circle')
                .attr('r', function(d){
                    return scope.rScale(parseInt(d.value));
                });

            //Create an array logging what is connected to what
            for (var i = 0; i < scope.data.length; i++) {
                scope.linkedByIndex[i + "," + i] = 1;
            }

            scope.dataLinks.forEach(function (d) {
                scope.linkedByIndex[d.source.index + "," + d.target.index] = 1;
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
                .classed('bubble-label', true)
                .classed('noselect', true)
                .attr('href', function(d) {
                    return '#' + (encodeURIComponent(scope.idValue(d)));
                })
                .call(scope.force.drag)
                .call(scope.connectEvents, scope);

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
                    return Math.max(8, scope.rScale(parseInt(d.value) / 5)) + 'px';
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
        connectEvents  : function(element, scope){

            // Bueno tal vez el que lea esto o yo mismo me pregunte algun dia,
            // "OH pero por q coño llamo las funciones de los eventos desde una funcion anonima y no directamente desde el .on"
            // pues mi estimado lector eso es por que eres una marica, no mentiras solo bromeo, lo llamo desde una funcion anonima
            // por q si le inserto la funcion al .on directamente cuando este dentro la funcion el 'this' ya no ni los metodos ni los atributos del scope
            // osea pues no tiene el objeto _private si no q el 'this' se remplaza por el elemento actual donde actual es el elemento al q se le insero la funcion, un circulo o lo q seaA
            // tons por eso si lo llamo desde una funcion anonima puedo usar el 'this' que me da el .on y el 'scope' de la clase

            element.on("click", function(d){
                scope.click(d);
            });
            element.on("mouseover", function(d){
                scope.mouseover(d, this);
            });
            element.on("mouseout", function(d){
                scope.mouseout(d);
            });

            element.on('dblclick', function(){
                scope.connectedNodes(this);
            });
            /*
            d.on("click", scope.click);
            d.on("mouseover", scope.mouseover);
            d.on("mouseout", scope.mouseout);
            */

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
        mouseover      : function(d, elem) {
            var scope = this;

            scope.node
                .classed("bubble-hover", function(p) {
                    return p === d;
                })
                .attr('data-effect', function(p){
                    return ( p === d && scope.nodeType(d) === 'enfermedad' ) ? 'st-effect-11' : null;
                });

            scope.node.select('circle')
                .transition(500)
                .attr('r', function(p){
                    var actMargin = scope.rScale(parseInt(p.value));

                    if(p === d){
                        actMargin = scope.rScale(parseInt(d.value));
                        return actMargin * 1.2;
                    }
                    return actMargin;
                });

            SidebarMenuEffects.init();
        },
        // ---
        // remove hover class
        // ---
        mouseout       : function(d) {
            var scope = this;
            scope.node
                .classed("bubble-hover", false)
                .attr('data-effect', null);

            scope.node.select('circle')
                .transition(500)
                .attr('r', function(p){
                    var actMargin = scope.rScale(parseInt(p.value));

                    return actMargin;
                });
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
                .classed("bubble-selected-enferm", function(d) {
                    return id === scope.idValue(d) && scope.nodeType(d) === 'enfermedad';
                })
                .classed("bubble-selected-sintom", function(d) {
                    return id === scope.idValue(d) && scope.nodeType(d) === 'sintoma';
                });

            if (id.length > 0) {
                return d3.select("#menu-11 > h2")
                    .text(id);
            } /*else {
                return d3.select("#status")
                    .html("<h3>No hay ninguna burbuja seleccionada</h3>");
            }*/
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
        // ---
        // Busca el nodo seleccionado en el autocomplete
        // ---
        search : function() {
            _private.searchNode();
        }

    };

    return public;

})(window, d3, _, SidebarMenuEffects);
