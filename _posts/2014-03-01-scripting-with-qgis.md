---
layout: post
title: Scripting Tasks with Python in QGIS
excerpt: Using the QGIS API to script a repetitive selection task.
---

For a project I am working on, I needed to figure out which elecion districts make up a New York City Council District. While this would be a simple lookup to conduct for one district, it would be very time consuming to do for all fifty one districts in New York City. Fortunately, the wonderful [QGIS](http://www.qgis.org/en/site/) comes with a built-in Python console that makes solving these sorts of problems much more managable.

The method that I used involved working directly with the QGIS console. There is a way to access the associated QGIS library without using QGIS explicitly, but I wanted to be able to check on things as they progressed visually, so my approach involved using QGIS directly. Note also that I'm using QGIS version 2.2 Valmiera (which has a much improved Python console from 1.8 Lisboa, along with a revamped API).

#### Basic selection through intersections

After loading up your shapefiles into QGIS, accessing all of the layers is fairly easy:

{% highlight python %}
all_layers = qgis.utils.iface.mapCanvas().layers()
{% endhighlight %}

From this point, we need to break each QGIS Vector layer down into discrete features. The easiest way to do that is this:

{% highlight python %}
first_layer_features = first_layer.getFeatures()
{% endhighlight %}

This gives an iterator object. At this point, getting the geographic intersection is pretty simple.

{% highlight python %}
for feature in parent_layer_features:
    for child_feature in child_layer_features:
        child_feature.intersects(feature.geometry().boundingBox())
{% endhighlight %}

#### Speeding up through a Spatial Index

That approach, though, can be really slow if you have lots of feature elements to iterate through. This can be sped up significantly by using a **spatial index**. For details about the timing of the speed increase, check out [this blog post](http://nathanw.net/2013/01/04/using-a-qgis-spatial-index-to-speed-up-your-code/) by Nathan Woodrow.

We start by creating an empty `QgsSpatialIndex`:

{% highlight python %}
index = QgsSpatialIndex()
# We are creating an index on the child feature
# created the same way as above
for f in child_layer_features:
    index.insertFeature(f)
{% endhighlight %}

Now, we search for the intersection based on the index. This will return the same results, but will be much faster.

{% highlight python %}
for feature in parent_layer_features:
    ids = index.intersects(feature.geometry().boundingBox())
    print ids
# ids is a list of child feature ids
{% endhighlight %}

#### Adding a field to the parent layer

Now that we have a method to select out the IDs that are contained within any given parent feature, we have to add those IDs to the parent layer in order to make use of them. We are going to add our IDs as one long comma-separated string and parse that later. Adding a new field (or attribute) to a layer is fairly simple:

{% highlight python %}
parent_layer.dataProvider().addAttribute([
    QgsField('field name here', QVariant.String)])
# Now, we have to actually update the layer
parent_layer.updateFields()
{% endhighlight %}

Now that we've added the new field, we have to add the data to it. This is also fairly straightforward.

{% highlight python %}
# We have to turn on edit mode before we can update the attributes
parent_layer.startEditing()

all_parent_features = layer.getFeatures()

for feature in all_parent_features:
        # Modify the named attribute you are interested in
        feature['field name here'] = 'updated field value'
        layer.updateFeature(feature)

# commit to save the changes
layer.commitChanges
{% endhighlight %}

Now, after we run this script from the console, we should see the list of districts populated in the proper field.
![Election Districts in the attribute table]({{ site.url }}/images/2014-03-01-attribute-table.png)

The full code that I ending up using is available [at this gist](https://gist.github.com/bsmithgall/9285262).
