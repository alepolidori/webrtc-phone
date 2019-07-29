'use strict';

{

  let remoteAudio, remoteVideo, localVideo, server, phone,
      rtcSession, counterpartNum;

  let call = (to, video) => {
    let options = {
      sessionDescriptionHandlerOptions: {
        constraints: {
          audio: true,
          video: video
        },
        // peerConnectionOptions: {
        //   rtcConfiguration: {
        //     iceServers: [{
        //       urls: []
        //     }]
        //   }
        // },
        // offerConstraints: {
        //   'offerToReceiveAudio': true
        // },
        // mandatory: [{
        //     OfferToReceiveAudio: true,
        //     OfferToReceiveVideo: true
        //   },
        //   {
        //     'DtlsSrtpKeyAgreement': true
        //   }
        // ]
      }
    };
    counterpartNum = to;
    try {
      rtcSession = phone.invite(to + '@' + server);
    } catch (error) {
      console.error(error);
    }
    attachEvtListeners();
  };

  let login = data => {
    remoteAudio = $('#' + data.audioId).get(0);
    remoteVideo = $('#' + data.remoteVideoId).get(0);
    localVideo = $('#' + data.localVideoId).get(0);
    server = data.server;
    let configuration = {
      uri: data.exten + '@' + server,
      transportOptions: {
        wsServers: [ 'wss://' + server + ':8089/ws' ],
        traceSip: false
      },
      authorizationUser: data.exten,
      password: data.password
    };
    try {
      phone = new SIP.UA(configuration);
    } catch (error) {
      console.error(error);
      return;
    }
    phone.on('registered', e => {
      console.log('registered');
      console.log(e);
      $(document).trigger('registered');
    });
    phone.on('unregistered', e => {
      console.log('unregistered');
      console.log(e);
      $(document).trigger('unregistered');
    });
    phone.on('registrationFailed', e => {
      console.log('registrationFailed');
      console.log(e);
    });
    phone.on('invite', session => {
      console.log('invite');
      console.log(session);
      rtcSession = session;
      $(document).trigger('incomingcall', counterpartNum);
    });
    phone.on('message', e => {
      console.log('message');
      console.log(e);
    });
    phone.on('outOfDialogReferRequested', e => {
      console.log('outOfDialogReferRequested');
      console.log(e);
    });
    phone.on('transportCreated', e => {
      console.log('transportCreated');
      console.log(e);
    });
    phone.start();
  };

  let logout = () => {
    phone.unregister();
  };

  let answer = () => {
    let options = {
      sessionDescriptionHandlerOptions: {
        constraints: {
          audio: true,
          video: true
        }
      }
    };
    attachEvtListeners();
    rtcSession.accept(options);
  };

  let hangup = () => {
    if (rtcSession && rtcSession.terminate) {
      rtcSession.terminate();
    }
  };

  let getCounterpartNum = () => {
    return rtcSession.remoteIdentity._displayName + ' ' + rtcSession.remoteIdentity.uri.user;
  };

  let attachEvtListeners = () => {
    rtcSession.on('progress', e => {
      console.log('progress');
      console.log(e);
      $(document).trigger('calling');
    });
    rtcSession.on('accepted', e => {
      console.log('accepted');
      console.log(e);
      $(document).trigger('callaccepted');
    });
    rtcSession.on('rejected', e => {
      console.log('rejected');
      console.log(e);
      $(document).trigger('callaccepted');
    });
    rtcSession.on('failed', e => {
      console.log('failed');
      console.log(e);
    });
    rtcSession.on('terminated', e => {
      console.log('terminated');
      console.log(e);
      $(document).trigger('hangup');
    });
    rtcSession.on('cancel', e => {
      console.log('cancel');
      console.log(e);
    });
    rtcSession.on('reinvite', e => {
      console.log('reinvite');
      console.log(e);
    });
    rtcSession.on('referRequested', e => {
      console.log('referRequested');
      console.log(e);
    });
    rtcSession.on('replaces', e => {
      console.log('replaces');
      console.log(e);
    });
    rtcSession.on('dtmf', e => {
      console.log('dtmf');
      console.log(e);
    });
    rtcSession.on('sessionDescriptionHandler-created', e => {
      console.log('sessionDescriptionHandler');
      console.log(e);
    });
    rtcSession.on('directionChanged', e => {
      console.log('directionChanged');
      console.log(e);
    });
    rtcSession.on('trackAdded', () => {
      let pc = rtcSession.sessionDescriptionHandler.peerConnection;

      let remoteStream = new MediaStream();
      pc.getReceivers().forEach((receiver) => {
        remoteStream.addTrack(receiver.track);
      });
      // remoteAudio.srcObject = remoteStream;
      remoteVideo.srcObject = remoteStream;

      let localStream = new MediaStream();
      pc.getSenders().forEach(function (sender) {
        localStream.addTrack(sender.track);
      });
      localVideo.srcObject = localStream;
    });
    rtcSession.on('bye', e => {
      console.log('bye');
      console.log(e);
      $(document).trigger('hangup');
    });
  };

  var sipjsWebrtcPhone = {
    call: call,
    login: login,
    logout: logout,
    answer: answer,
    hangup: hangup,
    getCounterpartNum: getCounterpartNum
  };
}