---
layout: post
title: Some Thoughts About Citibike
excerpt: Just got back from a Citibike hack night, and I wanted to jot some things down while I still remember them.
---

#{{ page.title }}
#####{{ page.date | date: "%d %B %Y" }}

<hr>

One of the more problematic elements from any bike sharing program's point of view is the concept of "rebalancing." What this means is that bikes need to shuttled between stations in such a way that bikes are available at any given station at any given time. There have been several interesting approaches to this, and I think the best I've seen has been from the [Data Science for Social Good](https://github.com/dssg/bikeshare) organization, who have put out a really cool way of predicting which bike stations will be low 60 minutes from now.

Something I learned at the hack night tonight is that in New York City, empty stations tend to cluster together (you can see a pretty good visualization [here](http://www.bkeyes.com/maps/citibike_heatmap.html)). This got me thinking about two things.

#### Optimal Rebalancing

Assuming that you believe that rebalancing is necessary and the correct thing to do(more on that later), let's think for a bit about some of the constraints around it, and how I think you might want to design an optimal system. Any rebalancing regime is going to be constrained necessarily by resources you have to actually move bikes around. However, you also have the built-in advantage of user mobility; people who are looking to rent bikes can easily walk to nearby station to find a bike.

To build an optimal system, what you could do is combine the heat mapping, which shows where current bike "deserts" are located, and also where the "oases" are with some of the preditive modeling that the DSSG group has been building. You could scrape down and store a historical dataset of bike use and then use or tweak some of the DSSG models to figure out over time where there might empty stations. *Additionally*, from the heat maps, you know stations tend to cluster into these deserts and oases. 

Consider each particular desert. What you could do is write a clustering algorithm to cluster together like bike stations (from a geography and current fullness perspective), and then treat each cluster as a node graph. With that graph, then, you can use various centrality measures to figure out which stations you should prioritize in your rebalancing. If you were to then combine all of those elements together, you'd end up with a list of stations that you would want to repopulate first (because of their nearness to other nodes), and that would allow you to prioritze your limited resources for repopulation..

I think that the optimal scenario would likely be one where a user would be able to go to some webapp and be able to look a few views: not only would the current station status be available, but also the modeled station status for thirty minutes, one hour, and maybe two hours (on the outside) would be viewable as well. Additionally, the system would recommend which stations should be repopulated for the modeled view, and if it were to be incredibly fancy, perhaps the system could provide a ranking or ordering of nodes to repopulate.

#### Considerations of a Rebalancing regime

One side note to consider while thinking about rebalancing is that it is entirely possible to rebalance too much. For example, in New York we've been able to [observe](http://www.newyorker.com/online/blogs/newsdesk/2013/07/month-of-citi-bike.html) some general trends -- namely that people move the center and to downtown during the day and then move back out again at night. Given that we know this, it is probably the case that the optimal distribution of bikes is *not* one that would have the same number of bikes at every station. Instead, the system would have to account for the usage patterns that we already know. Of course, it's difficult to say how people are really using the system in an unbiased sense, but it would be good not overcompensate too much, and to perhaps overbalance particular stations around rush hour.

In any case, I think this is a really interesting problem with a difficult solution. I'm not sure the one I'm proposing here is the best one, but I certainly think that there's good work to be done. I'm going to start working on building some sort of script that builds out these desert/oasis nodes using the [Citibike JSON feed](http://citibikenyc.com/stations/json), and will post updates as I go.