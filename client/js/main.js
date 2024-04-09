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

var DataModel = require('./datamodel.js');
var MatrixView = require('./matrixview.js');
var ClusterView = require('./clusterview.js');
var LinkView = require('./linkview.js');
var MDSView = require('./mdsview.js');
var TableView = require('./tableview.js');

window.visapp = {};
visapp.datamodel = new DataModel();

var app_parameter = {
	// need to consistent with the data folder on the server side
	data: 'data/crescent.json',
	prediction_methods: ['none', 'bc_adamic_adar', 'bc_common_neighbors', 'bc_jaccard', 'bc_preferential_attachement', 'bc_random_walk']
};

$(document).ready(function() {
	var urlquery = location.search.substring(1);
	if(urlquery) {
		urlquery.split('&').forEach(function(part) {
			var item = part.split('=');
    		app_parameter[item[0]] = decodeURIComponent(item[1]);
    		if(app_parameter[item[0]].indexOf(',') != -1)
    			app_parameter[item[0]] = app_parameter[item[0]].split(',');
		});
	}

	initUI();
	initVis();
	viewLinking(); 
});


function initUI() {
	app_parameter.prediction_methods.forEach(element => {
		$('#method').add('<option>' + element + '</option>')
	});

	$('#method').selectmenu({ 
		change: function(event, ui) {
			visapp.datamodel.predict(ui.item.value);
		}
	});

	$('#threshold').slider({
		range: true,
		min: 0,
		max: 1000,
		values: [0, 1000],
		slide: function(event, ui) {
			visapp.datamodel.filter([ui.values[0] / 1000, ui.values[1] / 1000]);
		}
	});

	$('#sort').selectmenu({ 
		change: function(event, ui) {
			visapp.datamodel.sort(ui.item.value.substring(3), 2);
		}
	});

	// $('#rowsort').selectmenu({ 
	// 	change: function(event, ui) {
	// 		visapp.datamodel.sort(ui.item.value.substring(3), 0);
	// 	}
	// });

	// $('#colsort').selectmenu({ 
	// 	change: function(event, ui) {
	// 		visapp.datamodel.sort(ui.item.value.substring(3), 1);
	// 	}
	// });

	$('#compute').button().click(function() {
		visapp.datamodel.bicluster();
		visapp.datamodel.computegraph();
	});

	$('#bicsort').selectmenu({ 
		change: function(event, ui) {
			visapp.datamodel.sortbic(ui.item.value.substring(3));
		}
	});

	// $('#matrixview').resizable({
	// 	resize: function(event, ui) {
	// 		$('#clusterview').height(ui.size.height);
	// 	}
	// });

	// $('#clusterview').resizable({
	// 	resize: function(event, ui) {
	// 		$('#matrixview').height(ui.size.height);
	// 	}
	// });

	generateLegend('#legend1', d3.scaleSequential(d3.interpolateYlGn).domain([-0.2, 1.2]))
	generateLegend('#legend2', d3.scaleSequential(d3.interpolatePurples).domain([-0.2, 1.2]))
}

function initVis() {
	visapp.datamodel.loadData(app_parameter.data);

	$('#matrixview').width(660).height(520);
	visapp.matrixview = new MatrixView('#matrixview', 
		visapp.datamodel, 
		{size: [650, 510], info: '#infopanel'}
	);
	visapp.matrixview.init();

	$('#linkview').width(110).height(520);
	visapp.linkview = new LinkView('#linkview', 
		visapp.datamodel, 
		{size: [100, 510], info: '#infopanel'}
	);
	visapp.linkview.init();

	$('#clusterview').width(630).height(520);
	visapp.clusterview = new ClusterView('#clusterview', 
		visapp.datamodel, 
		{size: [620, 510], info: '#infopanel'}
	);
	visapp.clusterview.init();

	$('#mdsview').width(300).height(300);
	visapp.mdsview = new MDSView('#mdsview', 
		visapp.datamodel, 
		{size: [290, 290], info: '#infopanel'}
	);
	visapp.mdsview.init();

	$('#tableview').width(1100).height(300);
	visapp.talbeview = new TableView('#tableview', visapp.datamodel, {size: [1090, 220]});
	visapp.talbeview.init();

	visapp.datamodel.on('data loaded', function() {
		visapp.datamodel.predict($('#method').val());
	});
}

