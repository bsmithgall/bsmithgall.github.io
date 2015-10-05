---
layout: post
title: Multi-Table Full Text Search with Postgres, Flask, and Sqlalchemy, Part II
excerpt: Moving past database triggers with SQLAlchemy Events.
---

In my [last post]({{ site.url }}/blog/full-text-search-flask-sqlalchemy), I talked about how embrace the qualities of [good enough Postgres full-text search](http://blog.lostpropertyhq.com/postgres-full-text-search-is-good-enough/). In this post, I want to talk about some of that approach's weaknesses, some ways to improve.

### Weaknesses of the database trigger approach

There are two primary problems:

+ Slowness in the database refresh/blocking of the actual web request
+ Additional difficulty in creating sensible database migrations

##### Slowness in the database refresh

One of the problems that we noticed early on was that once the data got any larger than absolutely tiny, the database refresh would block the main web request and make things really quite slow. This is to be expected, but causes a very poor experience whenever people update or add new records.

##### Additional difficulty in creating sensible database migrations

Additionally, whenever we want to add new tables to our materialized search view, we now not only have to rewrite the materialized view create query, but we also have to completely add and drop our triggers (due to their only being executing on certain columns).

### A new approach

Fortunately, there are some tools that allow us to solve this problem: [SQLAlchemy ORM events](http://docs.sqlalchemy.org/en/latest/orm/events.html) and [Celery](http://celery.readthedocs.org/en/latest/). We'll use the ORM events to replace the database triggers, and Celery to mitigate slowness by punting the actual materialized view rebuild over into a separate worker process.

### Integration with Celery

<blockquote class="twitter-tweet" lang="en"><p lang="en" dir="ltr">A chrome extension that replaces &quot;easy to use&quot; with &quot;full of magic&quot; in software documentation.</p>&mdash; Ben Smithgall (@bsmithgall) <a href="https://twitter.com/bsmithgall/status/633343031878414336">August 17, 2015</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

If you are using the [app factory](http://flask.pocoo.org/docs/0.10/patterns/appfactories/) and [blueprint](http://flask.pocoo.org/docs/0.10/blueprints/#blueprints) patterns (which I highly recommend), plugging in Celery is a non-trivial exercise, despite what the documentation might say. One of the biggest difficulties is dealing with the fact that you might not have an application context when you create your Celery workers. Another tripping point is dealing with circular imports. We'll walk through the approach used in the [Pittsburgh Purchasing Suite](https://github.com/codeforamerica/pittsburgh-purchasing-suite).

##### Installing Celery

We're going to be using [redis](http://redis.io/) as our broker in this instance for a few reasons (it is free on Heroku, and it can double as a lightweight cache we will use later). You can install Celery and python dependencies in one go with this command (NOTE: you'll need to have redis installed. If you are on OSX, you can install it using [homebrew](http://brew.sh/)):

{% highlight bash %}
pip install celery[redis]
{% endhighlight %}

We should now have Celery installed, along with the dependencies for redis. The next step is to get a Celery instance instantiated. A good way to do this is to have a `make_celery` factory method that lives in the same place as your app creation factory. Here's what a small application that uses this pattern might look like:

{% highlight python %}
# settings.py
class Config(object):
    CELERY_BROKER_URL = os_env.get('REDIS_URL', 'redis://localhost:6379/0')

# app.py
from flask import Flask
from werkzeug.utils import import_string
from celery import Celery

def make_celery():
    config = os.environ['CONFIG']
    if isinstance(config, basestring):
        config = import_string(config)
    return Celery(__name__, broker=getattr(config, 'CELERY_BROKER_URL')

celery = make_celery()

def create_app():
    config_string = os.environ['CONFIG']
    if isinstance(config_string, basestring):
        config = import_string(config_string)
    else:
        config = config_string
    app = Flask(__name__)
    app.config.from_object(config)
    return app

if __name__ == '__main__':
    app = create_app()
    app.run()

{% endhighlight %}

Let's walk through step-by-step and see what is going on here. In both our app factory and our Celery factory, we use the [werkzeug `import_string` utility](http://werkzeug.pocoo.org/docs/0.10/utils/#werkzeug.utils.import_string) to get a configuration string from our environment. An example of what this might look like would be `settings.Config`. This will looking in a `settings.py` file for an object named `Config`, and import it. Then, we instantiate with a `Celery` object or a `Flask` object, depending on which factory method we are calling.

Now that we have a `celery` object and an app factory, we are ready to get started. We'll need to create an entry point that our Celery worker can use and have access to the Flask application context:

{% highlight python %}
# celery_worker.py

from app import create_app, celery

app = create_app()
app.app_context().push()
{% endhighlight %}

What does this do? It creates a new `app` from the app factory and pushes that app's context, allowing a [Celery worker](http://celery.readthedocs.org/en/latest/userguide/workers.html#starting-the-worker) to boot with full access to the application's context. This allows us to do things that we wouldn't be able to do otherwise, like connecting to the database or sending templated emails. At this point, we should be able to start all of the pieces that we need to actually start running Celery tasks:

{% highlight bash %}
# you will need these three commands separately
# first, let's start our redis server
redis-server /usr/local/etc/redis.conf

# next, let's run our celery worker
celery --app=celery_worker:celery worker --loglevel=debug

# finally, let's run our flask app
python app.py

{% endhighlight %}

You should now have everything running. Note: in development, we can use the [`CELERY_ALWAYS_EAGER` flag](http://celery.readthedocs.org/en/latest/configuration.html#celery-always-eager) to have celery run tasks immediately and avoid running a broker and a separate celery worker process. For now, though, we'll want to keep all three running to make sure that everything works as expected.

### Writing our database refresh task

Now that our yak has been fully shaved, we can get started with the original purpose, writing our database refresh task! To do this, we'll want to create a mixin for our SQLAlchemy events, and a task to perform the work itself. Let's start with the task, as that's what we will import to use in our database mixin.

##### A rebuild task

Here's the code for our rebuilding task:

{% highlight python %}
# tasks.py
from app import celery
from extensions import db

@celery.task
def rebuild_search_view():
    session = db.create_scoped_session()
    session.execute(
        '''
        REFRESH MATERIALIZED VIEW CONCURRENTLY search_view
        '''
    )
    session.commit()
    db.engine.dispose()
{% endhighlight %}

This is fairly straightforward:

+ Create an isoloated [scoped session](http://docs.sqlalchemy.org/en/rel_0_9/orm/contextual.html?highlight=scoped_session#unitofwork-contextual) that we will use to run our rebuild transaction
+ Run the refresh materialzied view command, discussed in more depth in the [last post]({{ site.url }}/blog/full-text-search-flask-sqlalchemy)
+ Commit the transaction, which will process the execution and do the actual updating
+ Dispose of the session and the underlying engine, ensuring that we reclaim our connection to the database

Disposing of the connection is an important step here; if we fail to do it, it's possible to leave a bunch of uncommitted connections open, which will quickly overwhelm the database and prevent it from processing other requests, including web requests. Now that we have our task, let's write our database mixin:

##### A database mixin

{% highlight python %}
# database.py
def refresh_search_view(mapper, connection, target):
    # only fire the trigger if the object itself was actually modified
    if db.session.object_session(target).is_modified(target, include_collections=False):
        from tasks import rebuild_search_view
        rebuild_search_view.delay()

class RefreshSearchViewMixin(object):

    @classmethod
    def event_handler(cls, *args, **kwargs):
        return refresh_search_view(*args, **kwargs)

    @classmethod
    def __declare_last__(cls):
        for event_name in ['after_insert', 'after_update', 'after_delete']:
            sqlalchemy.event.listen(cls, event_name, cls.event_handler)

{% endhighlight %}

This is a bit more complicated, so let's go through it, starting with the mixin itself.

##### The event handler

For testing purposes, we break out the actual refresh logic from the class. In the `refresh_search_view` function, we use some [logic from the SQLAlchemy docs](http://docs.sqlalchemy.org/en/rel_1_0/orm/events.html?highlight=events#sqlalchemy.orm.events.MapperEvents.before_update) to determine if columns on the object have been modified. This is important because when we use this mixin, it will run the event on modification of the original object and any of the object's relationships. Therefore, we want to be a bit convservative about when we actually fire the rebuild event. If the object in question _has_ been changed, we fire our `rebuild_search_view` task, calling `.delay()` to tell Celery to run it async.

##### `__declare_last__`

The [`__declare_last__`](http://docs.sqlalchemy.org/en/rel_1_0/orm/extensions/declarative/api.html?highlight=__declare_last__#declare-last) directive is a special directive that lets us declare events _after_ the mapper is otherwise configured. This allows us to attach event listeners after the rest of the mapper configuration. There are [other ways to attach event listeners](http://stackoverflow.com/questions/12753450/sqlalchemy-mixins-and-event-listener), but I think this is perhaps the best way to do it with the declarative base setup. Once we know this, the logic of the hook says to listen for the three 'after' events, and to fire the class's `event_handler` classmethod. In this case, it's the handler that we described above.

### Improving on this approach

One big area of improvement that we can take advantage of is the caching that we get by using redis as our Celery broker. We can use a cache lock and tell celery to only run the rebuild if we aren't already doing it:

{% highlight python %}
# database.py
from extensions import cache

def refresh_search_view(mapper, connection, target):
    # only fire the trigger if the object itself was actually modified
    if db.session.object_session(target).is_modified(target, include_collections=False):
        if cache.get('refresh-lock') is None:
            cache.set('refresh-lock', True)
            from purchasing.tasks import rebuild_search_view
            rebuild_search_view.delay()
        else:
            return

# tasks.py
@celery.task
def rebuild_search_view():
    try:
        session = db.create_scoped_session()
        session.execute(
            '''
            REFRESH MATERIALIZED VIEW CONCURRENTLY search_view
            '''
        )
        session.commit()
        db.engine.dispose()
    except Exception, e:
        raise e
    # always remove our cache key
    finally:
        cache.delete('refresh-lock')

{% endhighlight %}

### Testing

Testing is a bit difficult, but we can use mocks to good effect here:

{% highlight python %}
from unittest import TestCase
from database import RefreshSearchViewMixin, Model, Column, db

class FakeModel(RefreshSearchViewMixin, Model):
    __tablename__ = 'fakefake'
    __table_args__ = {'extend_existing': True}

    id = Column(db.Integer, primary_key=True)
    description = Column(db.String(255))

    def __init__(self, *args, **kwargs):
        super(FakeModel, self).__init__(*args, **kwargs)

    @classmethod
    def record_called(cls):
        cls.called = True

    @classmethod
    def reset_called(cls):
        cls.called = False

    @classmethod
    def event_handler(cls, *args, **kwargs):
        return cls.record_called()

class TestEventHandler(TestCase):
    def setUp(self):
        super(TestEventHandler, self).setUp()
        FakeModel.reset_called()

    def test_init(self):
        self.assertFalse(FakeModel.called)

    def test_create(self):
        FakeModel.create(description='abcd')
        self.assertTrue(FakeModel.called)

    def test_update(self):
        fake_model = FakeModel.create(description='abcd')
        FakeModel.reset_called()
        self.assertFalse(FakeModel.called)
        fake_model.update(description='efgh')
        self.assertTrue(FakeModel.called)

    def test_delete(self):
        fake_model = FakeModel.create(description='abcd')
        FakeModel.reset_called()
        self.assertFalse(FakeModel.called)
        fake_model.delete()
        self.assertTrue(FakeModel.called)
{% endhighlight %}

What we are doing here is creating a fake SQLAlchemy declarative base model as if it were a model in our normal app. We override the `event_handler` classmethod, having it set a `called` class property. Because the `RefreshSearchViewMixin` is applied to our class, when we create, update, or delete an instance of the class, the `called` property should be set to true.

### Closing thoughts

This implementation has been a big improvement for us: it has increased speed, allowed us to delegate rebuilds, and makes updating the data models simpler. It does involve some additional dependencies in production, but these can be mocked out in development. If you have comments or suggestions, let me know [on twitter](https://twitter.com/bsmithgall).
