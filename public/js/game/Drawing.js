

function Drawing(context, images) {
  this.context = context;
  //this.context.imageSmoothingEnabled = false;
  this.images = images;
  // console.log('once');
}

//show names
var show_names = '1';
var show_life = '1';

/************************************************************/
/* Definiciones generales ***********************************/

Drawing.NAME_FONT             = '14px Questrial';
Drawing.NAME_COLOR            = '#FFF';
Drawing.HP_COLOR              = '#89D926';
Drawing.HP_MISSING_COLOR      = '#FF0000';
Drawing.SHIELD_COLOR          = '#26C6D9';
Drawing.SHIELD_MISSING_COLOR  = '#BEF8FF';
Drawing.BASE_IMG_URL          = 'img/canvas/';
Drawing.TILE_SIZE             = 2500;

/************************************************************/
/* Localizamos las imágenes a usar **************************/

//public\media

Drawing.IMG_SRCS = {
  //machines
  'explosion_media':        '/public/media/game/machines/explosion_02.png',
  'smoke':                  '/public/media/game/machines/smoke.svg',
  'panzer':                 '/public/media/game/machines/panzer_02.png',
  'self_turret':            '/public/media/game/machines/cannon_03.png',
  'other_tank':             '/public/media/game/machines/enemy_panzer.png',
  'other_turret':           '/public/media/game/machines/enemy_cannon.png',
  'drone':                  '/public/media/game/machines/drone.png',
  'shadow':                 '/public/media/game/machines/broken_panzer_02.png',
  'nada':                   '/public/media/game/machines/nada.png',
  'shield':                 '/public/media/game/machines/shield_02.png',
  //ammo
  'ammo_regular':           '/public/media/game/ammo/regular.png',
  'ammo_healco_care':       '/public/media/game/ammo/healco_care.png',
  'ammo_slowco_frozen':     '/public/media/game/ammo/slowco_frozen.png',
  //map
  'tile':                   '/public/media/maps/camo-black.png',
  //map powerups
  'shotgun_powerup':        '/public/media/shotgun_powerup.png',
  'speedboost_powerup':     '/public/media/speedboost_powerup.png',
  'rapidfire_powerup':      '/public/media/rapidfire_powerup.png',
  'shield_powerup':         '/public/media/shield_powerup.png',
  'healthpack_powerup':     '/public/media/healthpack_powerup.png',
};

/************************************************************/
/* Crea las imagenes en canvas ******************************/

Drawing.create = function(context) {
  var images = {};
  for (var key in Drawing.IMG_SRCS) {
    images[key] = new Image();
    images[key].src = Drawing.IMG_SRCS[key];
  }
  return new Drawing(context, images);
};

/************************************************************/
/* Limpiamos el canvas **************************************/

Drawing.prototype.clear = function() {
  this.context.clearRect(0, 0, Constants.CANVAS_WIDTH, Constants.CANVAS_HEIGHT);
};

/************************************************************/
/* Crea las unidades en el mapa *****************************/

