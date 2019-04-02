
function Game(socket, leaderboard, drawing, viewPort) {
  this.socket = socket;
  this.leaderboard = leaderboard;
  this.drawing = drawing;
  this.viewPort = viewPort;
  this.self = null;
  this.players = [];
  this.projectiles = [];
  this.powerups = [];
  this.explosions = [];
  this.latency = 0;
  this.animationFrameId = 0;
}

Game.create = function(socket, canvasElement, leaderboardElement) {
  canvasElement.width = Constants.CANVAS_WIDTH;
  canvasElement.height = Constants.CANVAS_HEIGHT;
  var canvasContext = canvasElement.getContext('2d');

  var leaderboard = Leaderboard.create(leaderboardElement);
  var drawing = Drawing.create(canvasContext);
  var viewPort = ViewPort.create();

  var game = new Game(socket, leaderboard, drawing, viewPort);
  game.init();
  return game;
};

Game.prototype.init = function() {
  this.socket.on('update', bind(this, function(data) {
    this.receiveGameState(data);
  }));
};

Game.prototype.receiveGameState = function(state) {
  this.leaderboard.update(state['leaderboard']);

  this.self = state['self'];
  this.players = state['players'];
  this.projectiles = state['projectiles'];
  this.powerups = state['powerups'];
  this.explosions = state['explosions'];
  this.latency = state['latency'];
};

Game.prototype.animate = function() {
  this.animationFrameId = window.requestAnimationFrame(
      bind(this, this.run));
};

Game.prototype.stopAnimation = function() {
  window.cancelAnimationFrame(this.animationFrameId);
};

Game.prototype.run = function() {
  this.update();
  this.draw();
  this.animate();
};

Game.prototype.update = function() {

   if (this.self) {

     //canvas
     const canvas_hold        = document.getElementById('canvas-container');
     const canvas_hold_info   = canvas_hold.getBoundingClientRect();
     const canvas_hold_w      = canvas_hold_info.width;
     const canvas_hold_h      = canvas_hold_info.height;

     //camera
     camera_x         = this.self['camera_x'];
     camera_y         = this.self['camera_y'];
     camera           = {x: camera_x, y: camera_y};

     //unidad
     var unidad_x     = this.self['camera_x'];
     var unidad_y     = this.self['camera_y'];
     unidad           = {x: unidad_x, y: unidad_y};

     //usuario
     var usuario_x    = (canvas_hold_w / 2);
     var usuario_y    = (canvas_hold_h / 2);
     usuario          = {x: usuario_x, y: usuario_y};

     //maximos
     var maxima_x     = Constants.CANVAS_WIDTH - usuario.x;
     var maxima_y     = Constants.CANVAS_HEIGHT - usuario.y;
     maxima           = {x: maxima_x, y: maxima_y};

     //si el usuario se acerca a la máxima izquierda
     if (camera.x < usuario.x) { camera.x = usuario.x; this.viewPort.update(camera.x, camera.y) }
     //si el usuario se acerca a la máxima superior
     if (camera.y < usuario.y) { camera.y = usuario.y; this.viewPort.update(camera.x, camera.y) }
     //si el usuario se acerca a la máxima derecha
     if (camera.x > maxima.x) { camera.x = maxima.x; this.viewPort.update(camera.x, camera.y) }
     //si el usuario se acerca a la máxima inferior
     if (camera.y > maxima.y) { camera.y = maxima.y; this.viewPort.update(camera.x, camera.y) }
     //seguir al usuario
     else { this.viewPort.update(camera.x, camera.y); }

     //diferencia lineal camera unidad.
     var diferencia_camera_unidad_x = camera.x - unidad.x;
     var diferencia_camera_unidad_y = camera.y - unidad.y;
     diferencia_camera_unidad = {x: diferencia_camera_unidad_x, y: diferencia_camera_unidad_y};

     /************************************************************/
     /* calculamos el angulo de disparo **************************/

     //comenzamos por calcular el angulo de disparo
     var turretAngle = Math.atan2(
     //calculo la diferencia
     //calcular radianes desde la posición del player a la posición del cursor
     (Input.MOUSE[1] - Constants.CANVAS_HEIGHT / 2) + (diferencia_camera_unidad.y),
     (Input.MOUSE[0] - Constants.CANVAS_WIDTH / 2) + (diferencia_camera_unidad.x)
     ) + Math.PI / 2;


     /************************************************************/
     /* prevención de operaciones sin foco ***********************/

     //observamos al canvas y vemos si posee foco
     var canvas_focus = document.getElementById('canvas');
     var canvas_isFocused = (document.activeElement === canvas_focus);
     // console.log(canvas_isFocused);

     //si el canvas no posee foco, liberar varaibles
     if (canvas_isFocused == false) {
       //armamos acá la información para enviar al servidor
       Input.UP = false;
       Input.RIGHT = false;
       Input.DOWN = false;
       Input.LEFT = false;
       Input.LEFT_CLICK = false;
     };

     /************************************************************/
     /* armamos el pack con información para el server ***********/

     //armamos acá la información para enviar al servidor
     var pack = {
       'keyboardState': {
         'up':           Input.UP,
         'right':        Input.RIGHT,
         'down':         Input.DOWN,
         'left':         Input.LEFT
       },
       'turretAngle':    turretAngle,
       'shot':           Input.LEFT_CLICK,
       'timestamp':      (new Date()).getTime()
     };

     /************************************************************/
     /* emisión de información hacia el server *******************/

     //enviamos el input al servidor y analizamos el feedback
     this.socket.emit('player-action', pack, function(feedback) {
       //revisamos si disparó
       // @@ if (feedback && feedback.player_has_fired == 'yes') {
       //   //sacudimos el canvas en cualquier caso de disparo
       //   canvas_shake();
       //   //removemos el "wanna_fire", le interrumpimos el fuego.
       //   if(feedback.player_main_ammo != "Assassin MK1") {
       //     Input.LEFT_CLICK = false;
       //   }
       //   //salvo que posea una Assassin.
       //   if(feedback.player_main_ammo == "Assassin MK1") {
       //     //es obvio que se podría hacer con más elegancia.
       //     setTimeout(function(){ Input.LEFT_CLICK = false; }, 2000);
       //   }
       //   //reproducimos el sonido de la munición .
       //   if(feedback.player_main_ammo == "common") {
       //     sounds['./audio/ammo/common.mp3'].play();
       //     // $('#canvas').addClass('shake shake-slow');
       //   }
       //   else if(feedback.player_main_ammo == "Assassin MK1") {
       //     sounds['./audio/ammo/quick.mp3'].play();
       //   }
       //   else if(feedback.player_main_ammo == "Vladof relics 1.0") {
       //     sounds['./audio/ammo/fork.mp3'].play();
       //   }
       //   else {
       //     sounds['./audio/ammo/common.mp3'].play();
       //   }
       // }
     })
     // console.log(camera);
   }

   //console.timeEnd("framer_posiciones");
 };

