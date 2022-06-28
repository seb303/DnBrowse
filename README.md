# DnBrowse

Denizen tool which creates an HTML interface to browse Flags and Notes.

v0.5 2022-06-26

## Installation

Requires Denizen-1.2.5-b6309-DEV or newer.

Copy the files into the `Denizens` directory (within scripts/ and webroot/dnbrowse/).

The following config options should be set in `Denizen/config.yml`:
- `Commands/WebServer/Allow: true`
- `Tags/List flags/I know what im doing and need this: true`

## Usage

To get a link to the browser interface, run command `/dnbrowse`

## Permissions

- `custom.dnbrowse` base permission needed to use
- `custom.dnbrowse.tp` allow to teleport player to locations, etc.
- `custom.dnbrowse.edit` allow editing and deleting of flags and notese (not yet implemented)
- `custom.dnbrowse.secrets` allow to show dnbrowse_secret flags, otherwise these and dnbrowse_active are filtered

Note that depending on the permissions system, the player may need to be online for the permissions to function (i.e. if the web interface is reloaded while the player is offline then the permissions may default to false).

## Features

Shows a tree-view of Denizen data within a web-browser.

### Flags

Currently supports: server flags, player flags, and item flags within noted inventories. Other flaggable objects may be added later.

Expiring flags show an icon, with relative and absolute times.

### Notes

All types of note can be browsed.

### Search

A search function allows searching of the data within the current tab. Note that since player flags are loaded on demand when each player is expanded in the tree view, only loaded players will be searched.

### Player heads

Player objects show the player's head (from [crafatar.com](https://crafatar.com/)). Clicking the head opens the player's flags.

### Teleport

If a Location or AreaObject is saved in flag or note, an icon allows the player who launched DnBrowse to be teleported to the location. In the case of an AreaObject the player will be teleported to the center and the area will be selected with the Denizen Area Selector Tool and/or WorldEdit, if available.  Requires permission `custom.dnbrowse.tp`