Drawing.prototype.drawTank = function(isSelf, coords, orientation, turretAngle, name, kind, health, hasShield, shieldsize) {

  /************************************************************/
  /* visualización opcional de los nombres de usuario *********/

  if (show_names == 1) {
    this.context.save();
    //presición pixelar
    coords[0] = (0.5 + coords[0]) | 0;
    coords[1] = (0.5 + coords[1]) | 0;
    //ahora si
    this.context.translate(coords[0], coords[1]);
    this.context.textAlign = 'center';
    this.context.font = Drawing.NAME_FONT;
    this.context.fillStyle = Drawing.NAME_COLOR;
    this.context.fillText(name, 0, -50);
    this.context.restore();
  }

  /************************************************************/
  /* visualización opcional de la barra de vida ***************/

  if (show_life == 1) {
    this.context.save();
    //presición pixelar
    coords[0] = (0.5 + coords[0]) | 0;
    coords[1] = (0.5 + coords[1]) | 0;
    //ahora si
    this.context.translate(coords[0], coords[1]);
    //los pixeles que ocupa cada unidad
    var unidad_w = 3;
    //barra de escude
    if (hasShield != null && hasShield != undefined) {
      //console.log('shield size: ' + shieldsize);
      for (var s = 0; s < 20; s++) {
        //escude
        if (s < shieldsize) {
          this.context.fillStyle = Drawing.SHIELD_COLOR;
          this.context.fillRect((s * unidad_w) + (unidad_w * 10), -42, unidad_w, 5);
        }
      }
    }
    //barra de vida
    for (var i = 0; i < 20; i++) {
      //salud
      if (i < health) {
        this.context.fillStyle = Drawing.HP_COLOR;
        this.context.fillRect((i * unidad_w) - (unidad_w * 10), -42, unidad_w, 5);
      }
      //salud perdida
      else {
        this.context.fillStyle = Drawing.HP_MISSING_COLOR;
        this.context.fillRect((i * unidad_w) - (unidad_w * 10), -42, unidad_w, 5);
        }
    }
    //c-c-coom-bo breaker!
    this.context.restore();
  }

  /************************************************************/
  /* resumimos operaciones convencionales sobre unidad ********/

  this.context.save();
  //presición pixelar
  coords[0] = (0.5 + coords[0]) | 0;
  coords[1] = (0.5 + coords[1]) | 0;
  //ahora si
  this.context.translate(coords[0], coords[1]);
  this.context.rotate(orientation);
  //acá arma la unidad
  var unidad = null;
  if (kind == "drone") { unidad = this.images['drone']; }
  if (kind == "panzer") { unidad = this.images['panzer']; }
  if (kind == "shadow") { unidad = this.images['shadow']; }
  //draw, primero el normal, después el volado
  if (kind != "shadow") { this.context.drawImage(unidad, -unidad.width / 2, -unidad.height / 2); }
  if (kind == "shadow") { this.context.drawImage(unidad, -170, -128); }
  //acomodamos
  this.context.restore();
  this.context.save();
  //presición pixelar
  coords[0] = (0.5 + coords[0]) | 0;
  coords[1] = (0.5 + coords[1]) | 0;
  //ahora si
  this.context.translate(coords[0], coords[1]);
  this.context.rotate(turretAngle);
  //acá arma el cañon
  var turret = null;
  if (kind == "drone") { turret = this.images['nada']; }
  if (kind == "panzer") { turret = this.images['self_turret']; }
  if (kind == "shadow") { turret = this.images['nada']; }
  this.context.drawImage(turret, -turret.width / 2, -turret.height / 2);
  this.context.restore();
  //revisa si posee escudo
  if (hasShield != null && hasShield != undefined) {
  this.context.save();
  //presición pixelar
  coords[0] = (0.5 + coords[0]) | 0;
  coords[1] = (0.5 + coords[1]) | 0;
  //ahora si
  this.context.translate(coords[0], coords[1]);
  var shield = this.images['shield'];
  this.context.drawImage(shield, -shield.width / 2, -shield.height / 2);
  this.context.restore();
  }
  //usando las proximas 7 lineas es posible hacer que la unidad disipe fuego.
  /*
  if (health < 3) {
    this.context.save();
    //presición pixelar
    coords[0] = (0.5 + coords[0]) | 0;
    coords[1] = (0.5 + coords[1]) | 0;
    //ahora si
    this.context.translate(coords[0], coords[1]);
    var smoke = this.images['smoke'];
    this.context.drawImage(smoke, -smoke.width / 2, -smoke.height / 2);
    this.context.restore();
  }
  */

};

/************************************************************/
/* Creación de balas ****************************************/

