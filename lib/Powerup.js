
/************************************************************/
/* Dependencias e inclusión modular *************************/

//comenzamos por las inclusiones
var Entity = require('./Entity');
var World = require('./World');
var Util = require('../shared/Util');

/************************************************************/
/* función principal ****************************************/

function Powerup(x, y, name, data, duration) {
  this.x = x;
  this.y = y;
  this.name = name;
  this.data = data;
  this.duration = duration;
  this.shouldExist = true;
}

/************************************************************/
/* inclusión y herencia de clases ***************************/

//pedimos shared
require('../shared/base');

//herencia de clase
Powerup.inheritsFrom(Entity);

/************************************************************/
/* definiciones *********************************************/

Powerup.HITBOX_SIZE                   = 40;
Powerup.HEALTHPACK                    = 'healthpack_powerup';
Powerup.HEALTHPACK_MIN_HEAL           = 3;
Powerup.HEALTHPACK_MAX_HEAL           = 7;
Powerup.SHOTGUN                       = 'shotgun_powerup';
Powerup.SHOTGUN_MIN_BONUS_SHELLS      = 1;
Powerup.SHOTGUN_MAX_BONUS_SHELLS      = 2;
Powerup.RAPIDFIRE                     = 'rapidfire_powerup';
Powerup.RAPIDFIRE_MIN_MULTIPLIER      = 2.0;
Powerup.RAPIDFIRE_MAX_MULTIPLIER      = 3.5;
Powerup.SPEEDBOOST                    = 'speedboost_powerup';
Powerup.SPEEDBOOST_MIN_MULTIPLIER     = 1.2;
Powerup.SPEEDBOOST_MAX_MULTIPLIER     = 1.8;
Powerup.SHIELD                        = 'shield_powerup';
Powerup.SHIELD_MIN_STRENGTH           = 1;
Powerup.SHIELD_MAX_STRENGTH           = 3;
Powerup.MIN_DURATION                  = 5000;
Powerup.MAX_DURATION                  = 15000;
Powerup.P1            = 'order_shield';
Powerup.P2            = 'order_quick';
Powerup.P3            = 'order_fork';
Powerup.P4            = 'order_speed';
Powerup.P5            = 'order_slow';
Powerup.P6            = 'order_heal';
Powerup.POWERUPS = [
  Powerup.HEALTHPACK,
  Powerup.SHOTGUN,
  Powerup.RAPIDFIRE,
  Powerup.SPEEDBOOST,
  Powerup.SHIELD
];

/************************************************************/
/* Genera un powerup y lo revoléa al mapa *******************/

Powerup.generateRandomPowerup = function() {
  var point = World.getRandomPoint();
  var name = Util.choiceArray(Powerup.POWERUPS);
  var data = null;
  switch (name) {
    case Powerup.HEALTHPACK:
      data = Util.randRangeInt(
        Powerup.HEALTHPACK_MIN_HEAL,
        Powerup.HEALTHPACK_MAX_HEAL + 1);
      break;
    case Powerup.SHOTGUN:
      data = Util.randRangeInt(
        Powerup.SHOTGUN_MIN_BONUS_SHELLS,
        Powerup.SHOTGUN_MAX_BONUS_SHELLS + 1);
      break;
    case Powerup.RAPIDFIRE:
      data = Util.randRange(
        Powerup.RAPIDFIRE_MIN_MULTIPLIER,
        Powerup.RAPIDFIRE_MAX_MULTIPLIER);
      break;
    case Powerup.SPEEDBOOST:
      data = Util.randRange(
        Powerup.SPEEDBOOST_MIN_MULTIPLIER,
        Powerup.SPEEDBOOST_MAX_MULTIPLIER);
      break;
    case Powerup.SHIELD:
      data = Util.randRangeInt(
        Powerup.SHIELD_MIN_STRENGTH,
        Powerup.SHIELD_MAX_STRENGTH + 1);
      break;
  }
  var duration = Util.randRange(
    Powerup.MIN_DURATION,
    Powerup.MAX_DURATION);
  return new Powerup(point[0], point[1], name, data, duration);
};

/************************************************************/
/* Arma un array con la información de un powerup ***********/

Powerup.prototype.getAppliedObject = function() {
  return {
    name: this.name,
    data: this.data,
    expirationTime: (new Date()).getTime() + this.duration
  };
};

/************************************************************/
/* Aplica powerups cuando los choca un player ***************/

Powerup.prototype.update = function(players) {
  for (var i = 0; i < players.length; ++i) {
    if (players[i].isCollidedWith(this.x, this.y, Powerup.HITBOX_SIZE)) {
      //console.log('colision con powerup');
      players[i].applyPowerup(this.name, this.getAppliedObject());
      this.shouldExist = false;
      return;
    }
  }
};

//modulo para el servidor
module.exports = Powerup;
