/************************************************************/
/* definiciones iniciales ***********************************/

var DEV_MODE = true;
var PORT_NUMBER = process.env.PORT || 80;
var FRAME_RATE = 1000.0 / 60.0;

/************************************************************/
/* Variables de player **************************************/

PLAYER_TURN_RATE                  = 0.005; //radianes sobre ms
PLAYER_DEFAULT_VELOCITY_MAGNITUDE = 0.3; //pixels per millisecond.
PLAYER_DEFAULT_SHOT_COOLDOWN      = 80; //milliseconds
PLAYER_DEFAULT_HITBOX_SIZE        = 20; //pixels
PLAYER_SHIELD_HITBOX_SIZE         = 45; //pixels
PLAYER_MAX_HEALTH                 = 20; //health units
PLAYER_MINIMUM_RESPAWN_BUFFER     = 1000; //distance in pixels

/************************************************************/
/* Variables previas de player ******************************/

/*
Player.TURN_RATE = 0.005;
Player.DEFAULT_VELOCITY_MAGNITUDE = 0.3;
Player.DEFAULT_SHOT_COOLDOWN = 800;
Player.DEFAULT_HITBOX_SIZE = 20;
Player.SHIELD_HITBOX_SIZE = 45;
Player.MAX_HEALTH = 10;
Player.MINIMUM_RESPAWN_BUFFER = 1000;
*/

/************************************************************/
/* developer mode opcional **********************************/

process.argv.forEach(function(value, index, array) {
  if (value == '--dev' || value == '--development') {
    DEV_MODE = true;
  }
});

/************************************************************/
/* dependencias *********************************************/

var request     = require('request');
var express     = require('express');
var bodyParser  = require('body-parser');
var fs          = require('fs');
var http        = require('http');
var https       = require('https');
var compression = require('compression');
var path        = require('path')
var morgan      = require('morgan');
var socketIO    = require('socket.io');
var swig        = require('swig');
var Game        = require('./lib/Game');

/************************************************************/
/* inicialización *******************************************/

var app     = express();
var server  = http.Server(app);
var game    = new Game();

/************************************************************/
/* accesibilidad global a io ********************************/

io = socketIO(server);

/************************************************************/
/* calzamos compressor **************************************/

app.use(compression());

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
/* escape de la info ****************************************/

