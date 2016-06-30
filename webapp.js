'use strict';

var path = require('path');
var getBuildStatus = require('./lib/build-status');

module.exports = function (context, done) {
  context.app.get('/:org/:repo/badge', function (req, res) {
    var name = req.params.org + '/' + req.params.repo
    var branch = req.query.branch
    var style = req.query.style || 'default'

    getBuildStatus(name, branch, context, function (error, status) {
      if (error) {
        console.error('[badge] error occured when getting badge: ' + error.message)
      }

      if (style === 'default') {
        res.sendfile(path.join(__dirname, 'images', 'build_' + status.label + '.png'));
      } else {

        var badge = {
          subject: 'build',
          style: 'flat-square'
        }

        var badgeUrl = badge.subject + '-' + status.label + '-' + status.color + '.svg?style=' + badge.style;

        var externalReq = require('https').request({
          protocol: 'https:',
          hostname: 'img.shields.io',
          path: '/badge/' + badgeUrl
        }, function(externalRes) {
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('content-type', 'image/svg+xml;charset=utf-8');
          externalRes.pipe(res);
        })
        externalReq.end();
      }
    })
  })
  done();
};
