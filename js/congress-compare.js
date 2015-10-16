
var billsandres = [{'dem_houses': 0,'total_bills': 1876,'congress': '83rd','congress_number': 83},{'dem_houses': 2,'total_bills': 2012,'congress': '84th','congress_number': 84},{'dem_houses': 2,'total_bills': 1825,'congress': '85th','congress_number': 85},{'dem_houses': 2,'total_bills': 1379,'congress': '86th','congress_number': 86},{'dem_houses': 2,'total_bills': 1658,'congress': '87th','congress_number': 87},{'dem_houses': 2,'total_bills': 1119,'congress': '88th','congress_number': 88},{'dem_houses': 2,'total_bills': 1386,'congress': '89th','congress_number': 89},{'dem_houses': 2,'total_bills': 1064,'congress': '90th','congress_number': 90},{'dem_houses': 2,'total_bills': 1037,'congress': '91st','congress_number': 91},{'dem_houses': 2,'total_bills': 851,'congress': '92nd','congress_number': 92},{'dem_houses': 2,'total_bills': 1598,'congress': '93rd','congress_number': 93},{'dem_houses': 2,'total_bills': 1669,'congress': '94th','congress_number': 94},{'dem_houses': 2,'total_bills': 1719,'congress': '95th','congress_number': 95},{'dem_houses': 2,'total_bills': 1563,'congress': '96th','congress_number': 96},{'dem_houses': 1,'total_bills': 898,'congress': '97th','congress_number': 97},{'dem_houses': 1,'total_bills': 1012,'congress': '98th','congress_number': 98},{'dem_houses': 1,'total_bills': 1020,'congress': '99th','congress_number': 99},{'dem_houses': 2,'total_bills': 1112,'congress': '100th','congress_number': 100},{'dem_houses': 2,'total_bills': 1279,'congress': '101st','congress_number': 101},{'dem_houses': 2,'total_bills': 1212,'congress': '102nd','congress_number': 102},{'dem_houses': 2,'total_bills': 996,'congress': '103rd','congress_number': 103},{'dem_houses': 0,'total_bills': 939,'congress': '104th','congress_number': 104},{'dem_houses': 0,'total_bills': 1028,'congress': '105th','congress_number': 105},{'dem_houses': 0,'total_bills': 1380,'congress': '106th','congress_number': 106},{'dem_houses': 0,'total_bills': 1069,'congress': '107th','congress_number': 107},{'dem_houses': 0,'total_bills': 1374,'congress': '108th','congress_number': 108},{'dem_houses': 0,'total_bills': 1512,'congress': '109th','congress_number': 109},{'dem_houses': 2,'total_bills': 1897,'congress': '110th','congress_number': 110},{'dem_houses': 2,'total_bills': 1851,'congress': '111st','congress_number': 111},{'dem_houses': 1,'total_bills': 1007,'congress': '112nd','congress_number': 112},{'dem_houses': 1,'total_bills': 313,'congress': '113th','congress_number': 113},{'dem_houses': -2,'total_bills': 801,'congress': '113th(proj)','congress_number': 114}];

