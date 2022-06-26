var secret;
var time_offset; // Add time_offset milliseconds to browser time to get server time
var options = {};
//options.show_expired_flags ... Show expired flags?
//optjons.tp ... Player has permission to teleport?
//options.edit ... Player has permission to edit data?
function init() {
	$.jstree.defaults.core.themes.variant = "dark";
	$.jstree.defaults.plugins = [ "search", "state" ]; // "checkbox"
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
	$("#search").submit(function(e) {
		e.preventDefault();
		// Need to change this to search active tab!!!!
		$("#data_server").jstree(true).search($("#query").val());
	});
}

var players_list;
function switchTab(tab) {
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
				var json = JSON.stringify(data, null, 4);
				$('#data_'+tab).html('<pre>'+escapeHtml(json)+'</pre>');
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
						playerFlags(e.currentTarget.dataset.value);
					});
				
				$('#'+data.node.id+' img.teleport')
					.off('mouseenter').on('mouseenter', function(e) {
						showTeleportInfo(e.currentTarget, e.currentTarget.dataset.expiration);
					})
					.off('click').on('click', function(e) {
						teleportTo(e.currentTarget, e.currentTarget.dataset.value);
					});
			})
		})
		.fail(function() {
			alert('An error occurred:\n\n'+jqxhr.responseText);
		});
	}
	$('#data > div').removeClass('active');
	$('#data_'+tab).addClass('active');
	window.location.hash = '#'+tab;
}
function loadPlayerFlags(node, cb) {
	if (node.parent === null) {
		var players_tree = [];
		if (players_list.online) {
			players_tree[players_tree.length] = {
				text: 'Online Players',
				children: playersTreeNode(players_list.online)
			}
		}
		if (players_list.offline) {
			players_tree[players_tree.length] = {
				text: 'Offline Players',
				children: playersTreeNode(players_list.offline)
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
function showPlayerFlags(p) {
	alert(p);
}

function flagTreeNode(flags) {
	var node = [];
	if (flags.__value && typeof flags.__value != 'object') {
		node[node.length] = nodeValue(flags.__value);
	} else {
		if (flags.__value) {
			flags = flags.__value;
		}
		if (flags.constructor === Array) {
			for (var i=0; i < flags.length; i++) {
				node[node.length] = nodeValue(flags[i]);
			}
		} else {
			var keys = Object.keys(flags).sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
			for (var i=0; i < keys.length; i++) {
				let key = keys[i];
				if (flags[key].__expiration && typeof flags[key].__expiration != 'object') {
					var expiration = parseTimeTag(flags[key].__expiration).getTime();
					var expires = expiration - (new Date()).getTime() - time_offset;
					if (expires > 0 || options.show_expired_flags) {
						var text = escapeHtml(key);
						text += '<img class=expires src="/dnbrowse/expires.png" data-expiration="'+expiration+'">';
						node[node.length] = {
							text: text,
							children: flagTreeNode(flags[key])
						};
					}
				} else {
					node[node.length] = {
						text: escapeHtml(key),
						children: flagTreeNode(flags[key])
					};
				}
			}
		}
	}
	return node;
}
function nodeValue(value) {
	var text = escapeHtml(value);
	if (value.startsWith('p@')) {
		var uuid = value.substring(2);
		text += '<img class=player src="https://crafatar.com/avatars/'+uuid+'" data-value="'+escapeHtml(value)+'">';
	} else if (options.tp && value.startsWith('l@')) {
		text += '<img class=teleport src="/dnbrowse/teleport.png" data-value="'+escapeHtml(value)+'">';
	}
	return text;
}

function playersTreeNode(players) {
	var node = [];
	var keys = Object.keys(players).sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
	for (var i=0; i < keys.length; i++) {
		let p = keys[i];
		node[node.length] = {
			text: escapeHtml(players[p]),
			player: p,
			children: true
		};
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
function showPlayerInfo(el, p) {
	var jqxhr = $.getJSON( '/ajax', {secret: secret, action: 'get_player_name', player: p}, function(data) {
		var html = 'Player '+data.name+' - click to browse flags';
		showHoverInfo(el, html);
	})
	.fail(function() {
		alert('An error occurred:\n\n'+jqxhr.responseText);
	});
}
function playerFlags(p) {
	switchTab('player');
	showPlayerFlags(p);
}
function showTeleportInfo(el, l) {
	var html = 'Click to teleport here';
	showHoverInfo(el, html);
}
function teleportTo(el, l) {
	var jqxhr = $.getJSON( '/ajax', {secret: secret, action: 'teleport', location: l}, function(data) {
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

function escapeHtml(text) {
	var map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

$(document).ready(init);