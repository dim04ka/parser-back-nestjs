import { Injectable } from '@nestjs/common';
import { BehaviorSubject } from 'rxjs';
import { IScanElement } from './models/item.interface';

@Injectable()
export class AppService {
  parserItems$ = new BehaviorSubject<IScanElement[]>([]);
  constructor() {}
}
