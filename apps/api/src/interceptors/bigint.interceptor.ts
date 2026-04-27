import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interceptor that converts BigInt values to strings in JSON responses.
 * This fixes the "Do not know how to serialize a BigInt" error.
 */
@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.convertBigInts(data)));
  }

  private convertBigInts(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'bigint') {
      return data.toString();
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.convertBigInts(item));
    }

    if (typeof data === 'object') {
      const result: any = {};
      for (const key of Object.keys(data)) {
        result[key] = this.convertBigInts(data[key]);
      }
      return result;
    }

    return data;
  }
}