function viewLinking() {
	// matrixview
	visapp.matrixview.on('mouseoverLabel', function(name, data) {
		visapp.talbeview.scrollto(data, true);
		visapp.clusterview.highlightNode(data, true);
	});

	visapp.matrixview.on('mouseoutLabel', function(name, data) {
		visapp.talbeview.scrollto(data, false);
		visapp.clusterview.highlightNode(data, false);
	});

	visapp.matrixview.on('mouseoverLink', function(name, data) {
		visapp.clusterview.highlightLink(data, true);
		visapp.linkview.highlightLink(data, true);
	});

	visapp.matrixview.on('mouseoutLink', function(name, data) {
		visapp.clusterview.highlightLink(data, false);
		visapp.linkview.highlightLink(data, false);
	});

	visapp.matrixview.on('mouseclickLink', function(name, data) {
		visapp.linkview.redraw();
	});

	// clusterview
	visapp.clusterview.on('mouseoverLink', function(name, data) {
		visapp.matrixview.highlightLink(data, true);
		visapp.linkview.highlightLink(data, true);
	});

	visapp.clusterview.on('mouseoutLink', function(name, data) {
		visapp.matrixview.highlightLink(data, false);
		visapp.linkview.highlightLink(data, false);
	});

	visapp.clusterview.on('mouseoverCluster', function(name, data) {
		var nodes = data.nodes[0].map(function(n) {return n.id;});
		nodes = nodes.concat(data.nodes[1].map(function(n) {return n.id;}))
		visapp.matrixview.highlightNode(nodes, true, '.tbox');
		visapp.mdsview.highlightCluster(data, true);
	});

	visapp.clusterview.on('mouseoutCluster', function(name, data) {
		visapp.matrixview.highlightNode(data, false);
		visapp.mdsview.highlightCluster(data, false);
	});

	visapp.clusterview.on('mouseoverLabel', function(name, data) {
		visapp.talbeview.scrollto(data, true);
	});

	visapp.clusterview.on('mouseoutLabel', function(name, data) {
		visapp.talbeview.scrollto(data, false);
	});
	// mds view
	visapp.mdsview.on('mouseoverCluster', function(name, data) {
		var nodes = data.nodes[0].map(function(n) {return n.id;});
		nodes = nodes.concat(data.nodes[1].map(function(n) {return n.id;}))
		visapp.matrixview.highlightNode(nodes, true, '.tbox');
		visapp.clusterview.highlightCluster(data, true);
	});

	visapp.mdsview.on('mouseoutCluster', function(name, data) {
		visapp.matrixview.highlightNode(data, false);
		visapp.clusterview.highlightCluster(data, false);
	});

	// linkview
	visapp.linkview.on('mouseoverLink', function(name, data) {
		visapp.matrixview.highlightLink(data, true);
		visapp.clusterview.highlightLink(data, true);
	});
	visapp.linkview.on('mouseoutLink', function(name, data) {
		visapp.matrixview.highlightLink(data, false);
		visapp.clusterview.highlightLink(data, false);
	});

	// tableview
	visapp.talbeview.on('mouseoverRow', function(name, data) {
		visapp.matrixview.highlightNode(data, true, '.tlabel, .tbox');
	});

	visapp.talbeview.on('mouseoutRow', function(name, data) {
		visapp.matrixview.highlightNode(data, false);
	});
}

function updateLinkView() {
	$('#linkview').empty();
	for(var key in visapp.datamodel.addedlinks){
		var lk = visapp.datamodel.addedlinks[key];
		$('#linkview').append('<span class="linkspan">' + lk.source.id + '-' + lk.target.id + '</span>');
	}

	$('#linkview .linkspan').hover(function() {
		var nodes = $(this).html().split('-'),
			fakelink = {source: {id: nodes[0]}, target: {id: nodes[1]}};
		visapp.matrixview.highlightLink(fakelink, true);
	}, function() {
		var nodes = $(this).html().split('-'),
			fakelink = {source: {id: nodes[0]}, target: {id: nodes[1]}};
		visapp.matrixview.highlightLink(fakelink, false);
	});	
}

function generateLegend(elem, colorscale) {
	var svg = d3.select(elem)
	var ticks = [0, 0.2, 0.4, 0.6, 0.8, 1]
	svg.selectAll('rect')
		.data(ticks)
		.enter()
		.append('rect')
		.attr('x', function(d, i) { return i * 15 })
		.attr('y', 15)
		.attr('width', 15)
		.attr('height', 15)
		.style('fill',  function(d) { return colorscale(d) })

	svg.selectAll('text')
		.data(ticks)
		.enter()
		.append('text')
		.attr('x', function(d, i) { return i * 15 })
		.attr('y', 15)
		.style('font-size', 8)
		.text(function(d) {return d.toFixed(1)})
}






