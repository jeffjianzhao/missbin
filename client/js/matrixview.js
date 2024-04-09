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

function MatrixView(container, dataobject, options = {}) {
	var self = this;

	//public fields///////////////////////////////////////////////////////////////////////////
	self.container = container;
	self.dataobject = dataobject;
	self.svg = null;
	self.svgDrawing = null;
	self.size = options.size || [800, 800];
	self.margin = options.margin || 15;
	self.info = options.info;

	//private fields///////////////////////////////////////////////////////////////////////////
	var animt = 1000;
	var cellsize = 10;
	var labelmargin = 30;
	var linkcolorscale1 = d3.scaleSequential(d3.interpolateYlGn).domain([-0.2, 1.2]),
		linkcolorscale2 = d3.scaleSequential(d3.interpolatePurples).domain([-0.2, 1.2]);

	//public methods///////////////////////////////////////////////////////////////////////////
 	self.init = function() {
 		self.svg = d3.select(container).append('svg')
	 		.attr('width', self.size[0])
	 		.attr('height', self.size[1]);

 		self.svgDrawing = self.svg.append('g')
 			.attr('transform', 'translate(' + self.margin + ',' + self.margin + ')');
 		self.svgDrawing.append('g')
 			.attr('class', 'backlayer');
 		self.svgDrawing.append('g')
 			.attr('class', 'frontlayer');

 		self.dataobject.on('data loaded', self.update);
 		self.dataobject.on('link predicted', self.redraw);
 		self.dataobject.on('matrix updated', self.redraw);
	}

	self.update = function() {
		self.size[0] = self.dataobject.matrix[1].length * cellsize + self.margin * 2 + labelmargin + 10;
		self.size[1] = self.dataobject.matrix[0].length * cellsize + self.margin * 2 + labelmargin + 10;
		self.svg.attr('width', self.size[0]).attr('height', self.size[1]);
		
		self.redraw();
	}

	self.redraw = function() {
		// rows
		var nodes = self.svgDrawing.select('.backlayer').selectAll('.node.row')
			.data(self.dataobject.matrix[0], function(d) {return d.id;});

		var nodesEnter = nodes.enter().append('g')
			.attr('class', 'node row')
			.attr('transform', function(d) {
				var px = labelmargin + d.idx * cellsize;
				return 'translate(' + [labelmargin, px] + ')'; 
			});
		nodesEnter.append('rect')
			.attr('class', 'tbox row')
			.attr('x', 0)
			.attr('y', 0)
			.attr('height', cellsize)
			.attr('width', self.dataobject.matrix[1].length * cellsize);
		nodesEnter.append('text')
			.attr('class', 'tlabel row')
			.attr('x', 0)
			.attr('y', cellsize / 2)
			.on('mouseover', function(d) { mouseoverLabel(d3.select(this), d); })
			.on('mouseout', function(d) { mouseoutLabel(d3.select(this), d); })
			.on('click', function(d) { clickLabel(d3.select(this), d); })
			.text(function(d) {return d.id;});
		nodes.transition()
			.duration(animt)
			.attr('transform', function(d) {
				var px = labelmargin + d.idx * cellsize;
				return 'translate(' + [labelmargin, px] + ')'; 
			});
		nodes.exit().remove();
	
		// columns
		nodes = self.svgDrawing.select('.backlayer').selectAll('.node.col')
			.data(self.dataobject.matrix[1], function(d) {return d.id;});

		nodesEnter = nodes.enter().append('g')
			.attr('class', 'node col')
			.attr('transform', function(d) {
				var px = labelmargin + d.idx * cellsize;
				return 'translate(' + [px, labelmargin] + ')'; 
			});
		nodesEnter.append('rect')
			.attr('class', 'tbox col')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', cellsize)
			.attr('height', self.dataobject.matrix[0].length * cellsize);
		nodesEnter.append('text')
			.attr('class', 'tlabel col')
			.attr('x', cellsize / 2)
			.attr('y', 0)
			.attr('transform', 'rotate(-60)')
			.on('mouseover', function(d) { mouseoverLabel(d3.select(this), d); })
			.on('mouseout', function(d) { mouseoutLabel(d3.select(this), d); })
			.on('click', function(d) { clickLabel(d3.select(this), d); })
			.text(function(d) {return d.id;});
		nodes.transition()
			.duration(animt)
			.attr('transform', function(d) {
				var px = labelmargin + d.idx * cellsize;
				return 'translate(' + [px, labelmargin] + ')';
			});
		nodes.exit().remove();

		// existing links
		var links = self.svgDrawing.select('.backlayer').selectAll('.link.existing')
			.data(_.values(self.dataobject.links), function(d) {return d.source.id + '-' + d.target.id;});

		links.enter().append('rect')
			.attr('class', 'link existing')
			.attr('x', function(d) {
				return labelmargin + d.target.idx * cellsize + 1;
			})
			.attr('y', function(d) {
				return labelmargin + d.source.idx * cellsize + 1;
			})
			.attr('width', cellsize - 2)
			.attr('height', cellsize - 2)
			.attr('fill', function(d) { return linkcolorscale1(d.weight); })
			.on('mouseover', function(d) { mouseoverLink(d3.select(this), d); })
			.on('mouseout', function(d) { mouseoutLink(d3.select(this), d); });
			//.on('click', function(d) { clickLink(d3.select(this, d));});
		links.transition()
			.duration(animt)
			.attr('x', function(d) {
				return labelmargin + d.target.idx * cellsize + 1;
			})
			.attr('y', function(d) {
				return labelmargin + d.source.idx * cellsize + 1;
			})
			.attr('fill', function(d) { return linkcolorscale1(d.weight);});
		links.exit().remove();

		// missing links
		links = self.svgDrawing.select('.backlayer').selectAll('.link.missing').data(
			_.values(self.dataobject.missinglinks).filter(function(d) {
				return d.weight >= self.dataobject.linkfilter[0] && d.weight <= self.dataobject.linkfilter[1];
			}), function(d) {return d.source.id + '-' + d.target.id;});

		links.enter().append('rect')
			.attr('class', 'link missing')
			.attr('x', function(d) {
				return labelmargin + d.target.idx * cellsize + 1;
			})
			.attr('y', function(d) {
				return labelmargin + d.source.idx * cellsize + 1;
			})
			.attr('width', cellsize - 2)
			.attr('height', cellsize - 2)
			.attr('fill', function(d) { return linkcolorscale2(d.weight);})
			.on('mouseover', function(d) { mouseoverLink(d3.select(this), d); })
			.on('mouseout', function(d) { mouseoutLink(d3.select(this), d); })
			.on('click', function(d) { clickLink(d3.select(this), d);});
		links.transition()
			.duration(animt)
			.attr('x', function(d) {
				return labelmargin + d.target.idx * cellsize + 1;
			})
			.attr('y', function(d) {
				return labelmargin + d.source.idx * cellsize + 1;
			})
			.attr('fill', function(d) { return linkcolorscale2(d.weight);});
		links.exit().remove();

		// added links
		links = self.svgDrawing.select('.frontlayer').selectAll('.link.added')
			.data(_.values(self.dataobject.addedlinks), function(d) {return d.source.id + '-' + d.target.id;});

		links.enter().append('path')
			.attr('class', 'link added')
			.attr('transform', function(d) {
				var x = labelmargin + d.target.idx * cellsize + 0.5,
					y = labelmargin + d.source.idx * cellsize + 0.5;
				return 'translate(' + x + ',' + y + ')';
			})
			.attr('d', 'M0,0 L' + [cellsize, cellsize] + 'M' + [cellsize, 0] + 'L' + [0, cellsize])
			.on('mouseover', function(d) { mouseoverLink(d3.select(this), d); })
			.on('mouseout', function(d) { mouseoutLink(d3.select(this), d); })
			.on('click', function(d) { clickLink(d3.select(this), d);});
		links.transition()
			.duration(animt)
			.attr('transform', function(d) {
				var x = labelmargin + d.target.idx * cellsize + 0.5,
					y = labelmargin + d.source.idx * cellsize + 0.5;
				return 'translate(' + x + ',' + y + ')';
			});

		links.exit().remove();
	}

	self.highlightNode = function(d, isin, classes) {
		if(isin) {
			if(Array.isArray(d)) {
				self.svgDrawing.selectAll('.node')
					.filter(function(t) {
						if(d.indexOf(t.id) != -1)
							return true;
					})
					.selectAll(classes)
					.classed('highlight', true); 
			}
			else {
				self.svgDrawing.selectAll('.node')
					.filter(function(t) {
						if(t.id == d)
							return true;
					})
					.selectAll(classes)
					.classed('highlight', true);
			} 
		}
		else
			self.svgDrawing.selectAll('.tlabel.highlight, .tbox.highlight')
				.classed('highlight', false);
	}

	self.highlightLink = function(d, isin) {
		if(isin) {
			self.svgDrawing.selectAll('.node')
				.filter(function(t) {
					if(t.id == d.source.id || t.id == d.target.id)
						return true;
				})
				.selectAll('.tlabel')
				.classed('highlight', true);

			self.svgDrawing.selectAll('.link')
				.filter(function(l) {
					if(l.source.id == d.source.id && l.target.id == d.target.id)
						return true;
				})
				.classed('highlight', true);
		}
		else
			self.svgDrawing.selectAll('.link.highlight, .tlabel.highlight')
				.classed('highlight', false);
	}

	//private methods///////////////////////////////////////////////////////////////////////////
	function mouseoverLink(elem, d) {
		elem.classed('highlight', true);

		self.svgDrawing.selectAll('.node')
			.filter(function(t) {
				if(t.id == d.source.id || t.id == d.target.id)
					return true;
			})
			.selectAll('.tlabel, .tbox')
			.classed('highlight', true);

		if(d.rank)
			$(self.info).html('#' + d.rank + ' ' + d.source.id + ' - ' + d.target.id + ' : ' + d.weight);
		else
			$(self.info).html(d.source.id + ' - ' + d.target.id + ' : ' + d.weight);
				
		self.emit('mouseoverLink', 'MatrixView', d);
	}

	function mouseoutLink(elem, d) {
		elem.classed('highlight', false);

		self.svgDrawing.selectAll('.tlabel.highlight, .tbox.highlight')
			.classed('highlight', false);
	
		$(self.info).html('');

		self.emit('mouseoutLink', 'MatrixView', d);
	}

	function clickLink(elem, d) {
		self.dataobject.addLink(d);
		
		self.emit('mouseclickLink', 'MatrixView', d);
	}

	function mouseoverLabel(elem, d) {
		elem.classed('highlight', true);
		$(self.info).html(d.id);
		self.emit('mouseoverLabel', 'MatrixView', d);
	}
	
	function mouseoutLabel(elem, d) {
		elem.classed('highlight', false);
		$(self.info).html('');
		self.emit('mouseoutLabel', 'MatrixView', d);
	}

	function clickLabel(elem, d) {
		console.log(d)
	}
}



util.inherits(MatrixView, events.EventEmitter);

module.exports = MatrixView;