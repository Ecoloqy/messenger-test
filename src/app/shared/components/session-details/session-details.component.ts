import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-session-details',
  templateUrl: './session-details.component.html',
  styleUrls: ['./session-details.component.css'],
})
export class SessionDetailsComponent {
  @Input() sessionDetails?: string;
}
