---
layout: post
title: Comparing the 113th to Previous Congresses
excerpt: The 113th Congress is on pace to pass the least amount of legislation since the 1950s -- examining Congressional legislative history with the D3 library.
---

#####Last updated: 22 October 2013

So while it looks like the shutdown is [over for now](http://www.nytimes.com/2013/10/17/us/congress-budget-debate.html?hp&_r=0), Congress still has a big [image problem](http://www.gallup.com/poll/165281/congress-job-approval-falls-amid-gov-shutdown.aspx). I was curious if it would be possible to measure the efficiency of Congress as well.

Some quick background: a session of Congress lasts for two years, and we are almost halfway through the 113th Congress. Congress, of course, is the Legislative Branch of the government and as such is responsible for writing legislation and, presumably, improving the nation's laws.

Using the fantastic [Govtrack](https://www.govtrack.us/developers/api) and [New York Times](http://developer.nytimes.com/docs/congress_api) APIs, I pulled together the following visualizations of Congressional efficiency over time. First, I looked at the total amount of legislation that passed through both chambers of Congress, including Bills, Resolutions, Join Resolutions, Signed Bills ([Laws](http://www.youtube.com/watch?v=tyeJ55o3El0)), Vetoed Bills, and Overturned Vetoes. So basically anything that passed through both houses:

<label style="font-size: 9px"><input type="checkbox" id="billsandresinput">Order by Bills and Resolutions Passed</label>

<p id="billsAndRes"></p>

This, of course, gets a lot worse if you only consider the Bills. With the exception of Joint Resolutions, a resolution is not submitted to the President and therefore lacks the force of law. For more information about different types of Bills and Resolutions, check out the [Senate's web site](http://www.senate.gov/reference/glossary_term/concurrent_resolution.htm).

<label style="font-size: 9px"><input type="checkbox" id="billsonlyinput">Order by Bills Passed</label>

<p id="billsOnly"></p>

So what do we learn from all of this?

Well, a few interesting things stick out immediately. First, in the past twenty or so years, Congress has spent a lot more time passing non-binding resolutions than they have legislation. Additionally, it doesn't really seem to matter if one party is in charge of both houses, or if they are split; there is still an overall lackluster Congressional performance. As for the 113th Congress, things aren't looking so good at all. Assuming that they stay on their current pace, they are only set to pass 115 pieces of actual legislation (while they will express their non-binding positions an additional 700 times through resolutions).

Note: I hope to post the D3 code that built this to a Github Gist/bl.ocks page in the coming days. I'll update this post when I do so.

Update: The code is available [here](http://bl.ocks.org/bsmithgall/7033944)

Second update (19 October). I've gone through and manually looked up the controlling parties for the houses of Congress. I didn't realize that Democrats controlled both houses between the 84th Congress (started meeting in 1955) and the 95th Congress (started meeting in 1977). I was also curious about the gap between the number of Bills & Resolutions passed and the number of only Bills passed. The chart below graphs that gap over time.

<label style="font-size: 9px"><input type="checkbox" id="gap">Order by Size of Difference</label>

<p id="gapContainer"></p>

Whoa. What happened in the [93rd Congress](http://en.wikipedia.org/wiki/93rd_United_States_Congress)? Nixon resigned during the period, but I'm not totally sure what would have caused there to be such a huge spike in non-binding resolutions. If you have any insight about why this might be, let me know! I'd definitely be interested.

Third Update (22 October):

<blockquote class="twitter-tweet" data-conversation="none"><p><a href="https://twitter.com/bsmithgall">@bsmithgall</a> Could it be a scope problem? For example, the THOMAS database only tracks house resolutions back to the 93rd congress</p>&mdash; Jake Interrante (@jcinterrante) <a href="https://twitter.com/jcinterrante/statuses/391681086373130240">October 19, 2013</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

Big props to [Jake](https://twitter.com/jcinterrante/), who pointed out that [THOMAS](http://thomas.loc.gov/home/thomas.php) only tracks resolutions going back to the 93rd Congress. I've kept the data above, but grayed the bars that didn't have resolution information.


<script src="/javascripts/congress-compare.js"></script>
