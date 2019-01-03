// This class stores the state of a bullet on the server.

/************************************************************/
/* Dependencias e inclusión modular *************************/

var request       = require('request');
var Entity        = require('./Entity');
var World         = require('./World');
var Explosion     = require('./Explosion');
var World         = require('./World');
var Constants     = require('../shared/Constants');
var Util          = require('../shared/Util');

// Constructor for a bullet.
// param {number} x The x coordinate of the bullet.
// param {number} y The y coordinate of the bullet.
// param {number} vx The velocity in the x direction of the bullet.
// param {number} vy The velocity in the y direction of the bullet.
// param {number} orientation The orientation of the bullet in radians, used for rendering the bullet.
// param {string} source The socket ID of the player that fired the bullet.
// extends {Entity}

function Bullet(x, y, vx, vy, orientation, source, vmag, ammo, maxdis, rage, damage) {
  this.x = x;
  this.y = y;
  this.source_x = x;
  this.source_y = y;
  this.vx = vx;
  this.vy = vy;
  this.orientation = orientation;
  this.source = source;
  this.damage = damage;
  this.distanceTraveled = 0;
  this.shouldExist = true;
  this.explosiones_adicionales = [];
  this.vmag = vmag;
  this.ammo = ammo;
  this.hitboxSize = 5;
  this.maxdis = maxdis;
}

require('../shared/base');
Bullet.inheritsFrom(Entity);

//velocidad de munición expresada en pixeles por milisegundos
Bullet.VELOCITY_MAGNITUDE = 1.85;
//daño generico de munición
Bullet.DEFAULT_DAMAGE = 5;
//maximo recorrido de la bala en pixeles
Bullet.MAX_TRAVEL_DISTANCE = 1000;
//radio de colision alrededor de la bala
Bullet.HITBOX_SIZE = 10;


// Factory method for the Bullet object. This is meant to be called from the context of a Player.
// param {number} x The starting x-coordinate of the bullet (absolute).
// param {number} y The starting y-coordinate of the bullet (absolute).
// param {number} direction The direction the bullet will travel in radians.
// param {string} source The socket ID of the player that fired the bullet.
// return {Bullet}

Bullet.create = function(x, y, direction, source, vmag, ammo, maxdis, rage) {
  if(vmag) { var vmag = vmag; }
  else { var vmag = Bullet.VELOCITY_MAGNITUDE; }
  var vx = vmag * Math.cos(direction - Math.PI / 2);
  var vy = vmag * Math.sin(direction - Math.PI / 2);
  var ammo = ammo;
  var rage = rage;
  var damage = Bullet.DEFAULT_DAMAGE * rage;
  if(maxdis) { maxdis = maxdis; }
  else { maxdis = Math.floor(Math.random() * 200) + 800;}
  return new Bullet(x, y, vx, vy, direction, source, vmag, ammo, maxdis, rage, damage);
};

Bullet.prototype.isCollidedWith = function(x, y, hitboxSize) {
  var minDistance = this.hitboxSize + hitboxSize;
  return Util.getEuclideanDistance2(this.x, this.y, x, y) <
      (minDistance * minDistance);
};

//Adds an explosion to the internally maintained array.
//param {Explosion} explosion The explosion to add.

Bullet.prototype.addExplosion = function(explosion) {
  this.explosiones_adicionales.push(explosion);
  //informar explosion
  //console.log(this.explosions);
};

// Updates this bullet and checks for collision with any player.
// We reverse the coordinate system and apply sin(direction) to x
// because canvas in HTML will use up as its '0' reference point
// while JS math uses left as its '0' reference point.
// this.direction always is stored in radians.
// param {Hashmap} clients The Hashmap of active IDs and players stored on the server.


Bullet.prototype.update = function(clients) {

  this.parent.update.call(this);
  this.distanceTraveled += this.vmag * this.updateTimeDifference;

  //revisamos si la bala se fue de largo
  if (this.distanceTraveled > this.maxdis || !World.isInside(this.x, this.y)) { this.shouldExist = false; return; }

  console.log(this);

  var players = clients.values();

  //para cada uno de los players
  for (var i = 0; i < players.length; ++i) {

    //console.log(API_URI);

    //si la munución no es de el, y le dio
    if (this.source != players[i].id && players[i].isCollidedWith(this.x, this.y, Bullet.HITBOX_SIZE)) {

      //si es una healco!
      //console.log(this);
      if(this.ammo == 'healco_care') { players[i].heal(1); }
      //procesamos el daño
      else {
        var source_player = clients.get(this.source);
        if(source_player.rage < 2) { source_player.rage = source_player.rage + 0.10; }
        players[i].damage(this.damage);
        players[i].rage = 1;
      }


      //revisamos si murio
      if (players[i].isDead()) {
        //apenas el servidor confirma la eliminación debe anularlo para prevenir dual dead
        players[i].hitboxSize = -10;
        explosion_x = players[i].x;
        explosion_y = players[i].y;

        //shadow
        players[i].kind = 'shadow';

        //buscamos el nombre del asesino
        var killingPlayer = clients.get(this.source);


        //cambiamos la camera
        players[i].killer     = killingPlayer.name;
        players[i].killer_id  = killingPlayer.id;
        //players[i].camera_x   = 100;//killingPlayer.camera_x;
        //players[i].camera_y   = 100;//killingPlayer.camera_y;

        //subimos los kills del asesino
        killingPlayer.kills++;
        //el que dispara es killingPlayer y el que muere players[i]
        //imprimimos player para buscar la variable
        //console.log(killingPlayer);
        //console.log(players[i]);
        this.addExplosion(new Explosion(explosion_x, explosion_y, 100, 1000));
        //asociamos variables de nombres
        var user_killer = killingPlayer.name;
        var user_killed = players[i].name
        //armamos el pedido
        //req  = API_URI;
        //req += '?model=war/kill';
        //req += '&username_a=';
        //req += user_killer
        //req += '&username_b=';
        //req += user_killed
        //revision
        //console.log(req);

        //enviamos el pedido
        //request(req, { json: true }, (err, res, body) => {
          //revision
          //console.log(body);
          //if (body.advice == 'Done.') {
            //acomodamos la información del usuario_b
            //players[i].balance      = body.user_b.available_balance;
            //players[i].difference   = body.user_b.difference;
            //players[i].spawns       = body.user_b.spawns;
            //acomodamos la información del usuario_a
            //killingPlayer.balance     = body.user_a.available_balance;
            //killingPlayer.difference  = body.user_a.difference;
            //en caso de error de comunicación
            //if (err) { return console.log(err); }
            //informamos, remplazar para informar usuarios.
            //console.log(players[i].name + ' has been killed by ' + players[i].killer);
            //enviamos información al canal.
            io.sockets.emit('dialogo-servidor-usuarios', {
              name: players[i].name,
              message:"has been killed by",
              message_class: "killed",
              user_killer: players[i].killer,
              user_killed: players[i].name
            });
            //informamos el balance acá
            //console.log(players[i].name + ' has a balance of: ' + players[i].balance);
            //mandamos la camara en 100?
            //console.log(players[i]);
            //hacemos siempre el respawn, después vemos si es drone.
            players[i].limbo(players[i]);
            //en vez de respawnearlo, lo sacamos
            //game.removePlayer(players[i].id);
          //}
        //});
      }
      //acaba de cerrar el if (players[i].isDead()
      this.shouldExist = false;
      return;
    }
    //acaba de cerrar el if isCollided
  }
  //acaba de cerrar el for
};
//acaba de cerrar el refresh

/**
 * This line is needed on the server side since this is loaded as a module
 * into the node server.
 */
module.exports = Bullet;
