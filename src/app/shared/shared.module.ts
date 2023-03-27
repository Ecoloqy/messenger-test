import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ColsByUsersPipe } from '@shared/pipes/cols-by-users.pipe';
import { FilterBySrcObjectPipe } from '@shared/pipes/filter-by-src-object.pipe';
import { AngularSvgIconModule } from 'angular-svg-icon';

@NgModule({
  declarations: [
    ColsByUsersPipe,
    FilterBySrcObjectPipe,
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
    ColsByUsersPipe,
    FilterBySrcObjectPipe,
  ],
})
export class SharedModule {}
