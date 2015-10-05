---
layout: post
title: Wrapping up the R scripts for Citibike
excerpt: Now that the heavy lifting is finished from the R script, all that's left is to return out the results and clean up the script.
---

At the end of [the second part]({{ site.url }}/blog/where-to-rebalance-citibike-part-ii/) of the Citibike rebalancing problem, we had visualized a network of a cluster of citibike stations and left off with noting that the final steps involved extracting the information from the graph data and packaging it up for delivery.

The first step in doing this is to extract the information from the network graph. The following function both gets the graph data from an input dataframe and returns the necessary information from that graph.

{% highlight r %}
require(igraph)
get.graph.data <- function(single.cluster) {
  cluster.graph2 <- graph.explode(single.cluster)
  g2 <- graph.data.frame(cluster.graph2)
  V(g2)$degcent <- centralization.degree(g2)$res

  q2 <- as.data.frame(as.numeric(as.matrix(V(g2)$name)))
  q2$v2<-as.matrix(V(g2)$degcent)

  names(q2) <- c('id','degcent')
  q2<-q2[order(q2$id, decreasing=TRUE),]
  output <- merge(q2, single.cluster, by="id")
  return(output)
}
{% endhighlight %}

Information that we need is stored in the vertices. In order to access the vertices from igraph, we simply call `V(g)` where `g` is our graph object. When you access the vertices, the information is returned to you as a vector of R `character`s. Note that this is accounted for above by casting this vector to a matrix.

The last thing that we want to do is to only return stations that aren't close to each other. Note that this implementation is definitely the most hack-y of any other part of the project so far.

First, we use the citibike [app endpoint](appservices.citibikenyc.com/data2/stations.php) (note that this is a different endpoint from the original API). From this, we can get each station's ID and the IDs of its closest five neighbors:

{% highlight r %}
require(RCurl)
require(RJSONIO)
get.dists <- function(url) {
  dist.json <- fromJSON(url, method='C')
  dist.list <- as.data.frame(matrix(unlist(
    lapply(dist.json$results, function(i) {
      unlist(c(i$id,lapply(i$nearbyStations, function(j){unlist(cbind(j[1]))})))
    })), nrow=length(dist.json$results), byrow=TRUE))
  names(dist.list) <- c('id','close.one','close.two',
                        'close.three','close.four','close.five')
  return(dist.list)
}
{% endhighlight %}

Note how awful parsing nested JSON is in R.

Once we have this information, we can go ahead and make our recommendations. In order to do this, we are going to use a `while` loop to get the top four results for one particular cluster. Even though I am making use of control flows in R in this script (`for` loops, `while` loops and `if`/`else` statements), typically they are to be avoided in favor of the `apply` family of functions. If you are reading this and have a more clever way of doing what happens below, please let me know.

{% highlight r %}
make.recs <- function(graph.data, dists) {
  i <- 1
  close <- data.frame(check = numeric(0))
  results <- data.frame(id = numeric(0), name = character(0),
                        available = numeric(0), total = numeric(0),
                        stringsAsFactors=FALSE)
  comb <- merge(graph.data, dists, by="id")
  comb <- comb[order(comb$degcent, decreasing = T),]
  # oh no a loop! kill it with fire!
  # but seriously there's only like 300 total rows max so i'm not
  # going to sweat this one too much. maybe it can be refactored
  # later
  while(nrow(results) < 4) {
    j <- comb[i,]
    close[nrow(close) + 1,] <- c(j$close.one)
    close[nrow(close) + 1,] <- c(j$close.two)
    close[nrow(close) + 1,] <- c(j$close.three)
    close[nrow(close) + 1,] <- c(j$close.four)
    close[nrow(close) + 1,] <- c(j$close.five)
    if(j$id %in% close$check) { NA }
    else { results[nrow(results) + 1,] <- c(j$id, j$name, j$available, j$total) }
    i <- i+1
  }
  return(results)
}
{% endhighlight %}

With this, we can finally get ready to return out the final recommendations. I've cleaned up the script used to generate the code from parts one and two and turned those pieces into function calls.

{% highlight r %}
main <- function() {
  stations.tocluster <- stations.prep(stations.url)
  stations.cluster <- stations.kmeans(stations.tocluster)
  dists <- get.dists(dist.url)
  output <- data.frame(id = numeric(0), name = character(0),
                        available = numeric(0), total = numeric(0),
                        stringsAsFactors=FALSE)
  for(i in 1:4) {
    j <- stations.cluster[stations.cluster$clustered.cluster==i,]
    recs <- make.recs(get.graph.data(j), dists)
    output <- rbind(output,recs)
  }
  return(output)
}

main()
{% endhighlight %}

Looking at these recommendations, we can see a list a priority list of stations to be rebalanced, culled from a list of over one hundred mostly empty stations:

<pre>
     id                        name available total
1   260        Broad St & Bridge St        32    35
2   337         Old Slip & Front St        37    37
3   360        William St & Pine St        38    39
4   224       Spruce St & Nassau St        25    31
5   317           E 6 St & Avenue B        22    27
6   410     Suffolk St & Stanton St        30    35
7   428              E 3 St & 1 Ave        27    31
8   504             1 Ave & E 15 St        43    45
9  2017             E 43 St & 2 Ave        37    39
10  228             E 48 St & 3 Ave        54    55
11  501         FDR Drive & E 35 St        35    43
12  456       E 53 St & Madison Ave        31    35
13  120 Lexington Ave & Classon Ave        17    19
14  270     Adelphi St & Myrtle Ave        20    23
15  372   Franklin Ave & Myrtle Ave        25    27
16  396  Lefferts Pl & Franklin Ave        23    25
</pre>

####Next Steps

Now that the part of the system is complete, there's still a few more things that can be done to make it even better:


+ Bundle this into a web app and display the information on a map.
+ Integrate the Data Science for Social Good's [station capacity prediction model](https://github.com/dssg/bikeshare) to pinpoint which stations are going to be priority stations in 60 minutes as opposed to those that are priority right now.
+ Using similar logic, get the most central full stations from each geographic cluster (>80% bikes available) and figure out the shortest distance between a full stations and an empty one.
+ Improve the way that distance between stations is calculated: use actual street distances as opposed to simple Haversine distances.

I think that these features would all be positive steps forward in bulding this tool out. I'm going to start working on deploying the output onto a map first because the visual will be, I think, easier to understand than the list of stations.
