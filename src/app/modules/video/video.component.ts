import { Component, OnInit } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { AppConfigService } from '@core/services/app-config.service';

const script = require('@assets/scripts/client.mjs');

@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.scss'],
})
export class VideoComponent implements OnInit {
  getUsersFn = script.getConnectedUsers;
  userUUID = uuidv4();

  constructor(private appConfigService: AppConfigService) {}

  ngOnInit(): void {
    script.setRoomUUID('roomId');
    script.setUserUUID(this.userUUID);
    script.setIceServers([
      {
        urls: 'stun:relay.metered.ca:80',
      },
      {
        urls: 'turn:relay.metered.ca:80',
        username: 'df36a504987e1cfd985e6a30',
        credential: '0ga+k5C5f7DLK/ED',
      },
      {
        urls: 'turn:relay.metered.ca:443',
        username: 'df36a504987e1cfd985e6a30',
        credential: '0ga+k5C5f7DLK/ED',
      },
      {
        urls: 'turn:relay.metered.ca:443?transport=tcp',
        username: 'df36a504987e1cfd985e6a30',
        credential: '0ga+k5C5f7DLK/ED',
      },
    ]);
    script.setConnection('ws://51.77.58.218:8090');
    // script.setConnection('ws://127.0.0.1:9090');
  }
}
