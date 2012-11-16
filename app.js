var	express = require('express'),
	app = require('express')(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	sanitize = require('validator').sanitize,
	check = require('validator').check,
	roomID = null,
	chatHistories = {};

__root = __dirname + '/public';

app.configure(function() {
	app.use(express.static('public'));
});

server.listen(3000);


app.get('/', function (req, res) {
	res.sendfile('index.html');
});

app.get('/room/new', function (req, res) {
	//Todo: store recent room names in cookie, display on homepage? In case user accidently leaves
	//Empty rooms may get auto deleted by socketio, but if user goes back, initiate it as a new room with same ID
	var randomID = Math.round(Math.random()*10000000000).toString(36);
	res.redirect('/room/'+randomID);
});

app.get('/room/*', function (req, res) {
	res.sendfile(__root + '/room/index.html');
	roomID = req.params[0];
});


io.sockets.on('connection', function (socket) {

	//Todo:
	//	Check username isnt just spaces / a full stop etc
	//	For sanitize / check fails; return an error, dont use substituted strings
	//	Implement chat history & restore
	//	Only broadcast `user joined` if user wasn't already in room
	//		--> Need manageable list of users in room, suggest just an array using room id as index

	socket.emit('room_init', { 'roomID' : roomID } );

	socket.on('room_join', function(data) {
		socket.join(data.roomID);
		socket.set('room_id', data.roomID);

		if (typeof(chatHistories[data.roomID]) === "undefined") {
			chatHistories[data.roomID] = [];
		} else {
			io.sockets.in(data.roomID).emit('message history', chatHistories[data.roomID]);
		}
	});

	//Also trigger this when someone just closes the window / direct disconnects
	socket.on('room_leave', function(data) {
		socket.get('nickname', function (err, name) {
			console.log('somebody left', data.roomID);
			io.sockets.in(data.roomID).emit('user left', { 'author' : name });
			socket.leave(data.roomID);
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

			//if nickname edited, broadcast change
			socket.get('nickname', function (err, name) {

				if (name === null) {
					socket.set('nickname', cleanNickname, function () {
						io.sockets.in(socketRoomID).emit('user joined', { 'author' : cleanNickname });
						socket.emit('ready');
						
					});
				} else {
					io.sockets.in(socketRoomID).emit('nick change', { 'old_name' : name, 'new_name' : cleanNickname } );

					socket.set('nickname', cleanNickname, function () {
						io.sockets.in(socketRoomID).emit('user joined', { 'author' : cleanNickname });
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