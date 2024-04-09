/*************************************************************************
 * Copyright (c) 2018 Jian Zhao
 *
 *************************************************************************
 *
 * 
 * @author
 * Jian Zhao <zhao@fxpal.com>
 *
 *************************************************************************/

var events = require('events');
var util = require('util');
var _ = require('underscore');

function ClusterView(container, dataobject, options = {}) {
	var self = this;

	//public fields///////////////////////////////////////////////////////////////////////////
	self.container = container;
	self.dataobject = dataobject;
	self.svg = null;
	self.svgDrawing = null;
	self.size = options.size || [400, 800];
	self.margin = options.margin || 15;
	self.info = options.info;

	//private fields///////////////////////////////////////////////////////////////////////////
	var animt = 1000;
	var cellsize = 10;
	var labelmargin = 30;
	var bicmarginx = 20, bicmarginy = 5;
	var bicspace = 50;
	var linkcolorscale1 = d3.scaleSequential(d3.interpolateYlGn).domain([-0.2, 1.2]),
		linkcolorscale2 = d3.scaleSequential(d3.interpolatePurples).domain([-0.2, 1.2]);
	var bicrectcolor = ['red', 'green', 'gray'];
	var biclinkscale = d3.scaleLinear().domain([0, 1]).range([0, 8]);

	//var allbiclusters = [];
	var bicsimilrity = [];

	//public methods///////////////////////////////////////////////////////////////////////////
	self.init = function() {
 		self.svg = d3.select(container).append('svg')
	 		.attr('width', self.size[0])
	 		.attr('height', self.size[1]);

 		self.svgDrawing = self.svg.append('g')
 			.attr('transform', 'translate(' + self.margin + ',' + self.margin + ')');

 		self.dataobject.on('biclusters computed', self.update);
 		self.dataobject.on('biclusters updated', self.redraw);
	}

	self.update = function() {
		var newbics = [], removedbics = [];
		for(var i = 0; i < self.dataobject.allbiclusters.length; i++) {
			var bic = self.dataobject.allbiclusters[i];
			if(bic.type == 1)
				newbics.push(bic);
			else if(bic.type == 0)
				removedbics.push(bic);
		}

		bicsimilrity = computeBicSimilarity(removedbics, newbics);

		self.redraw();
	}

	self.redraw = function() {
		// compute layout parameters
		computeLayoutMT();
		//computeLayoutNL();

		// rendering
		var bics = self.svgDrawing.selectAll('.bicluster')
			.data(self.dataobject.allbiclusters, function(d) {return d.id;});

		var bicsEnter = bics.enter().append('g')
			.attr('class', 'bicluster')
			.attr('transform', function(d) {
				return 'translate(' + d.xshfit + ',' + d.yshfit + ')';
			})
			.on('mouseover', function(d) { mouseoverCluster(d3.select(this), d); })
			.on('mouseout', function(d) { mouseoutCluster(d3.select(this), d); });
		bicsEnter.append('rect')
			.attr('class', 'bicrect')
			.attr('x', -bicmarginx / 2)
			.attr('y', -bicmarginy / 2)
			.attr('rx', 5)
			.attr('ry', 5)
			.attr('height', function(d) {return d.h - bicmarginy;})
			.attr('width', function(d) {return d.w - bicmarginx;})
			.attr('stroke', function(d) {return bicrectcolor[d.type];});
		drawBiclusterMT(bicsEnter);
		//drawBiclusterNL(bicsEnter);
		
		bics.transition()
			.duration(animt)
			.attr('transform', function(d) {
				return 'translate(' + d.xshfit + ',' + d.yshfit + ')';
			});
		bics.select('.bicrect')
			.attr('height', function(d) {return d.h - bicmarginy;})
			.attr('width', function(d) {return d.w - bicmarginx;})
			.attr('stroke', function(d) {return bicrectcolor[d.type];});
		drawBiclusterMT(bics);
		//drawBiclusterNL(bics);
		
		bics.exit().remove();

		var biclinks = self.svgDrawing.selectAll('.biclink')
			.data(bicsimilrity, function(d) {return d.bics[0].id + '-' + d.bics[1].id;});

		biclinks.enter().append('path')
			.attr('class', 'biclink')
			.attr('d', function(d) {
				var p1 = [d.bics[0].xshfit + d.bics[0].w - bicmarginx * 1.5, d.bics[0].yshfit + d.bics[0].h / 2];
				var p2 = [d.bics[1].xshfit - bicmarginx * 0.5, d.bics[1].yshfit + d.bics[1].h / 2];
				return 'M' + p1 + ' C' + [p1[0] + 25, p1[1]] + ',' + [p2[0] - 25, p2[1]] + ',' + p2;
			})
			.attr('stroke-width', function(d) {
				return biclinkscale(d.score);
			});
		biclinks.attr('d', function(d) {
				var p1 = [d.bics[0].xshfit + d.bics[0].w - bicmarginx * 1.5, d.bics[0].yshfit + d.bics[0].h / 2];
				var p2 = [d.bics[1].xshfit - bicmarginx * 0.5, d.bics[1].yshfit + d.bics[1].h / 2];
				return 'M' + p1 + ' C' + [p1[0] + 25, p1[1]] + ',' + [p2[0] - 25, p2[1]] + ',' + p2;
			});
		biclinks.exit().remove();
	}

	self.highlightNode = function(d, isin) {
		if(isin) {
			self.svgDrawing.selectAll('.bicluster')
				.filter(function(t) {
					return t.id == d.id;
				})
				.classed('highlight', true);
		}
		else {
			self.svgDrawing.selectAll('.bicluster.highlight')
				.classed('highlight', false);
		}
	}

	self.highlightLink = function(d, isin) {
		if(isin) {
			self.svgDrawing.selectAll('.link')
				.filter(function(t) {
					if(t.source.id == d.source.id && t.target.id == d.target.id)
						return true;
				})
				.classed('highlight', true);

			self.svgDrawing.selectAll('.tlabel')
				.filter(function(t) {
					if(t.id == d.source.id || t.id == d.target.id)
						return true;
				})
				.classed('highlight', true);
		}
		else {
			self.svgDrawing.selectAll('.tlabel.highlight, .link.highlight')
				.classed('highlight', false);
		}
	}

	self.highlightCluster = function(d, isin) {
		if(isin) {
			self.svgDrawing.selectAll('.bicluster')
				.filter(function(t) {
					if(t.id == d.id)
						return true;
				})
				.classed('highlight', true);
		}
		else {
			self.svgDrawing.selectAll('.bicluster.highlight')
				.classed('highlight', false);
		}
	}
	//private methods///////////////////////////////////////////////////////////////////////////
	function drawBiclusterMT(bics) {
		// row labels
		var labels = bics.selectAll('.tlabel.row')
			.data(function(d) { return d.nodes[0];}, function(d) {return d.id;});
		labels.enter().append('text')
			.attr('class', 'tlabel row')
			.attr('x', 0)
			.attr('y', 0)
			.attr('transform', function(d) {
				var pos = labelmargin + (d.bicidx + 0.5) * cellsize;
				return 'translate(' + [labelmargin, pos] + ')'; 
			})
			.on('mouseover', function(d) { mouseoverLabel(d3.select(this), d); })
			.on('mouseout', function(d) { mouseoutLabel(d3.select(this), d); })
			.text(function(d) {return d.id;});
		labels.transition()
			.duration(animt)
			.attr('transform', function(d) {
				var pos = labelmargin + (d.bicidx + 0.5) * cellsize;
				return 'translate(' + [labelmargin, pos] + ')'; 
			});
		labels.exit().remove();
	
		// column labels
		labels = bics.selectAll('.tlabel.col')
			.data(function(d) { return d.nodes[1];}, function(d) {return d.id;});

		labels.enter().append('text')
			.attr('class', 'tlabel col')
			.attr('x', 0)
			.attr('y', 0)
			.attr('transform', function(d) {
				var pos = labelmargin + (d.bicidx + 0.5) * cellsize;
				return 'translate(' + [pos, labelmargin] + ')rotate(-60)'; 
			})
			.on('mouseover', function(d) { mouseoverLabel(d3.select(this), d); })
			.on('mouseout', function(d) { mouseoutLabel(d3.select(this), d); })
			.text(function(d) {return d.id;});
		labels.transition()
			.duration(animt)
			.attr('transform', function(d) {
				var pos = labelmargin + (d.bicidx + 0.5) * cellsize;
				return 'translate(' + [pos, labelmargin] + ')rotate(-60)'; 
			});
		labels.exit().remove();

		// links
		var links = bics.selectAll('.link')
			.data(function(d) {return d.links;}, function(d) {return d.source.id + '-' + d.target.id;});
		links.enter().append('rect')
			.attr('class', 'link')//function(d) {return 'link ' + (d.missing ? 'missing' : 'existing');})
			.attr('x', function(d) {
				return labelmargin + d.target.bicidx * cellsize + 1;
			})
			.attr('y', function(d) {
				return labelmargin + d.source.bicidx * cellsize + 1;
			})
			.attr('width', cellsize - 2)
			.attr('height', cellsize - 2)
			.attr('fill', function(d) { 
				return d.missing ? linkcolorscale2(d.weight) : linkcolorscale1(d.weight); 
			})
			.on('mouseover', function(d) { mouseoverLink(d3.select(this), d); })
			.on('mouseout', function(d) { mouseoutLink(d3.select(this), d); });
		links.transition()
			.duration(animt)
			.attr('x', function(d) {
				return labelmargin + d.target.bicidx * cellsize + 1;
			})
			.attr('y', function(d) {
				return labelmargin + d.source.bicidx * cellsize + 1;
			})
			.attr('fill', function(d) { 
				return d.missing ? linkcolorscale2(d.weight) : linkcolorscale1(d.weight); 
			});
		links.exit().remove();
	}

	function drawBiclusterNL(bics) {
		// row labels
		var labels = bics.selectAll('.tlabel.row')
			.data(function(d) { return d.nodes[0];}, function(d) {return d.id;});
		labels.enter().append('text')
			.attr('class', 'tlabel row')
			.attr('x', 0)
			.attr('y', 0)
			.attr('transform', function(d) {
				var pos = (d.bicidx + 0.5) * cellsize;
				return 'translate(' + [labelmargin, pos] + ')'; 
			})
			.on('mouseover', function(d) { mouseoverLabel(d3.select(this), d); })
			.on('mouseout', function(d) { mouseoutLabel(d3.select(this), d); })
			.text(function(d) {return d.id;});
		labels.transition()
			.duration(animt)
			.attr('transform', function(d) {
				var pos = (d.bicidx + 0.5) * cellsize;
				return 'translate(' + [labelmargin, pos] + ')'; 
			});
		labels.exit().remove();

		// column labels
		labels = bics.selectAll('.tlabel.col')
			.data(function(d) { return d.nodes[1];}, function(d) {return d.id;});

		labels.enter().append('text')
			.attr('class', 'tlabel col')
			.attr('x', 0)
			.attr('y', 0)
			.attr('transform', function(d) {
				var pos = (d.bicidx + 0.5) * cellsize;
				return 'translate(' + [labelmargin + bicspace, pos] + ')'; 
			})
			.on('mouseover', function(d) { mouseoverLabel(d3.select(this), d); })
			.on('mouseout', function(d) { mouseoutLabel(d3.select(this), d); })
			.text(function(d) {return d.id;});
		labels.transition()
			.duration(animt)
			.attr('transform', function(d) {
				var pos = (d.bicidx + 0.5) * cellsize;
				return 'translate(' + [labelmargin + bicspace, pos] + ')'; 
			});
		labels.exit().remove();

		// links
		var links = bics.selectAll('.link')
			.data(function(d) {return d.links;}, function(d) {return d.source.id + '-' + d.target.id;});
		links.enter().append('path')
			.attr('class', 'link')
			.attr('d', function(d) {
				var pos0 = (d.source.bicidx + 0.5) * cellsize, 
					pos1 = (d.target.bicidx + 0.5) * cellsize;
				return 'M' + [labelmargin, pos0] + ' L' + [labelmargin + bicspace, pos1];
			})
			.attr('stroke', function(d) { 
				return d.missing ? linkcolorscale2(d.weight) : linkcolorscale1(d.weight); 
			})
			.attr('stroke-opacity', function(d) {
				return d.missing ? 1.0 : 0.3;
			})
			.on('mouseover', function(d) { mouseoverLink(d3.select(this), d); })
			.on('mouseout', function(d) { mouseoutLink(d3.select(this), d); });
		links.transition()
			.duration(animt)
			.attr('d', function(d) {
				var pos0 = (d.source.bicidx + 0.5) * cellsize, 
					pos1 = (d.target.bicidx + 0.5) * cellsize;
				return 'M' + [labelmargin, pos0] + ' L' + [labelmargin + bicspace, pos1];
			})
			.attr('stroke', function(d) { 
				return d.missing ? linkcolorscale2(d.weight) : linkcolorscale1(d.weight); 
			})
			.attr('stroke-opacity', function(d) {
				return d.missing ? 1.0 : 0.3;
			});
		links.exit().remove();
	}

	function computeLayoutMT() {
		var xshfits = [0, 0, 0, 0];
		self.dataobject.allbiclusters.forEach(function(bic, i) {
			for(var n = 0; n < 2; n++) {
				for(var i = 0; i < bic.nodes[n].length; i++) {
					bic.nodes[n][i].bicidx = i;
				}
			}

			bic.w = bic.nodes[1].length * cellsize + labelmargin + bicmarginx * 2;
			xshfits[bic.type + 1] = Math.max(xshfits[bic.type + 1], bic.w);
		});

		xshfits[1] = xshfits[1] + 50;
		xshfits[2] = xshfits[1] + xshfits[2] + 50;
		xshfits[3] = xshfits[2] + xshfits[3];

		var yshifts = [0, 0, 0];
		self.dataobject.allbiclusters.forEach(function(bic, i) {
			bic.xshfit = xshfits[bic.type];
			bic.yshfit = yshifts[bic.type];

			bic.h = bic.nodes[0].length * cellsize + labelmargin + bicmarginy * 2;
			yshifts[bic.type] += bic.h;
		}); 

		self.size[0] = xshfits[3] + 2 * self.margin;
		self.size[1] = _.max(yshifts) + 2 * self.margin;
		self.svg.attr('width', self.size[0])
	 		.attr('height', self.size[1]);
	}

	function computeLayoutNL() {
		var yshifts = [0, 0, 0];
		self.dataobject.allbiclusters.forEach(function(bic, i) {
			for(var n = 0; n < 2; n++) {
				for(var i = 0; i < bic.nodes[n].length; i++) {
					bic.nodes[n][i].bicidx = i;
				}
			}

			bic.xshfit = bic.type * self.size[0] / 3;
			bic.yshfit = yshifts[bic.type];

			bic.w = labelmargin * 2 + bicspace + bicmarginx * 2;
			bic.h = Math.max(bic.nodes[0].length, bic.nodes[1].length) * cellsize + bicmarginy * 2;

			yshifts[bic.type] += bic.h;
		}); 

		self.size[1] = _.max(yshifts) + 2 * self.margin;
		self.svg.attr('height', self.size[1]);

		// self.size[0] = xshfit + 2 * self.margin;
		// self.svg.attr('width', self.size[0]);
	}

	function computeBicSimilarity(biclist1, biclist2) {
		var similarities = [];
		for(var i = 0; i < biclist1.length; i++) {
			for(var j = 0; j < biclist2.length; j++) {
				var score = self.dataobject.getBicSimilarity(biclist1[i], biclist2[j]);
				similarities.push({bics: [biclist1[i], biclist2[j]], score: score});
			}
		}

		return similarities;
	}

	function mouseoverLink(elem, d) {
		self.svgDrawing.selectAll('.link')
			.filter(function(t) {
				if(t.source.id == d.source.id && t.target.id == d.target.id)
					return true;
			})
			.classed('highlight', true);

		self.svgDrawing.selectAll('.tlabel')
			.filter(function(t) {
				if(t.id == d.source.id || t.id == d.target.id)
					return true;
			})
			.classed('highlight', true);

		if(d.rank)
			$(self.info).html('#' + d.rank + ' ' + d.source.id + ' - ' + d.target.id + ' : ' + d.weight);
		else
			$(self.info).html(d.source.id + ' - ' + d.target.id + ' : ' + d.weight);
	
		self.emit('mouseoverLink', 'ClusterView', d);
	}

	function mouseoutLink(elem, d) {
		self.svgDrawing.selectAll('.tlabel.highlight, .link.highlight')
			.classed('highlight', false);

		$(self.info).html('');

		self.emit('mouseoutLink', 'ClusterView', d);
	}

	function mouseoverCluster(elem, d) {
		elem.classed('highlight', true);
		self.svgDrawing.selectAll('.biclink')
			.filter(function(n) {
				return d.id == n.bics[0].id || d.id == n.bics[1].id;
			})
			.classed('highlight', true);
		self.emit('mouseoverCluster', 'ClusterView', d);
	}
	
	function mouseoutCluster(elem, d) {
		elem.classed('highlight', false);
		self.svgDrawing.selectAll('.biclink.highlight')
			.classed('highlight', false);
		self.emit('mouseoutCluster', 'ClusterView', d);
	}

	function mouseoverLabel(elem, d) {
		self.svgDrawing.selectAll('.tlabel')
			.filter(function(t) {
				if(t.id == d.id)
					return true;
			})
			.classed('highlight', true);
		$(self.info).html(d.id);
		self.emit('mouseoverLabel', 'ClusterView', d);
	}
	
	function mouseoutLabel(elem, d) {
		self.svgDrawing.selectAll('.tlabel.highlight')
			.classed('highlight', false);
		$(self.info).html('');
		self.emit('mouseoutLabel', 'ClusterView', d);
	}
}

util.inherits(ClusterView, events.EventEmitter);

module.exports = ClusterView;

