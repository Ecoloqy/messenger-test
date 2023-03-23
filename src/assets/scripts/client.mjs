/* eslint-env es6 */
/* eslint-disable */

const getLocalVideoContainer = () => {
  return document.querySelector('#local-video');
}

let iceServers = null;
let userUUID = null;
let roomUUID = null;

let connectedUsers = [];
let localVideoStream = null;
let connection = null;

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
  connection = new WebSocket(address);
  connection.onopen = () => {
    send({ type: "login" });
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
      case "userConnect": {
        handleUserConnect(data.success, data.userUUID);
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
      case "mute": {
        handleMute(true, data.name);
        break;
      }
      case "unMute": {
        handleMute(false, data.name);
        break;
      }
      case "leave": {
        handleLeave();
        break;
      }
      default:
        break;
    }
  };

  connection.onerror = (err, ev) => {
    console.log(err);
    console.log(ev);
  };
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

let videoConnection;

window.addEventListener('beforeunload', function (e) {
  send({
    type: "userDisconnect",
    roomUUID: roomUUID,
    userUUID: userUUID
  });
});

window.addEventListener('close', function (e)  {
  send({
    type: "userDisconnect",
    roomUUID: roomUUID,
    userUUID: userUUID
  });
});

const handleMute = (status, userUUID) => {
  connectedUsers.forEach((cu) => {
    if (cu.uuid !== userUUID) {
      cu.srcObject.muted = status;
    }
  })
}

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
  }

  if (localVideoStream) {
    user.videoConnection = new RTCPeerConnection(configuration);

    user.videoConnection.addStream(localVideoStream);

    user.videoConnection.onaddstream = (event) => {
      user.srcObject = event.stream;
    };

    user.videoConnection.onicecandidate = (event) => {
      send({
        type: "candidateVideo",
        userUUID: userUUID,
        callUserUUID: user.uuid,
        candidate: event.candidate,
        roomUUID: roomUUID
      })
    };
  }
}

const handleLogin = (success, otherUsersToCall) => {
  if (!success) {
    alert("Ooops...try a different username");
  } else {
    connectedUsers = otherUsersToCall.map((userUUID) => ({
      uuid: userUUID,
      videoConnection: null,
      srcObject: null
    }));

    getUserStream({ audio: true, video: { width: 320, height: 240 } }, otherUsersToCall).catch((videoError) => {
      getUserStream({ audio: true, video: false }, otherUsersToCall).catch((audioError) => {
        alert("Error when obtaining video and audio");
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

    const allConnectedUsers = connectedUsers.map((cu) => cu.uuid);
    const usersToCall = otherUsersToCall.filter((user) => allConnectedUsers.includes(user));
    usersToCall.forEach((userToCall) => {
      callTo(userToCall);
    });
  })
}

const handleUserDisconnect = (success, userUUID) => {
  connectedUsers = connectedUsers.filter((cu) => cu.uuid !== userUUID);
}

const handleUserConnect = (success, userUUID) => {
  callTo(userUUID);
}

const callTo = (callToUserUUID) => {
  createVideoPeer(callToUserUUID);

  const user = connectedUsers.find((cu) => cu.uuid === callToUserUUID);
  user.videoConnection.createOffer().then((offer) => {
    send({
      type: "offerVideo",
      offer: offer,
      callUserUUID: callToUserUUID,
      userUUID: userUUID,
      roomUUID: roomUUID
    });
    user.videoConnection.setLocalDescription(offer);
  }).catch(() => {
    alert("Error when creating an offer");
  });
}

const handleOfferVideo = (offer, callToUserUUID) => {
  createVideoPeer(callToUserUUID);

  const user = connectedUsers.find((cu) => cu.uuid === callToUserUUID);
  if (user?.videoConnection) {
    user.videoConnection.setRemoteDescription(new RTCSessionDescription(offer)).then((r) => {
      user.videoConnection.createAnswer().then((answer) => {
        send({
          type: "answerVideo",
          answer: answer,
          callUserUUID: callToUserUUID,
          userUUID: userUUID,
          roomUUID: roomUUID
        });
        user.videoConnection.setLocalDescription(answer);
      }).catch(() => {
        alert("Error when answering a video");
      });
    });
  }
};

const handleAnswerVideo = (answer, callToUserUUID) => {
  const user = connectedUsers.find((cu) => cu.uuid === callToUserUUID);
  user.videoConnection.setRemoteDescription(new RTCSessionDescription(answer));
};

const handleCandidateVideo = (candidate, userUUID) => {
  const user = connectedUsers.find((cu) => cu.uuid === userUUID);
  if (candidate && user?.videoConnection) {
    user.videoConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }
};

const handleLeave = () => {
  connectedUsers = [];
  videoConnection.close();
  videoConnection.onicecandidate = null;
  videoConnection.onaddstream = null;
}
