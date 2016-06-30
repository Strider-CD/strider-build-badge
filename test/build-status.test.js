var expect = require('expect.js')
  , nock = require('nock')
  , getBuildStatus = require('../lib/build-status')

describe('Build Status', function () {

  function getContext(job) {
    var jobModel =
    { findOne: function () { return jobModel }
    , sort: function () { return jobModel }
    , where: function (field, value) {
        if(field === 'ref.branch' && value !== 'master') {
          job = null;
        }
        return jobModel
      }
    , ne: function () { return jobModel }
    , exec: function (callback) { callback(null, job) }
    }
    return { models: { Job: jobModel } }
  }

  function buildRequest(params, query) {
    return {
      params: params,
      query: query
    }
  }

  function buildResponse() {
    return {
      setHeader: function() {},
      on: function() {},
      once: function() {},
      emit: function() {},
      end: function() {}
    }
  }

  it('should return success label with successful build', function (done) {
    var job = { test_exitcode: 0 }
    getBuildStatus('test', 'master', getContext(job), function (error, status) {
      expect(status.label).to.be('passing')
      done()
    })
  })

  it('should return failed label with failed build', function (done) {
    var job = { test_exitcode: 1 }
    getBuildStatus('test', 'master', getContext(job), function (error, status) {
      expect(status.label).to.be('failing')
      done()
    })
  })

  it('should return unknown label when build state unknown', function (done) {
    getBuildStatus('test', 'master', getContext(null), function (error, status) {
      expect(status.label).to.be('unknown')
      done()
    })
  })

  it('should return success label for the default branch ', function (done) {
    var job = { test_exitcode: 0 }
    getBuildStatus('test', undefined, getContext(job), function (error, status) {
      expect(status.label).to.be('passing')
      done()
    })
  })

  it('should return unknown label when job for the specified branch does not exist', function (done) {
    var job = { test_exitcode: 0 }
    getBuildStatus('test', 'develop', getContext(job), function (error, status) {
      expect(status.label).to.be('unknown')
      done()
    })
  })

  describe('image response', function () {
    it('should return success image with successful build', function (done) {
      var job = { test_exitcode: 0 }
      var context = getContext(job)

      // fake the express app
      context.app = {
        // add a get handler
        get: function(path, handler) {
          var req = buildRequest({ org: 'test', repo: 'test' },{ branch: 'master' })

          // provide a fake sendFile function
          var res = {
            sendfile: function(filePath) {
              expect(filePath).to.contain('build_passing.png')
              done()
            }
          }

          handler(req, res)
        }
      }

      require(__dirname + '/../webapp')(context, function() { })
    })

    it('should return failed image with failed build', function (done) {
      var job = { test_exitcode: 1 }
      var context = getContext(job)

      // fake the express app
      context.app = {
        // add a get handler
        get: function(path, handler) {
          var req = buildRequest({ org: 'test', repo: 'test' },{ branch: 'master' })

          // provide a fake sendFile function
          var res = {
            sendfile: function(filePath) {
              expect(filePath).to.contain('build_failing.png')
              done()
            }
          }

          handler(req, res)
        }
      }

      require(__dirname + '/../webapp')(context, function() { })
    })

    it('should return unknown image when build state is unknown', function (done) {
      var context = getContext(null)

      // fake the express app
      context.app = {
        // add a get handler
        get: function(path, handler) {
          var req = buildRequest({ org: 'test', repo: 'test' },{ branch: 'master' })

          // provide a fake sendFile function
          var res = {
            sendfile: function(filePath) {
              expect(filePath).to.contain('build_unknown.png')
              done()
            }
          }

          handler(req, res)
        }
      }

      require(__dirname + '/../webapp')(context, function() { })
    })

    it('should return success image for the default branch', function (done) {
      var job = { test_exitcode: 0 }
      var context = getContext(job)

      // fake the express app
      context.app = {
        // add a get handler
        get: function(path, handler) {
          var req = buildRequest({ org: 'test', repo: 'test' },{ })

          // provide a fake sendFile function
          var res = {
            sendfile: function(filePath) {
              expect(filePath).to.contain('build_passing.png')
              done()
            }
          }

          handler(req, res)
        }
      }

      require(__dirname + '/../webapp')(context, function() { })
    })

    it('should return unknown image when job for the specified branch does not exist', function (done) {
      var job = { test_exitcode: 0 }
      var context = getContext(job)

      // fake the express app
      context.app = {
        // add a get handler
        get: function(path, handler) {
          var req = buildRequest({ org: 'test', repo: 'test' },{ branch: 'xx' })

          // provide a fake sendFile function
          var res = {
            sendfile: function(filePath) {
              expect(filePath).to.contain('build_unknown.png')
              done()
            }
          }

          handler(req, res)
        }
      }

      require(__dirname + '/../webapp')(context, function() { })
    })
  })

  describe('svg response', function () {
    it('should return success svg with successful build', function (done) {
      var job = { test_exitcode: 0 }
      var context = getContext(job)

      // http intercept, we expect this path to be called by the webapp
      // containing the badgeUrl to request from img.shields.io
      var scope = nock('https://img.shields.io')
        .get('/badge/build-passing-brightgreen.svg?style=flat-square')
        .reply(200)

      // fake the express app and request/response
      context.app = {
        get: function(path, handler) {
          var req = buildRequest({ org: 'test', repo: 'test' },{ branch: 'master', service: 'shield' })
          var res = buildResponse();
          handler(req, res)
        }
      }

      require(__dirname + '/../webapp')(context, function() {
        // expect our http intercept to have been hit
        expect(scope.isDone()).to.eql(true)
        return done()
      })
    })

    it('should return failed svg with failed build', function (done) {
      var job = { test_exitcode: 1 }
      var context = getContext(job)

      // http intercept, we expect this path to be called by the webapp
      // containing the badgeUrl to request from img.shields.io
      var scope = nock('https://img.shields.io')
        .get('/badge/build-failing-red.svg?style=flat-square')
        .reply(200)

      // fake the express app and request/response
      context.app = {
        get: function(path, handler) {
          var req = buildRequest({ org: 'test', repo: 'test' },{ branch: 'master', service: 'shield' })
          var res = buildResponse();
          handler(req, res)
        }
      }

      require(__dirname + '/../webapp')(context, function() {
        // expect our http intercept to have been hit
        expect(scope.isDone()).to.eql(true)
        done()
      })
    })

    it('should return unknown svg when the build state is unknown', function (done) {
      var context = getContext(null)

      // http intercept, we expect this path to be called by the webapp
      // containing the badgeUrl to request from img.shields.io
      var scope = nock('https://img.shields.io')
        .get('/badge/build-unknown-lightgrey.svg?style=flat-square')
        .reply(200);

      // fake the express app and request/response
      context.app = {
        get: function(path, handler) {
          var req = buildRequest({ org: 'test', repo: 'test' },{ branch: 'master', service: 'shield' })
          var res = buildResponse();
          handler(req, res)
        }
      }

      require(__dirname + '/../webapp')(context, function() {
        // expect our http intercept to have been hit
        expect(scope.isDone()).to.eql(true)
        done()
      })
    })

    it('should return success svg for the default branch', function (done) {
      var job = { test_exitcode: 0 }
      var context = getContext(job)

      // http intercept, we expect this path to be called by the webapp
      // containing the badgeUrl to request from img.shields.io
      var scope = nock('https://img.shields.io')
        .get('/badge/build-passing-brightgreen.svg?style=flat-square')
        .reply(200)

      // fake the express app and request/response
      context.app = {
        get: function(path, handler) {
          var req = buildRequest({ org: 'test', repo: 'test' },{ branch: undefined, service: 'shield' })
          var res = buildResponse();
          handler(req, res)
        }
      }

      require(__dirname + '/../webapp')(context, function() {
        // expect our http intercept to have been hit
        expect(scope.isDone()).to.eql(true)
        done()
      })
    })

    it('should return unknown svg when job for the specified branch does not exist', function (done) {
      var job = { test_exitcode: 0 }
      var context = getContext(job)

      // http intercept, we expect this path to be called by the webapp
      // containing the badgeUrl to request from img.shields.io
      var scope = nock('https://img.shields.io')
        .get('/badge/build-unknown-lightgrey.svg?style=flat-square')
        .reply(200)

      // fake the express app and request/response
      context.app = {
        get: function(path, handler) {
          var req = buildRequest({ org: 'test', repo: 'test' },{ branch: 'xx', service: 'shield' })
          var res = buildResponse();
          handler(req, res)
        }
      }

      require(__dirname + '/../webapp')(context, function() {
        // expect our http intercept to have been hit
        expect(scope.isDone()).to.eql(true)
        done()
      })
    })
  })
})