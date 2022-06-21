var secret;
function init() {
	$.jstree.defaults.core.themes.variant = "dark";
	$.jstree.defaults.plugins = [ "checkbox", "search" ];
	secret = window.location.pathname.substring(1);
	var jqxhr = $.getJSON( '/ajax', {secret: secret, action: 'get_timeout'}, function(data) {
		setInterval(function() {
			$.getJSON( '/ajax', {secret: secret, action: 'keep_alive'} );
		}, data.timeout*250);
	})
	.fail(function() {
		alert('An error occurred:\n\n'+jqxhr.responseText);
	});
	switchTab('server');
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
				html += '<li class=key>'+escapeHtml(key);
				if (flags[key].__expiration && typeof flags[key].__expiration != 'object') {
					html += '<span class=expires>'+flags[key].__expiration+'</span>';
				}
				html += writeTreeNode(flags[key]);
			}
		}
	}
	html += '</ul>';
	return html;
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