import { Component, OnInit } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { AppConfigService } from '@core/services/app-config.service';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-client',
  templateUrl: './client.component.html',
  styleUrls: ['./client.component.scss'],
})
export class ClientComponent implements OnInit {
  script!: any;
  userUUID = uuidv4();

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
    this.router.navigate(['/']);
    window.close();
  }
}