/**
 * Draws the state of the game onto the HTML5 canvas.
 */
Game.prototype.draw = function() {
  if (this.self) {
    // Clear the canvas.
    this.drawing.clear();

    /**
     * Draw the background first behind the other entities, we calculate the
     * closest top-left coordinate outside of the ViewPort. We use that
     * coordinate to draw background tiles from left to right, top to bottom,
     * so that the entire ViewPort is appropriately filled.
     */
     var center = this.viewPort.selfCoords;
       var leftX = this.self['x'] - Constants.CANVAS_WIDTH / 2;
       var topY = this.self['y'] - Constants.CANVAS_HEIGHT / 2;
       var drawStartX = Math.max( leftX - (leftX % Drawing.TILE_SIZE), Constants.WORLD_MIN);
       var drawStartY = Math.max( topY - (topY % Drawing.TILE_SIZE), Constants.WORLD_MIN);
       var drawEndX = Math.min( drawStartX + Constants.CANVAS_WIDTH + Drawing.TILE_SIZE, Constants.WORLD_MAX);
       var drawEndY = Math.min( drawStartY + Constants.CANVAS_HEIGHT + Drawing.TILE_SIZE, Constants.WORLD_MAX);
       posiciones = {};
       posiciones.x_minima = this.viewPort.toCanvasX(drawStartX),
       posiciones.y_minima = this.viewPort.toCanvasY(drawStartY),
       posiciones.x_maxima = this.viewPort.toCanvasX(drawEndX),
       posiciones.y_maxima = this.viewPort.toCanvasY(drawEndY),
       this.drawing.drawTiles(
           posiciones.x_minima,
           posiciones.y_minima,
           posiciones.x_maxima,
           posiciones.y_maxima,
           this.self['health']
       );

     // Draw the projectiles next.
     for (var i = 0; i < this.projectiles.length; ++i) {
       //console.log(this.projectiles[i]);
       this.drawing.drawBullet(
           this.viewPort.toCanvasCoords(this.projectiles[i]),
           this.projectiles[i]['orientation'],
           this.projectiles[i]['ammo'],
           this.viewPort.toCanvasX(this.projectiles[i]['source_x']),
           this.viewPort.toCanvasY(this.projectiles[i]['source_y'])
         );
     }

    // Draw the powerups next.
    for (var i = 0; i < this.powerups.length; ++i) {
      this.drawing.drawPowerup(
          this.viewPort.toCanvasCoords(this.powerups[i]),
          this.powerups[i]['name']);
    }

    // Draw the explosion next.
    for (var i = 0; i < this.explosions.length; ++i) {
      //por donde andan las explosiones?
      // console.log(this.explosions);
      this.drawing.drawExplosion( this.viewPort.toCanvasCoords(this.explosions[i]), this.explosions[i]);
      //this.drawing.foreground_rain();
      //mala idea, se ponen las cosas un poco pesadas :)
      //console.log(this.explosions);
    }

    // Draw the tank that represents the player.
    if (this.self) {
      this.drawing.drawTank(
          true,
          this.viewPort.toCanvasCoords(this.self),
          this.self['orientation'],
          this.self['turretAngle'],
          this.self['name'],
          this.self['kind'],
          this.self['health'],
          this.self['powerups']['shield_powerup']);
    }
    // Draw any other tanks.
    for (var i = 0; i < this.players.length; ++i) {
      this.drawing.drawTank(
          false,
          this.viewPort.toCanvasCoords(this.players[i]),
          this.players[i]['orientation'],
          this.players[i]['turretAngle'],
          this.players[i]['name'],
          this.players[i]['kind'],
          this.players[i]['health'],
          this.players[i]['powerups']['shield_powerup']);
    }
  }
};
