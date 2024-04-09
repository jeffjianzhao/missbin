var env = process.env.NODE_ENV || 'development';

var config = {
	development: {
		//db: 'mongodb://localhost:27017/sample',
		port: 8000
	},
	production: {
		db: process.env.MONGO_URI,
		port: process.env.PORT
	}
};

module.exports = config[env];