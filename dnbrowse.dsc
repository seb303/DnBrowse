## =======================================================##
## creates an HTML interface to browse Flags and Notables ##
## by @seb303                                             ##
## v0.1 2022-06-20                                        ##
## Requires Denizen-1.2.5-b6309-DEV or newer              ##  https://ci.citizensnpcs.co/job/Denizen_Developmental/
## =======================================================##



## CONFIG STARTS ##
dnbrowse_config:
    type: data

    # IP address or host name of the server
    address: localhost

    # Port for internal webserver to listen on
    port: 8080

    # Timeout period in seconds (after this time the internal webserver is stopped if there is no browser open)
    timeout: 300

## CONFIG ENDS ##



dnbrowse_events:
    type: world
    debug: false
    events:
        on delta time secondly every:10 server_flagged:dnbrowse_active:
            - if <server.flag[dnbrowse_secret].size> == 0:
                - webserver stop port:<script[dnbrowse_config].data_key[port]>
                - flag server dnbrowse_active:!

        on webserver web request method:get priority:100 has_response:false:
            - if !<server.has_flag[dnbrowse_secret.<context.path.substring[2]>]>:
                - determine code:401 passively
                - determine headers:[Content-Type=text/plain] passively
                - determine "raw_text_content:Permission denied"
            - else:
                - determine code:200 passively
                - determine "headers:<map.with[Content-Type].as[text/html; charset=UTF-8]>" passively
                - determine file:/dnbrowse.html
        on webserver web request path:/favicon.ico method:get:
            - determine code:200 passively
            - determine headers:[Content-Type=image/x-icon] passively
            - determine file:favicon.ico
        on webserver web request path:/css/* method:get:
            - determine code:200 passively
            - determine headers:[Content-Type=text/css] passively
            - determine file:<context.path>
        on webserver web request path:/js/* method:get:
            - determine code:200 passively
            - determine "headers:<map.with[Content-Type].as[text/javascript; charset=UTF-8]>" passively
            - determine file:<context.path>
        on webserver web request path:/ajax method:get:
            - define dnbrowse_secret <context.query.get[secret]>
            - if !<server.has_flag[dnbrowse_secret.<[dnbrowse_secret]>]>:
                - determine code:401 passively
                - determine headers:[Content-Type=text/plain] passively
                - determine "raw_text_content:Permission denied"
            - else:
                # Get player
                - define player <server.flag[dnbrowse_secret.<[dnbrowse_secret]>]>
                # Refresh secret expiry
                - flag server dnbrowse_secret.<[dnbrowse_secret]>:<[player]> expire:<script[dnbrowse_config].data_key[timeout]>s
                - flag <[player]> dnbrowse_secret:<[dnbrowse_secret]> expire:<script[dnbrowse_config].data_key[timeout]>s

                # Respond with JSON data
                - determine code:200 passively
                - determine "headers:<map.with[Content-Type].as[application/json; charset=UTF-8]>" passively
                - choose <context.query.get[action]>:

                    - case get_timeout:
                        - definemap data:
                            timeout: <script[dnbrowse_config].data_key[timeout]>

                    - case keep_alive:
                        - define data <map>

                    - case load_server:
                        - define data <server.flag_map>
                        - if !<[player].has_permission[custom.dnbrowse.secret]>:
                            - define data.dnbrowse_active:!
                            - define data.dnbrowse_secret:!

                    - case load_players:
                        - definemap data:
                            online: <map>
                            offline: <map>
                        - foreach <server.online_players> as:p:
                            - define data.online.<[p]> <[p].name>
                        - foreach <server.offline_players> as:p:
                            - define data.offline.<[p]> <[p].name>

                    - case load_player:
                        - define p <context.query.get[player]||>
                        - if <player[<[p]>].is_player>:
                            - define data <player[<[p]>].flag_map[]>
                            - if !<[player].has_permission[custom.dnbrowse.secret]>:
                                - define data.dnbrowse_secret:!
                        - else:
                            - definemap data:
                                error: "Unknown player '<[p]>'"

                    - case load_notables:
                        - define data <map>
                        - foreach locations|cuboids|ellipsoids|polygons|inventories as:type:
                            - foreach <server.notes[<[type]>]> as:note:
                                - define data.<[type]>.<[note]>.name <[note].note_name>
                                - choose <[type]>:
                                    - case locations:
                                        - define data.<[type]>.<[note]>.xyz <[note].xyz>
                                        - define data.<[type]>.<[note]>.yaw <[note].yaw>
                                        - define data.<[type]>.<[note]>.pitch <[note].pitch>
                                        - define data.<[type]>.<[note]>.world <[note].world.name>
                                    - case cuboids:
                                        - define corners <[note].corners>
                                        - define data.<[type]>.<[note]>.from <[corners].get[1].xyz>
                                        - define data.<[type]>.<[note]>.to <[corners].get[8].xyz>
                                        - define data.<[type]>.<[note]>.world <[note].world.name>
                                    - case ellipsoids:
                                        - define data.<[type]>.<[note]>.center <[note].location.xyz>
                                        - define data.<[type]>.<[note]>.size <[note].size.xyz>
                                        - define data.<[type]>.<[note]>.world <[note].world.name>
                                    - case polygons:
                                        - define data.<[type]>.<[note]>.corners <[note].corners.parse[xyz]>
                                        - define data.<[type]>.<[note]>.min_y <[note].min_y>
                                        - define data.<[type]>.<[note]>.max_y <[note].max_y>
                                        - define data.<[type]>.<[note]>.world <[note].world.name>
                                    - case inventories:
                                        - define data.<[type]>.<[note]>.slots <map>
                                        - define data.<[type]>.<[note]>.title <[note].title>
                                        - if <[note].script.exists>:
                                            - define data.<[type]>.<[note]>.script <[note].script.name>
                                        - else:
                                            - define data.<[type]>.<[note]>.script <empty>
                                        - foreach <[note].map_slots> key:slot as:item:
                                            - definemap data.<[type]>.<[note]>.slots.<[slot]>:
                                                name: <[item].material.name>
                                                display: <[item].display||>
                                                lore: <[item].lore||>
                                                enchantments: <[item].enchantment_map>
                                                quantity: <[item].quantity>

                    - default:
                        - definemap data:
                            error: "Unrecognised action '<context.query.get[action]>'"
                - determine raw_text_content:<[data].to_json>

dnbrowse_command:
    type: command
    debug: false
    name: dnbrowse
    description: Creates an HTML interface to browse Denizen flags & notables
    usage: /dnbrowse
    permission: custom.dnbrowse

    path_chars: <list[a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z|0|1|2|3|4|5|6|7|8|9]>
    script:
        - if <context.args.size> != 0:
            - narrate "<&[error]>/dnbrowse takes no parameters"

        # Build base URL
        - define url http://<script[dnbrowse_config].data_key[address]>
        - if <script[dnbrowse_config].data_key[port]> != 80:
            - define url <[url]>:<script[dnbrowse_config].data_key[port]>

        # Do we already have an active session for this player?
        - if <player.has_flag[dnbrowse_secret]>:
            - define dnbrowse_secret <player.flag[dnbrowse_secret]>
        - else:
            # Generate new secret
            - define dnbrowse_secret <script[dnbrowse_command].parsed_key[path_chars].random[10].separated_by[]>
        # Save secret / refresh expiry
        - flag server dnbrowse_secret.<[dnbrowse_secret]>:<player> expire:<script[dnbrowse_config].data_key[timeout]>s
        - flag <player> dnbrowse_secret:<[dnbrowse_secret]> expire:<script[dnbrowse_config].data_key[timeout]>s

        # Ensure webserver is running
        - if !<server.has_flag[dnbrowse_active]>:
            - flag server dnbrowse_active
            - webserver start port:<script[dnbrowse_config].data_key[port]> ignore_errors

        # Output link
        - define url <[url]>/<[dnbrowse_secret]>
        - narrate "DnBrowse listening at <&[emphasis]><&click[<[url]>].type[OPEN_URL]><[url]><&end_click>"
