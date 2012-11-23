//Global app object containing YouTube (Player related funcitonality), domUtils (DOM operations, style functions) and templates (templates used with underscore)
var app = {

	socket : io.connect(window.location.protocol + '//' + window.location.host),

	roomID: window.location.pathname.replace('/room/', ''),

	YouTube: {

		player: null,

		pending_id : null,

		pending_author : null,

		loadingStatus: { 'dom' : false, 'youtube_api' : false },

		init: function(youtube_id, author) {
			$('#youtube').addClass('initialized');

			if (youtube_id === null) {

				//video not yet set for room - show init form
				$('#ytframe').hide();
				$('#init_youtube').show().css('visibility', 'visible');

			} else {

				pending_id = youtube_id;
			}
		},

		onYouTubeAPIReady: function() {
			this.loadingStatus.youtube_api = true;
			if (this.pending_id && this.pending_author && this.pending_id && this.pending_author && this.loadingStatus.dom === true)
				this.initPlayer(this.pending_id, this.pending_author);
		},

		onDomReady: function() {
			this.loadingStatus.dom = true;
			if (this.pending_id && this.pending_author && this.pending_id && this.pending_author && this.loadingStatus.youtube_api === true)
				this.initPlayer(this.pending_id, this.pending_author);
		},

		initPlayer: function(id, author) {

			console.log('playing', id, author);

			$('#youtube').addClass('initialized');


			this.player = new YT.Player('ytframe', {
				height: '390',
				width: '640',
				playerVars: { 'autoplay': 1 },
				videoId: id
			});

			var youtube_author_template = $('#youtube-author-template').html();

			$('#ytframe').show().css('visibility', 'visible');

			var populatedTemplate = _.template(app.templates.youtube_author_template,
				{
					'youtube_id' : id,
					'author' : author
				}
			);

			$('#chat').append(populatedTemplate);
			app.domUtils.chatScrollToBottom();
		},

		sendNewVideo: function(video_id) {
			app.socket.emit('update video', { video_id : video_id } );
		},

		recieveNewVideo: function(video_id, author) {

			if (this.player === null) {
				this.initPlayer(video_id, author);
				return;
			}

			this.player.loadVideoById(video_id);
			$('#ytframe').show().css('visibility', 'visible');

			$('#youtube').addClass('initialized');
			$('#init_youtube').hide();

			//Todo: broadcast new video notification in chat
			var populatedTemplate = _.template(app.templates.youtube_author_template,
				{
					'youtube_id' : video_id,
					'author' : author
				}
			);

			$('#chat').append(populatedTemplate);
			app.domUtils.chatScrollToBottom();
		}

	},

	domUtils : {
		/* Bespoke DOM utilities */

		hideNickNameForm: function() {
			$('#nickname-set').hide();
			$('#chat-text').show();
		},

		showNickNameForm: function() {
			$('#nickname-set').show();
		},

		toggleNickNameForm: function() {
			$('#nickname-set').toggle();
		},

		chatScrollToBottom: function() {
			$('#chat').scrollTop(document.getElementById('chat').scrollHeight);
		},

		hideChatMessageForm: function() {
			$('#chat-text').hide();
		},

		showChatMessageForm: function() {
			$('#chat-text').show();
		},

		setNicknameFormTo: function(state) {
			if (state === "show") {

				this.showNickNameForm();
				this.hideChatMessageForm();
				$('#nickname-toggle').hide();
				$('#cancel-nickname').show();

			} else if (state === "hide") {

				this.hideNickNameForm();
				this.showChatMessageForm();
				$('#nickname-toggle').show();
				$('#cancel-nickname').hide();

			}
		},

		populateRecentRooms: function() {
			var recent_rooms = sessionStorage.getItem('recent_rooms');
			if (recent_rooms !== null) {
				var recent = JSON.parse(recent_rooms);
				var populatedTemplate = _.template(app.templates.recent_rooms_template,
					{
						'rooms' : recent.rooms
					}
				);

				$('#recent-rooms').append(populatedTemplate);
			}
		}

	},

	templates: {}

};


function onYouTubeIframeAPIReady() {
	app.YouTube.onYouTubeAPIReady();
}


