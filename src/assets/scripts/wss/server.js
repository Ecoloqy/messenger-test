/* eslint-env es6 */
/* eslint-disable */

class User {
  connection;
  uuid;

  constructor(uuid, connection) {
    this.uuid = uuid;
    this.connection = connection;
  }
}

class Room {
  uuid;
  users = [];
  admin;

  constructor(uuid) {
    this.uuid = uuid;
  }

  addUser(user) {
    if (!this.findUser(user.uuid)) {
      this.users.push(user);
      return user;
    }
    return null;
  };

  findUser(userUUID) {
    return this.users.find(user => user.uuid === userUUID);
  }

  getUsers() {
    return this.users;
  }

  addAdmin(admin) {
    this.admin = admin;
  }

  getAdmin() {
    return this.admin;
  }

  deleteUser(userUUID) {
    const roomUser = this.findUser(userUUID);
    if (!!roomUser) {
      this.users = this.users.filter((user) => user.uuid !== userUUID);
      if (roomUser.uuid === this.getAdmin()?.uuid) {
        this.admin = null;
      }
    }
  }
}

class ServerData {
  rooms = [];
  users = {};

  getUsers() {
    return this.users;
  }

  setUsers(users) {
    this.users = users;
  }

  getRooms() {
    return this.rooms;
  }

  findRoom(roomUuid) {
    return this.rooms.find((room) => room.uuid === roomUuid);
  }

  addRoom(room) {
    this.rooms = [...this.rooms, room];
  }

  removeRoom(roomUuid) {
    this.rooms = this.rooms.filter((room) => room.uuid !== roomUuid);
  }

}


let fs = require('fs');
let WebSocketServer = require('ws').Server;
let cfg = { ssl: false, port: 9090 };
let httpServ = cfg.ssl ? require('https') : require('http');

let wss = null;

const serverData = new ServerData();

// dummy request processing
const processRequest = function (req, res) {
  res.writeHead(200);
  res.end("All glory to WebSockets!\n");
};

// if ssl enabled - providing server with  SSL key/cert
if ( cfg.ssl ) {
  require('dotenv').config();
  const { constants } = require('crypto');
  const server = httpServ.createServer({
    key: fs.readFileSync( process.env.KEY ),
    cert: fs.readFileSync( process.env.CERT ),
    passphrase: process.env.KEYPASS,
    secureOptions: constants.SSL_OP_NO_TLSv1 | constants.SSL_OP_NO_TLSv1_1
  }, processRequest ).listen( cfg.port );
  wss = new WebSocketServer({ server });
} else {
  const server = httpServ.createServer( processRequest ).listen( cfg.port );
  wss = new WebSocketServer({ server });
}

