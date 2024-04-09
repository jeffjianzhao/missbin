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

function TableView(container, dataobject, options) {
	var self = this;

	//public fields///////////////////////////////////////////////////////////////////////////
	self.container = container;
	self.dataobject = dataobject;
	self.size = options.size || [800, 400];
	self.table = '#metrics';

	//private fields///////////////////////////////////////////////////////////////////////////
	var labels = ['node ID', 'degree (before)', 'degree (after)', 'closeness (before)', 'closeness (after)', 
		'betweenness (before)', 'betweenness (after)'];
	var tableinstance = null;

	//public methods///////////////////////////////////////////////////////////////////////////
	self.init = function() {
		$(self.container).append('<table id="metrics" class="row-border hover order-column"></table>');
		
		var headerrow = $('<tr/>');	

		labels.forEach(function(name) {
			headerrow.append('<th>' + name + '</th>');
		});

		$(self.table).append($('<thead/>').append(headerrow)).append('<tbody></tbody>');

		tableinstance = $(self.table).DataTable({
			'columnDefs': [
				{
					'targets': [1, 3, 5], 
					'render': function (data, type, row, meta) {
						return data.toPrecision(5);
					}
				},
				{
					'targets': [2, 4, 6], 
					'render': function (data, type, row, meta) {
						if(data && row[meta.col - 1] && row[meta.col - 1] != data)
							return '<span class="highlight">' + data.toPrecision(5) + '</span>';
						else
							return data.toPrecision(5);
					}
				}
			],
			'rowId': function (data, type, row, meta) { return data[0]; },
			'ordering': false,
			'paging': false,
			'scrollY': self.size[1],
  			'scrollCollapse': true,
  			'select': {
  				'style': 'single'
  			}
		});

		self.dataobject.on('graph computed', self.render);
	}

	self.render = function() {
		tableinstance.clear();
		
		for(var i = 0; i < 2; i++) {
			self.dataobject.matrix[i].forEach(function(n) {
				var row = [n.id];
				['degree', 'closeness', 'betweenness'].forEach(function(m) {
					var num1 = self.dataobject.originalgraphmetrics[m][n.id];
					num1 = num1 ? num1 : 0;
					row.push(num1);

					var num2 = self.dataobject.graphmetrics[m][n.id];
					num2 = num2 ? num2 : 0;
					row.push(num2);
				});

				tableinstance.row.add(row);
			});
		}
		
		tableinstance.draw();

		$(self.table + ' tr').hover(function() {
			self.emit('mouseoverRow', 'TableView', tableinstance.row(this).data()[0]);
		}, function() {
			self.emit('mouseoutRow', 'TableView', tableinstance.row(this).data()[0]);
		});
	}

	self.scrollto = function(data, isin) {
		if(isin) {
			$(tableinstance.row('#' + data.id).node()).addClass('selected');
			$('.dataTables_scrollBody').stop().animate({
				'scrollTop': tableinstance.$("tr.selected").position().top - 30
			});
		}
		else {
			$(tableinstance.row('#' + data.id).node()).removeClass('selected');
		}
	}

	//private methods///////////////////////////////////////////////////////////////////////////
}


util.inherits(TableView, events.EventEmitter);

module.exports = TableView;