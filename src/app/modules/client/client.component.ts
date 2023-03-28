import { Component, OnInit } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { AppConfigService } from '@core/services/app-config.service';

const script = require('@assets/scripts/client.mjs');

@Component({
  selector: 'app-client',
  templateUrl: './client.component.html',
  styleUrls: ['./client.component.scss'],
})
export class ClientComponent implements OnInit {
  getUsersFn = script.getConnectedUsers;
  userUUID = uuidv4();

  constructor(private appConfigService: AppConfigService) {}

  public ngOnInit(): void {
    const iceServers = this.appConfigService.appConfig.iceServers;
    const wssServer = this.appConfigService.appConfig.wssServer;

    script.setRoomUUID('roomId');
    script.setUserUUID(this.userUUID);
    script.setIceServers(iceServers);
    script.setConnection(wssServer);
  }

  public close(): void {
    script.windowClose();
  }
}
