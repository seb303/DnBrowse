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

- custom.dnbrowse - base permission needed to use
- custom.dnbrowse.tp - allow to teleport player to noted locations, etc.
- custom.dnbrowse.edit - allow editing and deleting of flags and notables (not yet implemented)
- custom.dnbrowse.secrets - allow to show dnbrowse_secret flags, otherwise these and dnbrowse_active are filtered

Note that depending on the permissions system, the player may need to be online for the permissions to function (i.e. if the web interface is reloaded while the player is offline then the permissions may default to false).