//Await doc-ready before binding events
$(document).ready(function() {

	app.YouTube.onDomReady();

	var nicknameInput = $('#nickname-set .contents'),
		textInput = $('#chat-text .contents');

	app.templates.chat_message_template = $('#chat-message-template').html(),
	app.templates.chat_messages_template = $('#chat-messages-template').html(),
	app.templates.user_joined_template = $('#user-joined-template').html(),
	app.templates.user_left_template = $('#user-left-template').html(),
	app.templates.nick_change_template = $('#nick-change-template').html(),
	app.templates.recent_rooms_template = $('#recent-rooms-template').html(),
	app.templates.room_members_template = $('#room-members-template').html(),
	app.templates.youtube_author_template = $('#youtube-author-template').html();
	
	//Check for recent rooms in cookie, display if found
	app.domUtils.populateRecentRooms();

	/* DOM Events */

	$('#chat-text').submit(function(e) {
		e.preventDefault();
		app.socket.emit('chat message', { contents: textInput.val() });
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
		app.socket.emit('set nickname', { nickname : nickname });

		$('.init_nickname_notice').hide();
		$('#init_youtube').removeClass('faded');
		$('#ytframe').removeClass('faded');

		app.domUtils.setNicknameFormTo("hide");

		//Todo: show nickname somewhere
		sessionStorage.setItem("nickname", nickname);
	});

	$('#nickname-toggle').click(function(e) {
		e.preventDefault();
		app.domUtils.setNicknameFormTo("show");
	});

	$('#cancel-nickname').click(function(e) {
		e.preventDefault();
		app.domUtils.setNicknameFormTo("hide");
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
		$('#init_youtube').hide();
		app.YouTube.sendNewVideo(videoID);
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
		app.YouTube.sendNewVideo(videoID);

		$('#room_list .btn.open').show();
		$('#set-youtube').hide();
		$('#set-youtube .url').val('');
	});

});



/* Expose socket Events */

app.socket.on('existing video', function(data) {
	if (typeof(data.youtube_id) === "undefined" || data.youtube_id === null) {
		app.YouTube.init(null, null);
	} else {
		app.YouTube.pending_id = data.youtube_id;
		app.YouTube.pending_author = data.author;
	}
});

app.socket.on('room_init', function(data) {
	var currentRoomID = sessionStorage.getItem("roomID");
	if (currentRoomID !== null && (currentRoomID !== data.roomID)) {
		app.socket.emit('room_leave', { 'roomID' : currentRoomID } );
	}
	sessionStorage.setItem("roomID", data.roomID);
	app.socket.emit('room_join', { 'roomID' : data.roomID } );

	//Check if nickname is stored in session, emit on init if found.
	var session_nickname = sessionStorage.getItem('nickname');
	if (session_nickname !== null) {
		app.socket.emit('set nickname', { nickname : session_nickname });
		app.domUtils.hideNickNameForm();
	} else {
		$('#init_youtube').addClass('faded');
		$('#ytframe').addClass('faded');
		$('.init_nickname_notice').show().css('display', 'block');
	}
});

app.socket.on('ready', function (data) {
	var _yt = app.YouTube;
	if (_yt.pending_id && _yt.pending_author && _yt.pending_id && _yt.pending_author && _yt.loadingStatus.youtube_api === true && _yt.loadingStatus.dom === true)
		_yt.initPlayer(_yt.pending_id, _yt.pending_author);

	$('header textarea').val(window.location.href);

	var recent_rooms = sessionStorage.getItem('recent_rooms'),
		recent;

	if (recent_rooms === null) {
		recent = { "rooms" : [app.roomID] };
		sessionStorage.setItem('recent_rooms', JSON.stringify(recent));
	} else {
		recent = JSON.parse(recent_rooms);
		if (recent.rooms.indexOf(app.roomID) === -1)
			recent.rooms.push(app.roomID);
			if (recent.rooms.length > 5)
				recent.rooms.splice(0, 1);
			sessionStorage.setItem('recent_rooms', JSON.stringify(recent));

	}
	
	//Todo:
	//Disable youtube init form until this fires
});

app.socket.on('invalid nickname', function() {
	$('#nickname-set .invalid').show();
	showNickNameForm();
});

app.socket.on('user joined', function(data) {
	populatedTemplate = _.template(app.templates.user_joined_template,
		{
			'author' : data.author
		}
	);

	$('#chat').append(populatedTemplate);
	app.domUtils.chatScrollToBottom();
});

app.socket.on('user left', function(data) {
	if (typeof(data.author) === 'undefined' || data.author === null)
		return;

	populatedTemplate = _.template(app.templates.user_left_template,
		{
			'author' : data.author
		}
	);

	$('#chat').append(populatedTemplate);
	app.domUtils.chatScrollToBottom();
});

app.socket.on('message history', function(data) {
	populatedTemplate = _.template(app.templates.chat_messages_template,
		{
			'messages' : data
		}
	);

	$('#chat').append(populatedTemplate);
	app.domUtils.chatScrollToBottom();
});

//style differently if sent by this user
app.socket.on('chat message', function(data) {
	var linkifiedContents = linkify(data.contents);
	populatedTemplate = _.template(app.templates.chat_message_template,
		{
			'author' : data.author,
			'contents' : linkifiedContents,
			'room_id' : data.room_id
		}
	);

	$('#chat').append(populatedTemplate);
	app.domUtils.chatScrollToBottom();
});

app.socket.on('nick change', function(data) {

	populatedTemplate = _.template(app.templates.nick_change_template,
		{
			'old_name' : data.old_name,
			'new_name' : data.new_name
		}
	);

	$('#chat').append(populatedTemplate);
	app.domUtils.chatScrollToBottom();
});

app.socket.on('update room members', function(data) {

	var populatedTemplate = _.template(app.templates.room_members_template,
		{
			'members' : data
		}
	);

	$('#room-members').empty().html(populatedTemplate);
});

app.socket.on('update video', function(data) {
	app.YouTube.recieveNewVideo(data.video_id, data.author);
});