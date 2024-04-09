var express = require('express'),
//	mongoose = require('mongoose'),
	glob = require('glob');

var bodyParser = require('body-parser'),
	compress = require('compression'),
	methodOverride = require('method-override');

var config = require('../config.js');

// mongoose.Promise = global.Promise;
// mongoose.connect(config.db, {useMongoClient: false});
// var db = mongoose.connection;
// db.on('error', function () {
// 	throw new Error('unable to connect to database at ' + config.db);
// });

var app = express();
// configure
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({extended: true, limit: '50mb', parameterLimit: 50000}));
app.use(compress());
app.use(methodOverride());
// static directories
app.use(express.static('public'));
app.use('/data', express.static('data'));
// apis
require('./apis.js')(app);
// start listening
app.listen(config.port, function() {
	console.log('Listening ' + config.port);
});;
