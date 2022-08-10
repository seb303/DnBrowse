var secret;
var time_offset; // Add time_offset milliseconds to browser time to get server time
var options = {};
//options.show_expired_flags ... Show expired flags?
//optjons.tp ... Player has permission to teleport?
//options.edit ... Player has permission to edit data?
function init() {
	$.jstree.defaults.core.themes.variant = "dark";
	$.jstree.defaults.plugins = [ "search", "state" ]; // "checkbox"
	$.jstree.defaults.search.show_only_matches_children = true;
	secret = window.location.pathname.substring(1);
	var jqxhr = $.getJSON( '/ajax', {secret: secret, action: 'get_options'}, function(data) {
		setInterval(function() {
			$.getJSON( '/ajax', {secret: secret, action: 'keep_alive'} );
		}, data.timeout*250);
		var server_time = parseTimeTag(data.time_now);
		time_offset = server_time.getTime() - (new Date()).getTime();
		options.show_expired_flags = (data.show_expired_flags == 'true');
		options.tp = (data.tp == 'true');
		options.edit = (data.edit == 'true');
		var last_tab = window.location.hash.substring(1);
		if (last_tab != '') {
			switchTab(last_tab);
		} else {
			switchTab('server');
		}
	})
	.fail(function() {
		alert('An error occurred:\n\n'+jqxhr.responseText);
	});
	
	$('#searchtype img').on('click', function(e) {
		if (!query_menu) {
			e.stopImmediatePropagation();
			$('#searchtype').addClass('menu').removeClass('filter');
			query_menu = true;
		}
	});
	$('#searchtype img.search').on('click', function(e) {
		if (query_menu) {
			e.stopImmediatePropagation();
			$('#searchtype').removeClass(['menu','filter']);
			query_menu = false;
			query_filter = false;
			doSearch();
		}
	});
	$('#searchtype img.filter').on('click', function(e) {
		if (query_menu) {
			e.stopImmediatePropagation();
			$('#searchtype').removeClass('menu').addClass('filter');
			query_menu = false;
			query_filter = true;
			doSearch();
		}
	});
	$('#search').submit(function(e) {
		e.preventDefault();
		doSearch();
	});
}
var query_menu = false;
var query_filter = false;
var query_per_tab = {};
function doSearch() {
	query_per_tab[current_tab] = {
		query: $('#query').val(),
		filter: query_filter
	}
	$('#data_'+current_tab).jstree(true).search(query_per_tab[current_tab].query, false, query_per_tab[current_tab].filter);
}

