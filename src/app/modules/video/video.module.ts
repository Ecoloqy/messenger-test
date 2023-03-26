import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { VideoRoutingModule } from './video-routing.module';
import { VideoComponent } from '@modules/video/video.component';
import { FilterBySrcObjectPipe } from './filter-by-src-object.pipe';

@NgModule({
  declarations: [VideoComponent, FilterBySrcObjectPipe],
  imports: [CommonModule, VideoRoutingModule],
})
export class VideoModule {}
