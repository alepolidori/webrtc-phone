'use strict';

{
  let checkStoredData = () => {
    let config = JSON.parse(localStorage.getItem('config'));
    if (config) {
      $('#server').val(config.server);
      $('#name').val(config.name);
      $('#exten').val(config.exten);
      $('#password').val(config.password);
    } else {
      $('#server').val(location.hostname);
    }
    if (localStorage.getItem('auto-connection') === 'true') {
      $('#auto-connection').attr('checked', 'checked');
    }
    if (localStorage.getItem('store-data') === 'true') {
      $('#store-data').attr('checked', 'checked');
    }
    checkAutoConnectionCheckbox();
  };

  let checkAutoConnectionCheckbox = () => {
    if ($('#store-data').is(':checked')) {
      $('#auto-connection').removeAttr('disabled');
    } else {
      $('#auto-connection').attr('disabled', 'disabled');
    }
  };

  let storeAutoConnection = () => {
    localStorage.setItem('auto-connection', $('#auto-connection').is(':checked'));
  };

  let initEventListeners = () => {

    $('#store-data').click(() => {
      checkAutoConnectionCheckbox();
    });

    $('#auto-connection').click(() => {
      storeAutoConnection();
    });

    $('#login-btn').click(() => {
      let config = {
        server: $('#server').val(),
        exten: $('#exten').val(),
        name: $('#name').val(),
        password: $('#password').val()
      };
      if ($('#store-data').is(':checked')) {
        localStorage.setItem('config', JSON.stringify(config));
        localStorage.setItem('store-data', $('#store-data').is(':checked'));
        storeAutoConnection();
      } else {
        localStorage.clear();
      }
      login();
    });

    $('#logout-btn').click(() => {
      webrtcPhone.logout();
    });

    $(document).on('registered', function (ev) {
      $('#login-btn, #server, #name, #exten, #password').attr('disabled','disabled');
      $('#logout-btn').removeAttr('disabled');
    });

    $(document).on('unregistered', function (ev) {
      $('#login-btn, #server, #name, #exten, #password').removeAttr('disabled');
      $('#logout-btn').attr('disabled','disabled');
    });
  };

  let checkAutoConnection = () => {
    if ($('#auto-connection').is(':checked')) {
      login();
    }
  };

  let login = () => {
    phoneApp.use('janus');
    let config = {
      server: $('#server').val(),
      exten: $('#exten').val(),
      name: $('#name').val(),
      password: $('#password').val(),
      remoteVideoId: 'remote-video',
      localVideoId: 'local-video',
      remoteAudioId: 'remote-audio'
    };
    webrtcPhone.login(config);
  };

  $(function () {
    checkStoredData();
    initEventListeners();
    checkAutoConnection();
  });
}