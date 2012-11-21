var	express = require('express'),
	app = require('express')(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server, { log : false }),
	sanitize = require('validator').sanitize,
	check = require('validator').check,
	roomID = null,
	chatHistories = {},
	chatMembers = [],
	chatVideo = [];

__root = __dirname + '/public';

app.configure(function() {
	app.use(express.static('public'));
});

server.listen(3000);

app.get('/room/new', function (req, res) {
	var randomID = Math.round(Math.random()*10000000000).toString(36);
	res.redirect('/room/'+randomID);
});

app.get('/room/:id', function (req, res) {
	res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
	res.sendfile(__root + '/room/index.html');
	roomID = req.params.id;
	console.log('served', roomID);
});

app.get('/', function (req, res) {
	res.sendfile('index.html');
});

var chatRoom = {

	initChatHistories: function(roomId) {
		if (typeof(chatHistories[roomId]) === "undefined") {
			chatHistories[roomId] = [];
		}
	},

	initChatMembers: function(roomId) {
		if (typeof(chatMembers[roomId]) === "undefined") {
			chatMembers[roomId] = [];
		}
	},

	initChatVideo: function(roomId) {

		if (typeof(roomId) === "undefined" || roomId === "" || roomId === null)
			return;

		if (typeof(chatVideo[roomId]) === "undefined") {
			chatVideo[roomId] = [];
		}
	}

};


io.sockets.on('connection', function (socket) {

	socket.emit('room_init', { 'roomID' : roomID } );

	socket.on('room_join', function(data) {
		socket.join(data.roomID);
		socket.set('room_id', data.roomID);

		if (typeof(chatHistories[data.roomID]) === "undefined") {
			chatRoom.initChatHistories(data.roomID);
		} else {
			socket.emit('message history', chatHistories[data.roomID]);
		}
		
		if (typeof(chatVideo[data.roomID]) !== "undefined") {
			socket.emit('existing video', { youtube_id : chatVideo[data.roomID].video_id, author : chatVideo[data.roomID].author } );
		} else {
			socket.emit('existing video', { youtube_id : null, author : null } );
		}

	});

	socket.on('room_leave', function(data) {
		socket.get('nickname', function (err, name) {

			io.sockets.in(data.roomID).emit('user left', { 'author' : name });

			chatRoom.initChatMembers(data.roomID);

			var index = chatMembers[data.roomID].indexOf(name);
			if (index !== -1)
				chatMembers[data.roomID].splice(index, 1);

			io.sockets.in(data.roomID).emit('update room members', chatMembers[data.roomID]);

			socket.leave(data.roomID);

		});
	});

	socket.on('disconnect', function(data) {
		socket.get('room_id', function(err, id) {
			socket.get('nickname', function (err, name) {
				io.sockets.in(id).emit('user left', { 'author' : name });

				chatRoom.initChatMembers(id);

				var index = chatMembers[id].indexOf(name);
				if (index !== -1)
					chatMembers[id].splice(index, 1);
				
				io.sockets.in(id).emit('update room members', chatMembers[id]);
			});
		});
	});

	socket.on('set nickname', function (data) {

		var socketRoomID = null,
			cleanNickname = strip_tags(sanitize(data.nickname).xss().trim());

		if (cleanNickname.length < 3) {
			socket.emit('invalid nickname', null);
			return;
		}

		socket.get('room_id', function(err, id) {

			socketRoomID = id;
			
			socket.get('nickname', function (err, name) {

				if (name === null) { //nickname was set for first time

					socket.set('nickname', cleanNickname, function () {
						console.log(cleanNickname, 'joined room', socketRoomID);
						io.sockets.in(socketRoomID).emit('user joined', { 'author' : cleanNickname });

						chatRoom.initChatMembers(socketRoomID);
						chatRoom.initChatVideo(socketRoomID);

						chatMembers[socketRoomID].push(cleanNickname);
						io.sockets.in(socketRoomID).emit('update room members', chatMembers[socketRoomID]);

						socket.emit('ready');
						
					});

				} else { //nickname was edited
					io.sockets.in(socketRoomID).emit('nick change', { 'old_name' : name, 'new_name' : cleanNickname } );

					socket.set('nickname', cleanNickname, function () {

						//remove old nickname from chatmembers
						var toRemove = chatMembers[socketRoomID].indexOf(name);
						chatMembers[socketRoomID].splice(toRemove, 1);

						//add new nickname to chatmembers
						chatMembers[socketRoomID].push(cleanNickname);

						//broadcast nickname change to the room
						io.sockets.in(socketRoomID).emit('update room members', chatMembers[socketRoomID]);

						socket.emit('ready');
					});
				}

			});

		});

		
	});

	socket.on('chat message', function (data) {

		var socketRoomID = null;
		socket.get('room_id', function(err, id) {

			socketRoomID = id;

			socket.get('nickname', function (err, name) {

				var this_msg = {
					'author' : name,
					'contents' : strip_tags(sanitize(data.contents).xss().trim()),
					'room_id' : socketRoomID
				};

				io.sockets.in(socketRoomID).emit('chat message', this_msg);

				//Put messages into session - for restoring room messages when a new user joins mid-conversation (or hard refresh etc)
				chatRoom.initChatHistories(socketRoomID);

				chatHistories[socketRoomID].push(this_msg);

			});

		});
	});

	socket.on('update video', function(video_data) {
		socket.get('nickname', function(err, nickname) {
			socket.get('room_id', function(err, id) {

				if (typeof(chatVideo[id]) === "undefined")
					chatVideo[id] = [];
				chatVideo[id].video_id = video_data.video_id;
				chatVideo[id].author = nickname;
				io.sockets.in(id).emit('update video', { 'video_id' : video_data.video_id, 'author' : nickname } );

			});
		});
	});

});

//Utility regex function to remove html tags from a string - credit to http://phpjs.org/functions/strip_tags/
function strip_tags (input, allowed) {
  allowed = (((allowed || "") + "").toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');
  var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
    commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
  return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
    return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
  });
}