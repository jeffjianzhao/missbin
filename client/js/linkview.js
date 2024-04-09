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

function LinkView(container, dataobject, options) {
	var self = this;

	//public fields///////////////////////////////////////////////////////////////////////////
	self.container = container;
	self.dataobject = dataobject;
	self.svg = null;
	self.svgDrawing = null;
	self.size = options.size || [100, 800];	
	self.margin = options.margin || 5;
	self.info = options.info;

	//private fields///////////////////////////////////////////////////////////////////////////
	var renderedlinks = [];
	var predictedlinks = [];

	var animt = 1000;
	var cellsize = 10;
	var labelmargin = 30;
	var linkcolorscale2 = d3.scaleSequential(d3.interpolatePurples).domain([-0.2, 1.2]);
	
	//public methods///////////////////////////////////////////////////////////////////////////
	self.init = function() {
 		self.svg = d3.select(container).append('svg')
	 		.attr('width', self.size[0])
	 		.attr('height', self.size[1]);

 		self.svgDrawing = self.svg.append('g')
 			.attr('transform', 'translate(' + self.margin + ',' + self.margin + ')');

 		self.dataobject.on('link predicted', self.update);
 		self.dataobject.on('matrix updated', self.redraw);
	}

	self.update = function() {
		predictedlinks = _.sortBy(_.values(self.dataobject.missinglinks), function(d) {return d.rank;});
		self.size[1] = predictedlinks.length * cellsize + self.margin * 2;
		self.svg.attr('width', self.size[0]).attr('height', self.size[1]);

		self.redraw();
	}

	self.redraw = function() {
		renderedlinks = _.values(self.dataobject.addedlinks);

		predictedlinks.forEach(function(lk) {
			if(!self.dataobject.addedlinks[lk.source.id + '-' + lk.target.id])
				renderedlinks.push(lk);
		});

		for(var i = 0; i < renderedlinks.length; i++)
			renderedlinks[i].idx = i;

		var links = self.svgDrawing.selectAll(".linkitem")
			.data(renderedlinks, function(d) {return d.source.id + '-' + d.target.id;});

		var linksEnter = links.enter().append('g')
			.attr('class', 'linkitem')
			.attr('transform', function(d) {return 'translate(0,' + d.idx * cellsize + ')'; })
			.on('mouseover', function(d) { mouseoverLink(d3.select(this), d); })
			.on('mouseout', function(d) { mouseoutLink(d3.select(this), d); });

		linksEnter.append('rect')
			.attr('class', 'link')
			.attr('x', 25)
			.attr('y', 1)
			.attr('width', cellsize - 2)
			.attr('height', cellsize - 2)
			.attr('fill', function(d) { return linkcolorscale2(d.weight); });
		linksEnter.append('path')
			.attr('class', 'link added')
			.attr('transform', 'translate(25,0)')
			.attr('d', function(d) {
				if(self.dataobject.addedlinks[d.source.id + '-' + d.target.id])
					return 'M0,0 L' + [cellsize, cellsize] + 'M' + [cellsize, 0] + 'L' + [0, cellsize]
			});
		linksEnter.append('text')
			.attr('class', 'rank')
			.attr('x', 0)
			.attr('y', cellsize / 2)
			.text(function(d) {return d.rank;})
		linksEnter.append('text')
			.attr('class', 'lkname')
			.attr('x', 36)
			.attr('y', cellsize / 2)
			.text(function(d) {return d.source.id + ' - ' + d.target.id;})

		links.transition()
			.duration(animt)
			.attr('transform', function(d) {return 'translate(0,' + d.idx * cellsize + ')'; })
		links.selectAll('.link.added')
			.attr('d', function(d) {
				if(self.dataobject.addedlinks[d.source.id + '-' + d.target.id])
					return 'M0,0 L' + [cellsize, cellsize] + 'M' + [cellsize, 0] + 'L' + [0, cellsize]
			})
		links.select('.rank')
			.text(function(d) {return d.rank;})
		links.select('.lkname')
			.text(function(d) {return d.source.id + ' - ' + d.target.id;})

		links.exit().remove()
	}


	self.highlightLink = function(d, isin) {
		if(isin) {
			self.svgDrawing.selectAll('.linkitem')
				.filter(function(l) {
					if(l.source.id == d.source.id && l.target.id == d.target.id)
						return true;
				})
				.classed('highlight', true);
		}
		else
			self.svgDrawing.selectAll('.linkitem.highlight')
				.classed('highlight', false);
	}

	//private methods///////////////////////////////////////////////////////////////////////////

	function mouseoverLink(elem, d) {
		elem.classed('highlight', true);

		if(d.rank)
			$(self.info).html('#' + d.rank + ' ' + d.source.id + ' - ' + d.target.id + ' : ' + d.weight);
		else
			$(self.info).html(d.source.id + ' - ' + d.target.id + ' : ' + d.weight);
				
		self.emit('mouseoverLink', 'LinkView', d);
	}

	function mouseoutLink(elem, d) {
		elem.classed('highlight', false);
	
		$(self.info).html('');

		self.emit('mouseoutLink', 'LinkView', d);
	}
};


util.inherits(LinkView, events.EventEmitter);

module.exports = LinkView;