import { GlobalWithFetchMock } from 'jest-fetch-mock';
import { HttpErrorResponse, HttpRequestOptions, NamedValues } from 'ts-rest-client';

import { FetchHttpService } from '.';

const customGlobal: GlobalWithFetchMock = global as GlobalWithFetchMock;
// tslint:disable-next-line:no-var-requires
customGlobal.fetch = require('jest-fetch-mock');
customGlobal.fetchMock = customGlobal.fetch;

describe('FetchHttpService', () => {
  const service = new FetchHttpService();

  beforeEach(() => {
    customGlobal.fetch.resetMocks();
  });

  it('Gets data using fetch', done => {
    const body = JSON.stringify({ data: '12345' });
    customGlobal.fetch.mockResponseOnce(
      body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.length.toString() } },
    );

    service.request(new HttpRequestOptions('http://example.api.com/get', 'GET')).subscribe(data => {
      expect(data).toEqual({ data: '12345' });
      expect(customGlobal.fetch.mock.calls.length).toEqual(1);
      expect(customGlobal.fetch.mock.calls[0][0]).toEqual('http://example.api.com/get');
      done();
    });
  });

  it('Handles query string correctly', done => {
    const body = JSON.stringify({ data: '12345' });
    customGlobal.fetch.mockResponseOnce(body, { headers: { 'Content-Type': 'application/json', 'Content-Length': body.length.toString() } });

    service.request(
      new HttpRequestOptions(
        'http://example.api.com/get?myValue=1', 'GET', null, null, new NamedValues({ 'Test': '12345', 'My-Addition': '1 + 6 = 7' }),
      ),
    ).subscribe(data => {
      expect(data).toEqual({ data: '12345' });
      expect(customGlobal.fetch.mock.calls.length).toEqual(1);
      expect(customGlobal.fetch.mock.calls[0][0]).toEqual('http://example.api.com/get?myValue=1&Test=12345&My-Addition=1%20+%206%20=%207');
      done();
    });
  });

  it('Headers are sent correctly', done => {
    const body = JSON.stringify({ data: '12345' });
    customGlobal.fetch.mockResponseOnce(body, { headers: { 'Content-Type': 'application/json', 'Content-Length': body.length.toString() } });
    service.request(
      new HttpRequestOptions(
        'http://example.api.com/get?myValue=1', 'GET', null, new NamedValues({ 'Test': '12345', 'My-Addition': '1 + 6 = 7' }),
      ),
    ).subscribe(data => {
      expect(data).toEqual({ data: '12345' });
      expect(customGlobal.fetch.mock.calls.length).toEqual(1);

      const initObject = customGlobal.fetch.mock.calls[0][1];

      expect(initObject.headers.get('Test')).toBe('12345');
      expect(initObject.headers.get('My-Addition')).toBe('1 + 6 = 7');
      done();
    });
  });

  it('Handles text response body', done => {
    const body = 'You are doomed';
    customGlobal.fetch.mockResponseOnce(body, { headers: { 'Content-Type': 'text/plain', 'Content-Length': body.length.toString() } });
    service.request(
      new HttpRequestOptions('http://example.api.com/get', 'GET'),
    ).subscribe(data => {
      expect(data).toEqual('You are doomed');
      expect(customGlobal.fetch.mock.calls.length).toEqual(1);
      done();
    });
  });

  it('Handles error response', done => {
    const body = JSON.stringify({ message: 'You are doomed' });
    const headers = { 'content-type': 'application/json', 'custom': 'Test', 'Content-Length': body.length.toString() };
    customGlobal.fetch.mockResponseOnce(
      body, { headers, status: 400, statusText: 'Shit happens' },
    );
    service.request(
      new HttpRequestOptions('http://example.api.com/get', 'GET'),
    ).subscribe(
      () => { throw new Error('The observable should have thrown'); },
      err => {
        expect(err instanceof HttpErrorResponse).toBeTruthy();
        expect(err.status).toBe(400);
        expect(err.statusText).toBe('Shit happens');
        expect(err.headers).toEqual({ 'content-type': 'application/json', 'custom': 'Test', 'content-length': body.length.toString() });
        expect(err.error).toEqual({ message: 'You are doomed' });
        done();
      },
    );
  });

  it('Handles client-side error', done => {
    customGlobal.fetch.mockReject(() => Promise.reject(new ProgressEvent('error', { loaded: 0, lengthComputable: false, total: 0 })));
    service.request(
      new HttpRequestOptions('http://example.api.com/get', 'GET'),
    ).subscribe(
      () => { throw new Error('The observable should have thrown'); },
      err => {
        expect(err instanceof HttpErrorResponse).toBeTruthy();
        expect(err.status).toBe(0);
        expect(err.error instanceof ProgressEvent).toBeTruthy();
        done();
      },
    );
  });

  it('Handles client-side error with non Event type', done => {
    customGlobal.fetch.mockReject(new TypeError('Wrong header buddy'));
    service.request(
      new HttpRequestOptions('http://example.api.com/get', 'GET'),
    ).subscribe(
      () => { throw new Error('The observable should have thrown'); },
      err => {
        expect(err instanceof HttpErrorResponse).toBeTruthy();
        expect(err.status).toBe(0);
        expect(err.error instanceof ErrorEvent).toBeTruthy();
        expect((err.error as ErrorEvent).error instanceof TypeError).toBeTruthy();
        done();
      },
    );
  });
});
