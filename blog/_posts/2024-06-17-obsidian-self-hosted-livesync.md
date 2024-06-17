---
layout: post
title: Self-hosting Obsidian LiveSync on Kubernetes with Tailscale
excerpt: Gluing a bunch of stuff together to get what you get for free with Apple Notes, except you get to keep your notes on your own server, and you don't have to expose the server to the internet.
---

Recently, I've been using [Obsidian] for note taking. It's fast, has a bunch of
nice features, a decent vim mode, and rich support for community plugins. I also
really like the "file over app" philosophy that the current CEO [has written
about][file-over-app].

I also have been running Kubernetes on a cluster of RaspberryPi computers in my
house that I have been using for all sorts of odds and ends. It hosts my [chess
tournament website][elswisser] that I have [written][post1] [about][post2]
[previously][post3]. I also use it as a sync server for the incredible
[atuin](https://atuin.sh/), host a handful of internal-to-the-house apps, and
some other things. The cluster runs [k3s](https://k3s.io/) and uses four Pi
computers that I have accumulated over the years, going as far back as model 2B.

One thing I like quite a bit about it is that nothing is exposed to the public
internet, except the aforementioned tournament website, which is hidden behind a
[Cloudflare tunnel][tunnel]. Instead, I use a combination of [external-mdns] and
[Tailscale](https://tailscale.com/) to make things accessible outside the
cluster as needed.

Obsidian has a plugin for [self-hosted LiveSync][plugin], which I really
appreciate. I like to host these things myself when possible, especially when
the cost of failure is low, like it is here. I had some "fun" getting this set
up with my setup and wanted to write about wiring pieces together.

# CouchDB

I know absolutely nothing about CouchDB. In fact, I hadn't heard of it before
learning that the plugin in based on it, but I did learn that it is written in
Erlang, which is great. So to start off, I had to get CouchDB running in
kubernetes.

CouchDB has a [helm chart][couchdb-helm], but I opted to write my own deployment
instead. In general, I prefer to have my own yaml lying around so I can put it
in source control and make tweaks later.

In any case, the deployment is pretty straightforward. However, there are a
couple of gotchas when setting this up from scratch, especially since the
documentation is quite sparse.

First, you need to have an admin user and password ready to go via environment
variables. I created them as a kubernetes secret and referenced them via
`secretKeyRef`.

Second, after everything has started, you need to go into the running pod and
manually create the required databases. This is discussed in the [setup
documentation][setup-docs], but there are a few additional caveats: 

1. The curl commands in the setup documentation will not work as written because
CouchDB will only allow you to run them if you are an administrator. You need to
sign your requests. I used the [`_session` auth method][_session] and managed to
create the required databases.  
2. Setting up CouchDB to operate as a single-node installation isn't as
straightforward as I had hoped. The [recommended way][couchdb-docker] to do it
is to publish your own Docker image that has a `local.ini` file bundled inside
of it, with the `single_node=true` flag set in the CouchDB property. This is
probably the best way to do it, but I just configured a service and local `mdns`
ingress and used the management GUI to do it manually.

# Tailscale

Now that we've got CouchDB set up, we need to have some way to communicate with
it from Obsidian. One thing that is quite important is that we are able to do so
via https; without it, I wouldn't be able to sync to and from my phone.
[Tailscale](https://tailscale.com/) is an amazing piece of technology. It wraps
around [WireGuard](https://www.wireguard.com/) and can make a mesh network out
of any number of devices. My pi cluster, computer, and phone are all part of the
same Tailscale mesh network, so I can do all sorts of cool stuff like [send
files between devices][taildrop] or [ssh from anywhere][ts-ssh] without
having machines exposed to the public internet.

One relatively recent feature added to Tailscale was the [kubernetes
operator][ts-k8s]. This does a couple of nice things for us, like being able to
expose a service directly as a "machine" in your Tailscale mesh network (aka
tailnet), or even an entire subnet router. I have found that selectively
exposing services has been the most straightforward since it can be done just
with [annotations][ts-annotation].

Unlike with CouchDB, I used the helm chart for this one. The kubernetes setup is
quite complicated with a lot of moving parts (service accounts, roles and
rolebindings, custom resource definitions, etc.). I had tried using the raw yaml
directly for awhile, but it's still somewhat early and things have moved around
a bit since I started trying it out.

In any case, the documentation for the simple case is pretty straightforward
from Tailscale's website. There are some [additional steps][ts-https] needed in
order to get HTTPS set up for a tailnet. The main thing for us is that in order
to use HTTPS, we have to know the [full tailnet name][ts-name].  This is
important when actually setting up the LiveSync, since the `tailscale cert`
command will automatically generate a certificate with the full name and https
requests will work as expected.

Additionally, annotating a kubernetes service wasn't sufficient to generate a
certificate. In order to get HTTPS traffic working, I had to use a dedicated
ingress, as is outlined [in Tailscale documentation][ts-ingress]. I also had to
manually ssh into the pod running tailscale for the given ingress and run
`tailscale cert` manually in order to generate a certificate. My guess is that I
had spent too much time mucking around, and something had gone sideways.

# Obsidian LiveSync

At this point, there's a CouchDB instance running in our cluster that is
accessible over HTTPS to all nodes in our tailnet, so we are ready to set up the
LiveSync plugin. One really nice thing about the plugin is that once you connect
it to the CouchDB instance, it can automatically configure the database to have
the appropriate configuration and CORS settings etc.

At this point, everything should be set up and sync can be enabled. The URI will
be the full name given to our CouchDB ingress. There's a couple of other really
things about this setup:

- Each vault goes to its own CouchDB database, which means that it is possible
  to sync multiple vaults simultaneously through the same instance
- "File over app" mentality means that the files are distributed onto each
  device without being dependent on the database directly. If something goes
  sideways with CouchDB, it just be deleted and rebuilt from the Obsidian vault
  directly.

[Obsidian]: https://obsidian.md/
[file-over-app]: https://stephango.com/file-over-app
[elswisser]: https://elswisser.casita.zone/
[post1]: ./2023-09-10-phoenix-hamburger-menu.md
[post2]: ./2024-05-31-live-view-chess-the-rules.md
[post3]: ./2024-06-05-live-view-chess-the-board.md
[tunnel]: https://www.cloudflare.com/products/tunnel/
[plugin]: https://github.com/vrtmrz/obsidian-livesync
[external-mdns]: https://github.com/blake/external-mdns
[couchdb-helm]: https://artifacthub.io/packages/helm/couchdb/couchdb
[setup-docs]: https://docs.couchdb.org/en/stable/setup/single-node.html
[_session]: https://docs.couchdb.org/en/stable/api/server/authn.html#api-auth-session
[couchdb-docker]: https://github.com/apache/couchdb/discussions/2948
[taildrop]: https://tailscale.com/kb/1106/taildrop
[ts-ssh]: https://tailscale.com/kb/1193/tailscale-ssh
[ts-k8s]: https://tailscale.com/kb/1236/kubernetes-operator
[ts-annotation]: https://tailscale.com/kb/1236/kubernetes-operator#exposing-a-cluster-workload-by-annotating-an-existing-service
[ts-https]: https://tailscale.com/kb/1153/enabling-https
[ts-name]: https://tailscale.com/kb/1217/tailnet-name
[ts-ingress]: https://tailscale.com/kb/1236/kubernetes-operator?q=kubernetes#exposing-a-service-using-ingress