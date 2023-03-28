import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

export interface AppConfig {
  wssServer: string;
  iceServers: {
    urls: string;
    username?: string;
    credential?: string;
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class AppConfigService {
  appConfig!: AppConfig;
  loadedSubject = new BehaviorSubject(false);
  loaded$ = this.loadedSubject.asObservable();

  constructor(private http: HttpClient) {}

  load(): Observable<void> {
    return this.http.get<AppConfig>('assets/config.json').pipe(
      map((appConfig) => {
        this.appConfig = appConfig;
      }),
      tap(() => this.loadedSubject.next(true)),
      catchError((err) => {
        this.appConfig = {
          wssServer: '',
          iceServers: [],
        };
        console.error('Could not load configuration', { err });
        return throwError(err);
      }),
    );
  }
}
