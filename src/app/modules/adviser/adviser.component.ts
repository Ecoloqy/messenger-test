import { Component, OnInit } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { AppConfigService } from '@core/services/app-config.service';

const script = require('@assets/scripts/adviser.mjs');

@Component({
  selector: 'app-adviser',
  templateUrl: './adviser.component.html',
  styleUrls: ['./adviser.component.scss'],
})
export class AdviserComponent implements OnInit {
  getUsersFn = script.getConnectedUsers;
  userUUID = uuidv4();
  muted = false;

  constructor(private appConfigService: AppConfigService) {}

  public ngOnInit(): void {
    const iceServers = this.appConfigService.appConfig.iceServers;

    script.setRoomUUID('roomId');
    script.setUserUUID(this.userUUID);
    script.setIceServers(iceServers);
    script.setConnection('ws://51.77.58.218:8090');
  }

  public close(): void {
    window.close();
  }

  public mute(): void {
    this.muted = !this.muted;
    script.mute(!this.muted);
  }
}
