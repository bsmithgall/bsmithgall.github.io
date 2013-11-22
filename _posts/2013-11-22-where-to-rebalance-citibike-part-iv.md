---
layout: post
title: Rewriting in python and deploying
excerpt: In order to deploy the recently finished script that gives rebalancing recommendations as a web application, we first have to rewrite the R script in python.
---

First things first: the rebalancing app is live, and it can be found [here](http://citibike-rebalancing.herokuapp.com).

Now that we've [wrapped up](http://bensmithgall.com/blog/where-to-rebalance-citibike-part-iii/) the script that generates station recommendations for rebalancing, we want to visualize this information to make it more digestible. Unfortunately (or maybe fortunately...), R is not a great language for dealing with browsers. Python, however, offers a variety of lightweight web frameworks that make this problem far less challenging.

####From R to python

While R was a great tool for building a prototype, a rewrite in python is hugely beneficial, especially with the ultimate goal of displaying the results as a web app. While a good amount of the logic from the R script rolls over to python without much trouble, I still did have to find libraries to replace `kmeans` (from the stats package in R) and `igraph`. While there is a python build of `igraph`, it requires a C compiler, which we want to avoid for easier deployment later.

Ultimately, I went with `networkx` to handle the graph data and `cluster` to handle the kmeans clustering due to their pure python implementations.

Working in python had additional advantages: the most obvious is how simple it is to parse the input JSON data. Implementing the kmeans clusters turned out to be fairly simple:

{% highlight python %}
# for reference, tocluster and cluster (below)
# have the following data structure:

# [ [stationName, 'id', 'availableDocks',
#  'totalDocks', 'latitude', 'longitude'],
# [...] ]


cl = KMeansClustering([(i[4], i[5]) for i in tocluster])
clusters = cl.getclusters(4) # returns list of lists of (i[4], i[5]) pairs
{% endhighlight %}

Working with `networkx` was also fairly straightforward.

{% highlight python %}
edges = []
combs = itertools.combinations(clustered, 2) #much simpler than R
for i in combs:
    edge1 = i[0][0]
    edge2 = i[1][0]
    dist = haversine_distance(i[0][5], i[0][4],
                              i[1][5], i[1][4])

    if dist < .8:
        edges.append((edge1, edge2, dist))

G = nx.DiGraph()
G.add_weighted_edges_from(edges)
degcent = nx.degree_centrality(G).items()
{% endhighlight %}

Calling `nx.degree_centrality(G)` returns a dictionary-like structure, whose `items()` can be called as expected. This makes it fairly easy to join the degree centrality measure from `degcent`.

The biggest win for python, though, was in throwing out the nearest stations. While that was very complex (and pretty hard to read) in R, it's much more straightforward in python.

{% highlight python %}
def make_recs(graph_output, dist_url):
    recs, nearby = [], []
    _dists = requests.get(dist_url).json()
    nearbyLookup = dict((i['id'], [j['id'] for j in i['nearbyStations']]) for i in _dists['results'])

    for i in sorted(graph_output, key=operator.itemgetter(7), reverse=True):
        if i[1] not in nearby:
            recs.append(i)
        nearby.append(nearbyLookup[i[1]])
        if len(recs) > 4:
            break

    return recs
{% endhighlight %}

####Serving the results as a web app

Because the current iteration of this doesn't store any data or do any database writing, I decided to deploy the app with [Heroku](http://heroku.com), an awesome service that does some free deployment. 

Additionally, I didn't need a lot of the advanced features that come bundled in with [Django](https://www.djangoproject.com/), so I opted to use [Flask](http://flask.pocoo.org). Flask is very lightweight and handles my needs perfectly for this use case. You can find the finished product [here](http://citibike-rebalancing.herokuapp.com).

A central component to this visualization was going to be the map. I decided to make the map fullscreen, and layer information on top of it. [Mapbox](http://mapbox.com) and [mapbox.js](http://mapbox.com/mapbox.js/) (which is an extension of the already great library [Leaflet](http://leafletjs.com)) were good choices for me in this case. Mapbox produces beautiful maps.

Another big advantage that came from rewriting the script in python was that it made it trivial to look at both empty and full stations, so I decided to display both of them.

####First impressions and takeaways

Overall, the relative simplicity of the design showcases the beautiful Mapbox map and lets the information show through fairly clearly. One interesting thing is noticing the way the clusters vary based on time of day. Plugging this system into a predictive system such as the one I've mentioned before would be really interesting.

I think the project was successful. When looking at the official [Citibike station map](http://citibikenyc.com/stations), you can see the emptiness patterns. Comparing this against our map shows the same patterns. Instead of a sea of empty stations, however, we instead get a small central cluster of stations.

Feel free to poke around the [app](http://citibike-rebalancing.herokuapp.com) and the [code](https://github.com/bsmithgall/citibike) (a gist of the R script is [here](https://gist.github.com/bsmithgall/7595417)), and let me know if you find issues.
