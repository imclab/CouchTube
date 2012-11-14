$(document).ready(function() {

	var nicknameInput = $('#nickname-set .contents'),
		textInput = $('#chat-text .contents'),
		socket = io.connect('http://localhost');
	
	socket.on('ready', function (data) {
		//Lock form by default (loading state), unlock it here.
		//Check for sessionStorage "nickname", emit automatically if found.
	});

	socket.on('chat message', function(data) {
		$('body').append('<p>'+data.author+' - '+data.contents+'</p>');
	});

	$('#chat-text').submit(function(e) {
		e.preventDefault();
		socket.emit('chat message', { contents: textInput.val() });
		textInput.val("");
	});

	$('#nickname-set').submit(function(e) {
		e.preventDefault();

		var nickname = nicknameInput.val();
		socket.emit('set nickname', { nickname : nickname });
		$('#nickname-set').hide();
		$('#chat-text').show();
		//show nickname somewhere
		//& set user's nickname in cookie. emit nickname automatically if detected in cookie.
		//& remember to update cookie when users edits nickname.
		sessionStorage.setItem("nickname", nickname);
	});

});