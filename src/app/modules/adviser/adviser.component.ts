import { Component, OnInit } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { AppConfigService } from '@core/services/app-config.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-adviser',
  templateUrl: './adviser.component.html',
  styleUrls: ['./adviser.component.scss'],
})
export class AdviserComponent implements OnInit {
  script!: any;
  userUUID = uuidv4();
  muted = false;

  constructor(
    private router: Router,
    private appConfigService: AppConfigService,
  ) {}

  getUsersFn = () => [];

  public ngOnInit(): void {
    this.script = require('@assets/scripts/client.mjs');

    this.getUsersFn = this.script.getConnectedUsers;
    const iceServers = this.appConfigService.appConfig.iceServers;
    const wssServer = this.appConfigService.appConfig.wssServer;

    this.script.setRoomUUID('roomId');
    this.script.setUserUUID(this.userUUID);
    this.script.setIceServers(iceServers);
    this.script.setConnection(wssServer);
  }

  public close(): void {
    window.close();
  }

  public mute(): void {
    this.muted = !this.muted;
    this.script.mute(!this.muted);
  }
}
