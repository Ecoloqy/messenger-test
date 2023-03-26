import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ColsByUsers } from '@shared/pipes/cols-by-users';
import { FilterBySrcObjectPipe } from '@shared/pipes/filter-by-src-object.pipe';
import { SessionTimerComponent } from '@shared/components/session-timer/session-timer.component';
import { SessionDetailsComponent } from './components/session-details/session-details.component';
import { AngularSvgIconModule } from 'angular-svg-icon';

@NgModule({
  declarations: [
    SessionTimerComponent,
    ColsByUsers,
    FilterBySrcObjectPipe,
    SessionDetailsComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    AngularSvgIconModule,
  ],
  exports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    AngularSvgIconModule,
    SessionTimerComponent,
    ColsByUsers,
    FilterBySrcObjectPipe,
    SessionDetailsComponent,
  ],
})
export class SharedModule {}
