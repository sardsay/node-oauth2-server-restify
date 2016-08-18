/**
 * Copyright 2013-present NightWorld.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var AuthCodeGrant = require('./authCodeGrant'),
        Authorise = require('./authorise'),
        Grant = require('./grant');

module.exports = OAuth2Server;

/**
 * Constructor
 *
 * @param {Object} config Configuration object
 */
function OAuth2Server (config) {

  if (!(this instanceof OAuth2Server)) return new OAuth2Server(config);

  config = config || {};

  if (!config.model) throw new Error('No model supplied to OAuth2Server');
  this.model = config.model;

  this.grants = config.grants || [];
  this.debug = config.debug || function () {};
  if (typeof this.debug !== 'function') {
    this.debug = console.log;
  }
  this.passthroughErrors = config.passthroughErrors;
  this.continueAfterResponse = config.continueAfterResponse;

  this.accessTokenLifetime = config.accessTokenLifetime !== undefined ?
          config.accessTokenLifetime : 3600;
  this.refreshTokenLifetime = config.refreshTokenLifetime !== undefined ?
          config.refreshTokenLifetime : 1209600;
  this.authCodeLifetime = config.authCodeLifetime || 30;

  this.regex = {
    clientId: config.clientIdRegex || /^[a-z0-9-_]{3,40}$/i,
    grantType: new RegExp('^(' + this.grants.join('|') + ')$', 'i')
  };
  this.expiresDate = config.expiresDate !== undefined ?
          config.expiresDate : null
}

/**
 * Authorisation Middleware
 *
 * Returns middleware that will authorise the request using oauth,
 * if successful it will allow the request to proceed to the next handler
 *
 * @return {Function} middleware
 */
OAuth2Server.prototype.authorise = function () {
  var self = this;

  return function (req, res, next) {
    new Authorise(self, req, next);
  };
};

/**
 * Check authorisation Middleware
 *
 * Returns middleware that will authorise the request using oauth, depends on route param
 * if successful it will allow the request to proceed to the next handler
 *
 * @return {Function} middleware
 */
OAuth2Server.prototype.checkAuthorise = function (routeParam) {
  var self = this;

  return function (req, res, next) {

    if(req.route && req.route[routeParam]) {
      new Authorise(self, req, next);
    } else {
      next();
    }
  };
};

/**
 * Grant Middleware
 *
 * Returns middleware that will grant tokens to valid requests.
 * This would normally be mounted at '/oauth/token' e.g.
 *
 * `server.post('/oauth/token', server.oauth.grant());`
 *
 * @return {Function} middleware
 */
OAuth2Server.prototype.grant = function () {
  var self = this;

  return function (req, res, next) {
    new Grant(self, req, res, next);
  };
};

/**
 * Code Auth Grant Middleware
 *
 * @param  {Function} check Function will be called with req to check if the
 *                          user has authorised the request.
 * @return {Function}       middleware
 */
OAuth2Server.prototype.authCodeGrant = function (check) {
  var self = this;

  return function (req, res, next) {
    console.log('authCodeGrant');
    new AuthCodeGrant(self, req, res, next, check);
  };
};

/**
 * Lockdown
 *
 * When using the lockdown patter, this function should be called after
 * all routes have been declared.
 * It will search through each route and if it has not been explitly bypassed
 * (by passing oauth.bypass) then authorise will be inserted.
 * If oauth.grant has been passed it will replace it with the proper grant
 * middleware
 * NOTE: When using this method, you must PASS the method not CALL the method,
 * e.g.:
 *
 * `
 * server.post('/oauth/token', app.oauth.grant);
 *
 * server.get('/secrets', function (req, res, next) {
 *   res.send('secrets');
 *   next();
 * });
 *
 * server.get('/public', server.oauth.bypass, function (req, res, next) {
 *   res.send('public');
 *   next();
 * });
 *
 * server.oauth.lockdown(server);
 * `
 *
 * @param  {Object} server Restify server
 */
OAuth2Server.prototype.lockdown = function (server) {
  var self = this;

  //var lockdownRestify = function (mount) {
  //  //console.log(mount);
  //};

  //var lockdownExpress3 = function (stack) {
  //  // Check if it's a grant route
  //  var pos = stack.indexOf(self.grant);
  //  if (pos !== -1) {
  //    stack[pos] = self.grant();
  //    return;
  //  }
  //
  //  // Check it's not been explitly bypassed
  //  pos = stack.indexOf(self.bypass);
  //  if (pos === -1) {
  //    stack.unshift(self.authorise());
  //  } else {
  //    stack.splice(pos, 1);
  //  }
  //};
  //
  //var lockdownExpress4 = function (layer) {
  //  if (!layer.route)
  //    return;
  //
  //  var stack = layer.route.stack;
  //  var handlers = stack.map(function (item) {
  //    return item.handle;
  //  });
  //
  //  // Check if it's a grant route
  //  var pos = handlers.indexOf(self.grant);
  //  if (pos !== -1) {
  //    stack[pos].handle = self.grant();
  //    return;
  //  }
  //
  //  // Check it's not been explitly bypassed
  //  pos = handlers.indexOf(self.bypass);
  //  if (pos === -1) {
  //    // Add authorise another route (could do it properly with express.route?)
  //    var copy = {};
  //    var first = stack[0];
  //    for (var key in first) {
  //      copy[key] = first[key];
  //    }
  //    copy.handle = self.authorise();
  //    stack.unshift(copy);
  //  } else {
  //    stack.splice(pos, 1);
  //  }
  //};

  //for (var i in server.router.mounts) {
  //  lockdownRestify(server.router.mounts[i]);
  //}
};

/**
 * Bypass
 *
 * This is used as placeholder for when using the lockdown pattern
 *
 * @return {Function} noop
 */
OAuth2Server.prototype.bypass = function () {};
