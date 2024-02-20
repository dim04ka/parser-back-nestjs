import { Injectable } from '@nestjs/common';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class AppService {
  parserItems$ = new BehaviorSubject([]);
  constructor() {}
}