var current_tab, players_list;
function switchTab(tab) {
	if (tab == current_tab) {
		return;
	}
	$('#tabs > span').removeClass('active');
	$('#tab_'+tab).addClass('active');
	if ($('#data_'+tab).length == 0) {
		$('#data').append('<div id=data_'+tab+'></div>');
		if (tab == 'player') {
			var action = 'load_players';
		} else {
			var action = 'load_'+tab;
		}
		var jqxhr = $.getJSON( '/ajax', {secret: secret, action: action}, function(data) {
			switch (tab) {
			case 'server':
				var jstree = $('#data_'+tab).jstree({
					core: {
						data: flagTreeNode(data)
					}
				});
				break;
			case 'player':
				players_list = data;
				var jstree = $('#data_'+tab).jstree({
					core: {
						data: loadPlayerFlags
					}
				});
				break;
			case 'notes':
				var jstree = $('#data_'+tab).jstree({
					core: {
						data: notesRootNode(data)
					}
				});
				break;
			}
			jstree.on('hover_node.jstree', function(e, data) {
				$('#'+data.node.id+' img.expires')
					.off('mouseenter').on('mouseenter', function(e) {
						showExpiry(e.currentTarget, e.currentTarget.dataset.expiration);
					});
				
				$('#'+data.node.id+' img.player')
					.off('mouseenter').on('mouseenter', function(e) {
						showPlayerInfo(e.currentTarget, e.currentTarget.dataset.value);
					})
					.off('click').on('click', function(e) {
						showPlayerFlags(e.currentTarget.dataset.value);
					});
				
				$('#'+data.node.id+' img.playerflags')
					.off('mouseenter').on('mouseenter', function(e) {
						showPlayerUuid(e.currentTarget, e.currentTarget.dataset.value);
					})
					.off('click').on('click', function(e) {
						copyToClipboard(e.currentTarget, e.currentTarget.dataset.value);
					});
				
				$('#'+data.node.id+' img.teleport')
					.off('mouseenter').on('mouseenter', function(e) {
						showTeleportInfo(e.currentTarget, e.currentTarget.dataset.value);
					})
					.off('click').on('click', function(e) {
						teleportTo(e.currentTarget, e.currentTarget.dataset.value);
					});
				
				$('#'+data.node.id+' img.areateleport')
					.off('mouseenter').on('mouseenter', function(e) {
						showAreaTeleportInfo(e.currentTarget, e.currentTarget.dataset.value);
					})
					.off('click').on('click', function(e) {
						teleportTo(e.currentTarget, e.currentTarget.dataset.value);
					});
			}).on('ready.jstree', function(e, data) {
				if (expand_player) {
					data.instance.close_all();
					data.instance.open_node(data.instance.get_parent(expand_player));
					data.instance.open_node(expand_player);
					expand_player = false;
				}
			});
		})
		.fail(function() {
			alert('An error occurred:\n\n'+jqxhr.responseText);
		});
	} else if (expand_player) {
		var instance = $('#data_player').jstree(true);
		instance.close_all();
		instance.open_node(instance.get_parent(expand_player));
		instance.open_node(expand_player);
		expand_player = false;
	}
	$('#data > div').removeClass('active');
	$('#data_'+tab).addClass('active');
	current_tab = tab;
	window.location.hash = '#'+tab;
	
	$('#searchtype').removeClass('menu');
	query_menu = false;
	if (query_per_tab[current_tab]) {
		$('#query').val(query_per_tab[current_tab].query);
		query_filter = query_per_tab[current_tab].filter;
	} else {
		$('#query').val('');
		query_filter = false;
	}
	if (query_filter) {
		$('#searchtype').addClass('filter');
	} else {
		$('#searchtype').removeClass('filter');
	}
}
function loadPlayerFlags(node, cb) {
	if (node.parent === null) {
		var players_tree = [];
		if (players_list.online) {
			players_tree[players_tree.length] = {
				id: 'online_players',
				text: 'Online Players',
				children: playersTreeNode(players_list.online),
				li_attr: {class:'online'}
			}
		}
		if (players_list.offline) {
			players_tree[players_tree.length] = {
				id: 'offline_players',
				text: 'Offline Players',
				children: playersTreeNode(players_list.offline),
				li_attr: {class:'offline'}
			}
		}
		cb.call(this, players_tree);
	} else {
		var jqxhr = $.getJSON( '/ajax', {secret: secret, action: 'load_player', player: node.original.player}, function(data) {
			cb.call(this, flagTreeNode(data));
		})
		.fail(function() {
			alert('An error occurred:\n\n'+jqxhr.responseText);
		});
	}
}

function flagTreeNode(flags) {
	if (flags.__value) {
		flags = flags.__value;
	}
	var node = [];
	if (flags && typeof flags != 'object') {
		node[node.length] = nodeValue(flags);
	} else {
		if (flags.constructor === Array) {
			for (var i=0; i < flags.length; i++) {
				if (typeof flags[i] != 'object') {
					node[node.length] = {
						text: nodeValue(flags[i]),
						li_attr: {class:'value'}
					};
				} else {
					node[node.length] = {
						text: ''+(i+1),
						children: flagTreeNode(flags[i]),
						li_attr: {class:'key'}
					};
				}
			}
		} else {
			var keys = Object.keys(flags).sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
			for (var i=0; i < keys.length; i++) {
				let key = keys[i];
				var nodeElement = flagNodeElement(key, flags[key]);
				if (nodeElement) {
					node[node.length] = nodeElement;
				}
			}
		}
	}
	return node;
}
function flagNodeElement(key, value) {
	if (value.__expiration && typeof value.__expiration != 'object') {
		var expiration = parseTimeTag(value.__expiration).getTime();
		var expires = expiration - (new Date()).getTime() - time_offset;
		if (expires > 0 || options.show_expired_flags) {
			var text = escapeHtml(key);
			text += '<img class=expires src="/dnbrowse/expires.png" data-expiration="'+expiration+'">';
			return {
				text: text,
				children: flagTreeNode(value),
				li_attr: expires > 0 ? {class:'key'} : {class:'key expired'}
			};
		}
	} else {
		return {
			text: escapeHtml(key),
			children: flagTreeNode(value),
			li_attr: {class:'key'}
		};
	}
	return false;
}
function nodeValue(value) {
	if (typeof value !== 'string') {
		value = value.toString()+' - this is probably an error, please open a github issue';
	}
	var text = escapeHtml(value);
	if (value.startsWith('p@')) {
		var uuid = value.substring(2);
		text += '<img class=player src="https://crafatar.com/avatars/'+uuid+'" data-value="'+escapeHtml(uuid)+'">';
	} else if (options.tp && value.startsWith('l@')) {
		text += '<img class=teleport src="/dnbrowse/teleport.png" data-value="'+escapeHtml(value)+'">';
	} else if (options.tp && (value.startsWith('cu@') || value.startsWith('ellipsoid@') || value.startsWith('polygon@'))) {
		text += '<img class=areateleport src="/dnbrowse/teleport.png" data-value="'+escapeHtml(value)+'">';
	}
	return {
		text: text,
		li_attr: {class:'value'}
	};
}

