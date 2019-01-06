// Stores the state of the player on the server. This class will also store
// other important information such as socket ID, packet number, and latency.

/************************************************************/
/* Dependencias e inclusión modular *************************/

var request       = require('request');
var Bullet        = require('./Bullet');
var Entity        = require('./Entity');
var Powerup       = require('./Powerup');
var Block         = require('./Block');
var World         = require('./World');
var Constants     = require('../shared/Constants');
var Util          = require('../shared/Util');


/************************************************************/
/* Definición de usuarios ***********************************/

function Player(x, y, orientation, name, kind, id) {
 this.x                = x;
 this.y                = y;
 this.camera_x         = x;
 this.camera_y         = y;
 this.orientation      = orientation;
 this.turretAngle      = orientation;
 this.name             = name;
 this.id               = id;
 this.vmag             = PLAYER_DEFAULT_VELOCITY_MAGNITUDE;
 this.turnRate         = 0;
 this.shotCooldown     = PLAYER_DEFAULT_SHOT_COOLDOWN;
 this.lastShotTime     = 0;
 this.health           = PLAYER_MAX_HEALTH;
 this.powerups         = {};
 this.hitboxSize       = PLAYER_DEFAULT_HITBOX_SIZE;
 this.kills            = 0;
 this.deaths           = 0;
 this.spawns           = 0;
 this.difference       = 0;
 this.orders_remaining = 5;
 this.killer           = null;
 this.killer_id        = null;
 this.is_dead          = false;
 this.kind             = kind;
 this.shieldsize       = 0;
 this.main_ammo        = 'common';
 this.cardio           = '0';
 this.rage             = 1;
}

require('../shared/base');
Player.inheritsFrom(Entity);

/************************************************************/
/* Creación de nuevo player ********************************/

// chris:
// la fuinción pone en el mapa a un nuevo player.
// es probable que se pueda resolver el respawn usando new player
// remplazando por respawn... solo sería necesario sacarlo
// para que luego haga un new player on click.

// alvin:
// Returns a new Player object given a name and id.
// param {string} name The display name of the player.
// param {string} id The socket ID of the client associated with this player.
// return {Player}

Player.generateNewPlayer = function(name, id) {
  var kind = 'panzer';
  var point       = World.getRandomPoint();
  var orientation = Util.randRange(0, 2 * Math.PI);
  x = point[0];
  y = point[1];
 //creamos player
 player = new Player(x, y, orientation, name, kind, id);
   //informamos el balance acá
   console.log(player.name + ' has a balance of: ' + player.balance + '. A real one for you.');
   /*player.powerups = {
     shield_powerup: {
       name: 'Tachyonic Shields Micro',
       data: 6,
       expirationTime: (new Date()).getTime() + (10 * 1000)
      };
    };
    */
   console.log(player);
   return player;
};

/**
* Updates this player given the the client's keyboard state and mouse angle
* for setting the tank turret.
* //param {Object} keyboardState A JSON Object storing the state of the
*   client keyboard.
* //param {number} turretAngle The angle of the client's mouse with respect
*   to the tank.
*/
Player.prototype.updateOnInput = function(keyboardState, turretAngle) {
 //si murio no debería poder moverse
 if(this.kind == 'shadow') {
   this.vx = 0;
   this.vy = 0;
   this.turnRate = 0;
   //liberamos
   keyboardState.up =  false;
   keyboardState.down =  false;
   keyboardState.right =  false;
   keyboardState.left =  false;
 }
 else {
   if (keyboardState.up) {
     this.vx = this.vmag * Math.sin(this.orientation);
     this.vy = -this.vmag * Math.cos(this.orientation);
   }
   if (keyboardState.down) {
     this.vx = -this.vmag * Math.sin(this.orientation);
     this.vy = this.vmag * Math.cos(this.orientation);
   }
   if (!keyboardState.up && !keyboardState.down) {
     this.vx = 0;
     this.vy = 0;
   }
   if (keyboardState.right) {
     this.turnRate = PLAYER_TURN_RATE;
   }
   if (keyboardState.left) {
     this.turnRate = -PLAYER_TURN_RATE;
   }
   if (!keyboardState.right && !keyboardState.left) {
     this.turnRate = 0;
   }
   //console.log(Game);
   this.turretAngle = turretAngle;
 }
};

