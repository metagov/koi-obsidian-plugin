# What is KOI Sync?
KOI Sync is an Obsidian plugin designed to interact with the [KOI-net ecosystem](https://github.com/DynamicalSystemsGroup/koi-net). Within a vault, it operates as its own node in a [Telescope KOI network](https://github.com/metagov/telescope-koi-network). It allows an Obsidian user to share notes with other vaults (or any nodes in the network), and stream knowledge objects produced by the network into their vault in a human-readable format.

The purpose of this plugin is to listen to RID events from a remote KOI-net node server, and synchronize knowledge objects with an Obsidian vault for local usage. As it is designed for this pilot Slack Telescope interface, the supported RIDs are generally restricted to `orn:telescoped`. For these knowledge objects, human visible markdown will be generated from the raw JSON using the provided Handlebar template. This template can be user modified.

As this plugin communicates with a remote KOI-net node, it allows a high degree of network usage. This is restricted to the specific URL endpoint of the server you wish to talk to, no other server is contacted. Currently remote servers are not for public usage. You will need to run your own instance and set up an API key for access. No data is sent to the remote server.

## Installation
The KOI Sync plugin can be easily installed inside of the Obsidian app.
1. Navigate to your vault's settings and click on `Community plugins`.
2. Click the button to `Exit Restricted mode` (if you haven't already).
3. Press the `Browse` button next to `Community plugins`.
4. Search for `KOI Sync`, and click on the result, it should say `By metagov`.
5. Click `Install` and then `Enable`.

## Setup
1. After installation, you should see the following info in the status bar (found at the bottom right of your screen): `KOI-net: 0 📜`.
2. Click on the "play" button to the right of it, mousing over it will show `Click to setup your KOI-net node!`.
3. Enter a name for your vault under `Node name`, make sure to enter a single word using only alphanumeric characters, hyphens, or underscores.
4. Copy in the `First contact RID` and `First contact URL`, this will be provided to you by the operator of your org's KOI network.
5. Leave the default values `RID types of interest`, unless a network operator tells you otherwise.
6. Click the `Submit` button to finish the setup process.

## Usage
(WIP)

After the initial sync, the plugin will automatically listen for new RID events and update its internal cache and templated markdown files. The status icon can be clicked to manually resynchronize with the remote node. Finally, a reformat command is provided to rerun the template on all of the knowledge objects. This should be run if the Handlebars template is every updated.