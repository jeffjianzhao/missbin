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

var events = require('events');
var util = require('util');
var _ = require('underscore');
var crypto = require('crypto');
var clusterfck = require('clusterfck');

function DataModel() {
	var self = this;

	//public fields///////////////////////////////////////////////////////////////////////////
	self.datafile;
	self.weightedgraph = false;
	self.nodes = [];
	self.links = {};
	
	self.matrix = null;
	self.missinglinks = {};
	self.addedlinks = {};

	self.originalbiclusers = [];
	self.biclusters = [];
	self.allbiclusters = [];
	self.bicsimilarites = {};

	self.graphmetrics = {degree:{}, betweenness:{}, closeness:{}};
	self.originalgraphmetrics = {degree:{}, betweenness:{}, closeness:{}};

	self.linkfilter = [0, 1];
	self.bicfilter = [2, 2];
	self.bicorder = 'size';

	//public methods///////////////////////////////////////////////////////////////////////////
	self.loadData = function(dataurl) {
		$.getJSON(dataurl, function(data) {
			self.datafile = dataurl.substring(dataurl.lastIndexOf('/') + 1);	// for retrieving precomputed results
			self.weightedgraph = data.weightedgraph || false;
			self.nodes = data.nodes;

	        for(var i = 0; i < data.links.length; i++) {
	        	data.links[i].source = self.nodes[0][data.links[i].source];
	        	data.links[i].target = self.nodes[1][data.links[i].target];
	        	self.links[data.links[i].source.id + '-' + data.links[i].target.id] = data.links[i];
	        }

	        self.matrix = [[], []];
	        
	        for(var n = 0; n < 2; n++) {
	        	for(var i = 0; i < self.nodes[n].length; i++) {
	        		self.matrix[n].push(self.nodes[n][i]);
	        		self.matrix[n][i].idx = i;
	        	}
	        }

	        self.bicluster(false);
	        self.computegraph(false);

	        self.emit('data loaded', 'DataModel');
		});
	}

	self.predict = function(method) {
		$.get('/api/linkpredict', {datafile: self.datafile, method: method}, function(data){
			self.addedlinks = {};
			self.missinglinks = {};
					
			for(var n = 0; n < 2; n++) {
				for(var i = 0; i < self.nodes[n].length; i++) {
					self.matrix[n][i].avgscore = 0;
					self.matrix[n][i].count = 0;
				}
			}

			for(var i = 0; i < data.length; i++) {
				self.matrix[0][data[i].source].avgscore += data[i].weight;
				self.matrix[1][data[i].target].avgscore += data[i].weight;
				self.matrix[0][data[i].source].count++;
				self.matrix[1][data[i].target].count++;

	        	data[i].source = self.nodes[0][data[i].source];
	        	data[i].target = self.nodes[1][data[i].target];
	        	data[i].missing = true;
	        	data[i].rank = i + 1;

	        	self.missinglinks[data[i].source.id + '-' + data[i].target.id] = data[i];
	        }

	        for(var n = 0; n < 2; n++) {
				for(var i = 0; i < self.nodes[n].length; i++) {
					if(self.matrix[n][i].count)
						self.matrix[n][i].avgscore /= self.matrix[n][i].count;
				}
			}

			self.emit('link predicted', 'DataModel');
		});
	}

	self.bicluster = function(withadded = true) {
		var adjmat = [];
		for(var i = 0; i < self.nodes[0].length; i++) {
			var row = [];
			for(var j = 0; j < self.nodes[1].length; j++) {
				row.push(0);
			}
			adjmat.push(row);
		}

		for(var lkkey in self.links) {
			var lk = self.links[lkkey];
			adjmat[lk.source.idx][lk.target.idx] = 1;
		}

		if(withadded)
			for(var lkkey in self.addedlinks) {
				var lk = self.addedlinks[lkkey];
				adjmat[lk.source.idx][lk.target.idx] = 1;
			}

		$.post('api/bicluster', {
			data: adjmat,
			sizefilter: self.bicfilter,  
			weighted: self.weightedgraph
		}, function(data) {
			var result = data.result, biclusters = [];
	
			for(var i = 0; i < result.length; i++) {
				var bic = {nodes: [], links: []};

				for(var n = 0; n < 2; n++) {
					var dim = [];
					for(var j = 0; j < result[i][n].length; j++) 
						dim.push(Object.assign({}, self.matrix[n][result[i][n][j]]));
					bic.nodes.push(dim);
				}

				var strkey = bic.nodes[0].map(function(d) {return d.id;}).sort().join(',') + '|'
					+ bic.nodes[1].map(function(d) {return d.id;}).sort().join(',');
				bic.id = crypto.createHash('sha1').update(strkey).digest('hex');

				for(var j = 0; j < bic.nodes[0].length; j++)
					for(var k = 0; k < bic.nodes[1].length; k++) {
						var lk = {
							source: bic.nodes[0][j],
							target: bic.nodes[1][k]
						};

						var key = bic.nodes[0][j].id + '-' + bic.nodes[1][k].id;
						if(self.links[key]) {
							lk.weight = self.links[key].weight;
						}
						else if(self.missinglinks[key]) {
							lk.missing = true;
							lk.weight = self.missinglinks[key].weight;
							lk.rank = self.missinglinks[key].rank;
						}

						bic.links.push(lk);
					}				

				biclusters.push(bic);
			}

			if(withadded) 
				self.biclusters = biclusters;
			else
				self.originalbiclusers = biclusters;

			self.allbiclusters = mergeBiclusters();
			self.bicsimilarites = computeBiclusterSimilarity(self.allbiclusters);

			if(withadded)
				self.emit('biclusters computed', 'DataModel');
			
		});
	}

	self.computegraph = function(withadded = true) {
		var nodes0 = self.nodes[0].map(function(d) {return d.id;}),
			nodes1 = self.nodes[1].map(function(d) {return d.id;}),
			links0 = _.values(self.links).map(function(d) {return [d.source.id, d.target.id];});
		var inputgraph = {nodes0: nodes0, nodes1: nodes1, links: links0};

		if(withadded) {
			var links1 = _.values(self.addedlinks).map(function(d) {return [d.source.id, d.target.id];});
			inputgraph.links = inputgraph.links.concat(links1);
		}

		$.post('api/computegraph', {
			graph: inputgraph
		}, function(data) {
			if(withadded)
				self.graphmetrics = data;
			else
				self.originalgraphmetrics = data;
			self.emit('graph computed', 'DataModel');
		});
	}

	self.filter = function(newvalue) {
		self.linkfilter = newvalue;
		self.emit('matrix updated', 'DataModel', 'filter');
	}

	self.sort = function(method, dim) {
		if(dim != 2) {
			sortdim(method, dim);
		}
		else {
			sortdim(method, 0);
			sortdim(method, 1);
		}

		self.emit('matrix updated', 'DataModel', 'sort');
	}

	self.addLink = function(lk) {
		var key = lk.source.id + '-' + lk.target.id;
		if(self.addedlinks[key])
			delete self.addedlinks[key];
		else
			self.addedlinks[key] = lk;
		self.emit('matrix updated', 'DataModel', 'addLink');
	}

	self.sortBic = function(newvalue) {
		self.bicorder = newvalue;
		self.emit('biclusters updated', 'DataModel', 'sort');
	}

	self.getBicSimilarity = function(bic1, bic2) {
		if(bic1.id < bic2.id)
			return self.bicsimilarites[bic1.id + ':' + bic2.id];
		else if(bic1.id > bic2.id)
			return self.bicsimilarites[bic2.id + ':' + bic1.id];
		else
			return 1.0;
	}

	//private methods///////////////////////////////////////////////////////////////////////////
	function sortdim(method, dim) {
		if(method == 'id') {
			self.matrix[dim] = _.sortBy(self.matrix[dim], function(d) {return d.id;});
		}
		else if(method == 'avg-score') {
			self.matrix[dim] = _.sortBy(self.matrix[dim], function(d) {return -d.avgscore;});
		}
		else if(method == 'total-number') {
			self.matrix[dim] = _.sortBy(self.matrix[dim], function(d) {return -d.count;});
		}
		else if(method == 'cluster') {
			var nodegroups = clusterfck.hcluster(self.matrix[dim], nodesim, clusterfck.COMPLETE_LINKAGE, 1);
			var items = [];
			nodegroups.forEach(function(ng) {
				var leaves = [];
				visitHierarchy(ng, leaves);
				items = items.concat(leaves);
			});
			self.matrix[dim] = items;
		}

	    for(var i = 0; i < self.matrix[dim].length; i++) {
    		self.matrix[dim][i].idx = i;
    	}
	}

	function nodesim(a, b) {
		var seta = [], setb = [];
		for(var key in self.links) {
			var lk = self.links[key];

			if(lk.source.id == a.id)
				seta.push(lk.target.id);
			else if(lk.target.id == a.id)
				seta.push(lk.source.id);
			if(lk.source.id == b.id)
				setb.push(lk.target.id);
			else if(lk.target.id == b.id)
				setb.push(lk.source.id);
		}

		for(var key in self.addedlinks) {
			var lk = self.addelinks[key];

			if(lk.source.id == a.id)
				seta.push(lk.target.id);
			else if(lk.target.id == a.id)
				seta.push(lk.source.id);
			if(lk.source.id == b.id)
				setb.push(lk.target.id);
			else if(lk.target.id == b.id)
				setb.push(lk.source.id);
		}

		var dist = _.intersection(seta, setb).length;
		return dist;
	}

	function visitHierarchy(node, leaves) {
	    if(node.value) {
	        leaves.push(node.value);
	    }
	    else {
	        visitHierarchy(node.left, leaves);
	        visitHierarchy(node.right, leaves);
	    }
	}

	function mergeBiclusters() {
		var allbiclusters = self.biclusters.slice();
		allbiclusters.forEach(function(d) { d.type = 1; });	// added, new
		self.originalbiclusers.forEach(function(d) {
			var bic = _.find(allbiclusters, function(n) {return n.id == d.id;} );
			if(bic) {
				bic.type = 2; // existed
			}
			else {
				d.type = 0; // removed, old 
				allbiclusters.push(d);
			}
		});

		return _.sortBy(allbiclusters, function(d) {return d.nodes[0].length + d.nodes[1].length;});
	}

	function computeBiclusterSimilarity(bics) {
		var sims = {};
		for(var i = 0; i < bics.length; i++) {
			for(var j = i + 1; j < bics.length; j++) {
				var bic1 = bics[i], bic2 = bics[j];
				if(bic1.id > bic2.id) {
					bic2 = bics[i];
					bic1 = bics[j];
				}
				var s = computeMatchingScore(bic1, bic2);
				sims[bic1.id + ':' + bic2.id] = s;
			}
		}

		return sims;
	}

	function computeMatchingScore(bic1, bic2) {
		var n11 = bic1.nodes[0].map(function(d) {return d.id;}),
			n12 = bic1.nodes[1].map(function(d) {return d.id;}),
			n21 = bic2.nodes[0].map(function(d) {return d.id;}),
			n22 = bic2.nodes[1].map(function(d) {return d.id;});

		return _.intersection(n11, n21).length * _.intersection(n12, n22).length / 
			(_.union(n11, n21).length * _.union(n12, n22).length);
	}	
}


util.inherits(DataModel, events.EventEmitter);

module.exports = DataModel;