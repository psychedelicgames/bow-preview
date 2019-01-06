

 /************************************************************/
 /* Dependencias e inclusión modular *************************/

var HashMap       = require('hashmap');
var Player        = require('./Player');
var Bullet        = require('./Bullet');
var Powerup       = require('./Powerup');
var Block         = require('./Block');
var Explosion     = require('./Explosion');
var Constants     = require('../shared/Constants');
var Util          = require('../shared/Util');

function Game() {
  this.clients = new HashMap();
  this.players = new HashMap();
  this.players_ready = [];
  this.projectiles = [];
  this.powerups = [];
  this.blocks = [];
  this.explosions = [];
  this.main_camera_x = null;
  this.main_camera_y = null;
}

//densidad de powerups y bloques
Game.MAX_MAP_POWERUPS = 10;
Game.MAX_BLOCKS = 0;

/************************************************************/
/* La función añade a un nuevo usuario **********************/

Game.prototype.addNewPlayer = function(name, socket) {
    var aplayer = {};
    aplayer.name = name;
    aplayer.socket = socket;
    console.log('Adding player: ' + aplayer.name);
    this.clients.set(aplayer.socket.id, { socket: aplayer.socket, latency: 0 });
    this.players.set(aplayer.socket.id, Player.generateNewPlayer(aplayer.name, aplayer.socket.id));
    //devolvemos la condición al servidor
    return 'on';
};

/************************************************************/
/* Función: saca al usuario específicado, devuelve nombre ***/

Game.prototype.removePlayer = function(id) {
  if (this.clients.has(id)) { this.clients.remove(id); }
  var player = {};
  if (this.players.has(id)) { player = this.players.get(id); this.players.remove(id); }
  return player.name;
};

/************************************************************/
/* Función: devuelve información sobre el usuario pedido ****/

Game.prototype.getPlayerNameBySocketId = function(id) {
  var player = this.players.get(id);
  if (player) {
    return player.name;
  }
  return null;
};

/************************************************************/
/* F: información del usuario *******************************/

//una replica de la función previa, solo que devuelve el usuario
//con cada una de las variables, más fácil, lol.
Game.prototype.all_player_info = function(id) {
  var player = this.players.get(id);
  if (player) {
    return player;
  }
  return null;
};

/************************************************************/
/* F: refrescar player **************************************/

Game.prototype.updatePlayer = function(id, keyboardState, turretAngle, shot, timestamp) {
  //buscamos la información del player y usuario
  var player = this.players.get(id);
  var client = this.clients.get(id);

  if (player) {
    //creamos un ob con un poco de información de player.
    var self_values =  {
      player_has_fired:   'no',
      player_main_ammo: player.main_ammo,
    };
    //cambiamos la información de player en presencia de nueva información
    player.updateOnInput(keyboardState, turretAngle);
    //si hizo click izquierdo
    if (shot && player.canShoot()) {
      //en caso de ser una unidad, dispara
      if(player.kind == 'panzer') {
        //enviamos la munición al campo.
        this.projectiles = this.projectiles.concat(player.getProjectilesShot());
        //marcamos que el player disparó
        self_values.player_has_fired = 'yes';
      }
      //en caso de ser un drone, le damos un powerup
      if(player.kind == 'drone') {
        //le mandamos speed
        var duracion = (new Date()).getTime() + 300;
        //le damos el poder
        player.powerups = {
        speedboost_powerup: {
        name: 'speedboost_powerup',
        data: 2,
        expirationTime: duracion
        }
        };
      }
    }
  }
  if (client) { client.latency = (new Date()).getTime() - timestamp; }
  //devolvemos los valores a la función que invocó a la función en curso
  return self_values;
};

/**
 * Adds an explosion to the internally maintained array.
 * @param {Explosion} explosion The explosion to add.
 */
Game.prototype.addExplosion = function(explosion) {
  this.explosions.push(explosion);
  //informar explosion
  //console.log(this.explosions);
};

/**
 * Returns an array of the currently active players.
 * @return {Array.<Player>}
 */
Game.prototype.getPlayers = function() {
  return this.players.values();
};

/**
 * Updates the state of all the objects in the game.
 */
