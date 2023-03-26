/* eslint-env es6 */
/* eslint-disable */

import RecordRTC from '../scripts/RecordRTC.js';

const getLocalVideoContainer = () => {
  return document.querySelector('#local-video');
}

let iceServers = null;
let userUUID = null;
let roomUUID = null;

let connectedUsers = [];
let localVideoStream = null;
let connection = null;

const recordTimer = 5000;
let mediaRecorder = null;
let codec = null;
let recording = false;

export const setIceServers = (value) => {
  iceServers = value;
}

export const setUserUUID = (value) => {
  userUUID = value;
}

export const setRoomUUID = (value) => {
  roomUUID = value;
}

export const getConnectedUsers = () => {
  return connectedUsers;
}

export const setConnection = (address) => {
  codec = getSupportedMimeTypes();
  connection = new WebSocket(address);
  startRecording();

  connection.onopen = () => {
    send({ type: "login" });
    logValues('SUCCESS WSS', 'Connected to WSS');
  };

  connection.onmessage = (message) => {
    const data = JSON.parse(message.data);

    switch(data.type) {
      case "login": {
        handleLogin(data.success, data.usersList);
        break;
      }
      case "userDisconnect": {
        handleUserDisconnect(data.success, data.userUUID);
        break;
      }
      case "offerVideo": {
        handleOfferVideo(data.offer, data.userUUID);
        break;
      }
      case "answerVideo": {
        handleAnswerVideo(data.answer, data.userUUID);
        break;
      }
      case "candidateVideo": {
        handleCandidateVideo(data.candidate, data.userUUID);
        break;
      }
      default:
        break;
    }
  };

  connection.onerror = (err) => {
    logValues('ERROR WSS', 'Error with connection to WSS: ' + err);
  };
}

export const mute = (status) => {
  send({
    type: "mute",
    status,
    roomUUID: roomUUID,
    userUUID: userUUID
  });
}

const logValues = (status, log) => {
  console.log(status, userUUID, roomUUID, log, getBrowserName(navigator.userAgent));
}

const send = (message) => {
  if (!message.roomUUID) {
    message.roomUUID = roomUUID;
  }

  if (!message.userUUID) {
   message.userUUID = userUUID;
  }

  connection.send(JSON.stringify(message));
};

const getSupportedMimeTypes = () => {
  const possibleTypes = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=vp9,opus',
    'video/mp4;codecs=h264,aac',
  ];
  const codecs = possibleTypes.filter(mimeType => {
    return MediaRecorder.isTypeSupported(mimeType);
  });

  if (codecs.length > 0) {
    logValues('SUCCESS WebRTC', 'Codec found: ' + codecs[0]);
    return codecs[0];
  }

  logValues('ERROR WebRTC', 'No codecs found');
  return null;
}

const startRecording = () => {
  if (recording) {
    stopRecording();
    return;
  }

  const remoteStreams = connectedUsers.map((user) => user.srcObject).filter((stream) => !!stream);
  const allAudioStreams = remoteStreams.concat(localVideoStream);
  logValues('SUCCESS WebRTC', 'Remote streams available: ' + remoteStreams.length + ', local stream: ' + (!!localVideoStream ? 'available' : 'not available'));
  if (allAudioStreams.length > 1) {
    logValues('SUCCESS WebRTC', 'Trying to start recording');
    mediaRecorder = new RecordRTC(allAudioStreams, {
      type: 'audio',
      mimeType: codec
    });
    mediaRecorder.startRecording();
    recording = true;
    logValues('SUCCESS WebRTC', 'Starting recording');
    setTimeout(startRecording, recordTimer);
  } else {
    setTimeout(startRecording, 1000);
  }
}

const stopRecording = () => {
  if (mediaRecorder !== null) {
    mediaRecorder.stopRecording(() => {
      recording = false;
      const blob = mediaRecorder.getBlob();
      const blobFile = new File([blob], (roomUUID + '.webm'), {
        type: 'application/octet-stream',
      });
      console.log(blobFile);

      const downloadAncher = document.createElement("a");
      downloadAncher.style.display = "none";

      downloadAncher.href = URL.createObjectURL(blobFile);
      downloadAncher.download = roomUUID + '.webm';
      downloadAncher.click();

      startRecording();
    });
  }
}

