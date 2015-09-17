var proxyquire = require('proxyquire');
var FIXTURE_SHA1 = 'foobarsha1';

var sha1Mock = jasmine.createSpy('sha1Mock')
  .and.returnValue('foobarsha1');

var fsMock = jasmine.createSpyObj('fsMock', [
  'createReadStream',
  'createWriteStream',
  'existsSync'
]);

var requestStreamMock = jasmine.createSpyObj('requestStreamMock', ['pipe', 'on']);
requestStreamMock.pipe.and.returnValue(requestStreamMock);
var writeStreamMock = jasmine.createSpyObj('writeStreamMock', ['pipe', 'on']);


var requestMock = jasmine.createSpy('request').and.returnValue(requestStreamMock);
var mkdirpMock = jasmine.createSpy('mkdirpMock');

var fakeWriteStream;

var PersistRequest = proxyquire(
  '../index.js',
  {
    fs: fsMock,
    mkdirp: mkdirpMock,
    request: requestMock,
    'node-sha1': sha1Mock
  }
);

describe('persistRequest', function() {
  var persistRequest;

  beforeEach(function() {
    persistRequest = new PersistRequest('/tmp/');
    fsMock.createWriteStream.and.returnValue(writeStreamMock);
  });

  it('should create cache directory on startup', function() {
    expect(mkdirpMock).toHaveBeenCalledWith('/tmp/');
  });

  it('should read from file if it exists', function() {
    var fakeStream = {};
    fsMock.createReadStream.and.returnValue(fakeStream);
    fsMock.existsSync.and.returnValue(true);
    expect(persistRequest.get('http://foo.bar/test.txt')).toEqual(fakeStream);
    expect(fsMock.createReadStream).toHaveBeenCalledWith('/tmp/' + FIXTURE_SHA1 + '.txt');
    expect(requestMock).not.toHaveBeenCalled();
  });

  describe('cache miss', function() {
    beforeEach(function() {
      fsMock.existsSync.and.returnValue(false);
      fsMock.createReadStream.and.callFake(function(fileName) {
        return requestStreamMock;
      });
    });

    it('should request file if cache does not exist', function() {
      expect(persistRequest.get('http://foo.bar/file.txt')).toEqual(requestStreamMock);
      expect(fsMock.existsSync).toHaveBeenCalledWith('/tmp/' + FIXTURE_SHA1 + '.txt');
      expect(requestMock).toHaveBeenCalledWith('http://foo.bar/file.txt');
    });

    it('should write the file to the cache', function() {
      persistRequest.get('http://foo.bar/file.txt');
      expect(fsMock.createWriteStream).toHaveBeenCalledWith('/tmp/' + FIXTURE_SHA1 + '.txt');
      expect(requestStreamMock.pipe).toHaveBeenCalledWith(writeStreamMock);
    });

    it('should set filename property on stream object', function() {
      var stream = persistRequest.get('http://foo.bar/file.js');
      expect(stream.filename).toEqual('/tmp/foobarsha1.js');
    });

    it('should respect the filename extension from the url', function() {
      var stream = persistRequest.get('http://foo.bar/somesortoffile.txt');
      expect(stream.filename).toEqual('/tmp/foobarsha1.txt');
    });
  });
});
