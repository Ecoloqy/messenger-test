import { APP_INITIALIZER, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResponseErrorInterceptor } from '@core/interceptors/response-error.interceptor';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from '@core/services/app-config.service';

const coreInitializer =
  (configService: AppConfigService): (() => Observable<void>) =>
  (): Observable<void> =>
    configService.load();

@NgModule({
  declarations: [],
  imports: [CommonModule],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ResponseErrorInterceptor,
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [AppConfigService],
      useFactory: coreInitializer,
    },
  ],
})
export class CoreModule {}
