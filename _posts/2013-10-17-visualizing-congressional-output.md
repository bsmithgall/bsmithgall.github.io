---
layout: post
title: Comparing the 113th to Previous Congresses
excerpt: The 113th Congress is on pace to pass the least amount of legislation since the 1950s -- examining Congressional legislative history with the D3 library.
---


#{{ page.title }}
#####{{ page.date | date: "%d %B %Y" }}

<hr>

So while it looks like the shutdown is [over for now](http://www.nytimes.com/2013/10/17/us/congress-budget-debate.html?hp&_r=0), Congress still has a big [image problem](http://www.gallup.com/poll/165281/congress-job-approval-falls-amid-gov-shutdown.aspx). I was curious if it would be possible to measure the efficiency of Congress as well.

Some quick background: a session of Congress lasts for two years, and we are almost halfway through the 113th Congress. Congress, of course, is the Legislative Branch of the government and as such is responsible for writing legislation and, presumably, improving the nation's laws.

Using the fantastic [Govtrack](https://www.govtrack.us/developers/api) and [New York Times](http://developer.nytimes.com/docs/congress_api) APIs, I pulled together the following visualizations of Congressional efficiency over time. First, I looked at the total amount of legislation that passed through both chambers of Congress, including Bills, Resolutions, Join Resolutions, Signed Bills ([Laws](http://www.youtube.com/watch?v=tyeJ55o3El0)), Vetoed Bills, and Overturned Vetoes. So basically anything that passed through both houses:

<label style="font-size: 9px"><input type="checkbox" id="billsandresinput">Order by Bills and Resolutions Passed</label>
<script>

var billsandres = [{'dem_houses': -1, 'total_bills': 1876, 'congress': '83rd', 'congress_number': 83}, {'dem_houses': -1, 'total_bills': 2012, 'congress': '84th', 'congress_number': 84}, {'dem_houses': -1, 'total_bills': 1825, 'congress': '85th', 'congress_number': 85}, {'dem_houses': -1, 'total_bills': 1379, 'congress': '86th', 'congress_number': 86}, {'dem_houses': -1, 'total_bills': 1658, 'congress': '87th', 'congress_number': 87}, {'dem_houses': -1, 'total_bills': 1119, 'congress': '88th', 'congress_number': 88}, {'dem_houses': -1, 'total_bills': 1386, 'congress': '89th', 'congress_number': 89}, {'dem_houses': -1, 'total_bills': 1064, 'congress': '90th', 'congress_number': 90}, {'dem_houses': -1, 'total_bills': 1037, 'congress': '91st', 'congress_number': 91}, {'dem_houses': -1, 'total_bills': 851, 'congress': '92nd', 'congress_number': 92}, {'dem_houses': -1, 'total_bills': 1598, 'congress': '93rd', 'congress_number': 93}, {'dem_houses': -1, 'total_bills': 1669, 'congress': '94th', 'congress_number': 94}, {'dem_houses': -1, 'total_bills': 1719, 'congress': '95th', 'congress_number': 95}, {'dem_houses': -1, 'total_bills': 1563, 'congress': '96th', 'congress_number': 96}, {'dem_houses': -1, 'total_bills': 898, 'congress': '97th', 'congress_number': 97}, {'dem_houses': -1, 'total_bills': 1012, 'congress': '98th', 'congress_number': 98}, {'dem_houses': -1, 'total_bills': 1020, 'congress': '99th', 'congress_number': 99}, {'dem_houses': -1, 'total_bills': 1112, 'congress': '100th', 'congress_number': 100}, {'dem_houses': -1, 'total_bills': 1279, 'congress': '101st', 'congress_number': 101}, {'dem_houses': 2, 'total_bills': 1212, 'congress': '102nd', 'congress_number': 102}, {'dem_houses': 2, 'total_bills': 996, 'congress': '103rd', 'congress_number': 103}, {'dem_houses': 0, 'total_bills': 939, 'congress': '104th', 'congress_number': 104}, {'dem_houses': 0, 'total_bills': 1028, 'congress': '105th', 'congress_number': 105}, {'dem_houses': 0, 'total_bills': 1380, 'congress': '106th', 'congress_number': 106}, {'dem_houses': 0, 'total_bills': 1069, 'congress': '107th', 'congress_number': 107}, {'dem_houses': 0, 'total_bills': 1374, 'congress': '108th', 'congress_number': 108}, {'dem_houses': 0, 'total_bills': 1512, 'congress': '109th', 'congress_number': 109}, {'dem_houses': 1, 'total_bills': 1897, 'congress': '110th', 'congress_number': 110}, {'dem_houses': 2, 'total_bills': 1851, 'congress': '111st', 'congress_number': 111}, {'dem_houses': 1, 'total_bills': 1007, 'congress': '112nd', 'congress_number': 112}, {'dem_houses': 1, 'total_bills': 313, 'congress': '113rd', 'congress_number': 113}, {'dem_houses': -2, 'total_bills': 801, 'congress': '113rd (proj)', 'congress_number': 114}]

function billsPassed(data, input, autosort) {
  var margin = {left: 40, right: 20, top: 20, bottom: 60},
      width = 520 - margin.left - margin.right,
      height = 300 - margin.top - margin.bottom;


  var xBar = d3.scale.ordinal()
            .domain(data.map(function(d) { return d.congress; }))
            .rangeRoundBands([0, width], .1);

  var yBar = d3.scale.linear()
            .domain([0, d3.max(data, function(d) { return d.total_bills; }) + 100])
            .range([height, 0]);

  var color = d3.scale.ordinal()
            .domain([0,2])
            .range(['B2182B','4575B4','8073AC'])

  var xAxis = d3.svg.axis()
                .scale(xBar)
                .orient('bottom')

  var yAxisBar = d3.svg.axis()
                .scale(yBar)
                .orient('left');

  var svgBar = d3.select('section').append('svg')
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
      })

  svgBar.append('g')
      .attr('class', 'y axis')
      .attr('font-size', '9px')
      .call(yAxisBar)

  svgBar.selectAll('.bar')
      .data(data)
    .enter().append('rect')
      .attr('class','bar')
      .attr('x', function(d) { return xBar(d.congress); })
      .attr('width', xBar.rangeBand())
      .attr('y', function(d) { return yBar(d.total_bills); })
      .attr('height', function(d) { return height - yBar(d.total_bills) })
      .style('stroke', 'white')
      .style('fill', function(d) { 
        if(d.dem_houses === -1) return "grey"
        else if (d.dem_houses === -2) return "bcbddc"
        else return color(d.dem_houses); })

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
};

