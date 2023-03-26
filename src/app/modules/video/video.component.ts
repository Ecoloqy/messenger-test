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
    const iceServers = this.appConfigService.appConfig.iceServers;

    script.setRoomUUID('roomId');
    script.setUserUUID(this.userUUID);
    script.setIceServers(iceServers);
    script.setConnection('ws://51.77.58.218:8090');
  }
}
