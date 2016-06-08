$(function () {
	console.log('stats');

	var margin = {top: 20, right: 20, bottom: 100, left: 40},
    width = 1100 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;

// Parse the date / time
var	parseDate = d3.time.format("%Y-%m-%d").parse;
var	parseDate = d3.time.parse;

var x = d3.scale.ordinal().rangeRoundBands([0, width], .05);

var y = d3.scale.linear().range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .ticks(d3.time.day)
    .orient("bottom")
    .tickFormat(d3.time.format("%Y-%m-%d"));

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(10);

var svg = d3.select("#graph").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", 
          "translate(" + margin.left + "," + margin.top + ")");


    data = players.map(function (el) {
    	return {
    		date : new Date(el.soldTime),
    		value: 1
    	}
    });
    d = {};
    for (var i in data) {
    	d[moment(data[i].date).startOf('days').format()] = d[moment(data[i].date).startOf('days').format()] || 0;
    	d[moment(data[i].date).startOf('days').format()]++;
    }
    debugger;
	data = [];
    for (var i in d) {
    	data.push({value : d[i], date : new Date(i)})
    }
    data.sort(function(a, b ) { return +a.date > +b.date });
	
  x.domain(data.map(function(d) { return d.date; }));
  y.domain([0, d3.max(data, function(d) { return d.value; })]);

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", "-.55em")
      .attr("transform", "rotate(-65)" );

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Проданных бандитов");

  svg.selectAll(".bar")
      .data(data)
    .enter().append("rect")
      .style("fill", "steelblue")
      .attr("x", function(d) { return x(d.date); })
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d.value); })
      .attr("height", function(d) { return height - y(d.value); });

  svg.selectAll("text.bar")
      .data(data)
    .enter().append("text")
      .attr("class", "bar")
      .attr("text-anchor", "middle")
      .attr("y", function(d) { return y(d.value) })
      .attr("x", function(d) { return x(d.date) })
      .text(function(d) { return d.value; })
      .attr('transform', 'translate(' + x.rangeBand() / 2 + ', 40)');

});