Game.prototype.update = function() {
  // Update all the players.
  var players = this.getPlayers();
  for (var i = 0; i < players.length; ++i) { players[i].update(); }

  /************************************************************/
  /* armamos cada una de las balas ****************************/

  for (var i = 0; i < this.projectiles.length; ++i) {

    //si la bala posee explosiones_adicionales, las añadimos a las explosiones
    if(this.projectiles[i].explosiones_adicionales[0] != null) {
      //añade explosion al eliminar una unidad
      //console.log(this.projectiles[i].explosiones_adicionales[0]);
      var boom_x = this.projectiles[i].explosiones_adicionales[0].x;
      var boom_y = this.projectiles[i].explosiones_adicionales[0].y;
      var boom_size = this.projectiles[i].explosiones_adicionales[0].size;
      this.addExplosion(new Explosion(boom_x, boom_y, boom_size, 1000));
    }

    //una bala que avanza
    if (this.projectiles[i].shouldExist) { this.projectiles[i].update(this.players); }

    else {
      //añade explosion al final de la bala: explosiones en las balas
      var boom_x = this.projectiles[i].x;
      var boom_y = this.projectiles[i].y;
      this.addExplosion(new Explosion(boom_x, boom_y, 100, 1000));
      //remueve a la bala
      var removedProjectile = this.projectiles.splice(i, 1);
      //próxima
      i--;
    }
  }

  /************************************************************/
  /* armamos los powerups  ************************************/

  // Update the powerups and ensure that there are always 10 powerups on the map.
  while (this.powerups.length < Game.MAX_MAP_POWERUPS) {
    //revisar la hora del servidor para mandar nuevos supplies.
    this.powerups.push(Powerup.generateRandomPowerup());
  }
  //removemos el powerup
  for (var i = 0; i < this.powerups.length; ++i) {
    if (this.powerups[i].shouldExist) {
      this.powerups[i].update(this.getPlayers());
    } else {
      //sacamos el powerup
      this.powerups.splice(i, 1);
      i--;
    }
  }

  /************************************************************/
  /* armamos los blocks ***************************************/

  //Mandamos blocks
  while (this.blocks.length < Game.MAX_BLOCKS) {
    //revisar la hora del servidor para mandar nuevos supplies.
    this.blocks.push(Block.PushRandomBlocks());
    //console.log(this.blocks);
  }
  //revisamos colisiones
  for (var i = 0; i < this.blocks.length; ++i) {
    if (this.blocks[i].shouldExist) {
      //var unidad = this.getPlayers()
      var municion = this.projectiles
      //shapes = unidad.concat(fire);
      //this.projectiles
      this.blocks[i].update(municion);
    }
  }

  /************************************************************/
  /* explosiones **********************************************/

  // Update the explosions.
  for (var i = 0; i < this.explosions.length; ++i) {
    if (this.explosions[i].isExpired()) {
      this.explosions.splice(i, 1);
      i--;
    }
  }
};

 /************************************************************/
 /* enviamos el refresh a cada uno de los socks **************/

Game.prototype.sendState = function() {

  //asumo que van a ser necesarias luego
  /*
  console.log('clients');
  console.log(this.clients);
  console.log('players');
  console.log(this.players);
  */

  //console.log(this.players.values());
  //if(salud=0)secuencia de spawn.
  //arnar el leaderboard
  var leaderboard = this.players.values().map(function(player) {
  return {
  name: player.name,
  kills: player.kills,
  deaths: player.deaths,
  };
  }).sort(function(a, b) {
  return b.kills - a.kills;
  }).slice(0, 10);

  //sacar el leaderboard de arriba

  var ids = this.clients.keys();
  for (var i = 0; i < ids.length; ++i) {

    var currentPlayer = this.players.get(ids[i]);
    var currentClient = this.clients.get(ids[i]);

    //cambiamos la camara si palmo
    //console.log(currentPlayer);
    if(currentPlayer.kind == 'shadow') {
      asesino = this.all_player_info(currentPlayer.killer_id);
      //console.log(currentPlayer);
      //console.log(asesino);
      if(asesino != null) {
        currentPlayer.camera_x = asesino.camera_x;
        currentPlayer.camera_y = asesino.camera_y;
      }
      else {
        currentPlayer.camera_x = currentPlayer.x;
        currentPlayer.camera_y = currentPlayer.y;
      }
    }

    currentClient.socket.emit('update', {
      leaderboard: leaderboard,
      self: currentPlayer,
      players: this.players.values().filter(function(player) {
        // Filter out only the players that are visible to the current
        // player. Since the current player is also in this array, we will
        // remove the current player from the players packet and send it
        // separately.
        if (player.id == currentPlayer.id) { return false; }
        return player.isVisibleTo(currentPlayer);
      }),
      projectiles: this.projectiles.filter(function(projectile) {
        return projectile.isVisibleTo(currentPlayer);
      }),
      powerups: this.powerups.filter(function(powerup) {
        return powerup.isVisibleTo(currentPlayer);
      }),
      blocks: this.blocks.filter(function(block) {
        return block.isVisibleTo(currentPlayer);
      }),
      explosions: this.explosions.filter(function(explosion) {
        return explosion.isVisibleTo(currentPlayer);
      }),
      latency: currentClient.latency
    });
  }
};

/**
 * This line is needed on the server side since this is loaded as a module
 * into the node server.
 */
module.exports = Game;