/************************************************************/
/* refresca información de player, finaliza en powerups *****/

//Updates the player's position and powerup states, this runs in the 60Hz
//server side loop so that powerups expire even when the player is not
//moving or shooting.

Player.prototype.update = function() {
 this.parent.update.call(this);
 this.orientation += this.turnRate * this.updateTimeDifference;

 //refrescamos la camera de acuerdo a la posición salvo que sea shadow
 if(this.kind != 'shadow') {
   this.camera_x = this.x;
   this.camera_y = this.y;
 }

 if(this.health >= 8 && this.cardio != '0') {
   //enviamos información solo a ese usuario
   io.to(this.id).emit('simon-says', { user_cardio: '0' });
   //cambiamos la condicion
   this.cardio = '0';
 }
 //no se puede salir de las coordenadas que devuelve
 var boundedCoord = World.bound(this.x, this.y);
 this.x = boundedCoord[0];
 this.y = boundedCoord[1];

 for (var powerup in this.powerups) {

   /************************************************************/
   /* Aplicamos powerups expirados *****************************/

   //console.log(powerup);

   switch (powerup) {

     /************************************************************/
     /* Powerups convencionales **********************************/

     case Powerup.SHIELD:
       this.hitboxSize = PLAYER_SHIELD_HITBOX_SIZE;
       this.shieldsize = this.powerups[powerup].data;
       //en caso de que el escudo llegue a 0, lo sacamos.
       if (this.powerups[powerup].data <= 0) {
         delete this.powerups[powerup];
         this.hitboxSize = PLAYER_DEFAULT_HITBOX_SIZE;
         this.shieldsize = 0;
         continue;
       }
       break;
     case Powerup.HEALTHPACK:
       this.health = Math.min(this.health + this.powerups[powerup].data, PLAYER_MAX_HEALTH);
       delete this.powerups[powerup];
       continue;
     case Powerup.SHOTGUN:
       break;
     case Powerup.RAPIDFIRE:
       ///this.shotCooldown = PLAYER_DEFAULT_SHOT_COOLDOWN / this.powerups[powerup].data;
       break;
     case Powerup.SPEEDBOOST:
       this.vmag = PLAYER_DEFAULT_VELOCITY_MAGNITUDE * this.powerups[powerup].data;
       break;

     /************************************************************/
     /* Powerups de diseño ***************************************/

     //El caso P1 no es usado para evadir la doble descripción...

     case Powerup.P2:
       this.shotCooldown = PLAYER_DEFAULT_SHOT_COOLDOWN / this.powerups[powerup].data;
       break;
     case Powerup.P3:
       break;
     case Powerup.P4:
       this.vmag = PLAYER_DEFAULT_VELOCITY_MAGNITUDE * this.powerups[powerup].data;
       break;
     case Powerup.P5:
       break;
     case Powerup.P6:
       break;
   }

   /************************************************************/
   /* Removemos los powerups expirados ************************/

   if ((new Date()).getTime() > this.powerups[powerup].expirationTime) {
     switch (powerup) {

       /************************************************************/
       /* Powerups convencionales **********************************/

       case Powerup.HEALTHPACK:
         //console.log('Sacamos heal');
         break;
       case Powerup.SHOTGUN:
         //console.log('Sacamos fork');
         break;
       case Powerup.RAPIDFIRE:
         //console.log('Sacamos quick');
         this.shotCooldown = PLAYER_DEFAULT_SHOT_COOLDOWN;
         break;
       case Powerup.SPEEDBOOST:
         //console.log('Sacamos speed');
         this.vmag = PLAYER_DEFAULT_VELOCITY_MAGNITUDE;
         break;
       case Powerup.SHIELD:
         //console.log('Sacamos shield');
         this.hitboxSize = PLAYER_DEFAULT_HITBOX_SIZE;
         this.shieldsize = 0;
         break;

       /************************************************************/
       /* Powerups de diseño ***************************************/

       case Powerup.P2:
         //console.log('sacamos P2');
         this.shotCooldown = PLAYER_DEFAULT_SHOT_COOLDOWN;
         this.main_ammo = 'common';
         break;
       case Powerup.P3:
         //console.log('sacamos P3');
         this.main_ammo = 'common';
         break;
       case Powerup.P4:
         //console.log('sacamos P4');
         this.vmag = PLAYER_DEFAULT_VELOCITY_MAGNITUDE;
         this.main_ammo = 'common';
         break;
       case Powerup.P5:
         //console.log('sacamos P5');
         this.main_ammo = 'common';
         break;
       case Powerup.P6:
         //console.log('sacamos P6');
         this.main_ammo = 'common';
         break;
     }
     delete this.powerups[powerup];
   }
 }
};

