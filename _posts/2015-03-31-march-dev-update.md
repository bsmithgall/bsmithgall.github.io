---
layout: post
title: Team Pittsburgh Development Update
excerpt: A quick snapshot of what we've been up at Code for America.
---

As we’ve focused our work down into discrete projects, there have been three main guiding principles that we’ve used to guide our thinking and our development: use simple and consistent tools, do things on the server, and always be shipping. I want to talk a bit more about our choices and how we’ve tried to apply these principles.

![image](https://31.media.tumblr.com/a3051bd2b1eb39d34d340fbf932338cf/tumblr_inline_nm2bzr4pjS1t9lx61_540.gif)

_An early version of the template-maker_

## Use simple and consistent tooling

Across our two main apps, we’re using basically identical stacks: [Flask](http://flask.pocoo.org/) with [Postgres](http://www.postgresql.org/). With Flask, we’ve been taking advantage of several great patterns: the [app factory pattern](http://flask.pocoo.org/docs/0.10/patterns/appfactories/) and the [blueprint pattern](http://flask.pocoo.org/docs/0.10/blueprints/#blueprints). We are managing both a simple app ([wexplorer](http://github.com/codeforamerica/wexplorer)) and a more complicated app with many moving pieces (the [template-maker](http://github.com/codeforamerica/template-maker)) and several smaller apps tied together by a larger flow. This makes blueprints indispensable — breaking the larger piece into smaller components allows for easier debugging and [testing](https://travis-ci.org/codeforamerica/template-maker).

We’ve also worked hard to make sure that the parts of the app that touch the database are pulled into their own module. Separating the presentation layer from the data layer frees us up to try many things later, including potentially building an API and perhaps working towards a larger client-facing application should that be something users need. For now, we are making an effort to do as much as possible server side (more on that below).

As for Postgres, it is both familiar and a good choice. It is fast, flexible, and comes with a host of brilliant features, including [native JSON support](http://www.postgresql.org/docs/9.4/static/datatype-json.html) and [full-text search](http://www.postgresql.org/docs/9.1/static/textsearch-intro.html). It has [sane defaults](http://blog.ionelmc.ro/2014/12/28/terrible-choices-mysql/), and is overall a great solution for our needs. While we may need to expand into something more document-based (like elasticsearch) in the future, Postgres is a great choice for now.

## Do things on the server

Choosing Flask and Postgres was easy because they are familiar tools. One thing that was much harder, though, was actively deciding to do as much processing on the server as possible. Originally, we were designing some of our tooling around heavy client-side interactions. But we had to ask the fundamental question: what is truly gained from avoiding page refreshes? What core interactions are essential to the application? Do you truly need a large client-side application to capture many of these experiences?

There are [many](http://sealedabstract.com/rants/why-mobile-web-apps-are-slow/), [many](http://isolani.co.uk/blog/standards/WebAppMistakesWeAreCondemnedToRepeat), [many](http://isolani.co.uk/blog/javascript/BreakingTheWebWithHashBangs), [many](http://codeofrob.com/entries/you-have-ruined-javascript.html) posts about the downsides of javascript-heavy applications. For us, removing the javascript application made the application simpler to test, made the page load much faster, and cut down on the time it took before content could be read and interactions could take place. It also [reduced the size of the codebase](https://github.com/codeforamerica/template-maker/commit/7131c9d5e7d6d06d9a3fe9be3715669f12234978) and made it much easier to keep track of state. For a prototype-stage app like the template-maker, keeping everything on the server has allowed us to move faster on new features.

These decisions have taken us this far, but we may decide to go for a javascript-heavy client side app in the future. We’ve planned for this as well — separation of the data processing and the presentation will allow us to quickly create a JSON-based REST API to build a rich client app should the need arise.

## Always be shipping
![image](https://31.media.tumblr.com/23edc8e82ca709b2c36a1c74485a1f67/tumblr_inline_nm2d1gUMMT1t9lx61_540.gif)

_Improvements to Wexplorer, originally released during build week_

Part of the CfA playbook is that the [strategy is delivery](http://mikebracken.com/blog/the-strategy-is-delivery-again/), and we’ve delivered software almost every week of the fellowship, including during the residency. Here is what we’ve developed so far:

*   [Wexplorer](http://wexplorer-pittsburgh.herokuapp.com/) - a tool for finding out what’s currently on contract with the City of Pittsburgh (Flask + Postgres/[Github](http://github.com/codeforamerica/wexplorer))
*   [Wextractor](https://github.com/codeforamerica/w-drive-extractor) (or the W-Drive-Extractor) - a general purpose ETL tool designed to move data from one format into another (originally Excel spreadsheets into relational Postgres tables)
*   [The Pittsburgh Procurement Explorer](http://codeforamerica.github.io/pittsburgh-procurement-explorer/) - a tool for figuring out which process you should use to buy new things (Jekyll/[Github](https://github.com/codeforamerica/pittsburgh-procurement-explorer))
*   [Cleaning-Pgh](http://codeforamerica.github.io/cleaning-pgh/) - a site to advertise an upcoming RFP, along with some language about that RFP simplified into a much more digestible Q&amp;A format (Jekyll/[Github](https://github.com/codeforamerica/cleaning-pgh)).
*   The [template-maker](http://damp-falls-2198.herokuapp.com/build/) (currently password-protected) - a tool for building document templates and then documents from those templates (Flask + Postgres/[Github](https://github.com/codeforamerica/template-maker))

We’re planning to continue to develop new features and improvements for all of these sites! All of the code is available on github and is open source — feel free to open issues and submit pull requests.
