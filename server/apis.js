/*************************************************************************
 * Copyright (c) 2018 Jian Zhao
 *
 *************************************************************************
 *
 * 
 * @author
 * Jian Zhao <https://github.com/jeffjianzhao>
 *
 *************************************************************************/

var express = require('express'),
	router = express.Router(),
	fs = require('fs');

const spawn = require('child_process').spawnSync;

var mbea = __dirname + '/../libs/MBEA',
	pygraph = __dirname + '/../libs/computegraph.py',
	path = require('path'),
	tmpdir = 'tmp/';
	

module.exports = function(app) {
	app.use('/api', router);	
};

// precomputing version, will be changed
router.route('/linkpredict')
	.get(function(req, res) {
		var data = JSON.parse(fs.readFileSync(__dirname + '/../data/' 
			+ path.parse(req.query.datafile).name + '-' + req.query.method + '.json'));	
		res.json(data);
	});

router.route('/bicluster')
	.post(function(req, res) {
		var token = Math.floor(Math.random() * 1000);
		var output = [];

		for(var i = 0; i < req.body.data.length; i++) {
			output.push(req.body.data[i].join(' '));
		}

		var inputfile = tmpdir + 'mbeainput-' + token + '.txt';
		fs.writeFileSync(inputfile, output.join('\n'));

		var biclustering = spawn(mbea, [inputfile, 'improved']);
		var result = biclustering.stdout.toString().split('\n');

		var biclusters = [];
		var num = parseInt(result[2]);
		for(var i = 0; i < num; i++) {
			var bicstr = result[5 + i].split('|');
			var row = bicstr[0].trim().split(' ').map(function(d) {return +d - 1;}), 
				col = bicstr[1].trim().split(' ').map(function(d) {return +d - 1 - req.body.data.length;});
			var bic = [row.sort(), col.sort()];
			
			if(bic[0].length >= req.body.sizefilter[0] && bic[1].length > req.body.sizefilter[1])
				biclusters.push(bic);
		}

		res.json({result: biclusters});

		fs.unlinkSync(inputfile);
	});

router.route('/computegraph')
	.post(function(req, res) {
		var output = spawn('python', [pygraph], {input: JSON.stringify(req.body.graph)});
		console.log(output.stderr.toString())
		res.json(JSON.parse(output.stdout.toString()));
	});