var secret;
var time_offset; // Add time_offset milliseconds to browser time to get server time
var options = {};
//options.show_expired_flags ... Show expired flags be hidden?
//optjons.tp ... Player has permission to teleport?
//options.edit ... Player has permission to edit data?
function init() {
	$.jstree.defaults.core.themes.variant = "dark";
	$.jstree.defaults.plugins = [ "checkbox", "search", "state" ];
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
		switchTab('server');
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

var server_flags, players, player_flags, notes;
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
				server_flags = data;
				$('#data_'+tab).html(writeTreeNode(server_flags)).jstree();
				break;
			case 'player':
				players = data;
				var json = JSON.stringify(players, null, 4);
				$('#data_'+tab).html('<pre>'+escapeHtml(json)+'</pre>');
				break;
			case 'notes':
				notes = data;
				var json = JSON.stringify(notes, null, 4);
				$('#data_'+tab).html('<pre>'+escapeHtml(json)+'</pre>');
				break;
			}
		})
		.fail(function() {
			alert('An error occurred:\n\n'+jqxhr.responseText);
		});
	}
	$('#data > div').removeClass('active');
	$('#data_'+tab).addClass('active');
}

function writeTreeNode(flags) {
	var html = '<ul>';
	if (flags.__value && typeof flags.__value != 'object') {
		html += '<li class=value>'+escapeHtml(flags.__value);
		if (flags.__value.startsWith('p@')) {
			html += ' <u>P-link-icon</u>';
		} else if (flags.__value.startsWith('l@')) {
			html += ' <u>Teleport-icon</u>';
		}
	} else {
		if (flags.__value) {
			flags = flags.__value;
		}
		if (flags.constructor === Array) {
			for (var i=0; i < flags.length; i++) {
				html += '<li class=value>'+escapeHtml(flags[i]);
			}
		} else {
			var keys = Object.keys(flags).sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
			for (var i=0; i < keys.length; i++) {
				let key = keys[i];
				if (flags[key].__expiration && typeof flags[key].__expiration != 'object') {
					var expiration = parseTimeTag(flags[key].__expiration).getTime();
					var expires = expiration - (new Date()).getTime() - time_offset;
					if (expires > 0 || options.show_expired_flags) {
						html += '<li class="key'+(expires > 0 ? '':' expired')+'">'+escapeHtml(key);
						html += '<img class=expires src="/dnbrowse/expires.png" onmouseover="showExpiry(this, event, '+expiration+');" onmouseout="hideHoverInfo();">';
						html += writeTreeNode(flags[key]);
					}
				} else {
					html += '<li class=key>'+escapeHtml(key);
					html += writeTreeNode(flags[key]);
				}
			}
		}
	}
	html += '</ul>';
	return html;
}

function showExpiry(el, e, expiration) {
	var pos = $(el).position();
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
	$('#hoverinfo').css({
		left: pos.left+30,
		top: pos.top-5,
		display: 'block'
	}).html(html);
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