# KOI Sync Obsidian Plugin

KOI Sync is an Obsidian plugin designed to interact with the [KOI ecosystem](https://github.com/BlockScience/koi). In its current state, it can only interface with the prototype KOI-net node created for the Telescope project. This plugin can only be used with a corresponding [Slack Telescope KOI node](https://github.com/metagov/slack-telescope).

The purpose of this plugin is to listen to RID events from a remote KOI-net node server, and synchronize knowledge objects with an Obsidian vault for local usage. As it is designed for this pilot Slack Telescope interface, the supported RIDs are generally restricted to `orn:telescoped`. For these knowledge objects, human visible markdown will be generated from the raw JSON using the provided Handlebar template. This template can be user modified.

As this plugin communicates with a remote KOI-net node, it allows a high degree of network usage. This is restricted to the specific URL endpoint of the server you wish to talk to, no other server is contacted. Currently remote servers are not for public usage. You will need to run your own instance and set up an API key for access. No data is sent to the remote server.

## Usage

Before synchronization can begin, the `KOI API URL` and `KOI API Key` must be set in the plugin settings. After this is completed, you may click the start button in the status bar to initialize your vault's local KOI cache. After the initial sync, the plugin will automatically listen for new RID events and update its internal cache and templated markdown files. The status icon can be clicked to manually resynchronize with the remote node. Finally, a reformat command is provided to rerun the template on all of the knowledge objects. This should be run if the Handlebars template is every updated.