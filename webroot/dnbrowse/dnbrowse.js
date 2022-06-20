var secret;
function init() {
	secret = window.location.pathname.substring(1);
	var jqxhr = $.getJSON( '/dnbrowse/ajax', {secret: secret, action: 'get_timeout'}, function(data) {
		setInterval(function() {
			$.getJSON( '/dnbrowse/ajax', {secret: secret, action: 'keep_alive'} );
		}, data.timeout*250);
	})
	.fail(function() {
		alert('An error occurred:\n\n'+jqxhr.responseText);
	});
	switchTab('server');
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
		var jqxhr = $.getJSON( '/dnbrowse/ajax', {secret: secret, action: action}, function(data) {
			switch (tab) {
			case 'server':
				server_flags = data;
				break;
			case 'player':
				players = data;
				break;
			case 'notes':
				notes = data;
				break;
			}
			updateTab(tab);
		})
		.fail(function() {
			alert('An error occurred:\n\n'+jqxhr.responseText);
		});
	}
	$('#data > div').removeClass('active');
	$('#data_'+tab).addClass('active');
}

function updateTab(tab) {
	switch (tab) {
	case 'server':
		var json = JSON.stringify(server_flags, null, 4);
		break;
	case 'player':
		var json = JSON.stringify(players, null, 4);
		//console.log(player_flags);
		break;
	case 'notes':
		var json = JSON.stringify(notes, null, 4);
		break;
	}
	$('#data_'+tab).html('<pre>'+escapeHtml(json)+'</pre>');
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