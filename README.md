# persist-request [![Build Status](https://travis-ci.org/leahciMic/persist-request.svg?branch=master)](https://travis-ci.org/leahciMic/persist-request)

`persist-request` will download a file and cache it in a user specified cache
directory. Subsequent requests to the same file will be returned a stream from
the cache rather than from the original source.

## Install

```sh
npm install --save persist-request
```

## Usage

```js
var persistRequest = require('persist-request')('/tmp/');

var stream = persistRequest.get('http://example.com/example.tar.gz');

stream.pipe(/* to whatever */);
```
