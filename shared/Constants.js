
function Constants() {
  throw new Error('Constants should not be instantiated!');
}


Constants.WORLD_MIN = 0;
Constants.WORLD_MAX = 2500;
Constants.WORLD_PADDING = 30;
Constants.CANVAS_WIDTH = 2500;
Constants.CANVAS_HEIGHT = 2500;
Constants.VISIBILITY_THRESHOLD_X = 1200;
Constants.VISIBILITY_THRESHOLD_Y = 1200;

if (typeof module === 'object') {  module.exports = Constants; }
else {  window.Constants = Constants; }
