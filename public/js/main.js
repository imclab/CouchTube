$(document).ready(function() {

	var nicknameInput = $('#nickname-set .contents'),
		textInput = $('#chat-text .contents'),
		socket = io.connect(window.location.protocol + '//' + window.location.host),
		roomID = window.location.pathname.replace('/room/', ''),
		chat_message_template = $('#chat-message-template').html(),
		chat_messages_template = $('#chat-messages-template').html(),
		user_joined_template = $('#user-joined-template').html(),
		user_left_template = $('#user-left-template').html(),
		nick_change_template = $('#nick-change-template').html(),
		recent_rooms_template = $('#recent-rooms-template').html(),
		room_members_template = $('#room-members-template').html(),
		youtube_author_template = $('#youtube-author-template').html();
	
	//Check for recent rooms in cookie, display if found
	populateRecentRooms();

	//YouTube object used for controlling the video
	var YouTube = {

		init: function(youtube_id, author) {
			$('#youtube').addClass('initialized');

			if (youtube_id === null) {

				//video not yet set for room - show init form
				$('#youtube iframe').hide();
				$('#init_youtube').show().css('visibility', 'visible');

			} else {

				//video already set for room - embed it
				var embedURL = 'http://www.youtube.com/v/'+youtube_id+'?version=3&enablejsapi=1';
				$('#youtube iframe').attr('src', embedURL).show().css('visibility', 'visible');

				var populatedTemplate = _.template(youtube_author_template,
					{
						'youtube_id' : youtube_id,
						'author' : author
					}
				);

				$('#chat').append(populatedTemplate);
				chatScrollToBottom();
			}
		},

		sendNewVideo: function(video_id) {
			socket.emit('update video', { video_id : video_id } );
		},

		recieveNewVideo: function(video_id, author) {

			var embedURL = 'http://www.youtube.com/v/'+video_id+'?version=3&enablejsapi=1';
			$('#youtube iframe').attr('src', embedURL).show();
			$('#youtube').addClass('initialized');
			$('#init_youtube').hide();

			//Todo: broadcast new video notification in chat
			var populatedTemplate = _.template(youtube_author_template,
				{
					'youtube_id' : video_id,
					'author' : author
				}
			);

			$('#chat').append(populatedTemplate);
			chatScrollToBottom();
		}


	};


	/* DOM Events */

	$('#chat-text').submit(function(e) {
		e.preventDefault();
		socket.emit('chat message', { contents: textInput.val() });
		textInput.val('');
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

		$('.init_nickname_notice').hide();
		$('#init_youtube').removeClass('faded');
		$('#youtube iframe').removeClass('faded');

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

	$('#init_youtube').submit(function(e) {
		e.preventDefault();

		var videoURL = $.url($(this).children('.url').val());

		if (videoURL.attr('host') === "youtube.com" || videoURL.attr('host') === "www.youtube.com") {

			//youtube standard url (`v` param)
			videoID = videoURL.param('v');

		} else if (videoURL.attr('host') === "youtu.be") {

			//youtu.be url
			videoID = videoURL.attr('path');
			videoID = videoID.replace('/', '', videoID);

		} else {

			$('#init_youtube .invalid').show();
			return;

		}

		$('#init_youtube .invalid').hide();
		YouTube.sendNewVideo(videoID);
	});

	$('#room_list .btn.open').click(function(e) {
		e.preventDefault();
		$(this).hide();
		$('#set-youtube').show();
	});

	$('#set-youtube .cancel').click(function(e) {
		e.preventDefault();
		$('#room_list .btn.open').show();
		$('#set-youtube').hide();
	});
	
	$('#set-youtube').submit(function(e) {
		e.preventDefault();
		var videoURL = $.url($(this).children('.url').val());

		if (videoURL.attr('host') === "youtube.com" || videoURL.attr('host') === "www.youtube.com") {

			//youtube standard url (`v` param)
			videoID = videoURL.param('v');

		} else if (videoURL.attr('host') === "youtu.be") {

			//youtu.be url
			videoID = videoURL.attr('path');
			videoID = videoID.replace('/', '', videoID);

		} else {

			$('#set-youtube .invalid').show();
			return;

		}

		$('#set-youtube .invalid').hide();
		YouTube.sendNewVideo(videoID);

		$('#room_list .btn.open').show();
		$('#set-youtube').hide();
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
		} else {
			$('#init_youtube').addClass('faded');
			$('#youtube iframe').addClass('faded');
			$('.init_nickname_notice').show().css('display', 'block');
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
		
		//Todo:
		//Disable youtube init form until this fires
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

	socket.on('update video', function(data) {
		YouTube.recieveNewVideo(data.video_id, data.author);
	});

	socket.on('existing video', function(data) {
		if (typeof(data.youtube_id) === "undefined") {
			YouTube.init(null, null);
		} else {
			YouTube.init(data.youtube_id, data.author);
		}
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