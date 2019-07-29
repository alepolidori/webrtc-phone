'use strict';

{
  let started = false;
  let registered = false;
  let janus, sipcall, exten, name, password, counterpartNum,
      remoteVideo, remoteAudio, localVideo, incoming, currentJsep,
      supportedDevices, videoEnabled;

  let getSupportedDevices = origCallback => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      // Firefox 38+ seems having support of enumerateDevicesx
      navigator.enumerateDevices = function (callback) {
        navigator.mediaDevices.enumerateDevices().then(callback);
      };
    }

    var MediaDevices = [];
    var isHTTPs = location.protocol === 'https:';
    var canEnumerate = false;

    if (typeof MediaStreamTrack !== 'undefined' && 'getSources' in MediaStreamTrack) {
      canEnumerate = true;
    } else if (navigator.mediaDevices && !!navigator.mediaDevices.enumerateDevices) {
      canEnumerate = true;
    }

    var hasMicrophone = false;
    var hasSpeakers = false;
    var hasWebcam = false;
    var isMicrophoneAlreadyCaptured = false;
    var isWebcamAlreadyCaptured = false;

    function checkDeviceSupport(callback) {
      if (!canEnumerate) {
        return;
      }

      if (!navigator.enumerateDevices && window.MediaStreamTrack && window.MediaStreamTrack.getSources) {
        navigator.enumerateDevices = window.MediaStreamTrack.getSources.bind(window.MediaStreamTrack);
      }

      if (!navigator.enumerateDevices && navigator.enumerateDevices) {
        navigator.enumerateDevices = navigator.enumerateDevices.bind(navigator);
      }

      if (!navigator.enumerateDevices) {
        if (callback) {
          callback();
        }
        return;
      }

      MediaDevices = [];
      navigator.enumerateDevices(function (devices) {
        devices.forEach(function (_device) {
          var device = {};
          for (var d in _device) {
            device[d] = _device[d];
          }

          if (device.kind === 'audio') {
            device.kind = 'audioinput';
          }

          if (device.kind === 'video') {
            device.kind = 'videoinput';
          }

          var skip;
          MediaDevices.forEach(function (d) {
            if (d.id === device.id && d.kind === device.kind) {
              skip = true;
            }
          });

          if (skip) {
            return;
          }

          if (!device.deviceId) {
            device.deviceId = device.id;
          }

          if (!device.id) {
            device.id = device.deviceId;
          }

          if (!device.label) {
            device.label = 'Please invoke getUserMedia once.';
            if (!isHTTPs) {
              device.label = 'HTTPs is required to get label of this ' + device.kind + ' device.';
            }
          } else {
            if (device.kind === 'videoinput' && !isWebcamAlreadyCaptured) {
              isWebcamAlreadyCaptured = true;
            }

            if (device.kind === 'audioinput' && !isMicrophoneAlreadyCaptured) {
              isMicrophoneAlreadyCaptured = true;
            }
          }

          if (device.kind === 'audioinput') {
            hasMicrophone = true;
          }

          if (device.kind === 'audiooutput') {
            hasSpeakers = true;
          }

          if (device.kind === 'videoinput') {
            hasWebcam = true;
          }

          // there is no 'videoouput' in the spec.
          MediaDevices.push(device);
        });

        if (callback) {
          callback();
        }
      });
    }

    // check for microphone/camera support!
    checkDeviceSupport(function () {
      supportedDevices = {
        audio: hasMicrophone,
        audioCap: isMicrophoneAlreadyCaptured,
        video: adapter.browserDetails.browser === 'chrome' ? hasWebcam : false,
        videoCap: adapter.browserDetails.browser === 'chrome' ? isWebcamAlreadyCaptured : false
      };
      Janus.log(supportedDevices);
      origCallback();
    });
  };

  let login2 = () => {
    if (sipcall) {
      var register = {
        username: 'sip:' + exten + '@127.0.0.1',
        display_name: name,
        secret: password,
        proxy: 'sip:127.0.0.1:5060',
        sips: false,
        request: 'register'
      };
      sipcall.send({
        'message': register
      });
    }
  };

  let handleRemote = jsep => {
    sipcall.handleRemoteJsep({
      jsep: jsep,
      error: function () {
        var hangup = {
          "request": "hangup"
        };
        sipcall.send({
          "message": hangup
        });
        sipcall.hangup();
      }
    });
  };

  let login = data => {
    let janusUrl = 'https://' + data.server + '/janus';
    exten = data.exten;
    name = data.name;
    password = data.password;
    remoteVideo = $('#' + data.remoteVideoId).get(0);
    localVideo = $('#' + data.localVideoId).get(0);
    remoteAudio = $('#' + data.remoteAudioId).get(0);
    if (sipcall) {
      login2();
      return;
    }
    Janus.init({
      debug: 'all',
      callback: function () {
        if (started) {
          return;
        }
        started = true;
        if (!Janus.isWebrtcSupported()) {
          console.error("No WebRTC support... ");
          return;
        }
        // create session
        janus = new Janus({
          server: janusUrl,
          success: function () {
            // attach the sip plugin
            janus.attach({
              plugin: 'janus.plugin.sip',
              success: function (pluginHandle) {
                sipcall = pluginHandle;
                Janus.log("Plugin attached! (" + sipcall.getPlugin() + ", id=" + sipcall.getId() + ")");
                getSupportedDevices(function () {
                  login2();
                });
              },
              error: function (error) {
                Janus.error("  -- Error attaching plugin...", error);
              },
              onmessage: function (msg, jsep) {
                Janus.debug(" ::: Got a message :::");
                Janus.debug(JSON.stringify(msg));
                // Any error?
                var error = msg["error"];
                if (error != null && error != undefined) {
                  if (!registered) {
                    Janus.log("User is not registered");
                  } else {
                    // Reset status
                    sipcall.hangup();
                  }
                  return;
                }
                var result = msg["result"];
                if (result !== null && result !== undefined && result["event"] !== undefined && result["event"] !== null) {
                  var event = result["event"];
                  switch (event) {
                    case 'registration_failed':
                      Janus.error("Registration failed: " + result["code"] + " " + result["reason"]);
                      return;
                      break;

                    case 'registered':
                      Janus.log("Successfully registered as " + result["username"] + "!");
                      if (!registered) {
                        registered = true;
                        $(document).trigger('registered', exten);
                      }
                      break;

                    case 'unregistered':
                      Janus.log("Successfully unregistered as " + result["username"] + "!");
                      if (registered) {
                        registered = false;
                        $(document).trigger('unregistered');
                      }
                      break;

                    case 'calling':
                      Janus.log("Waiting for the peer to answer...");
                      $(document).trigger('calling', counterpartNum);
                      break;

                    case 'incomingcall':
                      counterpartNum = msg.result.username.split('@')[0].split(':')[1];
                      incoming = true;
                      Janus.log("Incoming call from " + result["username"] + "!");



                      var doAudio = true, doVideo = true;
											var offerlessInvite = false;
                      if(jsep !== null && jsep !== undefined) {
												// What has been negotiated?
												doAudio = (jsep.sdp.indexOf("m=audio ") > -1);
												doVideo = (jsep.sdp.indexOf("m=video ") > -1);
												Janus.debug("Audio " + (doAudio ? "has" : "has NOT") + " been negotiated");
												Janus.debug("Video " + (doVideo ? "has" : "has NOT") + " been negotiated");
											} else {
												Janus.log("This call doesn't contain an offer... we'll need to provide one ourselves");
												offerlessInvite = true;
												// In case you want to offer video when reacting to an offerless call, set this to true
												doVideo = false;
											}



                      currentJsep = jsep;
                      $(document).trigger('incomingcall', counterpartNum);
                      break;

                    case 'progress':
                      Janus.log("There's early media from " + result["username"] + ", waiting for the call!");
                      if (jsep !== null && jsep !== undefined) {
                        handleRemote(jsep);
                      }
                      break;

                    case 'accepted':
                      Janus.log(result["username"] + " accepted the call!");
                      if (jsep !== null && jsep !== undefined) {
                        handleRemote(jsep);
                      }
                      $(document).trigger('callaccepted', counterpartNum);
                      break;

                    case 'hangup':
                      incoming = null;
                      Janus.log("Call hung up (" + result["code"] + " " + result["reason"] + ")!");
                      sipcall.hangup();
                      $(document).trigger('hangup');
                      break;

                    default:
                      break;
                  }
                }
              },
              onlocalstream: function (stream) {
                Janus.debug(" ::: Got a local stream :::");
                Janus.debug(JSON.stringify(stream));

                // if (videoEnabled === true) {
                  Janus.attachMediaStream(localVideo, stream);
                // }

                /* IS VIDEO ENABLED ? */
                // var videoTracks = stream.getVideoTracks();
                /* */
              },
              onremotestream: function (stream) {
                Janus.debug(" ::: Got a remote stream :::");
                Janus.debug(JSON.stringify(stream));

                // retrieve stream track
                var audioTracks = stream.getAudioTracks();
                var videoTracks = stream.getVideoTracks();

                Janus.attachMediaStream(remoteAudio, new MediaStream(audioTracks));
                Janus.attachMediaStream(remoteVideo, new MediaStream(videoTracks));
              },
              oncleanup: function () {
                Janus.log(" ::: Got a cleanup notification :::");
              }
            });
          },
          error: function (error) {
            started = false;
            registered = false;
            Janus.error(error);
            console.error("Janus error: " + error);
            reject();
          },
          destroyed: function () {
            started = false;
            registered = false;
            reject();
          }
        });
      }
    });
  };

  let logout = () => {
    if (sipcall) {
      var unregister = {
        request: 'unregister'
      };
      sipcall.send({
        'message': unregister
      });
    }
  };

  let call = (to, video) => {
    videoEnabled = video === true ? true : false;
    let media = {
      audioSend: true, audioRecv: true,
      videoSend: videoEnabled, videoRecv: videoEnabled
    };
    getSupportedDevices(function () {
      Janus.log("This is a SIP call");
      sipcall.createOffer({
        media: media,
        success: function (jsep) {
          Janus.debug("Got SDP!");
          Janus.debug(jsep);
          var body = {
            request: "call",
            uri: 'sip:' + to + '@127.0.0.1'
          };
          sipcall.send({
            "message": body,
            "jsep": jsep
          });
          counterpartNum = to;
        },
        error: function (error) {
          Janus.error("WebRTC error...", error);
        }
      });
    });
  };

  let answer = () => {
    incoming = null;
    getSupportedDevices(function () {
      sipcall.createAnswer({
        jsep: currentJsep,
        media: {
          audio: true,
          video: true
        },
        success: function (jsep) {
          Janus.debug("Got SDP! audio=" + true + ", video=" + true);
          Janus.debug(jsep);
          var body = {
            request: "accept"
          };
          sipcall.send({
            "message": body,
            "jsep": jsep
          });
        },
        error: function (error) {
          Janus.error("WebRTC error:", error);
          var body = {
            "request": "decline",
            "code": 480
          };
          sipcall.send({
            "message": body
          });
        }
      });
    });
  };

  let hangup = e => {
    if (incoming) {
      decline();
      return;
    }
    var hangup = {
      "request": "hangup"
    };
    sipcall.send({
      "message": hangup
    });
    sipcall.hangup();
  };

  let decline = () => {
    incoming = null;
    var body = {
      "request": "decline"
    };
    sipcall.send({
      "message": body
    });
  };

  let getCounterpartNum = () => {
    return counterpartNum;
  };

  var janusWebrtcPhone = {
    call: call,
    login: login,
    logout: logout,
    answer: answer,
    hangup: hangup,
    getCounterpartNum: getCounterpartNum
  };
}