function playersTreeNode(players) {
	var node = [];
	var keys = Object.keys(players).sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
	for (var i=0; i < keys.length; i++) {
		let p = keys[i];
		node[node.length] = {
			id: players[p].uuid,
			text: escapeHtml(players[p].name)+'<img class=playerflags src="https://crafatar.com/avatars/'+players[p].uuid+'" data-value="'+players[p].uuid+'">',
			player: p,
			children: true,
			li_attr: {class:'player'}
		};
	}
	return node;
}

function notesRootNode(notes) {
	var node = [];
	var notetypes = ['locations','cuboids','ellipsoids','polygons','inventories'];
	for (var i=0; i < notetypes.length; i++) {
		let notetype = notetypes[i];
		if (notes[notetype]) {
			node[node.length] = {
				text: notetype,
				children: notesTreeNode(notes[notetype], notetype),
				li_attr: {class:'notetype'}
			};
		}
	}
	return node;
}
function notesTreeNode(notes, notetype) {
	var node = [];
	if (!notes.name) {
		var keys = Object.keys(notes).sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
		for (var i=0; i < keys.length; i++) {
			let key = keys[i];
			var text = notes[key].name ? notes[key].name : key.replace(/^in@/, '');
			switch(notetype) {
				case 'locations':
					text += '<img class=teleport src="/dnbrowse/teleport.png" data-value="'+escapeHtml(key)+'">';
					break;
				case 'cuboids':
				case 'ellipsoids':
				case 'polygons':
					text += '<img class=areateleport src="/dnbrowse/teleport.png" data-value="'+escapeHtml(key)+'">';
					break;
			}
			node[node.length] = {
				text: text,
				children: notesTreeNode(notes[key], notetype),
				li_attr: {class:'key'}
			};
		}
	} else {
		var keys = Object.keys(notes).sort(function(a,b) {
			if (a == 'slots') {
				return 1;
			}
			if (b == 'slots') {
				return -1;
			}
			return a.localeCompare(b, undefined, {numeric: true});
		});
		for (var i=0; i < keys.length; i++) {
			let key = keys[i];
			if (typeof notes[key] != 'object') {
				node[node.length] = {
					text: key+' <span class=equals>=</span> <span class=value>'+escapeHtml(notes[key])+'</span>'
				};
			} else {
				node[node.length] = {
					text: key,
					children: notesTreeSubNode(key, notes[key]),
					li_attr: {class:'key'}
				};
			}
		}
	}
	return node;
}
function notesTreeSubNode(key, value) {
	var node = [];
	if (value.constructor === Array) {
		for (var i=0; i < value.length; i++) {
			if (typeof value[i] != 'object') {
				node[node.length] = {
					text: escapeHtml(value[i], true),
					li_attr: {class:'value'}
				};
			} else {
				node[node.length] = {
					text: ''+(i+1),
					children: notesTreeSubNode(i, value[i]),
					li_attr: {class:'key'}
				};
			}
		}
	} else if (typeof value == 'object') {
		var keys = Object.keys(value).sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
		for (var i=0; i < keys.length; i++) {
			let subkey = keys[i];
			if (typeof value[subkey] != 'object') {
				node[node.length] = {
					text: subkey+' <span class=equals>=</span> <span class=value>'+escapeHtml(value[subkey], true)+'</span>'
				};
			} else {
				if (key == 'slots') {
					var subkey_label = '<span class=value>'+subkey+' <span class=equals>=</span> '+escapeHtml(value[subkey].name);
					delete value[subkey].name;
					if (value[subkey].display) {
						subkey_label += ' '+escapeHtml(value[subkey].display, true, true);
					}
					if (value[subkey].quantity) {
						subkey_label += ' <span class=quantity>x'+value[subkey].quantity+'</span>';
					}
					subkey_label += '</span>';
				} else {
					var subkey_label = subkey;
				}
				if (key == 'flags') {
					var nodeElement = flagNodeElement(subkey, value[subkey]);
					if (nodeElement) {
						node[node.length] = nodeElement;
					}
				} else {
					node[node.length] = {
						text: subkey_label,
						children: notesTreeSubNode(subkey, value[subkey])
					};
				}
			}
		}
	}
	return node;
}
function showExpiry(el, expiration) {
	var server_time = (new Date()).getTime() + time_offset;
	var expires = expiration-server_time;
	if (expires > 0) {
		var html = 'Expires in '+timePeriod(expires);
	} else {
		var html = 'Expired '+timePeriod(expires*-1)+' ago';
		$(el).parents('li').first().addClass('expired');
	}
	var d = new Date();
	d.setTime(expiration);
	html += ' @ '+d.toLocaleTimeString()+' '+d.toLocaleDateString([], {timeZoneName: 'short'});
	showHoverInfo(el, html);
}
function showPlayerInfo(el, player) {
	var jqxhr = $.getJSON( '/ajax', {secret: secret, action: 'get_player_name', player: player}, function(data) {
		var html = 'Player '+data.name+' - click to browse flags';
		showHoverInfo(el, html);
	})
	.fail(function() {
		alert('An error occurred:\n\n'+jqxhr.responseText);
	});
}
var expand_player = false;
function showPlayerFlags(player) {
	expand_player = player;
	switchTab('player');
}
function showPlayerUuid(el, player) {
	showHoverInfo(el, el.dataset.value+' - click to copy');
}
function copyToClipboard(el, s) {
	showHoverInfo(el, 'Copied!');
	navigator.clipboard.writeText(s);
}
function showTeleportInfo(el, location) {
	var html = 'Click to teleport here';
	showHoverInfo(el, html);
}
function showAreaTeleportInfo(el, area) {
	var html = 'Click to teleport to center, and select area';
	showHoverInfo(el, html);
}
function teleportTo(el, destination) {
	var jqxhr = $.getJSON( '/ajax', {secret: secret, action: 'teleport', destination: destination}, function(data) {
		showHoverInfo(el, 'Teleport succeeded!');
		if (data.success == 'true') {
			el.src = '/dnbrowse/teleport_active.png';
			setTimeout(function() {
				el.src = '/dnbrowse/teleport.png';
			}, 250);
			setTimeout(function() {
				el.src = '/dnbrowse/teleport_active.png';
			}, 400);
			setTimeout(function() {
				el.src = '/dnbrowse/teleport.png';
			}, 650);
		} else {
			showHoverInfo(el, 'Teleport failed. Is your player still online?');
		}
	})
	.fail(function() {
		alert('An error occurred:\n\n'+jqxhr.responseText);
	});
}
function showHoverInfo(el, html) {
	$(el).off('mouseleave').on('mouseleave', hideHoverInfo);
	var pos = $(el).position();
	$('#hoverinfo').css({
		left: pos.left+30,
		top: pos.top-5,
		display: 'block'
	}).removeClass().addClass($(el).attr('class')).html(html);
}
function hideHoverInfo() {
	$('#hoverinfo').css({
		display: 'none'
	});
}
// Converts a number in ms to a human readable time period
function timePeriod(ms) {
	var s = Math.round(ms/1000);
	if (s < 60) {
		return s+'s';
	}
	if (s < 3600) {
		var m = Math.floor(s/60);
		var extra_s = (s%60);
		if (extra_s> 0) {
			return m+'m '+ extra_s+'s';
		} else {
			return m+'m';
		}
	}
	if (s < 86400-30) {
		var h = Math.floor(s/3600);
		var extra_m = Math.round((s%3600)/60);
		if (extra_m > 0) {
			return h+'h '+ extra_m+'m';
		} else {
			return h+'h';
		}
	}
	if (s < 31536000-1800) {
		var d = Math.floor(s/86400);
		var extra_h = Math.round((s%86400)/3600);
		if (extra_h == 24) {
			d++;
			extra_h = 0;
		}
		if (extra_h > 0) {
			return d+'d '+ extra_h+'h';
		} else {
			return d+'d';
		}
	}
	var y = Math.floor(s/31536000);
	var extra_d = Math.round((s%31536000)/86400);
	if (extra_d == 365) {
		y++;
		extra_d = 0;
	}
	if (extra_d > 0) {
		return y+'y '+ extra_d+'d';
	} else {
		return y+'y';
	}
}

