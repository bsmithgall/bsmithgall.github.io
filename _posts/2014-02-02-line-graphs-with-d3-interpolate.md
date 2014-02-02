---
layout: post
title: Working with D3 Interpolation on Spotify Charts
excerpt: Examining D3 Interpolation functions to visualize tracks on the Spotify Charts.
---

I spent most of last week working on a new version of the [Spotify charts site](charts.spotify.com), and one of the things I did was play around with visualizaing some of the data from the [public API](charts.spotify.com/docs). What I wanted to do was to display chart position over time, similar to Paul Lamere's [Awesome Chart Explorer](static.echonest.com/ACE/), which you should check out.

I started by dumping all of the data from the Spotify charts API into a static JSON file. You can look at the script that does that [here](https://gist.github.com/bsmithgall/8772438). In the future, I would want to write something that does this dynamically, but for now it is fine to just have a static data dump.

Next up was creating the line graphs with D3. There are a lot of great tutorials if you are interested in learning the D3 basics. I highly recommend reading the [alignedleft D3 tutorial](http://alignedleft.com/tutorials), or looking at some of the examples on [bl.ocks.org](bl.ocks.org).

This project involved testing a number of the different [interpolation functions](https://github.com/mbostock/d3/wiki/SVG-Shapes#wiki-line_interpolate) built in with D3. Interpolation, put basically, is the method of computing unknown points or values surrounding known points or values. What that means in this particular case is that the interpolation function is responsible for drawing the lines that connect the different points that represent chart positioning in a specific week. We are going to look at four functions; basis, cardinal, linear, and cubic monotonous.

A common interpolation function is the 'basis' interpolation function. This is great for drawing smooth graphs -- check out [this example](http://bl.ocks.org/mbostock/3884955), for instance. While basis interpolation draws smooth lines, it does not guarantee that the lines will intersect with the points that make up the line's foundation.

#### Basis interpolation
<script>
function buildCharts(interpolator) {
    var margin = {top: 40, right: 10, bottom: 40, left: 50},
        width     = 450 - margin.left - margin.right,
        height    = 450 - margin.top - margin.bottom;

    var parseDate = d3.time.format('%Y-%m-%d').parse;

    var x = d3.time.scale()
            .range([0, width]);

    var y = d3.scale.linear()
            .range([height, 0]);

    var color = d3.scale.category20b();

    var xAxis = d3.svg.axis()
                  .scale(x)
                  .orient('bottom');

    var yAxis = d3.svg.axis()
                  .scale(y)
                  .orient('left')
                  .tickFormat(function(d) { return Math.abs(d); });

    var line = d3.svg.line()
                 .interpolate(interpolator)
                 .x(function(d) { 
                  return x(d.date); 
                })
                 .y(function(d) { return y(d.rank); });

    // var div = d3.select('#legend').append('div')
    //     .attr('class', 'tooltip')
    //     .style('opacity', 0);

    var svg = d3.select('section').append('svg')
                .attr('wdith', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
              .append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    d3.json('/javascripts/json/charts.json', function(data) {
      drawChart(data)
    })

    var drawChart = function(rawdata) {
      data = cleanData(rawdata);

      color.domain(data.map(function(d){ return d.track }));

      data.forEach(function(kv){
        kv.data.forEach(function(d) {
          d.date = parseDate(d.date);
        })
      });

      var ranks = data;

      var minX = d3.min(data, function (kv) { return d3.min(kv.data, function (d) { return d.date; }) });
      var maxX = d3.max(data, function (kv) { return d3.max(kv.data, function (d) { return d.date; }) });
      // var minY = d3.min(data, function (kv) { return d3.min(kv.data, function (d) { return d.rank; }) });
      // var maxY = d3.max(data, function (kv) { return d3.max(kv.data, function (d) { return d.rank; }) });
      var minY = -10
      var maxY = -1

      x.domain([minX, maxX]);
      y.domain([minY, maxY]);

      var rank = svg.selectAll('.rank')
                  .data(ranks)
                  .enter().append('g')
                  .attr('class', 'rank')

      rank.append('path')
          .attr('class', function(d) { 
            return 'line ' + d.data[0].track_class + 'Line'; 
          })
          .attr('d', function(d) { return line(d.data); })
          .style('stroke', function(d) { return color(d.name); });

      rank.selectAll('circle')
          .data(function(d) { return d.data; })
          .enter().append('circle')
          .attr('cx', function(d) { return x(d.date); })
          .attr('cy', function(d) { return y(d.rank); })
          .attr('r', 4.5)
          .attr('fill', function(d) { return color(d.name); })
          .attr('class', function(d) { return d.track_class + 'Circle'; });

      svg.append('g')
          .attr('class', 'x axis')
          .attr('transform', 'translate(0,' + height + ')')
          .call(xAxis)
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', function(d) { return 'rotate(-25)'; });

      svg.append('g')
          .attr('class', 'y axis')
          .call(yAxis)

    }

    var cleanData = function(data) {
      var tracks = {};

      for (var day in data) {
        data[day].tracks.forEach(function(track, index) {
          if (index < 10) {
              var track_key = track.track_name + ' - ' + track.artist_name
              var track_class = track.track_name + track.artist_name
              // If track hasn't been seen yet add it in
              if (!tracks[track_key]) {
                  tracks[track_key] = {
                      name: track_key,
                      data: [],
                  };
              }
              
              // Add this data to the track
              tracks[track_key].data.push({
                  date: track.date,
                  streams: numberWithCommas(track.num_streams),
                  artist_name: track.artist_name,
                  rank: (index + 1) * -1,
                  url: track.track_url,
                  cover_art: track.artwork_url,
                  name: track_key,
                  track_class: track_class.replace(/ /g,'').replace(/ [\,\/#!$%\^&\*;:{}=\-_`~()\'\.]/g,'') // strip out punctuation and spaces
              });
          }
        });
      }
      // Now it is in URL -> { name -> String, data -> Array format }
      
      // Now we want to go to [{name -> String, data -> Array }, ...]
      var result = [];
      Object.keys(tracks).forEach(function(url) {
        result.push(tracks[url]);
      });

      function resultSort(a, b) {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return 0;
      }

      result.forEach(function(d) { return d.data.sort(resultSort) });
      return result
    };

    function numberWithCommas(x) {
      try {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      }
      catch (TypeError) {
        return 0;
      }
    }

}
buildCharts('basis')
</script>
<br />

Notice that with basis interpolation, the lines don't pass through the points. For this type of visualization, this isn't the desired behavior. 

#### Cardinal interpolation
<script>
buildCharts('cardinal')
</script>
<br />

Cardinal interpolation is a bit better: it passes through all of the points, but there are still some weaknesses; when a track changes positions rapidly, the line will appear to overcompensate for that. Look for example, in the top right corner.

#### Linear interpolation
<script>
buildCharts('linear')
</script>
<br />

Linear interpolation, as you might expect, simply connects the points togther. This is certainly the most accurate, if the least stylistically interesting.

#### Cubic interpolation (preserving monotonicity in y)
<script>
buildCharts('monotone')
</script>
<br /><br />

Cubic monotonous interpolation seems like the best candidate. While it maintains the relative accuracy of the linear interpolation, it has more stylistically interesting curves.

Choosing an interpolation function certainly depends on what the data being displayed are, and if the underlying points are a critical element. In this particular case, we want to display the movement of the line between the different points on the graph, so we can't use the basis interpolation function. Ultimately, I decided to use the **cubic monotonous** function; the rapid rise or fall of a track disrupts cardinal interpolation, and linear interpolation is very choppy and stylistically interesting. Cubic monotonous gives the right balance for this project.

Finally, I also wanted to make the charts interactive, so I added a simple click listener to the SVG circle; clicking it opens an info box on the right with stats about the track and links to the Spotify web player. You can check out a mock up of the fully interactive version [here]({{ site.url }}/projects/spotify-charts.html). Let me know what you think!

