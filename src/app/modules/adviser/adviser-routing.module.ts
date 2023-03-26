import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdviserComponent } from '@modules/adviser/adviser.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', component: AdviserComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdviserRoutingModule {}