// Returns a JavaScript Date object or null
function parseTimeTag(input) {
	var d = new Date();
	var bits;
	if (bits = input.match( /^time@([0-9][0-9][0-9][0-9])\/([0-9][0-9])\/([0-9][0-9])_([0-9][0-9]):([0-9][0-9]):([0-9][0-9]):[0-9][0-9][0-9][0-9]_/ )) {
		d.setFullYear( parseInt(bits[1]) );
		d.setMonth( parseInt(bits[2])-1 );
		d.setDate( parseInt(bits[3]) );
		d.setHours( parseInt(bits[4]) );
		d.setMinutes( parseInt(bits[5]) );
		d.setSeconds( parseInt(bits[6]) );
	}
	return d;
}

var htmlMap = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#039;'
};
var colorMap = {
	'§0': {tag:'<span style="color:#000000;">', reset: true},
	'§1': {tag:'<span style="color:#0000aa;">', reset: true},
	'§2': {tag:'<span style="color:#00aa00;">', reset: true},
	'§3': {tag:'<span style="color:#00aaaa;">', reset: true},
	'§4': {tag:'<span style="color:#aa0000;">', reset: true},
	'§5': {tag:'<span style="color:#aa00aa;">', reset: true},
	'§6': {tag:'<span style="color:#ffaa00;">', reset: true},
	'§7': {tag:'<span style="color:#aaaaaa;">', reset: true},
	'§8': {tag:'<span style="color:#555555;">', reset: true},
	'§9': {tag:'<span style="color:#5555ff;">', reset: true},
	'§a': {tag:'<span style="color:#55ff55;">', reset: true},
	'§b': {tag:'<span style="color:#55ffff;">', reset: true},
	'§c': {tag:'<span style="color:#ff5555;">', reset: true},
	'§d': {tag:'<span style="color:#ff55ff;">', reset: true},
	'§e': {tag:'<span style="color:#ffff55;">', reset: true},
	'§f': {tag:'<span style="color:#ffffff;">', reset: true},
	'§l': {tag:'<span style="font-weight:bold;">', reset: false},
	'§m': {tag:'<span style="text-decoration:line-through;">', reset: false},
	'§n': {tag:'<span style="text-decoration:underline;">', reset: false},
	'§o': {tag:'<span style="font-style:italic;">', reset: false},
	'§r': {reset: true}
};
function escapeHtml(text, bColors, bHideColorCodes) {
	text = text.replace(/[&<>"']/g, function(m) { return htmlMap[m]; });
	if (bColors) {
		var tagCount = 0;
		text = text.replace(/§[0-9a-flmnor]/g, function(m) {
			if (bHideColorCodes) {
				var res = '';
			} else {
				var res = m;
			}
			if (colorMap[m].reset) {
				for (; tagCount > 0; tagCount--) {
					res += '</span>';
				}
			}
			if (colorMap[m].tag) {
				res += colorMap[m].tag;
				tagCount++;
			}
			return res;
		});
		for (; tagCount > 0; tagCount--) {
			text += '</span>';
		}
	}
	return text;
}

$(document).ready(init);