billsPassed(billsandres, '#billsandresinput', true);
</script><br>

This, of course, gets a lot worse if you only consider the Bills. With the exception of Joint Resolutions, a resolution is not submitted to the President and therefore lacks the force of law. For more information about different types of Bills and Resolutions, check out the [Senate's web site](http://www.senate.gov/reference/glossary_term/concurrent_resolution.htm).

<label style="font-size: 9px"><input type="checkbox" id="billsonlyinput">Order by Bills Passed</label>
<script>
var billsonly = [{'dem_houses': -1, 'total_bills': 1783, 'congress_number': 83, 'congress': "83rd"}, {'dem_houses': -1, 'total_bills': 1921, 'congress_number': 84, 'congress': "84th"}, {'dem_houses': -1, 'total_bills': 1719, 'congress_number': 85, 'congress': "85th"}, {'dem_houses': -1, 'total_bills': 1293, 'congress_number': 86, 'congress': "86th"}, {'dem_houses': -1, 'total_bills': 1566, 'congress_number': 87, 'congress': "87th"}, {'dem_houses': -1, 'total_bills': 1024, 'congress_number': 88, 'congress': "88th"}, {'dem_houses': -1, 'total_bills': 1279, 'congress_number': 89, 'congress': "89th"}, {'dem_houses': -1, 'total_bills': 994, 'congress_number': 90, 'congress': "90th"}, {'dem_houses': -1, 'total_bills': 937, 'congress_number': 91, 'congress': "91st"}, {'dem_houses': -1, 'total_bills': 764, 'congress_number': 92, 'congress': "92nd"}, {'dem_houses': -1, 'total_bills': 778, 'congress_number': 93, 'congress': "93rd"}, {'dem_houses': -1, 'total_bills': 734, 'congress_number': 94, 'congress': "94th"}, {'dem_houses': -1, 'total_bills': 806, 'congress_number': 95, 'congress': "95th"}, {'dem_houses': -1, 'total_bills': 736, 'congress_number': 96, 'congress': "96th"}, {'dem_houses': -1, 'total_bills': 530, 'congress_number': 97, 'congress': "97th"}, {'dem_houses': -1, 'total_bills': 678, 'congress_number': 98, 'congress': "98th"}, {'dem_houses': -1, 'total_bills': 688, 'congress_number': 99, 'congress': "99th"}, {'dem_houses': -1, 'total_bills': 765, 'congress_number': 100, 'congress': "100th"}, {'dem_houses': -1, 'total_bills': 681, 'congress_number': 101, 'congress': "101st"}, {'dem_houses': 2, 'total_bills': 628, 'congress_number': 102, 'congress': "102nd"}, {'dem_houses': 2, 'total_bills': 490, 'congress_number': 103, 'congress': "103rd"}, {'dem_houses': 0, 'total_bills': 343, 'congress_number': 104, 'congress': "104th"}, {'dem_houses': 0, 'total_bills': 408, 'congress_number': 105, 'congress': "105th"}, {'dem_houses': 0, 'total_bills': 612, 'congress_number': 106, 'congress': "106th"}, {'dem_houses': 0, 'total_bills': 389, 'congress_number': 107, 'congress': "107th"}, {'dem_houses': 0, 'total_bills': 509, 'congress_number': 108, 'congress': "108th"}, {'dem_houses': 0, 'total_bills': 486, 'congress_number': 109, 'congress': "109th"}, {'dem_houses': 1, 'total_bills': 465, 'congress_number': 110, 'congress': "110th"}, {'dem_houses': 2, 'total_bills': 386, 'congress_number': 111, 'congress': "111st"}, {'dem_houses': 1, 'total_bills': 286, 'congress_number': 112, 'congress': "112nd"}, {'dem_houses': 1, 'total_bills': 45, 'congress_number': 113, 'congress': "113rd"}, {'dem_houses': -2, 'total_bills': 115.16, 'congress_number': 114, 'congress': "113rd (proj)"}]
billsPassed(billsonly, '#billsonlyinput', false)
</script>

So what do we learn from all of this?

Well, a few interesting things stick out immediately. First, in the past twenty or so years, Congress has spent a lot more time passing non-binding resolutions than they have legislation. Additionally, it doesn't really seem to matter if one party is in charge of both houses, or if they are split; there is still an overall lackluster Congressional performance. As for the 113th Congress, things aren't looking so good at all. Assuming that they stay on their current pace, they are only set to pass 115 pieces of actual legislation (while they will express their non-binding positions an additional 700 times through resolutions). 

Note: I hope to post the D3 code that built this to a Github Gist/bl.ocks page in the coming days. I'll update this post when I do so.

Update: The code is available [here](http://bl.ocks.org/bsmithgall/7033944)