$(document).ready(function() {

	var nicknameInput = $('#nickname-set .contents'),
		textInput = $('#chat-text .contents'),
		socket = io.connect('http://localhost');
	

	//Check if nickname is stored in session, emit on init if found.
	var session_nickname = sessionStorage.getItem('nickname');
	if (session_nickname !== null) {
		socket.emit('set nickname', { nickname : session_nickname });
		hideNickNameForm();
	}

	/* DOM Events */

	$('#chat-text').submit(function(e) {
		e.preventDefault();
		socket.emit('chat message', { contents: textInput.val() });
		textInput.val("");
	});

	$('#nickname-set').submit(function(e) {
		e.preventDefault();

		var nickname = nicknameInput.val();
		socket.emit('set nickname', { nickname : nickname });
		hideNickNameForm();
		//show nickname somewhere
		//& set user's nickname in cookie. emit nickname automatically if detected in cookie.
		//& remember to update cookie when users edits nickname.
		sessionStorage.setItem("nickname", nickname);
	});

	$('#nickname-toggle').click(function(e) {
		e.preventDefault();
		toggleNickNameForm();
	});

	$('#chat a').live('click', function(e) {
		e.preventDefault();
		window.open($(e.currentTarget).attr('href'));
	});



	/* Socket Events */

	socket.on('ready', function (data) {
		//Disable chat input until this fires (this fires after nickname has been set).
	});

	socket.on('chat message', function(data) {
		var linkifiedContents = linkify(data.contents);
		$('#chat').append('<p>'+data.author+' - '+linkifiedContents+'</p>');
	});

	socket.on('nick change', function(data) {
		$('#chat').append('<p>'+data.old_name+' changed their nickname to '+data.new_name+'</p>');
	});


	
	/* DOM utilities */

	function hideNickNameForm() {
		$('#nickname-set').hide();
		$('#chat-text').show();
	}

	function toggleNickNameForm() {
		$('#nickname-set').toggle();
	}

});