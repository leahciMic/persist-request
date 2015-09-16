'use strict';

var fs = require('fs');
var request = require('request');
var sha1 = require('node-sha1');
var path = require('path');
var debug = require('debug')('persist-request:debug');
var mkdirp = require('mkdirp');

function persistRequest(cacheDir) {
  if (!cacheDir) {
    debug('no cacheDir');
    throw new Error('please provide a cacheDir');
  }
  debug('setting cacheDir to ' + cacheDir);

  debug('creating cacheDir if needed');
  mkdirp(cacheDir);

  this.cacheDir = cacheDir;
}

persistRequest.prototype.get = function(url) {
  // check for cached copy
  var readStream;
  var cacheFileName = sha1(url);
  var fullCachePath = path.join(this.cacheDir, cacheFileName);

  try {
    debug('attempting to read from ' + fullCachePath);
    readStream = fs.createReadStream(fullCachePath);
  } catch(e) {
    if (e.code === 'ENOENT') {
      debug('cache did not exist, retrieving from ' + url);
      readStream = request(url).pipe(fs.createWriteStream(fullCachePath));
    } else {
      throw e;
    }
  }

  readStream.filename = fullCachePath;

  return readStream;
};

module.exports = function(cacheDir) {
  return new persistRequest(cacheDir);
};
