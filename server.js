/************************************************************/
/* definiciones iniciales ***********************************/

var DEV_MODE = true;
var PORT_NUMBER = process.env.PORT || 80;
var FRAME_RATE = 1000.0 / 60.0;

/************************************************************/
/* developer mode opcional **********************************/

process.argv.forEach(function(value, index, array) {
  if (value == '--dev' || value == '--development') {
    DEV_MODE = true;
  }
});

/************************************************************/
/* dependencias *********************************************/

var bodyParser    = require('body-parser');
var express       = require('express');
var http          = require('http');
var morgan        = require('morgan');
var socketIO      = require('socket.io');
var swig          = require('swig');
var Game          = require('./lib/Game');

/************************************************************/
/* inicialización *******************************************/

var app     = express();
var server  = http.Server(app);
var io      = socketIO(server);
var game    = new Game();

/************************************************************/
/* defeinicion de app ***************************************/

app.engine('html', swig.renderFile);
app.set('port', PORT_NUMBER);
app.set('view engine', 'html');
app.use(morgan(':date[web] :method :url :req[header] :remote-addr :status'));
app.use('/public', express.static(__dirname + '/public'));
app.use('/shared', express.static(__dirname + '/shared'));

/************************************************************/
/* accessos *************************************************/

app.get('/', function(request, response) {
  response.render('index.html', {
    dev_mode: DEV_MODE
  });
});

/************************************************************/
/* conexión y funciones de sock.io **************************/

io.on('connection', function(socket) {

/************************************************************/
/* nuevo usuario ********************************************/

socket.on('new-player', function(data, callback) {
  game.addNewPlayer(data.name, socket);
  io.sockets.emit('chat-server-to-clients', {
    name: '[Tank Anarchy]',
    message: data.name + ' has joined the game.',
    isNotification: true
  });
  callback();
  socket.emit('chat-server-to-clients', {
    name: '[Tank Anarchy]',
    message: 'Welcome, ' + data.name + '! Use WASD to move and click ' +
        'to shoot. Pick up powerups to boost your tank temporarily!',
    isNotification: true
  });
});

/************************************************************/
/* acciones de usuario **************************************/

socket.on('player-action', function(data) {
  game.updatePlayer(
    socket.id,
    data.keyboardState,
    data.turretAngle,
    data.shot,
    data.timestamp
  );
});

/************************************************************/
/* comunicación usuario server ******************************/

socket.on('chat-client-to-server', function(data) {
  io.sockets.emit('chat-server-to-clients', {
    name: game.getPlayerNameBySocketId(socket.id),
    message: data
  });
});

/************************************************************/
/* desconexión de usuario ***********************************/

socket.on('disconnect', function() {
  var name = game.removePlayer(socket.id);
  io.sockets.emit('chat-server-to-clients', {
    name: '[Tank Anarchy]',
    message: name + ' has left the game.',
    isNotification: true
  });
});

});

/************************************************************/
/* quick loop, producción de frames *************************/

setInterval(function() { game.update(); game.sendState();}, FRAME_RATE);

/************************************************************/
/* inicialización de servidor *******************************/

server.listen(PORT_NUMBER, function() { console.log('Server running: ' + PORT_NUMBER); });
