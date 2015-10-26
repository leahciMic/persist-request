'use strict';

var fs = require('fs');
var request = require('request');
var sha1 = require('node-sha1');
var path = require('path');
var debug = require('debug')('persist-request:debug');
var mkdirp = require('mkdirp');
var defer = require('lodash.defer');
var pkg = require('./package.json');
var temp = require('temp');

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

  // there was a bug early on where if the process crashed before we quit, we
  // would return a cache file that was half written next time someone asked
  // for the same url
  var cacheFileName = sha1(pkg.version + ':' + url);
  var fullCachePath = path.join(this.cacheDir, cacheFileName) + path.extname(url);
  var tmpStream = temp.createWriteStream();

  debug('attempting to read from ' + fullCachePath);

  if (fs.existsSync(fullCachePath)) {
    debug('cache exists');
    readStream = fs.createReadStream(fullCachePath);
    defer(function() {
      debug('emit cacheFile');
      readStream.emit('cacheFile', fullCachePath);
    });
  } else {
    debug('cache did not exist, retrieving from ' + url);
    var requestStream = request(url);

    readStream = requestStream.pipe(tmpStream);
    readStream.fromCache = false;

    tmpStream.on('finish', function() {
      debug('rename', tmpStream.path, 'to', fullCachePath);
      fs.renameSync(tmpStream.path, fullCachePath);
      debug('emit cacheFile');
      readStream.emit('cacheFile', fullCachePath);
    });
  }

  readStream.filename = fullCachePath;

  return readStream;
};

module.exports = function(cacheDir) {
  return new persistRequest(cacheDir);
};