window.addEventListener('beforeunload', () => {
  connectedUsers = [];
  send({
    type: "userDisconnect",
    roomUUID: roomUUID,
    userUUID: userUUID
  });
  logValues('SUCCESS WSS', 'Disconnected from WSS');
});

window.addEventListener('close', () =>  {
  connectedUsers = [];
  send({
    type: "userDisconnect",
    roomUUID: roomUUID,
    userUUID: userUUID
  });
  logValues('SUCCESS WSS', 'Disconnected from WSS');
});

const createVideoPeer = (callToUserUUID) => {
  const configuration = { "iceServers": iceServers };

  let user = connectedUsers.find((cu) => cu.uuid === callToUserUUID);
  if (!user) {
    user = {
      uuid: callToUserUUID,
      videoConnection: null,
      srcObject: null,
    };
    connectedUsers.push(user);
    logValues('CONNECTION WSS', 'Stream user: ' + callToUserUUID + '. Added connection to pool');
  }

  if (localVideoStream) {
    user.videoConnection = new RTCPeerConnection(configuration);
    logValues('SUCCESS WSS', 'Connection configuration read');

    user.videoConnection.addStream(localVideoStream);
    logValues('CONNECTION WSS', 'Local video streamed');

    user.videoConnection.onaddstream = (event) => {
      logValues('CONNECTION WSS', 'Stream user: ' + user.uuid + '. Video stream added');
      user.srcObject = event.stream;
    };

    user.videoConnection.onconnectionstatechange = (state) => {
      logValues('CONNECTION WSS', 'Stream user: ' + user.uuid + '. Connection state changed: ' + state.target?.connectionState);
    }

    user.videoConnection.onicecandidate = (event) => {
      if (event.candidate) {
        logValues('CONNECTION WSS', 'Stream user: ' + user.uuid + '. Ice candidate sent');
        send({
          type: "candidateVideo",
          userUUID: userUUID,
          callUserUUID: user.uuid,
          candidate: event.candidate,
          roomUUID: roomUUID
        });
      }
    };
  }
}

const handleLogin = (success, otherUsersToCall) => {
  if (!success) {
    logValues('ERROR WSS', 'User already connected');
    alert("Ooops...try a different username");
  } else {
    connectedUsers = otherUsersToCall.map((userUUID) => ({
      uuid: userUUID,
      videoConnection: null,
      srcObject: null
    }));

    getUserStream({ audio: true, video: { width: 320, height: 240 } }, otherUsersToCall).catch((videoError) => {
      logValues('ERROR WebRTC', 'Video cannot be obtained: ' + getWebRTCError(videoError));
      getUserStream({ audio: true, video: false }, otherUsersToCall).catch((audioError) => {
        logValues('ERROR WebRTC', 'Audio cannot be obtained: ' + getWebRTCError(audioError));
      })
    });
  }
}

const getUserStream = (params, otherUsersToCall) => {
  return navigator.mediaDevices.getUserMedia(params).then((stream) => {
    const localVideo = getLocalVideoContainer();
    localVideo.srcObject = stream;
    localVideo.muted = true;
    localVideoStream = stream;
    logValues('SUCCESS WebRTC', 'Video or audio obtained');

    const allConnectedUsers = connectedUsers.map((cu) => cu.uuid);
    const usersToCall = otherUsersToCall.filter((user) => allConnectedUsers.includes(user));
    usersToCall.forEach((callToUserUUID) => {
      setTimeout(() => {
        callTo(callToUserUUID);
      }, 1000);
    });
  })
}

const handleUserDisconnect = (success, callToUserUUID) => {
  connectedUsers = connectedUsers.filter((cu) => cu.uuid !== callToUserUUID);
}

const callTo = (callToUserUUID) => {
  createVideoPeer(callToUserUUID);

  const user = connectedUsers.find((cu) => cu.uuid === callToUserUUID);
  if (!!user?.videoConnection) {
    user.videoConnection.createOffer({ iceRestart: true }).then((offer) => {
      user.videoConnection.setLocalDescription(offer).then(() => {
        logValues('SUCCESS WSS', 'Stream user: ' + user.uuid + '. Sending offer');
        send({
          type: "offerVideo",
          offer: offer,
          callUserUUID: callToUserUUID,
          userUUID: userUUID,
          roomUUID: roomUUID
        });
      })
    }).catch(() => {
      logValues('ERROR WSS', 'Stream user: ' + user.uuid + ' . Error when creating an offer');
    });
  }
}

