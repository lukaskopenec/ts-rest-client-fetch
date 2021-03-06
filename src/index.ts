import { Observable, Observer } from 'rxjs';
import {
  HttpErrorResponse,
  HttpRequestInterceptor,
  HttpRequestOptions,
  HttpService,
  StringMap,
} from 'ts-rest-client';

export class FetchHttpService implements HttpService {
  constructor(requestInit?: RequestInit) {
    this.requestInit = requestInit || {};
  }

  private requestInit: RequestInit;
  private requestInterceptor: HttpRequestInterceptor;

  request(options: HttpRequestOptions): Observable<any> {
    if (this.requestInterceptor) {
      options = this.requestInterceptor(options);
    }

    return Observable.create(async (observer: Observer<any>) => {
      const requestUrl = options.getUrl();

      try {
        const response = await fetch(requestUrl, {
          ...this.requestInit,
          body: options.getSerializedBody(),
          headers: new Headers(options.headers.values),
          method: options.method,
        });

        if (!response.ok) {
          const error = await this.getResponseBody(response);
          const headers = {} as StringMap;
          if (response.headers) {
            response.headers.forEach((value, key) => headers[key] = value);
          }
          observer.error(new HttpErrorResponse({
            error,
            headers,
            status: response.status,
            statusText: response.statusText,
            url: response.url,
          }));
          return;
        }

        observer.next(await this.getResponseBody(response));
        observer.complete();
      } catch (err) {
        let error: Event = null;

        if (err instanceof Event) {
          error = err;
        } else {
          error = new ErrorEvent('error', { error: err });
        }

        observer.error(new HttpErrorResponse({ error, url: requestUrl }));
      }
    });
  }

  setRequestInterceptor(interceptor?: HttpRequestInterceptor) {
    this.requestInterceptor = interceptor;
  }

  getResponseBody(response: Response): Promise<any> {
    const contentType = response.headers.get('Content-Type');

    if (response.status === 204) {
      return null;
    }

    if (contentType.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }
}