/************************************************************/
/* coloca el powerup en el player **************************/

Player.prototype.applyPowerup = function(name, powerup) {
 this.powerups[name] = powerup;
};


/************************************************************/
/* evalua si el player puede disparar ***********************/

Player.prototype.canShoot = function() {
 return (new Date()).getTime() > this.lastShotTime + this.shotCooldown;
};

/************************************************************/
/* colocar bala, disparar: hace que el player dispare  ******/

Player.prototype.getProjectilesShot = function() {
 //ammo predefinido
 var ammo = 'common';
 //vmag predefinido
 var vmag = 1.85;
 //revisamos acá los powerups
 if (this.powerups[Powerup.P5]) { var ammo = 'slowco_frozen'; var vmag = 0.3; }
 if (this.powerups[Powerup.P6]) { var ammo = 'healco_care'; this.damage(1); }

 //ahora si, volvamos a las balas... munición original iniciada por usuario
 if (this.powerups[Powerup.RAPIDFIRE]) { var vmag = 3 }
 var bullets = [Bullet.create(this.x, this.y, this.turretAngle, this.id, vmag, ammo, null, this.rage)];
 //fork convencional
 if (this.powerups[Powerup.SHOTGUN]) {
   //enviamos más balas
   for (var i = 1; i < this.powerups[Powerup.SHOTGUN].data + 1; ++i) {
     bullets.push(Bullet.create(this.x, this.y, this.turretAngle - (i * Math.PI / 9), this.id, vmag, ammo, null, this.rage));
     bullets.push(Bullet.create(this.x, this.y, this.turretAngle + (i * Math.PI / 9), this.id, vmag, ammo, null, this.rage));
   }
 }
 //vladof fork
 if (this.powerups[Powerup.P3]) {
   //enviamos más balas
   for (var i = 1; i < this.powerups[Powerup.P3].data + 1; ++i) {
     maxdis = Math.floor(Math.random() * 500) + 400
     bullets.push(Bullet.create(this.x, this.y, this.turretAngle - (i * Math.PI / 70), this.id, vmag, ammo, maxdis, this.rage));
     maxdis = Math.floor(Math.random() * 500) + 400
     bullets.push(Bullet.create(this.x, this.y, this.turretAngle + (i * Math.PI / 70), this.id, vmag, ammo, maxdis, this.rage));
   }
 }
 //console.log(this.rage);
 //almacenamos cuando disparó su última bala
 this.lastShotTime = (new Date()).getTime();
 return bullets;
};

/************************************************************/
/* colision, evalua colision de player con coord ************/

Player.prototype.isCollidedWith = function(x, y, hitboxSize) {
 var minDistance = this.hitboxSize + hitboxSize;
 return Util.getEuclideanDistance2(this.x, this.y, x, y) <
     (minDistance * minDistance);
};

/************************************************************/
/* isdead evalua cuan dead user is **************************/

Player.prototype.isDead = function() {
 //prevenimos que muera si ya murio
 if (this.is_dead == false) {
   //revisamos si murio
   if (this.health <= 0) {
     //cambiamos la condición
     this.is_dead = true;
     //avisamos que el player colapso
     io.to(this.id).emit('simon-says', { user_dies: 1 });
     //respondemos con true o false a la variable
     return this.health <= 0;
   }
 }
};

/************************************************************/
/* damage, dañamos un poco al usuario ***********************/

