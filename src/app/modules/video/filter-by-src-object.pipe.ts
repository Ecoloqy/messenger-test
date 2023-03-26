import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterBySrcObject',
  pure: false,
})
export class FilterBySrcObjectPipe implements PipeTransform {
  transform(
    users: { uuid: string; srcObject?: MediaSource }[],
  ): { uuid: string; srcObject?: MediaSource }[] {
    return users.filter((user) => !!user.srcObject);
  }
}
