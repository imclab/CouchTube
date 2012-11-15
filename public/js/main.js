$(document).ready(function() {

	var nicknameInput = $('#nickname-set .contents'),
		textInput = $('#chat-text .contents'),
		socket = io.connect('http://localhost'),
		chat_message_template = $('#chat-message-template').html(),
		user_joined_template = $('#user-joined-template').html(),
		user_left_template = $('#user-left-template').html(),
		nick_change_template = $('#nick-change-template').html();
	

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
		$('#nickname-set .invalid').hide();

		var nickname = nicknameInput.val();
		socket.emit('set nickname', { nickname : nickname });
		hideNickNameForm();
		//show nickname somewhere
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

	$('header textarea').click(function(e) {
		$(this).select();
	});



	/* Socket Events */

	socket.on('room_init', function(data) {
		var currentRoomID = sessionStorage.getItem("roomID");
		if (currentRoomID !== null && (currentRoomID !== data.roomID)) {
			socket.emit('room_leave', { 'roomID' : currentRoomID } );
		}
		sessionStorage.setItem("roomID", data.roomID);
		socket.emit('room_join', { 'roomID' : data.roomID } );
	});

	socket.on('ready', function (data) {
		$('header textarea').val(window.location.href);
		//Disable chat input until this fires (this fires after nickname has been set).
	});

	socket.on('invalid nickname', function() {
		$('#nickname-set .invalid').show();
		showNickNameForm();
	});

	socket.on('user joined', function(data) {
		populatedTemplate = _.template(user_joined_template,
			{
				'author' : data.author
			}
		);

		$('#chat').append(populatedTemplate);
		chatScrollToBottom();
	});

	socket.on('user left', function(data) {
		populatedTemplate = _.template(user_left_template,
			{
				'author' : data.author
			}
		);

		$('#chat').append(populatedTemplate);
		chatScrollToBottom();
	});

	//style differently if sent by this user
	socket.on('chat message', function(data) {
		var linkifiedContents = linkify(data.contents);
		populatedTemplate = _.template(chat_message_template,
			{
				'author' : data.author,
				'contents' : linkifiedContents,
				'room_id' : data.room_id
			}
		);

		$('#chat').append(populatedTemplate);
		chatScrollToBottom();
	});

	socket.on('nick change', function(data) {

		populatedTemplate = _.template(nick_change_template,
			{
				'old_name' : data.old_name,
				'new_name' : data.new_name
			}
		);

		$('#chat').append(populatedTemplate);
		chatScrollToBottom();
	});


	
	/* DOM utilities */

	function hideNickNameForm() {
		$('#nickname-set').hide();
		$('#chat-text').show();
	}

	function showNickNameForm() {
		$('#nickname-set').show();
	}

	function toggleNickNameForm() {
		$('#nickname-set').toggle();
	}

	function chatScrollToBottom() {
		$('#chat').scrollTop(document.getElementById('chat').scrollHeight);
	}

});