Player.prototype.damage = function(amount) {
 //si posee un escudo, dañamos el escudo
 if (this.powerups[Powerup.SHIELD]) { this.powerups[Powerup.SHIELD].data -= amount; }
 //de no ser así, dañamos el player.
 else { this.health -= amount; }
 //enviamos información solo al usuario dañado
 console.log('mandamos información al usuario: ' + this.id);
 //enviamos información solo a ese usuario
 io.to(this.id).emit('simon-says', { user_damaged: 1 });
 //cardio si posee menos de 8 de salud
 if(this.health < 8 && this.cardio == '0') {
   //enviamos información solo a ese usuario
   io.to(this.id).emit('simon-says', { user_cardio: '1' });
   //cambiamos la condicion
   this.cardio = '1';
 }
 if(this.health < 6 && this.cardio == '1') {
   //enviamos información solo a ese usuario
   io.to(this.id).emit('simon-says', { user_cardio: '2' });
   //cambiamos la condicion
   this.cardio = '2';
 }
 if(this.health < 4 && this.cardio == '2') {
   //enviamos información solo a ese usuario
   io.to(this.id).emit('simon-says', { user_cardio: '3' });
   //cambiamos la condicion
   this.cardio = '3';
 }
};

/************************************************************/
/* heal, curamos un poco al usuario *************************/

//la función se armó para la healing ammo.
//considerar hacerle modificaciones necesarias para que la vida no desborde.

Player.prototype.heal = function(amount) {
 if (this.powerups[Powerup.SHIELD]) { this.powerups[Powerup.SHIELD].data += amount; }
 else { this.health += amount; }
 //información del player
 //console.log(this);
 //var player = game.all_player_info(socket.id);
 //console.log(player);
};

/************************************************************/
/* limbo, la función solo reinicia variables **************/
//querrá de hecho el player hacer un respawn?

Player.prototype.limbo = function(players) {
   this.x = this.x;
   this.y = this.y;
   this.camera_x = this.camera_x;
   this.camera_y = this.camera_y;
   this.health = 0;
   this.is_dead = true;
   this.deaths++;
   this.kind = 'shadow';
   this.hitboxSize = -10;
   this.vmag = 0;
   this.cardio = 0;
   console.log(this.name + ' is now in limbo...');

   //informamos y disparamos algunas acciones por allá
   io.to(this.id).emit('simon-says', { user_dead: '1' });

};


/************************************************************/
/* respawn, la función solo reinicia variables **************/

// recibe un array de players y los respawnea
// el problema es que player, al igual que bullet
// no pueden usar socks, ni funciones de game.
// las funciónes de sock y game, solo pueden ser usadas desde game y server.

//querrá de hecho el player hacer un respawn?
Player.prototype.respawn = function(players) {
   var point = World.getRandomPoint();
   var isValidSpawn = false;
   var elevador = 0;
   while (!isValidSpawn || elevador < 15) {
     isValidSpawn = true;
     for (var i = 0; i < players; ++i) {
       if (Util.getEuclideanDistance2(point[0], point[1], players[i].x, players[i].y) < PLAYER_MINIMUM_RESPAWN_BUFFER * PLAYER_MINIMUM_RESPAWN_BUFFER) {
         isValidSpawn = false;
         continue;
       }
     }
     point = World.getRandomPoint();
     elevador++;
   }
   this.x = point[0];
   this.y = point[1];
   this.health = PLAYER_MAX_HEALTH;
   this.orders_remaining = 5;
   this.killer = null;
   this.is_dead = false;
   //si el balance es menor a 2,000 hacemos un drone.
     //informamos el balance acá
     console.log(this.name + ' has a balance of: ' + this.balance + '. A real one for you.');
     //armamos
     this.kind = 'panzer';
     this.hitboxSize = 20;
     this.vmag = PLAYER_DEFAULT_VELOCITY_MAGNITUDE;
     //shield de bienvenida
     this.powerups = {
       shield_powerup: {
         //buscar nombre de escudos en freelancer
         name: 'Tachyonic Shields Micro',
         data: 6,
         expirationTime: (new Date()).getTime() + (10 * 1000)
         }
     };
};

/**
* This line is needed on the server side since this is loaded as a module
* into the node server.
*/
module.exports = Player;
