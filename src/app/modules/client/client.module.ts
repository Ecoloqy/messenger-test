import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientComponent } from './client.component';
import { ClientRoutingModule } from '@modules/client/client-routing.module';
import { SharedModule } from '@shared/shared.module';

@NgModule({
  declarations: [ClientComponent],
  imports: [CommonModule, SharedModule, ClientRoutingModule],
})
export class ClientModule {}
