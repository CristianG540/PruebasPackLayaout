/*jshint camelcase: true, debug: true, browser: true, jquery: true*/
/*global d3 */
(function () {
    debugger;
    var width = 960,
        height = 500,
        padding = 5.5, // separation between same-color nodes
        clusterPadding = 16, // separation between different-color nodes
        maxRadius = 12;

    var n = 200, // total number of nodes
        m = 5; // number of distinct clusters

    var color = d3.scale.category10()
        .domain(d3.range(m));

    // The largest node for each cluster.
    var clusters = new Array(m);

    var nodes = d3.range(n).map(function () {
        var i = Math.floor(Math.random() * m),
            r = Math.sqrt((i + 1) / m * -Math.log(Math.random())) * maxRadius,
            d = {
                cluster: i,
                radius: r
            };
        if (!clusters[i] || (r > clusters[i].radius)) clusters[i] = d;
        return d;
    });

    var nodesPack = d3.nest()
        .key(function (d) {
            return d.cluster;
        })
        .entries(nodes);

    // Use the pack layout to initialize node positions.
    d3.layout.pack()
        .sort(null)
        .size([width, height])
        .children(function (d) {
            return d.values;
        })
        .value(function (d) {
            return d.radius * d.radius;
        })
        .nodes({
            values: nodesPack
        });

    var force = d3.layout.force()
        .nodes(nodes)
        .size([width, height])
        .gravity(.02)
        .distance(20)
        .linkStrength(0.1)
        .friction(0.9)
        .charge(0)
        .on("tick", tick)
        .theta(0.8)
        .alpha(0.1)
        .start();

    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    var updSelectNode = svg.selectAll(".node")
        .data(nodes);

    var nodeGroup = updSelectNode.enter()
        .append("g")
        .attr("class", "node")
        .call(force.drag);

    var nodeCircle = nodeGroup.append("circle")
        .style("fill", function (d) {
            return color(d.cluster);
        });

    /*nodeGroup.append("text")
        .attr("dy", ".3em")
        .style("text-anchor", "middle")
        .text('banano');*/

    nodeCircle.transition()
        .duration(750)
        .delay(function (d, i) {
            return i * 5;
        })
        .attrTween("r", function (d) {
            var i = d3.interpolate(0, d.radius);
            return function (t) {
                return d.radius = i(t);
            };
        });

    function tick(e) {
        nodeGroup
            .each(cluster(10 * e.alpha * e.alpha))
            .each(collide(.5))
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    }

    // Move d to be adjacent to the cluster node.
    function cluster(alpha) {
        return function (d) {
            var cluster = clusters[d.cluster];
            if (cluster === d) return;
            var x = d.x - cluster.x,
                y = d.y - cluster.y,
                l = Math.sqrt(x * x + y * y),
                r = d.radius + cluster.radius;
            if (l != r) {
                l = (l - r) / l * alpha;
                d.x -= x *= l;
                d.y -= y *= l;
                cluster.x += x;
                cluster.y += y;
            }
        };
    }

    // Resolves collisions between d and all other circles.
    function collide(alpha) {
        var quadtree = d3.geom.quadtree(nodes);
        return function (d) {
            var r = d.radius + maxRadius + Math.max(padding, clusterPadding),
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;
            quadtree.visit(function (quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== d)) {
                    var x = d.x - quad.point.x,
                        y = d.y - quad.point.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.radius + quad.point.radius + (d.cluster === quad.point.cluster ? padding : clusterPadding);
                    if (l < r) {
                        l = (l - r) / l * alpha;
                        d.x -= x *= l;
                        d.y -= y *= l;
                        quad.point.x += x;
                        quad.point.y += y;
                    }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        };
    }
})();
