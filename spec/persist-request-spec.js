var proxyquire = require('proxyquire');

var fsMock = jasmine.createSpyObj('fsMock', [
  'createReadStream',
  'createWriteStream'
]);

var requestStreamMock = jasmine.createSpyObj('requestStreamMock', ['pipe']);
requestStreamMock.pipe.and.returnValue(requestStreamMock);

var requestMock = jasmine.createSpy('request').and.returnValue(requestStreamMock);
var mkdirpMock = jasmine.createSpy('mkdirpMock');

var fakeWriteStream;

var PersistRequest = proxyquire(
  '../index.js',
  {
    fs: fsMock,
    mkdirp: mkdirpMock,
    request: requestMock
  }
);

describe('persistRequest', function() {
  var persistRequest;

  beforeEach(function() {
    persistRequest = new PersistRequest('/tmp/');
    fakeWriteStream = function() {};
    fsMock.createWriteStream.and.returnValue(fakeWriteStream);
  });

  it('should create cache directory on startup', function() {
    expect(mkdirpMock).toHaveBeenCalledWith('/tmp/');
  });

  it('should read from file if it exists', function() {
    var fakeStream = {};
    fsMock.createReadStream.and.returnValue(fakeStream);
    expect(persistRequest.get('http://foo.bar')).toEqual(fakeStream);
    expect(fsMock.createReadStream).toHaveBeenCalledWith('/tmp/0d6fb577802e8a8f023ab678bca108c29b3982c6');
    expect(requestMock).not.toHaveBeenCalled();
  });

  describe('cache miss', function() {
    beforeEach(function() {
      // var fakeError = new Error('ENOENT: no such file or directory, open \'\')
      fsMock.createReadStream.and.callFake(function(fileName) {
        var fakeError = new Error('ENOENT: no such file or directory, open \'' + fileName + '\'');
        fakeError.code = 'ENOENT';
        throw fakeError;
      });
    });

    it('should request file if cache does not exist', function() {
      expect(persistRequest.get('http://foo.bar')).toEqual(requestStreamMock);
      expect(fsMock.createReadStream).toHaveBeenCalledWith('/tmp/0d6fb577802e8a8f023ab678bca108c29b3982c6');
      expect(requestMock).toHaveBeenCalledWith('http://foo.bar');
    });

    it('should write the file to the cache', function() {
      persistRequest.get('http://foo.bar');
      expect(fsMock.createWriteStream).toHaveBeenCalledWith('/tmp/0d6fb577802e8a8f023ab678bca108c29b3982c6');
      expect(requestStreamMock.pipe).toHaveBeenCalledWith(fakeWriteStream);
    });

    it('should set filename property on stream object', function() {
      var stream = persistRequest.get('http://foo.bar');
      expect(stream.filename).toEqual('whatever');
    });
  });

  it('should not swallow other errors', function() {
    fsMock.createReadStream.and.callFake(function(fileName) {
      var fakeError = new Error('A foobar error');
      fakeError.code = 'foobar';
      throw fakeError;
    });

    expect(function() {
      persistRequest.get('http://foo.bar');
    }).toThrowError('A foobar error');
  });
});