const handleOfferVideo = (offer, callToUserUUID) => {
  createVideoPeer(callToUserUUID);

  const user = connectedUsers.find((cu) => cu.uuid === callToUserUUID);
  if (!!user?.videoConnection) {
    logValues('SUCCESS WSS', 'Stream user: ' + user.uuid + '. Obtained offer');
    user.videoConnection.setRemoteDescription(new RTCSessionDescription(offer)).then(() => {
      user.videoConnection.createAnswer().then((answer) => {
        user.videoConnection.setLocalDescription(answer).then(() => {
          logValues('SUCCESS WSS', 'Stream user: ' + user.uuid + '. Sending answer');
          send({
            type: "answerVideo",
            answer: answer,
            callUserUUID: callToUserUUID,
            userUUID: userUUID,
            roomUUID: roomUUID
          });
        })
      }).catch(() => {
        logValues('ERROR WSS', 'Stream user: ' + user.uuid + ' . Error when creating a answer');
      });
    }).catch(() => {
      logValues('ERROR WSS', 'Stream user: ' + user.uuid + ' . Error when obtaining an offer');
    });
  }
};

const handleAnswerVideo = (answer, callToUserUUID) => {
  const user = connectedUsers.find((cu) => cu.uuid === callToUserUUID);
  user.videoConnection.setRemoteDescription(new RTCSessionDescription(answer)).then(() => {
    logValues('SUCCESS WSS', 'Stream user: ' + user.uuid + '. Obtained answer');
  }).catch(() => {
    logValues('ERROR WSS', 'Stream user: ' + user.uuid + ' . Error when obtaining a answer');
  })
};

const handleCandidateVideo = (candidate, callToUserUUID) => {
  const user = connectedUsers.find((cu) => cu.uuid === callToUserUUID);
  if (user?.videoConnection) {
    user.videoConnection.addIceCandidate(new RTCIceCandidate(candidate)).then(() => {
      logValues('SUCCESS WSS', 'Stream user: ' + user.uuid + '. Obtained candidate');
    }).catch(() => {
      logValues('ERROR WSS', 'Stream user: ' + user.uuid + ' . Error when obtaining a candidate');
    });
  }
};

const getBrowserName = (userAgent) => {
  // The order matters here, and this may report false positives for unlisted browsers.

  if (userAgent.includes('Firefox')) {
    // "Mozilla/5.0 (X11; Linux i686; rv:104.0) Gecko/20100101 Firefox/104.0"
    return 'Mozilla Firefox';
  } else if (userAgent.includes('SamsungBrowser')) {
    // "Mozilla/5.0 (Linux; Android 9; SAMSUNG SM-G955F Build/PPR1.180610.011) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/9.4 Chrome/67.0.3396.87 Mobile Safari/537.36"
    return 'Samsung Internet';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    // "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36 OPR/90.0.4480.54"
    return 'Opera';
  } else if (userAgent.includes('Trident')) {
    // "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729)"
    return 'Microsoft Internet Explorer';
  } else if (userAgent.includes('Edge')) {
    // "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/16.16299"
    return 'Microsoft Edge (Legacy)';
  } else if (userAgent.includes('Edg')) {
    // "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36 Edg/104.0.1293.70"
    return 'Microsoft Edge (Chromium)';
  } else if (userAgent.includes('Chrome')) {
    // "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36"
    return 'Google Chrome or Chromium';
  } else if (userAgent.includes('Safari')) {
    // "Mozilla/5.0 (iPhone; CPU iPhone OS 15_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1"
    return 'Apple Safari';
  } else {
    return 'unknown';
  }
}

const getWebRTCError = (error) => {
  let message = 'Cannot obtain UserMedia device video. Another error occurred';

  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    message = 'Cannot obtain UserMedia device video. Required track is missing';
  } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    message = 'Cannot obtain UserMedia device video. Webcam or mic are already in use';
  } else if (error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError") {
    message = 'Cannot obtain UserMedia device video. Constraints can not be satisfied by available devices';
  } else if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
    message = 'Cannot obtain UserMedia device video. Permission Denied';
  } else if (error.name === "TypeError" || error.name === "TypeError") {
    message = 'Cannot obtain UserMedia device video. Both audio and video are FALSE';
  }

  return message + ': ' + JSON.stringify(error.name) + ' - ' + JSON.stringify(error.message);
}
