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

var mdsProjection = require("./mds.js");

function MDSView(container, dataobject, options = {}) {
	var self = this;

	//public fields///////////////////////////////////////////////////////////////////////////
	self.container = container;
	self.dataobject = dataobject;
	self.svg = null;
	self.svgDrawing = null;
	self.size = options.size || [400, 800];
	self.margin = options.margin || 10;
	self.info = options.info;

	//private fields///////////////////////////////////////////////////////////////////////////
	var animt = 1000;
	var circlesize = 4;

	var distances = [];
	var positions = [];
	var xscale = d3.scaleLinear().domain([0, 1]),
		yscale = d3.scaleLinear().domain([0, 1]);
	var bicrectcolor = ['red', 'green', 'gray'];

	//pubic methods///////////////////////////////////////////////////////////////////////////
	self.init = function() {
 		self.svg = d3.select(container).append('svg')
	 		.attr('width', self.size[0])
	 		.attr('height', self.size[1]);

 		self.svgDrawing = self.svg.append('g')
 			.attr('transform', 'translate(' + self.margin + ',' + self.margin + ')');

 		xscale.range([0, self.size[0] -  2 * self.margin]);
 		yscale.range([0, self.size[1] -  2 * self.margin]);

 		self.dataobject.on('biclusters computed', self.update);
 		self.dataobject.on('biclusters updated', self.redraw);
	}

	self.update = function() {
		for(var i = 0; i < self.dataobject.allbiclusters.length; i++) {
			var row = [];
			for(var j = 0; j < self.dataobject.allbiclusters.length; j++) {
				var bic1 = self.dataobject.allbiclusters[i],
					bic2 = self.dataobject.allbiclusters[j];
				row.push(self.dataobject.getBicSimilarity(bic1, bic2));
			}
			distances.push(row);
		}

		positions = mdsProjection(distances, 2);
		for(var i = 0; i < self.dataobject.allbiclusters.length; i++) {
			self.dataobject.allbiclusters[i].mdspos = positions[i];
		}

		self.redraw();
	}

	self.redraw = function() {
		var bicdots = self.svgDrawing.selectAll('.bicdot')
			.data(self.dataobject.allbiclusters, function(d) {return d.id;}); 

		bicdots.enter()
			.append('circle')
			.attr('class', 'bicdot')
			.attr('cx', function(d) {return xscale(d.mdspos[0]);})
			.attr('cy', function(d) {return yscale(d.mdspos[1]);})
			.attr('r', circlesize)
			.attr('fill', function(d) {return bicrectcolor[d.type];})
			.on('mouseover', function(d) { mouseoverCluster(d3.select(this), d); })
			.on('mouseout', function(d) { mouseoutCluster(d3.select(this), d); })

		bicdots.attr('cx', function(d) {return xscale(d.mdspos[0]);})
			.attr('cy', function(d) {return yscale(d.mdspos[1]);})
			.attr('fill', function(d) {return bicrectcolor[d.type];});

		bicdots.exit().remove();
	}

	self.highlightCluster = function(d, isin) {
		if(isin)
			self.svgDrawing.selectAll('.bicdot')
				.filter(function(n) {return d.id == n.id;})
				.classed('highlight', true);
		else
			self.svgDrawing.selectAll('.bicdot.highlight')
				.classed('highlight', false);
	}

	//private methods///////////////////////////////////////////////////////////////////////////
	function mouseoverCluster(elem, d) {
		elem.classed('highlight', true);
		self.emit('mouseoverCluster', 'MDSView', d);
	}
	
	function mouseoutCluster(elem, d) {
		elem.classed('highlight', false);
		self.emit('mouseoutCluster', 'MDSView', d);
	}
}

util.inherits(MDSView, events.EventEmitter);

module.exports = MDSView;