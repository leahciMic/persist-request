'use strict';

var fs = require('fs');
var request = require('request');
var sha1 = require('node-sha1');
var path = require('path');
var debug = require('debug')('persist-request:debug');
var mkdirp = require('mkdirp');
var defer = require('lodash.defer');

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
  var fullCachePath = path.join(this.cacheDir, cacheFileName) + path.extname(url);

  debug('attempting to read from ' + fullCachePath);

  if (fs.existsSync(fullCachePath)) {
    readStream = fs.createReadStream(fullCachePath);
    defer(function() {
      readStream.emit('cacheExists', fullCachePath);
    });
  } else {
    debug('cache did not exist, retrieving from ' + url);
    var cacheStream = fs.createWriteStream(fullCachePath);
    readStream = request(url).pipe(cacheStream);
    readStream.fromCache = false;

    cacheStream.on('finish', function() {
      debug('emit cacheFile');
      readStream.emit('cacheExists', fullCachePath);
    });
  }

  readStream.filename = fullCachePath;

  return readStream;
};

module.exports = function(cacheDir) {
  return new persistRequest(cacheDir);
};
