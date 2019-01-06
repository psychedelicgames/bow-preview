// Definiciones de zombies
// Powerup remake
// param {number} x: The x-coordinate of the powerup.
// param {number} y: The y-coordinate of the powerup.
// param {string} name: el nombre o clase de zomie.
// param {number|string} health: la salud del zombie.

/************************************************************/
/* Dependencias e inclusión modular *************************/

var Entity        = require('./Entity');
var World         = require('./World');
var Util          = require('../shared/Util');

//función principal
function Block(x, y, name, health) {
  this.x = x;
  this.y = y;
  this.name = name;
  this.health = health;
  this.shouldExist = true;
}

//pedimos shared
require('../shared/base');

//herencia de clase
Block.inheritsFrom(Entity);

Block.HITBOX_SIZE = 20;

//definicion de zomibe
Block.ZOMBIE = 'zombie';
Block.ZOMBIE_MIN_HEAL = 3;
Block.ZOMBIE_MAX_HEAL = 7;

//definicion de people
Block.PEOPLE = 'people';
Block.PEOPLE_MIN_HEAL = 3;
Block.PEOPLE_MAX_HEAL = 7;

Block.TYPES = [Block.ZOMBIE, Block.PEOPLE];

 /************************************************************/
 /* Genera un powerup y lo revoléa al mapa *******************/

Block.PushRandomBlocks = function() {
  var point = World.getRandomPoint();
  var name = Util.choiceArray(Block.TYPES);
  switch (name) {
    case Block.ZOMBIE:
      health = Util.randRangeInt(
        Block.ZOMBIE_MIN_HEAL,
        Block.ZOMBIE_MAX_HEAL + 1);
      break;
    case Block.PEOPLE:
      health = Util.randRangeInt(
        Block.PEOPLE_MIN_HEAL,
        Block.PEOPLE_MAX_HEAL + 1);
      break;
  }
  //console.log(point[0], point[1], name, health);
  return new Block(point[0], point[1], name, health);
};

/************************************************************/
/* Chocan las unidades, pasan las balas *********************/

Block.bound = function(x, y) {
 //return [Util.bound(x, Constants.WORLD_MIN, Constants.WORLD_MAX), Util.bound(y, Constants.WORLD_MIN, Constants.WORLD_MAX)];
 return [Util.bound(x, 500, 1000), Util.bound(y, 500, 1000)];
};

/************************************************************/
/* Aplica acciones cuando los choca un player ***************/

Block.prototype.update = function(shape) {
  //console.log(figura);
  for (var i = 0; i < shape.length; ++i) {
    if (shape[i].isCollidedWith(this.x, this.y, Block.HITBOX_SIZE)) {
      console.log(shape);
      //players[i].applyPowerup(this.name, this.getAppliedObject());
      shape[i].shouldExist = false;
      return;
    }
  }
};

//modulo para el servidor
module.exports = Block;
