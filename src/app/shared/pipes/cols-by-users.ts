import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'colsByUsers',
  pure: false,
})
export class ColsByUsers implements PipeTransform {
  transform(users: { uuid: string; srcObject?: MediaSource }[]): number {
    switch (users.length) {
      case 2:
      case 3:
      case 4: {
        return 2;
      }
      case 5:
      case 6: {
        return 3;
      }
      default: {
        return 1;
      }
    }
  }
}
