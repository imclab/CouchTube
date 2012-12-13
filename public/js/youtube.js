(function() {

	var YouTube = function() {};

	YouTube.prototype.player = null;
	YouTube.prototype.pending_id = null;
	YouTube.prototype.pending_author = null;
	YouTube.prototype.loadingStatus = { 'dom' : false, 'youtube_api' : false };

	YouTube.prototype.init = function(youtube_id, author) {
		$('#youtube').addClass('initialized');

		if (youtube_id === null) {

			//video not yet set for room - show init form
			$('#ytframe').hide();
			$('#init_youtube').show().css('visibility', 'visible');

		} else {

			pending_id = youtube_id;
		}
	};


	YouTube.prototype.onYouTubeAPIReady = function() {
		this.loadingStatus.youtube_api = true;
		if (this.pending_id && this.pending_author && this.pending_id && this.pending_author && this.loadingStatus.dom === true)
			this.initPlayer(this.pending_id, this.pending_author);
	};

	YouTube.prototype.onDomReady = function() {
		this.loadingStatus.dom = true;
		if (this.pending_id && this.pending_author && this.pending_id && this.pending_author && this.loadingStatus.youtube_api === true)
			this.initPlayer(this.pending_id, this.pending_author);
	};

	YouTube.prototype.initPlayer = function(id, author) {

		//Todo: investigate why the topic is broadcasted upon nickname change.
		//More details: seems like this function is called more than once; loadVideoById method dissapears

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
	};

	YouTube.prototype.sendNewVideo = function(video_id) {
		app.socket.emit('update video', { video_id : video_id } );
	};

	YouTube.prototype.recieveNewVideo = function(video_id, author) {

		if (this.player === null) {
			this.initPlayer(video_id, author);
			return;
		}

		this.player.loadVideoById(video_id);
		$('#ytframe').show().css('visibility', 'visible');

		$('#youtube').addClass('initialized');
		$('#init_youtube').hide();

		var populatedTemplate = _.template(app.templates.youtube_author_template,
			{
				'youtube_id' : video_id,
				'author' : author
			}
		);

		$('#chat').append(populatedTemplate);
		app.domUtils.chatScrollToBottom();
	};
	
	window.app.YouTube = new YouTube();

}).call(this);