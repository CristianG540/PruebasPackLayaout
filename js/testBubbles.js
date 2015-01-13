/*jshint camelcase: true, debug: true, browser: true, jquery: true*/
/*global d3 */
(function () {
    var dataTest = {
        "children": [
            {
                "packageName": "Síntoma",
                "className": "Acné",
                "value": 12
        },
            {
                "packageName": "Enfermedad",
                "className": "Acido Urico Alto",
                "value": 4
        },
            {
                "packageName": "Enfermedad",
                "className": "ACV o Derrames",
                "value": 7
        },
            {
                "packageName": "Síntoma",
                "className": "Aftas",
                "value": 4
        },
            {
                "packageName": "Síntoma",
                "className": "Agrandamiento de la próstata",
                "value": 9
        },
            {
                "packageName": "Síntoma",
                "className": "Agrietamiento en la esquina de los labios ",
                "value": 3
        },
            {
                "packageName": "Síntoma",
                "className": "Alergia o congestión por el polvo o mohos",
                "value": 6
        },
            {
                "packageName": "Enfermedad",
                "className": "Alergias y Gripas",
                "value": 6
        },
            {
                "packageName": "Síntoma",
                "className": "Alimentos sin digerir en la deposición",
                "value": 2
        },
            {
                "packageName": "Enfermedad",
                "className": "Alzheimer",
                "value": 24
        },
            {
                "packageName": "Síntoma",
                "className": "Amanece cansad@",
                "value": 23
        },
            {
                "packageName": "Enfermedad",
                "className": "Anemia",
                "value": 8
        },
            {
                "packageName": "Síntoma",
                "className": "Angina de pecho o dolor en el pecho",
                "value": 13
        },
            {
                "packageName": "Síntoma",
                "className": "Ansiedad, preocupaciones con facilidad",
                "value": 21
        },
            {
                "packageName": "Síntoma",
                "className": "Antojo de carbohidratos",
                "value": 3
        },
            {
                "packageName": "Enfermedad",
                "className": "Apnea del Sueño",
                "value": 9
        },
            {
                "packageName": "Enfermedad",
                "className": "Arritmia cardíaca",
                "value": 3
        },
            {
                "packageName": "Enfermedad",
                "className": "Artritis Reumatoidea",
                "value": 14
        },
            {
                "packageName": "Enfermedad",
                "className": "Artrosis",
                "value": 13
        },
            {
                "packageName": "Enfermedad",
                "className": "Asma bronquial",
                "value": 7
        },
            {
                "packageName": "Síntoma",
                "className": "Ataques de estornudos",
                "value": 6
        },
            {
                "packageName": "Enfermedad",
                "className": "Autismo",
                "value": 20
        },
            {
                "packageName": "Síntoma",
                "className": "Baja alegría de vivir",
                "value": 10
        },
            {
                "packageName": "Síntoma",
                "className": "Baja capacidad de hacer deporte",
                "value": 10
        },
            {
                "packageName": "Síntoma",
                "className": "Baja capacidad de trabajo",
                "value": 10
        },
            {
                "packageName": "Síntoma",
                "className": "Baja inmunidad",
                "value": 10
        },
            {
                "packageName": "Síntoma",
                "className": "Baja presión arterial",
                "value": 10
        },
            {
                "packageName": "Síntoma",
                "className": "Baja resistencia",
                "value": 10
        },
            {
                "packageName": "Síntoma",
                "className": "Bajo deseo sexual",
                "value": 10
        },
            {
                "packageName": "Síntoma",
                "className": "Bolsas u ojeras debajo de los ojos",
                "value": 6
        },
            {
                "packageName": "Síntoma",
                "className": "Caída del cabello,",
                "value": 16
        },
            {
                "packageName": "Síntoma",
                "className": "Calambres musculares",
                "value": 2
        },
            {
                "packageName": "Enfermedad",
                "className": "Cálculos biliares",
                "value": 4
        },
            {
                "packageName": "Enfermedad",
                "className": "Cálculos renales",
                "value": 5
        },
            {
                "packageName": "Síntoma",
                "className": "Callos gruesos / resequedad en talones / fisuras",
                "value": 13
        },
            {
                "packageName": "Síntoma",
                "className": "Cambios de humor",
                "value": 10
        },
            {
                "packageName": "Síntoma",
                "className": "Cambios del estado de ánimo",
                "value": 11
        },
            {
                "packageName": "Enfermedad",
                "className": "Cáncer",
                "value": 24
        },
            {
                "packageName": "Enfermedad",
                "className": "Cataratas",
                "value": 3
        },
            {
                "packageName": "Síntoma",
                "className": "Cefalea tensional / dolor atrás de la cabeza",
                "value": 18
        },
            {
                "packageName": "Enfermedad",
                "className": "Ciática",
                "value": 3
        },
            {
                "packageName": "Enfermedad",
                "className": "Cirrosis del hígado",
                "value": 20
        },
            {
                "packageName": "Enfermedad",
                "className": "Cistitis a Repetición",
                "value": 5
        }
      ]
    };

    var diameter = 960,
        format = d3.format(",d"),
        color = d3.scale.category20c();

    var bubble = d3.layout.pack()
        .sort(null)
        .size([diameter, diameter])
        .padding(1.5)
        .nodes(dataTest)
        .filter(function (d) {
            // Segun lo que entiendo este filter elimina algo asi como el objeto padre del diagrama de borbujas
            return !d.children;
        });

    var svg = d3.select("#interactive").append("svg")
        .attr("width", diameter)
        .attr("height", diameter)
        .attr("class", "bubble");

    var node = svg.selectAll(".node")
        .data(bubble)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

    node.append("title")
        .text(function (d) {
            return d.className + ": " + format(d.value);
        });

    node.append("circle")
        .attr("r", function (d) {
            return d.r;
        })
        .style("fill", function (d) {
            return color(d.packageName);
        });

    node.append("text")
        .attr("dy", ".3em")
        .style("text-anchor", "middle")
        .text(function (d) {
            return d.className.substring(0, d.r / 3);
        });

})();
