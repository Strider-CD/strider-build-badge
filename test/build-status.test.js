var expect = require('expect.js')
  , sinon = require('sinon')
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

  describe('response', function () {
    it('should return success image with successful build', function (done) {
      var job = { test_exitcode: 0 }
      var context = getContext(job)

      // fake the express app
      context.app = {
        // add a get handler
        get: function(path, handler) {
          // fake the request
          var req = {
            params: { org: 'test', repo: 'test' },
            query: { branch: 'master' }
          }

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

      var app = require(__dirname + '/../webapp')(context, function() { })
    })
  })
})