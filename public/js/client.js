
$(document).ready(function() {
  var socket = io();

  var canvas = document.getElementById('canvas');
  var leaderboard = document.getElementById('leaderboard');
  var messages_board = document.getElementById('chat-display');
  var messages_field = document.getElementById('chat-input');

  var game = Game.create(socket, canvas, leaderboard);
  var chat = Chat.create(socket, messages_board, messages_field);

  Input.applyEventHandlers(canvas);
  Input.addMouseTracker(canvas);

  $('#name-input').focus();

  function send_name() {
    var name = $('#name-input').val();
    if (name && name.length < 20) {
      $('#name-prompt-container').empty();
      $('#name-prompt-container').append(
          $('<span>').addClass('fa fa-2x fa-spinner fa-pulse'));
      socket.emit('new-player', {
        name: name
      }, function() {
        $('#name-prompt-overlay').fadeOut(500);
        $('#canvas').focus();
        game.animate();
      });
    } else {
      window.alert('Your name cannot be blank or over 20 characters.');
    }
    return false;
  };
  $('#name-form').submit(send_name);
  $('#name-submit').click(send_name);

});
