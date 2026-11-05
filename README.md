# What is KOI Sync?
KOI Sync is an Obsidian plugin designed to interact with the [KOI-net ecosystem](https://github.com/DynamicalSystemsGroup/koi-net). Within a vault, it operates as its own node in a [Telescope KOI network](https://github.com/metagov/telescope-koi-network). It allows an Obsidian user to share notes with other vaults (or any nodes in the network), and stream knowledge objects produced by the network into their vault in a human-readable format.

This plugin communicates with remote KOI-net nodes over the internet. This is restricted to the nodes in the network you connect to by specifying the URL endpoint and RID of the coordinator during initial setup, no other remote services are contacted. In order to use this plugin, you will need access to a KOI network.

## Installation
The KOI Sync plugin can be easily installed inside of the Obsidian app.
1. Navigate to your vault's settings and click on `Community plugins`.
2. Click the button to `Exit Restricted mode` (if you haven't already).
3. Press the `Browse` button next to `Community plugins`.
4. Search for `KOI Sync`, and click on the result, it should say `By metagov`.
5. Click `Install` and then `Enable`.

## Setup
1. After installation, you should see the following info in the status bar (found at the bottom right of your screen): `KOI-net: 0 📜`.
2. Click on the "play" button to the right of it, mousing over it will show `Click to set up your KOI-net node!`.
3. Enter a name for your vault under `Node name`, make sure to enter a single word using only alphanumeric characters, hyphens, or underscores. (Example: `lukes-vault`).
4. Copy in the `First contact RID` and `First contact URL`, this will be provided to you by the operator of your org's KOI network.
5. Leave the default values `RID types of interest`, unless a network operator tells you otherwise.
6. Click the `Submit` button to finish the setup process.
7. You will see a pop up indicating that the plugin is now polling the network. A `KOI Sync` directory will appear, and you'll notice the KOI-net object counter increment as connections are made with new nodes and data is synchronized.

## Usage
Currently, the KOI Sync plugin has two main uses:
1. Syncing remote data published by other nodes, namely messages collected through the Telescope bot
2. Sharing Obsidian notes between two vaults within the same KOI network

Data published by other nodes will passively appear in your `KOI Sync` directory, so long as you have the corresponding RID type as being "of interest" in your settings. By default, this includes Obsidian notes (`orn:obsidian.note`) published by other vaults and Telescoped messages (`orn:telescoped`) from a Slack Telescope bot in the network. 

In order to pause syncing with the remote KOI network, click on the green check mark on the status bar. It will display `Synced! Click to pause` when you hover over it, and switch to a paused icon after clicking on it. While synchronization is paused, no new data will be sent or received. Any changes you make to tracked notes will only be transmitted after you resume synchronization.

Click on the pause button on the status bar, which displays `Paused. Click to resume syncing` on hover to resume the background sync process.

**All notes in the `KOI Sync` directory are views of remote data and should be treated as read-only. ANY EDITS MADE WILL BE OVERWRITTEN WITHOUT WARNING.**

**This plugin stores the node's private key within its `data.json` file. DO NOT PUBLISH YOUR VAULT PUBLICLY, OR SHARE IT WITH ANYONE YOU DO NOT TRUST.**

### Sharing Obsidian Notes
In order to publish your own notes, complete the following steps:
1. Press `Ctrl/Cmd + P` to open the Command palette.
2. Run the command `KOI Sync: Track this note` (you can start typing and hit `Enter` when the full command is highlighted).
3. Make sure frontmatter is visible by navigating to `Settings > Editor > Display` and setting `Properties in document` to `Visible`.
4. You should now see a properties header on the note you just tracked, with a unique RID (`_rid` field).
5. Shared notes automatically synchronize changes made to them with other nodes in the network, so as soon as you make an edit the updated version will show up on another vault in a few seconds.
6. In order to unshare a note, and delete it from other vaults, simply uncheck the `_koi_net_enabled` property. To reshare it, recheck the property again. Deleting a note in your vault will also remove it from other vaults.

As the `KOI Sync` directory represents a view on all knowledge objects in the vault's KOI-net cache, your own tracked notes will also show up under `KOI Sync > Obsidian Notes`. Make sure you are editing the original note, which will show the `_rid` and `_koi_net_enabled` properties at the top of the file.

### Formatting KOI Objects
Data received from a KOI network is JSON formatted, and stored in `KOI Sync > RID Cache`. In order to provide a more human-readable interface for Obsidian users, the KOI Sync plugin provides a templating system to transform JSON into formatted markdown. 

The default templates are automatically loaded into the `KOI Templates` directory, and automatically format KOI-net nodes & edges, Obsidian notes, and Telescoped messages. This plugin uses the [Handlebars templating language](https://handlebarsjs.com/guide/). For most users, the default templates will be sufficient. 

Templates are Markdown files named after the RID type they format, but with the `orn:` prefix dropped. (Example: `orn:koi-net.node` -> `koi-net.node.md`). If you modify a template, make sure to run the command: `KOI Sync: Reformat all synced notes from templates`. This will regenerate the note views in the `KOI Sync` directory, applying the new template.

### Resetting the Plugin
In order to reset the plugin to its initial state, run the command: `KOI Sync: Reset this plugin`. Note that doing this will permanently delete the `KOI Sync` directory, the RID cache, this node's identity and private key, and any plugin settings. Resetting will also transmit a FORGET event to the KOI network to delete this node's profile and associated edges. To confirm, click the `Reset` button in the popup.

**Shared Obsidian notes WILL NOT be deleted in remote vaults. If you wish to delete any shared notes, do this before resetting.** After setting up again, any notes that were still shared will be automatically re-shared from your new node, and can be unshared as normal.

You can now set up your plugin again by returning to the Setup section of this README.