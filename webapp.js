'use strict';

var path = require('path');
var getBuildStatus = require('./lib/build-status');

module.exports = function (context, done) {
  context.app.get('/:org/:repo/badge', function (req, res) {
    var name = req.params.org + '/' + req.params.repo
    var branch = req.query.branch
    var service = req.query.service || 'default'
    var style = req.query.style || 'flat-square'

    getBuildStatus(name, branch, context, function (error, status) {
      if (error) {
        console.error('[badge] error occured when getting badge: ' + error.message)
      }

      if (service === 'default') {
        res.sendfile(path.join(__dirname, 'images', 'build_' + status.label + '.png'));
      } else {

        var badge = {
          subject: 'build',
          style: style
        }

        var badgeUrl = badge.subject + '-' + status.label + '-' + status.color + '.svg?style=' + badge.style;

        var externalReq = require('https').request({
          protocol: 'https:',
          hostname: 'img.shields.io',
          path: '/badge/' + badgeUrl
        }, function(externalRes) {
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Content-Type', 'image/svg+xml;charset=utf-8');
          externalRes.pipe(res);
        })

        externalReq.on('error', function (err) {
          console.error('[badge] error occured when requesting badge from https://img.shields.io/' + badgeUrl + '. ' + err);

          // fallback to the image
          res.sendfile(path.join(__dirname, 'images', 'build_' + status.label + '.png'));
        });

        externalReq.end();
      }
    })
  })
  done();
};
