var	express = require('express'),
	app = require('express')(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	sanitize = require('validator').sanitize,
	check = require('validator').check,
	roomID = null,
	chatHistories = {},
	chatMembers = [];

__root = __dirname + '/public';

app.configure(function() {
	app.use(express.static('public'));
	app.use(express.logger());
    app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
});

server.listen(3000);


app.get('/room', function(req, res) {
	console.log(req);
});

app.get('/room/new', function (req, res) {
	var randomID = Math.round(Math.random()*10000000000).toString(36);
	res.redirect('/room/'+randomID);
});

app.get('/room/:id', function (req, res) {
	res.sendfile(__root + '/room/index.html');
	roomID = req.params.id;
});

app.get('/', function (req, res) {
	res.sendfile('index.html');
});


io.sockets.on('connection', function (socket) {

	//Todo:
	//	Only broadcast `user joined` if user wasn't already in room
	//		--> Need manageable list of users in room, suggest just an array using room id as index

	socket.emit('room_init', { 'roomID' : roomID } );

	socket.on('room_join', function(data) {
		socket.join(data.roomID);
		socket.set('room_id', data.roomID);

		if (typeof(chatHistories[data.roomID]) === "undefined") {
			chatHistories[data.roomID] = [];
		} else {
			socket.emit('message history', chatHistories[data.roomID]);
		}

	});

	//Also trigger this when someone just closes the window / direct disconnects
	socket.on('room_leave', function(data) {
		socket.get('nickname', function (err, name) {

			io.sockets.in(data.roomID).emit('user left', { 'author' : name });

			if (typeof(chatMembers[data.roomID]) === "undefined")
				chatMembers[data.roomID] = [];

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

				if (typeof(chatMembers[id]) === "undefined")
					chatMembers[id] = [];

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

				if (name === null) {

					socket.set('nickname', cleanNickname, function () {
						io.sockets.in(socketRoomID).emit('user joined', { 'author' : cleanNickname });

						if (typeof(chatMembers[socketRoomID]) === "undefined")
							chatMembers[socketRoomID] = [];

						console.log('writing ', cleanNickname, 'to ', socketRoomID, '...');
						chatMembers[socketRoomID].push(cleanNickname);
						io.sockets.in(socketRoomID).emit('update room members', chatMembers[socketRoomID]);

						socket.emit('ready');
						
					});

				} else { //if nickname edited, broadcast change
					io.sockets.in(socketRoomID).emit('nick change', { 'old_name' : name, 'new_name' : cleanNickname } );

					socket.set('nickname', cleanNickname, function () {
						io.sockets.in(socketRoomID).emit('user joined', { 'author' : cleanNickname });

						console.log('writing ', cleanNickname, 'to ', socketRoomID, '...');
						chatMembers[socketRoomID].push(cleanNickname);
						io.sockets.in(socketRoomID).emit.emit('update room members', chatMembers[socketRoomID]);

						socket.emit('ready');
					});
				}

			});

		});

		
	});

	socket.on('chat message', function (data) {

		console.log(chatMembers);

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

				//Also put messages into session - for restoring room messages when a new user joins mid-conversation (or hard refresh etc)
				chatHistories[socketRoomID].push(this_msg);

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