$(document).ready(function() {

	var nicknameInput = $('#nickname-set .contents'),
		textInput = $('#chat-text .contents'),
		socket = io.connect('http://localhost'),
		roomID = window.location.pathname.replace('/room/', ''),
		chat_message_template = $('#chat-message-template').html(),
		chat_messages_template = $('#chat-messages-template').html(),
		user_joined_template = $('#user-joined-template').html(),
		user_left_template = $('#user-left-template').html(),
		nick_change_template = $('#nick-change-template').html(),
		recent_rooms_template = $('#recent-rooms-template').html(),
		room_members_template = $('#room-members-template').html();
	

	populateRecentRooms();


	/* DOM Events */

	$('#chat-text').submit(function(e) {
		e.preventDefault();
		socket.emit('chat message', { contents: textInput.val() });
		textInput.val("");
	});

	$('#nickname-set').submit(function(e) {
		e.preventDefault();

		if (nicknameInput.val().length < 3) {
			$('#nickname-set .invalid').show();
			return;
		}

		$('#nickname-set .invalid').hide();

		var nickname = nicknameInput.val();
		socket.emit('set nickname', { nickname : nickname });

		setNicknameFormTo("hide");

		//Todo: show nickname somewhere
		sessionStorage.setItem("nickname", nickname);
	});

	$('#nickname-toggle').click(function(e) {
		e.preventDefault();
		setNicknameFormTo("show");
	});

	$('#cancel-nickname').click(function(e) {
		e.preventDefault();
		setNicknameFormTo("hide");
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

		//Check if nickname is stored in session, emit on init if found.
		var session_nickname = sessionStorage.getItem('nickname');
		if (session_nickname !== null) {
			socket.emit('set nickname', { nickname : session_nickname });
			hideNickNameForm();
		}
	});

	socket.on('ready', function (data) {
		$('header textarea').val(window.location.href);

		var recent_rooms = sessionStorage.getItem('recent_rooms'),
			recent;

		if (recent_rooms === null) {
			recent = { "rooms" : [roomID] };
			sessionStorage.setItem('recent_rooms', JSON.stringify(recent));
		} else {
			recent = JSON.parse(recent_rooms);
			if (recent.rooms.indexOf(roomID) === -1)
				recent.rooms.push(roomID);
				if (recent.rooms.length > 5)
					recent.rooms.splice(0, 1);
				sessionStorage.setItem('recent_rooms', JSON.stringify(recent));

		}
		
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

	socket.on('message history', function(data) {
		populatedTemplate = _.template(chat_messages_template,
			{
				'messages' : data
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

	socket.on('update room members', function(data) {

		var populatedTemplate = _.template(room_members_template,
			{
				'members' : data
			}
		);

		$('#room-members').empty().html(populatedTemplate);
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

	function hideChatMessageForm() {
		$('#chat-text').hide();
	}

	function showChatMessageForm() {
		$('#chat-text').show();
	}

	function setNicknameFormTo(state) {
		if (state === "show") {

			showNickNameForm();
			hideChatMessageForm();
			$('#nickname-toggle').hide();
			$('#cancel-nickname').show();

		} else if (state === "hide") {

			hideNickNameForm();
			showChatMessageForm();
			$('#nickname-toggle').show();
			$('#cancel-nickname').hide();

		}
	}

	function populateRecentRooms() {
		var recent_rooms = sessionStorage.getItem('recent_rooms');
		if (recent_rooms !== null) {
			var recent = JSON.parse(recent_rooms);
			var populatedTemplate = _.template(recent_rooms_template,
				{
					'rooms' : recent.rooms
				}
			);

			$('#recent-rooms').append(populatedTemplate);
		}
	}

});