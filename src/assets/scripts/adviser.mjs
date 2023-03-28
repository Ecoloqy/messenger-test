/* eslint-env es6 */
/* eslint-disable */

import RecordRTC from '../scripts/RecordRTC.js';
import { Helper } from './helper.mjs';

const getLocalVideoContainer = () => {
  return document.querySelector('#local-video');
}

let helper = null;
let iceServers = null;
let userUUID = null;
let roomUUID = null;

let connectedUsers = [];
let localVideoStream = null;
let connection = null;

const downloadRecord = false;
const recordTimer = 10000;

let mediaRecorder = null;
let codec = null;
let recording = false;

let websocketError = false;
let webRTCError = false;

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

export const getWebsocketError = () => {
  return websocketError;
}

export const getWebRTCError = () => {
  return webRTCError;
}

export const setConnection = (address) => {
  connection = new WebSocket(address);
  helper = new Helper(connection);

  codec = helper.getSupportedMimeTypes();
  if (codec) {
    logValues('SUCCESS RTC', 'Codec found: ' + codec);
  } else {
    logValues('ERROR RTC', 'Codec not found');
  }

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
    logValues('ERROR WSS', 'Error with connection to WSS: ' + JSON.stringify(err));
    websocketError = true;
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
  console.log(status, userUUID, roomUUID, log, helper.getBrowserName(navigator.userAgent));
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

const startRecording = () => {
  if (recording) {
    stopRecording();
    return;
  }

  const remoteStreams = connectedUsers.map((user) => user.srcObject).filter((stream) => !!stream);
  const allAudioStreams = remoteStreams.concat(localVideoStream);
  logValues('SUCCESS RTC', 'Remote streams available: ' + remoteStreams.length + ', local stream: ' + (!!localVideoStream ? 'available' : 'not available'));
  if (allAudioStreams.length > 1) {
    logValues('SUCCESS RTC', 'Trying to start recording');
    mediaRecorder = new RecordRTC(allAudioStreams, {
      type: 'audio',
      mimeType: codec
    });
    mediaRecorder.startRecording();
    recording = true;
    logValues('SUCCESS RTC', 'Starting recording');
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

      if (downloadRecord) {
        helper.downloadFile(blob, roomUUID + '.webm');
      }

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
    logValues('CONNECTION TURN', 'Stream user: ' + callToUserUUID + '. Added connection to pool');
  }

  if (localVideoStream) {
    user.videoConnection = new RTCPeerConnection(configuration);
    logValues('CONNECTION TURN', 'Connection configuration read');

    user.videoConnection.addStream(localVideoStream);
    logValues('CONNECTION WSS', 'Local video streamed');

    user.videoConnection.onaddstream = (event) => {
      logValues('CONNECTION TURN', 'Stream user: ' + user.uuid + '. Video stream added');
      user.srcObject = event.stream;
    };

    user.videoConnection.onconnectionstatechange = (state) => {
      logValues('CONNECTION TURN', 'Stream user: ' + user.uuid + '. Connection state changed: ' + state.target?.connectionState);
    }

    user.videoConnection.onicecandidate = (event) => {
      if (event.candidate) {
        logValues('CONNECTION TURN', 'Stream user: ' + user.uuid + '. Ice candidate sent');
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
      logValues('ERROR RTC', 'Video cannot be obtained: ' + helper.getWebRTCErrorMessage(videoError));
      getUserStream({ audio: true, video: false }, otherUsersToCall).catch((audioError) => {
        logValues('ERROR RTC', 'Audio cannot be obtained: ' + helper.getWebRTCErrorMessage(audioError));
        webRTCError = true;
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
    logValues('SUCCESS RTC', 'Video or audio obtained');

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
