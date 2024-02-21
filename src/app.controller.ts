import { Controller, Get } from '@nestjs/common';
import { FirestoreService } from './firestore/firestore.service';

@Controller()
export class AppController {
  transactionsArray = [];
  constructor(private db: FirestoreService) {}

  @Get('')
  async getHello(): Promise<any[]> {
    // const resultSync = await this.db
    //   .getFirestoreInstance()
    //   .collection('parser-sync')
    //   .doc('iT1hGDYGNvuC0FpeOKoH')
    //   .get();
    //
    // if (resultSync.exists) {
    //   this.transactionsArray = resultSync.data().date;
    // }
    return ['test'];
  }
}
