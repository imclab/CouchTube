var	express = require('express'),
	app = require('express')(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server);

app.configure(function() {
	app.use(express.static(__dirname + '/public'));
});

server.listen(3000);


app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});


io.sockets.on('connection', function (socket) {

	socket.get('nickname', function (err, name) {
		console.log(name);
	});

	//Todo: check username isnt just spaces
	socket.on('set nickname', function (data) {
		//if set, broadcast change
		socket.get('nickname', function (err, name) {
			if (name === null) {
				socket.set('nickname', data.nickname, function () {
					socket.emit('ready');
				});
			} else {
				io.sockets.emit('nick change', { 'old_name' : name, 'new_name' : data.nickname } );

				socket.set('nickname', data.nickname, function () {
					socket.emit('ready');
				});
			}
		});
	});

	socket.on('chat message', function (data) {
		socket.get('nickname', function (err, name) {
			console.log('Chat message by', name, ':', data.contents);
			io.sockets.emit('chat message', { 'author' : name, 'contents' : data.contents });
			//Could also put messages into session - for when a new user joins mid-conversation
		});
	});

});