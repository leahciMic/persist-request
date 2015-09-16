var proxyquire = require('proxyquire');

var fsMock = jasmine.createSpyObj('fsMock', [
  'createReadStream'
]);

var requestMock = jasmine.createSpy('request');

var mkdirpMock = jasmine.createSpy('mkdirpMock');

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

  it('should request file if cache does not exist', function() {
    var fakeStream = {};
    // var fakeError = new Error('ENOENT: no such file or directory, open \'\')
    fsMock.createReadStream.and.callFake(function(fileName) {
      var fakeError = new Error('ENOENT: no such file or directory, open \'' + fileName + '\'');
      fakeError.code = 'ENOENT';
      throw fakeError;
    });

    requestMock.and.returnValue(fakeStream);

    expect(persistRequest.get('http://foo.bar')).toEqual(fakeStream);
    expect(fsMock.createReadStream).toHaveBeenCalledWith('/tmp/0d6fb577802e8a8f023ab678bca108c29b3982c6');
    expect(requestMock).toHaveBeenCalledWith('http://foo.bar');
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