function escapesafe(toOutput){
  if(toOutput != null) {
    return toOutput.replace(/\&/g, '&amp;')
        .replace(/\</g, '&lt;')
        .replace(/\>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/\'/g, '&#x27')
        .replace(/\//g, '&#x2F');
  }
}

/************************************************************/
/* preloader audios *****************************************/

//definimos audio_files como cadena
var audio_files = {};

//buscamos los archivos de audio y los cargamos en arrays
//audio_files.main        = fs.readdirSync('./public/audio/');
audio_files.order_1       = fs.readdirSync('./public/audio/powers/1/');
audio_files.order_2       = fs.readdirSync('./public/audio/powers/2/');
audio_files.order_3       = fs.readdirSync('./public/audio/powers/3/');
audio_files.order_4       = fs.readdirSync('./public/audio/powers/4/');
audio_files.order_5       = fs.readdirSync('./public/audio/powers/5/');
audio_files.order_6       = fs.readdirSync('./public/audio/powers/6/');
audio_files.harm          = fs.readdirSync('./public/audio/harm/');
audio_files.dies          = fs.readdirSync('./public/audio/dies/');
audio_files.eliminacion   = fs.readdirSync('./public/audio/eliminacion/');
audio_files.spawn         = fs.readdirSync('./public/audio/spawn/');


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
  /* comprar powerup ******************************************/

  socket.on('comprar-power', function(keydown, callback) {
    //definimos feedback
    var feedback = {};
    //revision
    console.log(keydown);
    //buscamos la información del players
    var player = game.all_player_info(socket.id);
    //revisamos si player es null
    if(player === null) { return console.log('No player found.'); }
    //revisamos si player es shadow
    if(player.kind == 'shadow') {
      feedback.advice = 'you_are_dead';
      callback(feedback);
      return console.log('you are dead.');
    }
    //revisamos si player es drone
    if(player.kind == 'drone') {
      feedback.advice = 'drones_have_no_power';
      callback(feedback);
      return console.log('drones have no power.');
    }
    //revisamos si puede pedir una más
    if (player.orders_remaining <= 0) {
      feedback.advice = 'no_orders_remaining';
      callback(feedback);
      return console.log('no orders remaining.');
    }
    //en caso que le queden
    if (player.orders_remaining > 0) { player.orders_remaining -= 1; }

    //si lo compró, previo a aplicarlo, le acomodamos las variasble
    player.powerups     = null;
    player.shotCooldown = PLAYER_DEFAULT_SHOT_COOLDOWN;
    player.hitboxSize   = PLAYER_DEFAULT_HITBOX_SIZE;
    player.vmag         = PLAYER_DEFAULT_VELOCITY_MAGNITUDE;
    player.shieldsize   = 0;

    //escudo con 8 de defensa
    if(keydown.keydown == '49') {
      //arma principal equipada
      player.main_ammo = 'Tachyonic Shields Prolog';
      //le damos el poder
      player.powerups = {
      shield_powerup: {
      //buscar nombre de escudos en freelancer
      name: 'Tachyonic Shields Prolog',
      data: 8,
      expirationTime: (new Date()).getTime() + (30 * 1000)
      }
      };
      //enviamos información al canal.
      io.sockets.emit('dialogo-servidor-usuarios', {
        name: player.name,
        message: "uses Tachyonic Shields Prolog",
        message_class: "order"
      });
    }

    //serious fire.
    /*
    if(keydown.keydown == '50') {
      //arma principal equipada
      player.main_ammo = 'Assassin MK1';
      //le damos el poder
      player.powerups = {
      order_quick: {
      name: 'Assassin MK1',
      data: 3,
      expirationTime: (new Date()).getTime() + (30 * 1000)
      }
      };
      //enviamos información al canal.
      io.sockets.emit('dialogo-servidor-usuarios', {
        name: player.name,
        message: "uses Assassin MK1!",
        message_class: "order"
      });
    }

    //killing spree
    if(keydown.keydown == '51') {
      //arma principal equipada
      player.main_ammo = 'Vladof relics 1.0';
      //le damos el poder
      player.powerups = {
      order_fork: {
      name: 'Vladof relics 1.0',
      data: 2,
      expirationTime: (new Date()).getTime() + (30 * 1000)
      }
      };
      //enviamos información al canal.
      io.sockets.emit('dialogo-servidor-usuarios', {
        name: player.name,
        message: "uses Vladof relics 1.0",
        message_class: "order"
      });
    }
    */
    //speedrunner
    if(keydown.keydown == '50') {
      //arma principal equipada
      player.main_ammo = 'Moonwalk Class A';
      //le damos el poder
      player.powerups = {
      order_speed: {
      name: 'Moonwalk Class A',
      data: 1.666,
      expirationTime: (new Date()).getTime() + (30 * 1000)
      }
      };
      //enviamos información al canal.
      io.sockets.emit('dialogo-servidor-usuarios', {
        name: player.name,
        message: "uses Moonwalk Class A.",
        message_class: "order"
      });
    }

    //The Slow Co: Frozen
    if(keydown.keydown == '51') {
      //arma principal equipada
      player.main_ammo = 'The Slow Co: Frozen';
      //le damos el poder
      player.powerups = {
      order_slow: {
      name: 'The Slow Co: Frozen',
      expirationTime: (new Date()).getTime() + (30 * 1000)
      }
      };
      //enviamos información al canal.
      io.sockets.emit('dialogo-servidor-usuarios', {
        name: player.name,
        message: "uses The Slow Co: Frozen ammo",
        message_class: "order"
      });
    }
    /*
    //Heal
    if(keydown.keydown == '54') {
      //arma principal equipada
      player.main_ammo = 'Healco: basic care';
      //le damos el poder
      player.powerups = {
      order_heal: {
      name: 'Healco: basic care',
      expirationTime: (new Date()).getTime() + (30 * 1000)
      }
      };
      //enviamos información al canal.
      io.sockets.emit('dialogo-servidor-usuarios', {
        name: player.name,
        message: "uses Healco: basic care",
        message_class: "order"
      });
    }
    */

    //informamos
    feedback.advice = 'Success';

    //respondemos siempre, enviamos la información al browser
    callback(feedback);

      //sunflower
      /*
      if(keydown.keydown == '52') {
        //le damos el poder
        player.powerups = {
        shotgun_powerup: {
        name: 'sunflower',
        data: 12,
        expirationTime: duracion
        }
        };
        //enviamos información al canal.
        io.sockets.emit('dialogo-servidor-usuarios', {
        name: " ",
        message: body.user.username + ' uses power 4.',
        message_class: "order"
        });
      }
      //laser
      if(keydown.keydown == '53') {
        //le damos el poder
        player.powerups = {
        rapidfire_powerup: {
        name: 'ray',
        data: 12,
        expirationTime: duracion
        }
        };
        //enviamos información al canal.
        io.sockets.emit('dialogo-servidor-usuarios', {
        name: " ",
        message: body.user.username + ' uses power 5.',
        message_class: "order"
        });
      }
      */
      //calculamos saldo en usd
      //body.user.balance_usd = usd_balance(body.user.available_balance);
    //}

    //});


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