function billsPassed(data, input, autosort, elem) {
  var margin = {left: 40, right: 20, top: 20, bottom: 60},
      width = 520 - margin.left - margin.right,
      height = 300 - margin.top - margin.bottom;


  var xBar = d3.scale.ordinal()
            .domain(data.map(function(d) { return d.congress; }))
            .rangeRoundBands([0, width], 0.1);

  var yBar = d3.scale.linear()
            .domain([0, d3.max(data, function(d) { return d.total_bills; }) + 100])
            .range([height, 0]);

  var color = d3.scale.ordinal()
            .domain([0,2])
            .range(['#B2182B','#4575B4','#8073AC']);

  var xAxis = d3.svg.axis()
                .scale(xBar)
                .orient('bottom');

  var yAxisBar = d3.svg.axis()
                .scale(yBar)
                .orient('left');

  var svgBar = d3.select(elem).append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
              .append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  svgBar.append('g')
    .attr('class', 'x axis')
    .attr('font-size', '9px')
    .attr("transform", "translate(0," + (height) + ")")
    .call(xAxis)
    .selectAll('text')
      .style("text-anchor", "end")
      .attr('transform', function(d) {
        return 'rotate(-45)';
      });

  svgBar.append('g')
      .attr('class', 'y axis')
      .attr('font-size', '9px')
      .call(yAxisBar);

  svgBar.selectAll('.bar')
      .data(data)
    .enter().append('rect')
      .attr('class','bar')
      .attr('x', function(d) { return xBar(d.congress); })
      .attr('width', xBar.rangeBand())
      .attr('y', function(d) { return yBar(d.total_bills); })
      .attr('height', function(d) { return height - yBar(d.total_bills); })
      .style('stroke', 'white')
      .style('fill', function(d) {
        if(d.dem_houses === -1) return "grey";
        else if (d.dem_houses === -2) return "bcbddc";
        else return color(d.dem_houses); });

  d3.select(input).on("change", change);

  if(autosort === true) {
      var sortTimeout = setTimeout(function() {
        d3.select(input).property("checked", true).each(change);
      }, 5000);
    }

  function change() {
    clearTimeout(sortTimeout);

    var x0 = xBar.domain(data.sort(this.checked
        ? function(a, b) { return b.total_bills - a.total_bills; }
        : function(a, b) { return d3.ascending(a.congress_number, b.congress_number); })
        .map(function(d) { return d.congress; }))
        .copy();

    var transition = svgBar.transition().duration(750),
        delay = function(d, i) { return i * 50; };


    transition.selectAll(".bar")
        .delay(delay)
        .attr("x", function(d) { return x0(d.congress); });

    transition.select(".x.axis")
        .call(xAxis)
      .selectAll("g")
        .delay(delay)
      .selectAll('text')
        .style("text-anchor", "end")
        .attr('transform', function(d) {
          return 'rotate(-45)';
        });
  }
}

billsPassed(billsandres, '#billsandresinput', true, '#billsAndRes');

var billsonly = [{'dem_houses': 0, 'total_bills': 1783, 'congress_number': 83, 'congress': "83rd"}, {'dem_houses': 2, 'total_bills': 1921, 'congress_number': 84, 'congress': "84th"}, {'dem_houses': 2, 'total_bills': 1719, 'congress_number': 85, 'congress': "85th"}, {'dem_houses': 2, 'total_bills': 1293, 'congress_number': 86, 'congress': "86th"}, {'dem_houses': 2, 'total_bills': 1566, 'congress_number': 87, 'congress': "87th"}, {'dem_houses': 2, 'total_bills': 1024, 'congress_number': 88, 'congress': "88th"}, {'dem_houses': 2, 'total_bills': 1279, 'congress_number': 89, 'congress': "89th"}, {'dem_houses': 2, 'total_bills': 994, 'congress_number': 90, 'congress': "90th"}, {'dem_houses': 2, 'total_bills': 937, 'congress_number': 91, 'congress': "91st"}, {'dem_houses': 2, 'total_bills': 764, 'congress_number': 92, 'congress': "92nd"}, {'dem_houses': 2, 'total_bills': 778, 'congress_number': 93, 'congress': "93rd"}, {'dem_houses': 2, 'total_bills': 734, 'congress_number': 94, 'congress': "94th"}, {'dem_houses': 2, 'total_bills': 806, 'congress_number': 95, 'congress': "95th"}, {'dem_houses': 2, 'total_bills': 736, 'congress_number': 96, 'congress': "96th"}, {'dem_houses': 1, 'total_bills': 530, 'congress_number': 97, 'congress': "97th"}, {'dem_houses': 1, 'total_bills': 678, 'congress_number': 98, 'congress': "98th"}, {'dem_houses': 1, 'total_bills': 688, 'congress_number': 99, 'congress': "99th"}, {'dem_houses': 2, 'total_bills': 765, 'congress_number': 100, 'congress': "100th"}, {'dem_houses': 2, 'total_bills': 681, 'congress_number': 101, 'congress': "101st"}, {'dem_houses': 2, 'total_bills': 628, 'congress_number': 102, 'congress': "102nd"}, {'dem_houses': 2, 'total_bills': 490, 'congress_number': 103, 'congress': "103rd"}, {'dem_houses': 0, 'total_bills': 343, 'congress_number': 104, 'congress': "104th"}, {'dem_houses': 0, 'total_bills': 408, 'congress_number': 105, 'congress': "105th"}, {'dem_houses': 0, 'total_bills': 612, 'congress_number': 106, 'congress': "106th"}, {'dem_houses': 0, 'total_bills': 389, 'congress_number': 107, 'congress': "107th"}, {'dem_houses': 0, 'total_bills': 509, 'congress_number': 108, 'congress': "108th"}, {'dem_houses': 0, 'total_bills': 486, 'congress_number': 109, 'congress': "109th"}, {'dem_houses': 1, 'total_bills': 465, 'congress_number': 110, 'congress': "110th"}, {'dem_houses': 2, 'total_bills': 386, 'congress_number': 111, 'congress': "111st"}, {'dem_houses': 1, 'total_bills': 286, 'congress_number': 112, 'congress': "112nd"}, {'dem_houses': 1, 'total_bills': 45, 'congress_number': 113, 'congress': "113th"}, {'dem_houses': -2, 'total_bills': 115.16, 'congress_number': 114, 'congress': "113th(proj)"}];

