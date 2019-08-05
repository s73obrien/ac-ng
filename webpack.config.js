const ace = require('atlassian-connect-express');
var config = require('atlassian-connect-express/lib/internal/config');
var utils = require('atlassian-connect-express/lib/internal/utils');
var bodyParser = require('body-parser');
var compression = require('compression');
var cookieParser = require('cookie-parser');
var errorHandler = require('errorhandler');

var CONFIG_FILENAME = 'config.json';
var configOpts = utils.loadJSON(CONFIG_FILENAME);
var configuration = config(configOpts);

module.exports = {
  devServer: {
    publicPath: '/app/',
    port: configuration.port(),
    disableHostCheck: true,
    before: (app, server) => {
      app.get('/', (req, res) => {
        res.redirect('/atlassian-connect.json');
      });

      app.set('port', configuration.port());
      app.use(bodyParser.json());
      app.use(bodyParser.urlencoded({extended: false}));
      app.use(cookieParser());
      app.use(compression());
      if (app.get('env') == 'development') {
        app.use(errorHandler());
      }

      const addon = ace(app);
      app.use(addon.middleware());
      (async () => {
        addon.register();
      })()
    }
  }
}