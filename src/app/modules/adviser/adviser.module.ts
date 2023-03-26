import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdviserComponent } from './adviser.component';
import { SharedModule } from '@shared/shared.module';
import { AdviserRoutingModule } from '@modules/adviser/adviser-routing.module';

@NgModule({
  declarations: [AdviserComponent],
  imports: [CommonModule, SharedModule, AdviserRoutingModule],
})
export class AdviserModule {}