// when a user connects to our sever - initial connections
wss.on('connection', (connection) => {
  // when server gets a message from a connected user
  connection.on('message', (rawData) => {

    let data;

    // accepting only JSON messages
    try {
      data = JSON.parse(rawData);
    } catch (e) {
      console.log("Invalid JSON");
      data = {};
    }

    console.log(data);

    const room = serverData.findRoom(data.roomUUID);
    let user = null;
    if (room) {
      user = room.findUser(data.userUUID);
    }

    // switching type of the user message
    switch (data.type) {

      // when a user tries to log in
      case "login": {
        if (room && user) {
          console.log("User: " + user.uuid + " already in room: " + room.uuid);
          sendTo(connection, {
            type: "login",
            success: false
          });
        } else {
          let createdRoom = !!room ? room : new Room(data.roomUUID);
          if (!room) {
            serverData.addRoom(createdRoom);
            console.log("Created room: " + createdRoom.uuid);
          }

          if (data.admin) {
            createdRoom.addAdmin(new User(data.userUUID, connection));
            console.log("Add admin: " + data.uuid);
          }
          createdRoom.addUser(new User(data.userUUID, connection));
          console.log("Add user: " + data.userUUID);
          serverData.setUsers({ ...serverData.users, [data.userUUID]: connection })
          console.log("Users: " + createdRoom.getUsers().map((user) => user.uuid));
          connection.name = data.userUUID;

          const roomUsers = createdRoom.getUsers();

          sendTo(connection, {
            type: "login",
            success: true,
            usersList: roomUsers
              .filter((user) => user.uuid !== data.userUUID)
              .map((user) => user.uuid)
          });

          roomUsers.forEach((userInRoom) => {
            if (userInRoom.uuid !== data.userUUID) {
              sendTo(userInRoom.connection, {
                type: "userConnect",
                success: true,
                userUUID: data.userUUID,
              });
            }
          });
        }
        break;
      }

      case "userDisconnect": {
        if (room) {
          room.getUsers().forEach((userInRoom) => {
            if (userInRoom.uuid !== data.userUUID) {
              sendTo(userInRoom.connection, {
                type: "userDisconnect",
                success: true,
                userUUID: data.userUUID
              });
            }
          });
          room.deleteUser(data.userUUID);
          if (!room.getUsers()?.length) {
            console.log('Removed room: ' + room.uuid);
            serverData.removeRoom(room.uuid);
          }
        }
        break;
      }

      case "leave": {
        if (room && user) {
          user.connection.otherName = null;
          sendTo(user.connection, {
            type: "leave"
          });
        }
        break;
      }

      case "offerVideo": {
        if (room && user) {
          user.connection.otherName = data.userUUID;

          const callToUser = room.findUser(data.callUserUUID);
          if (callToUser) {
            sendTo(callToUser.connection, {
              type: "offerVideo",
              offer: data.offer,
              userUUID: user.uuid,
            });
          }
        }
        break;
      }

      case "answerVideo": {
        if (room && user) {
          user.connection.otherName = data.userUUID;

          const callToUser = room.findUser(data.callUserUUID);
          if (callToUser) {
            sendTo(callToUser.connection, {
              type: "answerVideo",
              answer: data.answer,
              userUUID: user.uuid,
            });
          }
        }
        break;
      }

      case "candidateVideo": {
        if (room && user) {
          const callToUser = room.findUser(data.callUserUUID);
          if (callToUser) {
            sendTo(callToUser.connection, {
              type: "candidateVideo",
              candidate: data.candidate,
              userUUID: user.uuid,
            });
          }
        }
        break;
      }

      default: {
        sendTo(connection, {
          type: "error",
          message: "Command not found: " + data.type
        });
      }

      // case "uploadFile":
      //   if (room) {
      //     const user = room.findUser(data.name);
      //     if (user) {
      //       // console.log("JSON Data: ", data.type, " room: ", data.roomUUID, " userName: ", data.name);
      //       sendTo(user.connection, {
      //         type: "uploadFile",
      //         name: data.name,
      //         blob: data.blob
      //       });
      //     }
      //   }
      //   break;

      // case "mute":
      //   console.log("JSON Data: ", data.type, " room: ", data.roomUUID, " userName: ", data.name);
      //   room = findRoom(data.roomUUID);
      //   if (room) {
      //     //  console.log("Users: ", room.users);
      //     room.users.forEach(element => {
      //       if (element.name != data.name) {
      //         //      console.log("Send to: ", element.name);
      //         sendTo(element.connection, {
      //           type: "mute",
      //           name: data.name
      //         });
      //       }
      //     });
      //   }
      //   break;
      // case "unMute":
      //   console.log("JSON Data: ", data.type, " room: ", data.roomUUID, " userName: ", data.name);
      //   room = findRoom(data.roomUUID);
      //   if (room) {
      //     //  console.log("Users: ", room.users);
      //     room.users.forEach(element => {
      //       if (element.name != data.name) {
      //         //      console.log("Send to: ", element.name);
      //         sendTo(element.connection, {
      //           type: "unMute",
      //           name: data.name
      //         });
      //       }
      //     });
      //   }
      //   break;

      // case "offerVideo2":
      //   room = findRoom(data.roomUUID);
      //
      //   if(room != null) {
      //     var roomUser = room.findUser(data.name);
      //
      //     if(roomUser != null) {
      //       connection.otherName = data.name;
      //
      //       sendTo(roomUser.connection, {
      //         type: "offerVideo2",
      //         offer: data.offer,
      //         name: connection.name
      //       });
      //     }
      //   }
      //   break;

      // case "offerAudio":
      //   room = findRoom(data.roomUUID);
      //
      //   if(room != null) {
      //     var roomUser = room.findUser(data.name);
      //
      //     if(roomUser != null) {
      //       connection.otherName = data.name;
      //       outUsersList = [];
      //       room.users.forEach(element => {
      //         if (element.name != data.name) {
      //           outUsersList.push(element.name);
      //         }
      //       });
      //       sendTo(roomUser.connection, {
      //         type: "offerAudio",
      //         offer: data.offer,
      //         name: connection.name,
      //         usersList: outUsersList
      //       });
      //     }
      //   }
      //   break;

      // case "offerAudio2":
      //   room = findRoom(data.roomUUID);
      //
      //   if(room != null) {
      //     var roomUser = room.findUser(data.name);
      //
      //     if(roomUser != null) {
      //       connection.otherName = data.name;
      //
      //       sendTo(roomUser.connection, {
      //         type: "offerAudio2",
      //         offer: data.offer,
      //         name: connection.name
      //       });
      //     }
      //   }
      //   break;

      // case "answerVideo2":
      //   room = findRoom(data.roomUUID);
      //   if(room != null) {
      //     var roomUser = room.findUser(data.name);
      //
      //     if(roomUser != null) {
      //       connection.otherName = data.name;
      //       sendTo(roomUser.connection, {
      //         type: "answerVideo2",
      //         answer: data.answer,
      //         name: connection.name
      //       });
      //     }
      //   }
      //   break;

      // case "answerAudio":
      //   room = findRoom(data.roomUUID);
      //   if(room != null) {
      //     var roomUser = room.findUser(data.name);
      //
      //     if(roomUser != null) {
      //       connection.otherName = data.name;
      //       outUsersList = [];
      //       room.users.forEach(element => {
      //         if (element.name != data.name) {
      //           outUsersList.push(element.name);
      //         }
      //       });
      //       sendTo(roomUser.connection, {
      //         type: "answerAudio",
      //         answer: data.answer,
      //         usersList: outUsersList,
      //         name: connection.name
      //       });
      //     }
      //   }
      //   break;

      // case "answerAudio2":
      //   room = findRoom(data.roomUUID);
      //   if(room != null) {
      //     var roomUser = room.findUser(data.name);
      //
      //     if(roomUser != null) {
      //       connection.otherName = data.name;
      //       sendTo(roomUser.connection, {
      //         type: "answerAudio2",
      //         answer: data.answer,
      //         name: connection.name
      //       });
      //     }
      //   }
      //   break;

      // case "candidateVideo2":
      //   room = findRoom(data.roomUUID);
      //   if(room != null) {
      //     var roomUser = room.findUser(data.name);
      //     if(roomUser != null) {
      //       sendTo(roomUser.connection, {
      //         type: "candidateVideo2",
      //         candidate: data.candidate
      //       });
      //     }
      //   }
      //   break;

      // case "candidateAudio":
      //   room = findRoom(data.roomUUID);
      //   if(room != null) {
      //     var roomUser = room.findUser(data.name);
      //     if(roomUser != null) {
      //       outUsersList = [];
      //       room.users.forEach(element => {
      //         if (element.name != data.name) {
      //           outUsersList.push(element.name);
      //         }
      //       });
      //       sendTo(roomUser.connection, {
      //         type: "candidateAudio",
      //         candidate: data.candidate,
      //         usersList: outUsersList
      //       });
      //     }
      //   }
      //   break;

      // case "candidateAudio2":
      //   room = findRoom(data.roomUUID);
      //   if(room != null) {
      //     var roomUser = room.findUser(data.name);
      //     if(roomUser != null) {
      //       sendTo(roomUser.connection, {
      //         type: "candidateAudio2",
      //         candidate: data.candidate
      //       });
      //     }
      //   }
      //   break;
    }

  });

  //when user exits, for example closes a browser window
  //this may help if we are still in "offer","answer" or "candidate" state
  connection.on("close", function() {

    console.log("close for :", connection.name);
    /*      if(connection.name) {
             delete users[connection.name];

             if(connection.otherName) {
                console.log("Disconnecting from ", connection.otherName);
                var conn = users[connection.otherName];
                conn.otherName = null;

                if(conn != null) {
                   sendTo(conn, {
                      type: "leave"
                   });
                }
             }
          }*/

  });

  //connection.send("Hello world");
});

const sendTo = (connection, message) => {
  connection.send(JSON.stringify(message));
}
