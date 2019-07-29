'use strict';

var intervalExtensUpdate;
var ringing = new Audio('./statics/ringing.mp3');
var calling = new Audio('./statics/calling.mp3');
ringing.loop = true;
calling.loop = true;

{
  var extenRegistered;
  
  let initEvtListeners = () => {

    $('#users-list .list-group-item').click(e => {
      let exten = e.target.getAttribute('data-exten');
      $('#destination').val(exten);
    });

    $('#videocall-btn').click(() => {
      let num = $('#destination').val();
      if (num === 'alepolidori') {
        num = '3405567088';
      }
      showAllVideos();
      webrtcPhone.call(num, true);
    });

    $('#audiocall-btn').click(() => {
      let num = $('#destination').val();
      if (num === 'alepolidori') {
        num = '3405567088';
      }
      hideAllVideos();
      webrtcPhone.call(num);
    });

    $('#answer-btn').click(() => {
      webrtcPhone.answer();
    });

    $('.hangup-btn').click(() => {
      webrtcPhone.hangup();
    });

    $('#start-fullscreen-btn').click(() => {
      document.getElementById('call-page').requestFullscreen();
      showExitFullscreen();
    });

    $('#exit-fullscreen-btn').click(() => {
      document.exitFullscreen();
      showStartFullscreen();
    });

    $(document).on('registered', function (ev, exten) {
      enableCallComps();
      setTimeout(() => {
        extenRegistered = exten;
        phoneApp.showHomePage();
        initUsersList();
      }, 1000);
    });

    $(document).on('unregistered', function (ev) {
      disableCallComps();
      hideIncallToast();
      calling.pause();
      ringing.pause();
      hideIncallToast();
      $('#extenid-label').text('');
    });

    $(document).on('calling', function (ev, num) {
      phoneApp.showCallPage();
      $('#call-status').text('Calling ' + (num === '3405567088' ? 'alepolidori' : num) + '...');
      calling.play();
      hideIncallToast();
    });

    $(document).on('incomingcall', function (ev, num) {
      $('#call-status').text('...incoming call from ' + num);
      disableCallComps();
      ringing.play();
      showIncallToast(num);
    });

    $(document).on('callaccepted hangup', function (ev) {
      calling.pause();
      ringing.pause();
      hideIncallToast();
    });

    $(document).on('hangup', function (ev) {
      enableCallComps();
      phoneApp.showHomePage();
      $('#call-status').text('Call terminated');
    });

    $(document).on('callaccepted', function (ev, num) {
      $('#call-status').text('In call with ' + num);
      phoneApp.showCallPage();
    });
  };

  $(function () {
    initEvtListeners();
    hideIncallToast();
  });

  let disableCallComps = () => {
    $('#videocall-btn, #audiocall-btn, #destination').attr('disabled', 'disabled');
  };

  let enableCallComps = () => {
    $('#videocall-btn, #audiocall-btn, #destination').removeAttr('disabled');
  };

  let showIncallToast = (num) => {
    $('#toast-title').text('Incoming call from ' + num);
    $('#incall-toast').removeClass('d-none').toast('show');
  };
  
  let hideIncallToast = () => {
    $('#incall-toast').toast('hide');
  };
  
  let showExitFullscreen = () => {
    $('#start-fullscreen-btn, #exit-fullscreen-btn').toggleClass('d-none');
  };
  
  let showStartFullscreen = () => {
    $('#start-fullscreen-btn, #exit-fullscreen-btn').toggleClass('d-none');
  };

  let hideAllVideos = () => {
    $('#local-video, #remote-video').addClass('invisible');
  };

  let showAllVideos = () => {
    $('#local-video, #remote-video').removeClass('invisible');
  };

  let initUsersList = () => {
    let baseUrl = location.origin + '/api';
    $.ajax({
      url: baseUrl + '/wextens',
      type: 'GET',
      dataType: 'json',
      success: function (res) {
        createUsersList(res);
        startExtensUpdate();
        $('#extenid-label').text(extenRegistered + ' ' + res[extenRegistered].name);
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error('error creating users list');
      }
    });
  };
}

let createUsersList = data => {
  console.log('all wextens:', data);
  if (Object.keys(data).length === 0) {
    return;
  }
  hideNoUsersLabel();
  for (let k in data) {
    var list = [
      '<button class="list-group-item list-group-item-action" ',
        'data-exten="', k, '" ',
        'onclick="clickExten(', k, ')" ',
        (data[k].status === 'offline' || k === extenRegistered ? 'disabled' : ''), '>',
        '<i id="status-exten-', k, '" class="fas fa-circle ', getStatusColor(data[k].status), ' mr-3"></i>',
        k, ' - ', data[k].name,
      '</button>'
    ].join('');
    $('#users-list').append(list);
  }
};

let clickExten = exten => {
  $('#destination').val(exten);
};

let getStatusColor = status => {
  if (status === 'online') {
    return 'text-success';
  } else if (status === 'offline') {
    return 'text-black-50';
  } else {
    return 'text-danger';
  }
};

let resetExtenColor = id => {
  $('#' + id).removeClass('text-success text-black-50 text-danger');
};

let startExtensUpdate = () => {
  intervalExtensUpdate = setInterval(() => {
    console.log('update extens status');
    let baseUrl = location.origin + '/api';
    $.ajax({
      url: baseUrl + '/wextens',
      type: 'GET',
      dataType: 'json',
      success: function (res) {
        updateUsersList(res);
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error('error updating users list');
      }
    });
  }, 2000);
};

let showNoUsersLabel = () => {
  $('#no-users-label').removeClass('d-none');
};

let hideNoUsersLabel = () => {
  $('#no-users-label').addClass('d-none');
};

let updateUsersList = data => {
  console.log('all wextens:', data);
  if (Object.keys(data).length === 0) {
    $('#users-list button').remove();
    showNoUsersLabel();
    return;
  }
  for (let k in data) {
    if ($('#status-exten-' + k).length > 0) {
      resetExtenColor('status-exten-' + k);
      $('#status-exten-' + k).addClass(getStatusColor(data[k].status));
    }
    if (data[k].status === 'offline') {
      $('#status-exten-' + k).parent().attr('disabled', 'disabled');
    } else if (k !== extenRegistered) {
      $('#status-exten-' + k).parent().removeAttr('disabled');
    }
  }
};