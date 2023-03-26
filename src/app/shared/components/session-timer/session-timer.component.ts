import { Component, Input } from '@angular/core';
import { interval } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-session-timer',
  templateUrl: './session-timer.component.html',
  styleUrls: ['./session-timer.component.scss'],
})
export class SessionTimerComponent {
  @Input() date?: string;

  sessionLeft = interval(1000).pipe(
    map(() => {
      const t1 = new Date(this.date ?? Date.now());
      t1.setSeconds(t1.getSeconds() - 5);
      const t2 = new Date(Date.now());
      const dif = t2.getTime() - t1.getTime();

      const secondsFromT1ToT2 = dif / 1000;
      const secondsBetweenDates = Math.abs(secondsFromT1ToT2);

      if (secondsBetweenDates > 60 * 60) {
        return new Date(secondsBetweenDates * 1000).toISOString().substr(11, 8);
      } else {
        return new Date(secondsBetweenDates * 1000).toISOString().substr(14, 5);
      }
    }),
  );
}
