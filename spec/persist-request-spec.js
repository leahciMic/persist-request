var proxyquire = require('proxyquire');
var FIXTURE_SHA1 = 'foobarsha1';
var memoryStream = require('memorystream');
var tempStreamMock;
var requestStreamMock;

var sha1Mock = jasmine.createSpy('sha1Mock')
  .and.returnValue('foobarsha1');

var fsMock = jasmine.createSpyObj('fsMock', [
  'createReadStream',
  'createWriteStream',
  'existsSync',
  'renameSync'
]);

var createFakeRequestStream = function() {
  requestStreamMock = new memoryStream.createReadStream(['This is test data']);
  spyOn(requestStreamMock, 'pipe').and.callThrough();
  return requestStreamMock;
};

var createFakeTempStream = function() {
  tempStreamMock = new memoryStream.createWriteStream();
  tempStreamMock.path = 'foobar';
  return tempStreamMock;
};

var writeStreamMock = jasmine.createSpyObj('writeStreamMock', ['pipe', 'on', '_write', 'write', 'emit']);

var requestMock = jasmine.createSpy('request').and.callFake(createFakeRequestStream);
var mkdirpMock = jasmine.createSpy('mkdirpMock');

var tempMock = jasmine.createSpyObj('tempMock', ['createWriteStream']);

tempMock.createWriteStream.and.callFake(createFakeTempStream);

var fakeWriteStream;

var PersistRequest = proxyquire(
  '../index.js',
  {
    fs: fsMock,
    mkdirp: mkdirpMock,
    request: requestMock,
    temp: tempMock,
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
    var fakeStream = new memoryStream(['foo', 'bar'], {writable: false});
    fsMock.createReadStream.and.returnValue(fakeStream);
    fsMock.existsSync.and.returnValue(true);
    expect(persistRequest.get('http://foo.bar/test.txt')).toEqual(fakeStream);
    expect(fsMock.createReadStream).toHaveBeenCalledWith('/tmp/' + FIXTURE_SHA1 + '.txt');
    expect(requestMock).not.toHaveBeenCalled();
  });

  describe('cache miss', function() {
    beforeEach(function() {
      fsMock.existsSync.and.returnValue(false);
    });

    it('should request file if cache does not exist', function() {
      expect(persistRequest.get('http://foo.bar/file.txt')).toBe(tempStreamMock);
      expect(fsMock.existsSync).toHaveBeenCalledWith('/tmp/' + FIXTURE_SHA1 + '.txt');
      expect(requestMock).toHaveBeenCalledWith('http://foo.bar/file.txt');
    });

    it('should write the file to the cache', function(done) {
      persistRequest.get('http://foo.bar/file.txt');
      expect(tempMock.createWriteStream).toHaveBeenCalled();
      expect(requestStreamMock.pipe).toHaveBeenCalledWith(tempStreamMock);
      tempStreamMock.on('finish', function() {
        expect(fsMock.renameSync).toHaveBeenCalledWith('foobar', '/tmp/foobarsha1.txt');
        done();
      });
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