billsPassed(billsonly, '#billsonlyinput', false, '#billsOnly');

var gap = [{'dem_houses': -1, 'total_bills': 93, 'congress': '83rd', 'congress_number': 83},{'dem_houses': -1, 'total_bills': 91, 'congress': '84th', 'congress_number': 84},{'dem_houses': -1, 'total_bills': 106, 'congress': '85th', 'congress_number': 85},{'dem_houses': -1, 'total_bills': 86, 'congress': '86th', 'congress_number': 86},{'dem_houses': -1, 'total_bills': 92, 'congress': '87th', 'congress_number': 87},{'dem_houses': -1, 'total_bills': 95, 'congress': '88th', 'congress_number': 88},{'dem_houses': -1, 'total_bills': 107, 'congress': '89th', 'congress_number': 89},{'dem_houses': -1, 'total_bills': 70, 'congress': '90th', 'congress_number': 90},{'dem_houses': -1, 'total_bills': 100, 'congress': '91st', 'congress_number': 91},{'dem_houses': -1, 'total_bills': 87, 'congress': '92nd', 'congress_number': 92},{'dem_houses': 2, 'total_bills': 820, 'congress': '93rd', 'congress_number': 93},{'dem_houses': 2, 'total_bills': 935, 'congress': '94th', 'congress_number': 94},{'dem_houses': 2, 'total_bills': 913, 'congress': '95th', 'congress_number': 95},{'dem_houses': 2, 'total_bills': 827, 'congress': '96th', 'congress_number': 96},{'dem_houses': 1, 'total_bills': 368, 'congress': '97th', 'congress_number': 97},{'dem_houses': 1, 'total_bills': 334, 'congress': '98th', 'congress_number': 98},{'dem_houses': 1, 'total_bills': 332, 'congress': '99th', 'congress_number': 99},{'dem_houses': 2, 'total_bills': 347, 'congress': '100th', 'congress_number': 100},{'dem_houses': 2, 'total_bills': 598, 'congress': '101st', 'congress_number': 101},{'dem_houses': 2, 'total_bills': 584, 'congress': '102nd', 'congress_number': 102},{'dem_houses': 2, 'total_bills': 506, 'congress': '103rd', 'congress_number': 103},{'dem_houses': 0, 'total_bills': 596, 'congress': '104th', 'congress_number': 104},{'dem_houses': 0, 'total_bills': 620, 'congress': '105th', 'congress_number': 105},{'dem_houses': 0, 'total_bills': 768, 'congress': '106th', 'congress_number': 106},{'dem_houses': 0, 'total_bills': 680, 'congress': '107th', 'congress_number': 107},{'dem_houses': 0, 'total_bills': 865, 'congress': '108th', 'congress_number': 108},{'dem_houses': 0, 'total_bills': 1026, 'congress': '109th', 'congress_number': 109},{'dem_houses': 1, 'total_bills': 1432, 'congress': '110th', 'congress_number': 110},{'dem_houses': 2, 'total_bills': 1465, 'congress': '111st', 'congress_number': 111},{'dem_houses': 1, 'total_bills': 721, 'congress': '112nd', 'congress_number': 112},{'dem_houses': 1, 'total_bills': 268, 'congress': '113th', 'congress_number': 113},{'dem_houses': 1, 'total_bills': 685.84, 'congress': '113th(proj)', 'congress_number': 114}];
billsPassed(gap, '#gap', false, '#gapContainer');
