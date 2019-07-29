'use strict';

var webrtcPhone, phoneApp;

{
  let use = name => {
    if (name === 'janus') {
      webrtcPhone = janusWebrtcPhone;
    } else if (name === 'sipml5') {
    } else if (name === 'sipjs') {
      webrtcPhone = sipjsWebrtcPhone;
    }
  };

  let hideAllPages = () => {
    $('#settings-page, #home-page, #call-page').addClass('d-none');
  };

  let showSettingsPage = () => {
    hideAllPages();
    $('#settings-page').removeClass('d-none');
  };

  let showHomePage = () => {
    hideAllPages();
    $('#home-page').removeClass('d-none');
  };

  let showCallPage = () => {
    hideAllPages();
    $('#call-page').removeClass('d-none');
  };

  let initEvtListeners = () => {

    $('#settings-btn').click(() => {
      showSettingsPage();
    });

    $('#home-btn').click(() => {
      showHomePage();
    });
  };

  $(function () {
    initEvtListeners();
  });

  phoneApp = {
    use: use,
    showCallPage: showCallPage,
    showHomePage: showHomePage
  };
}