Drawing.prototype.drawBullet = function(coords, orientation, ammo, source_x, source_y) {
  this.context.save();
  //presición pixelar
  coords[0] = (0.5 + coords[0]) | 0;
  coords[1] = (0.5 + coords[1]) | 0;

  //pixel wise, hace rendir más el GPU, previniendo posiciones imposibles
  source_x = (0.5 + source_x) | 0;
  source_y = (0.5 + source_y) | 0;

  //lineas
  this.context.beginPath();
  this.context.moveTo(source_x, source_y);
  this.context.lineTo(coords[0], coords[1]);

  //disfuminación de linea
  var grad = this.context.createLinearGradient(source_x, source_y, coords[0], coords[1]);
  grad.addColorStop(0, 'transparent');

  //color de la linea
  if(ammo == 'slowco_frozen') { grad.addColorStop(1, '#0B95FB'); }
  else if(ammo == 'healco_care') { grad.addColorStop(1, '#6CFA0B'); }
  else { grad.addColorStop(1, '#FF3939'); }
  this.context.strokeStyle = grad;
  this.context.stroke();

  //ahora si, la imagen
  this.context.translate(coords[0], coords[1]);
  this.context.rotate(orientation);
  var bullet = this.images['ammo_regular'];
  if(ammo == 'slowco_frozen') { var bullet = this.images['ammo_slowco_frozen']; }
  if(ammo == 'healco_care') { var bullet = this.images['ammo_healco_care']; }
  this.context.drawImage(bullet, -bullet.width / 2, -bullet.height / 2);
  //this.context.filter = 'blur(3px)';
  //this.context.drawImage(bullet, -bullet.width / 2, -bullet.height / 2);
  this.context.restore();
};

/************************************************************/
/* Creación de bloques **************************************/

Drawing.prototype.drawBlock = function(coords, name) {
  this.context.save();
  //presición pixelar
  coords[0] = (0.5 + coords[0]) | 0;
  coords[1] = (0.5 + coords[1]) | 0;
  //ahora si
  this.context.translate(coords[0], coords[1]);
  var block_media = this.images[name];
  this.context.drawImage(block_media, -block_media.width / 2, -block_media.height / 2);
  this.context.restore();
};

/************************************************************/
/* Creación de powerups *************************************/

Drawing.prototype.drawPowerup = function(coords, name) {
  this.context.save();
  //presición pixelar
  coords[0] = (0.5 + coords[0]) | 0;
  coords[1] = (0.5 + coords[1]) | 0;
  //ahora si
  this.context.translate(coords[0], coords[1]);
  var powerup_icon = this.images[name];
  this.context.drawImage(powerup_icon, -powerup_icon.width / 2, -powerup_icon.height / 2);
  this.context.restore();
};

/************************************************************/
/* Creación de explosiones **********************************/

Drawing.prototype.drawExplosion = function(coords) {
  this.context.save();
  //presición pixelar
  coords[0] = (0.5 + coords[0]) | 0;
  coords[1] = (0.5 + coords[1]) | 0;
  //ahora si
  this.context.translate(coords[0], coords[1]);
  var explosion_media = this.images['explosion_media'];
  this.context.drawImage(explosion_media, -explosion_media.width / 2, -explosion_media.height / 2);
  this.context.restore();
};

/************************************************************/
/* Creación del mapa ****************************************/

 // param {number} minX The minimum canvas x coordinate to start drawing from.
 // param {number} minY The minimum canvas y coordinate to start drawing from.
 // param {number} maxX The maximum canvas x coordinate to draw to.
 // param {number} maxY The maximum canvas y coordinate to draw to.

Drawing.prototype.drawTiles = function(minX, minY, maxX, maxY) {
  this.context.save();
  var tile = this.images['tile'];
  for (var x = minX; x < maxX; x += Drawing.TILE_SIZE) {
    for (var y = minY; y < maxY; y += Drawing.TILE_SIZE) {
      this.context.drawImage(tile, x, y);
    }
  }
  this.context.restore();
};
