// UNCLASSIFIED 

/**
 * @module guides 
 * This client module interfaces with [Totem's api](/api.view) to support [Totem's content management](/skinguide.view) 
 * function using [Totem's jquery framework](/jquery.view).  This framework typically loads itself as follows:
 * 
 *		script(src='/clients/jQuery/js/jquery-1.11.0.min.js')
 *		script(src='/clients/jQuery/ui/jquery-ui-1.10.3.custom.min.js')
 * 		script(src='/clients/guides.js')
*/

var GUIDES = {
};

/*
// jqGrid setup
// Having trouble with this.  Grid comes up but dom hangs.

copy({
	loadtext: "Loading data ...",
	recordtext: "View {0} - {1} of {2}",
	emptyrecords: "No records to view",
	pgtext : "Page {0} of {1}"
}, $.jgrid.defaults);
	
$.jgrid.defaults.jsonReader = {
	root:"data",
	page: null,
	total: null,
	records: "count",
	repeatitems: false,
	id: "ID"
};

$.jgrid.defaults.prmNames = {
	page: "_page", 			// requested page (default = page)
	rows: "_limit", 		// number of rows requested (default = rows)
	sort: "_sort", 			// sorting column (default = sidx)
	order: "_order", 		// sort order (default = sord)
	search: "_search", 		// search indicator (default = _search)
	nd: "_time", 			// time passed to the request (for IE browsers not to cache the request) (default = nd)
	id: "ID",				// name of the id when posting data in edit modules (default = id)
	oper: "_oper", 			// operation parameter (default = oper)
	editoper: "update", 	// name of operation when the data is posted in edit mode (default = edit)
	addoper: "insert", 		// name of operation when the data is posted in add mode (default = add)
	deloper: "delete", 		// name of operation when the data is posted in delete mode (default = del)
	totalrows: null, 		// number of the total rows to be obtained from server - see rowTotal (default = totalrows)
	subgridid: null 		// name passed when we click to load data in the subgrid (default = id) 			
};
*/

// Functions to generate DOM elements corresponding to each base component

var $plugin = $("");

$plugin.elFinder = elFinder;

var Canvas = "#ImageCanvas",
	Fabric = fabric ? new fabric.Canvas("ImageCanvas") : null;

String.prototype.parse = function (def) {
	
	try {
		return JSON.parse(this);
	}
	catch (err) {
		return def;
	}
}
 
/**
 * @class client.guides.String
 * @method pivot
 * */
String.prototype.pivot = function (items,attrs) {
	function isobuttons(group,list) {
		var x = ""; 
		var at = {class: "button"};
		
		for (var n in list) {
			at["data-"+group] = list[n];
			x += n.tag("button",at);
		}

		return x.tag("div",{id:group,class:"button-group"});
	}
		
	if ($plugin.isotope) 
		return (
			isobuttons('filters', { 		// embed filter buttons
				"show all": "*",
				"filter1": ".metal",
				"filter2": ".transition",
				"filter3": ".alkali, .alkaline-earth",
				"filter4": ":not(.transition)",
				"filter5": ".metal:not(.transition)",
				"number > 50": "numberGreaterThan50",
				"group-stan": "stan"
			}) +
			isobuttons('sorts', { 			// embed sort buttons
				"original order": "original-order",
				"name": "name",
				"symbol": "symbol",
				"number": "number",
				"weight": "weight",
				"age": "age",
				"group": "group"
			}) +
			"".tag("div",{id: 'data'})
		).tag("div",{class: "isotope", path:attrs.path||"", pivots:attrs.pivots||"", debug:attrs.debug||""});
	else
	if ($plugin.elFinder) 
		return "".tag("div",{class: "elFinder", path:attrs.path||"", pivots:attrs.pivots||"", debug:attrs.debug||""});
	else
		return "".tag("div",{class: "apy", path:attrs.path||"", pivots:attrs.pivots||"", debug:attrs.debug||""});
}
	
/**
 * @method accordion
 * */
String.prototype.accordion = function (items) {
	var rtn = this;
	
	items.Each(function (n,item) {
		var $item = $(item),
			Name = item.attr("class");

		rtn += (Name.tag("h3") + $item.html().tag("div")).tag("li");	
	});
	return rtn.tag("ul",{class:"accordion"});
}

/**
 * @method folder
 * */
String.prototype.folder = function (items) {
	var rtn = this;
	var tab = "";
	
	items.Each(function (n,item) {
		var $item = $(item),
			Name = $item.attr("class");
		
		tab += Name.tag("a",{href:"#tab-"+n+""}).tag("li");
		rtn += $item.html().tag("div",{id:"tab-"+n});
	});
	
	return (tab.tag("ul")+rtn).tag("div",{class:"folder"});
}

String.prototype.trace = function () {
	alert(this);
	return this;
}

/**
 * @method post
 * */
String.prototype.post = function (items) {
	return (this.tag("iframe",{src:"http://test.com",width:"100%",height:"100%"}) + "Load").tag("button",{class:"post"});
}

var
	FIELDS = {},
	DARKROOM = null;

String.prototype.image = function (items,attrs) {

	if (Caman) 
		return "".tag("div",{class: "Caman"});
	else
	if (Darkroom) 
		return (
			"".tag("input", {
				id: "ImageText",
				type: "text",
				size: 20
			}) +
			
			"".tag("input", {
				id: "ImageName",
				type: "text",
				size: 20,
				value: attrs.path.substr(1)
			}) +
			
			"".tag("input", {
				id: "ImageParm",
				type: "range",
				min: "0",
				max: "100",
				step: "1",
				value: "0"
			}) +
			
			"".tag("br") +
			"".tag("br") +
			
			"".tag("img", {
				id: "ImageArea",
				src: attrs.path
				//width: 500,
				//height: 500
			}));
	else
	if (fabric) 
		return "".tag("div",{class: "Fabric"});
	else
		return "".tag("div",{class: "NULL"});
}

/**
 * @method grid
 */
String.prototype.grid = function (items,attrs) {
	function parse(cols,fields,fmt) {
		var rtn = "";
		
		var spans = cols.parse(null,  			// returns number of columns being spanned
			function (tok,args,depth,asm) {		// called for Each token. returns number of columns being spanned
				if (args) {
					var sum = 0;
					
					args.Each( function (n,count) {	// sum all columns being spanned
						sum += count;
					});
					
					asm.push({
						entry: tok,
						count: sum });
						
					return sum;
				}
				else {							// field column being spanned
					if (fmt) {
						var parts = (tok+"..").split(".");	
						var rtn = {}, idx = {"name":0,"type":1,"label":2};
						
						parts[2] = parts[2] || parts[0];

						Each(fmt, function (n,mask) {
							if (n in idx)
								rtn[mask] = parts[idx[n]];
							else 
								rtn[n] = mask;
						});
						
						fields.push(rtn);
					}
					else 
						fields.push(tok);
					
					asm.push({
						entry: tok,
						count: 0 });
				
					return 1;
				}
			},
			
			function (asm,depth,count) {		// final call combines entries in assembly at given row depth
				var row = "";
				
				asm.Each(function (n,tok) {
					if (tok.count) 
						row += tok.entry.tag("th",{colspan:tok.count});
					else
						row += tok.entry.tag("th",{rowspan:count-depth});
				});
				
				rtn += row.tag("tr");
			}
		);
		
		return rtn;
	}
	
	var fields = FIELDS[attrs.Name] = [];
	//alert("w2grid="+$plugin.w2grid);
	//alert("jqgrid="+$plugin.jqGrid);
	//alert("datagrid="+$plugin.dataTable);
	
	if ($plugin.w2grid) {
		var rtn = parse(attrs.cols,fields, {
			name: "field",
			label: "caption",
			size: "50px",
			//render: "text",
			sortable: true,
			resizable: true,
			hidable: true,
			editable: {type: "text"}
		});
		
		return "".tag("table", {
			name: attrs.Name,
			style: "width:1000px;height:500px;",
			class: "w2grid",
			path: attrs.path,
			cols: attrs.cols
		});
	}
	else
	if ($plugin.jqGrid) {
		parse(attrs.cols,fields, {
			name: "index",
			label: "name",
			width: 55
		});
		
		return "".tag("table", {
			class: "jqGrid",
			id: attrs.Name,
			path: attrs.path,
			cols: attrs.cols
		});
	}
	else
	if ($plugin.dataTable) {
		var rtn = parse(attrs.cols,fields);
	
		console.log(attrs.path, attrs.cols);
		return (rtn.tag("thead") + this.tag("tbody")).tag("table",{
			class: "DataTable",
			cellpadding: 0,
			cellspacing: 0,
			border: 0,
			id: attrs.Name,
			path: attrs.path,
			cols: attrs.cols
		});
	}
	else
		return "No grid plugin specified";
}

// Base component widget generators

/**
 * @class client.guides.WIDGET
 * @method render
 * */
function Render() {
	function isostart($data,debug,Data) {		// isotope startup

		function isopivot(data) {
			var x = "", fn = "";

			if (debug) console.log(JSON.stringify(data));
			
			for (var f in data) 
				switch (f) {
					case "w": 		fn += " width"+data[f]; break;
					case "h": 		fn += " height"+data[f]; break;
					case "image":	
						x += "".tag("img",{src:data.image,height:"100%",width:"100%"}); 
						break;
					case "group": 	break;
					case "name": 	x += (data[f]+"").tag( "h3", {class: f}); break;
					default:		x += (data[f]+"").tag( "p", {class: f});
				}
			
			return x.tag("div",{class:"element "+data.group+fn, "group": data.group});
		}
		
		function isotable(data) {
			var x = "";
			
			for (var f in data) 
				switch (f) {
					case "w": 		
					case "h": 		
						break;
					case "image":	
						x += "".tag("img",{src:data.image,height:"100%",width:"100%"}); 
						break;
					default:
						x += (data[f]+"").tag("div", {class: f});
				}
			
			return x.tag("li");
		}

		var table = false;

		// set data into the dom
		
		var xdata = "";
		
		if (Data)
			for (var n=0,N=Data.length; n<N; n++) {
				var data = Data[n];

				xdata += table ? isotable(data) : isopivot(data);
			}
			
		xdata = table
			? xdata.tag("ul", {class: "isotope table-like"})
			: xdata.tag("div",{class: "isotope"});

		$data.html( xdata );

		// establish isotope interfaces
		
		var $container = $data.isotope({			// init Isotope
			itemSelector: '.element',
			layoutMode: 'packery', //'fitRows', //'vertical',
			//masonry: { columnWidth: 100 },
			getSortData: {
				name: '.name',
				symbol: '.symbol',
				number: '.number parseInt',
				group: '[group]',
				weight: '.weight parseFloat'
				/*function( itemElem ) {
					var weight = $( itemElem ).find('.weight').text();
					return parseFloat( weight.replace( /[\(\)]/g, '') );
				}*/
			}
		});

		var filterFns = {							// filter functions
			numberGreaterThan50: function() {  	// show if number is greater than 50
				var number = $(this).find('.number').text();
				return number > 50;
			},		
			stan: function() {					// show if name ends with -ium
				var name = $(this).find('.name').text();
				return name.match( /stan$/ );
			}
		};

		$('#filters').on( 'click', 'button', function() { 	// bind filter button click
			var filterValue = $( this ).attr('data-filters');
			// use filterFn if matches value
			filterValue = filterFns[ filterValue ] || filterValue;
			$container.isotope({ filter: filterValue });
		});

		$('#sorts').on( 'click', 'button', function() {		// bind sort button click
			var sortValue = $(this).attr('data-sorts');
			$container.isotope({ sortBy: sortValue });
		});
  
		$('.button-group').each( function( i, buttonGroup ) {	// change is-checked class on buttons
			var $buttonGroup = $( buttonGroup );
			$buttonGroup.on( 'click', 'button', function() {
				$buttonGroup.find('.is-checked').removeClass('is-checked');
				$( this ).addClass('is-checked');
			});
		});		
	}
			
	function jqdata(data,level) {				// jqdata startup
		var rtn = "", liat = null;
		
		data.Each(function (n,item) {
			if (!level) if (n==data.length-1) liat = {class:"last"};
			
			if (item.children) {
				rtn += (item.name.tag("span").tag("a",{class:"parent",href:"#"})+jqdata(item.children,level+1)).tag("li",liat);
			}
			else
				rtn += item.name.tag("span").tag("a",{href:"#"}).tag("li",liat);
		});
		
		if (level)
			return rtn.tag("ul").tag("div");
		else 
			return rtn.tag("ul",{class:"menu"}).tag("div",{id:"menu"});
	}		
/*
 * 	if (this.Guard) 
		if (this.Guard == CLIENT_PASS) return;
*/

	$("ul.accordion").accordion( 				// jquery accordions
	/*
 	{ 
		select: function( event, ui ) { 
			//$( "#" + Parms.Slider + ":first" ).slider( "value", ui.index ); 
		},
		spinner: Parms.Loading,
		collapsible: true,
		ajaxOptions: 	{ 	//  Cant get ajax to work
			error: function( xhr, status, index, anchor ) {
				$( anchor.hash ).html( "ajax could not load content into tab." );
			},
			async: true
		}, 
		create: function(event, ui) { 						
			$( "a[id$=Post]" ).click(function() {  // ui.panel
				LoadLink = this.href;   
					
				$( "Entry.Post".Is() ).each( function() {
					$(this).load( LoadLink );
				});

				return false;
			});
		}
	}
	*/
	);
	
	$("div.folder").tabs( 						// jquery tab folders
	/*
	{ 
		select: function( event, ui ) { 
			if (Slide) $( "#" + Slider + ":first" ).slider( "value", ui.index ); 
		},
		spinner: Loading,
		collapsible: true,
		ajaxOptions: 	{ 	//  Cant get ajax to work
			error: function( xhr, status, index, anchor ) {
				$( anchor.hash ).html( "ajax could not load content into tab." );
			},
			async: true
		}, 
		create: function(event, ui) { 						
			$( "a[id$=Post]" ).click(function() {  // ui.panel
				LoadLink = this.href;   
					
				$( "Entry.Post".Is() ).each( function() {
					$(this).load( LoadLink );
				});

				return false;
			});
		}
	}
	*/
	);
	
	$("div.apy").each( function () { 			// apy pivots
		var $apy = $(this);
		var path = $apy.attr("path");
		var pivots = $apy.attr("pivots");

		$.ajax({
			type: "GET",
			url: path+"?_tree="+pivots,
			failure: function () {
				alert("apy could not load tree");
			},
			success: function (tree) {
				$apy.html("".pivot(tree.children,0));
			}
		});	
	});
	
	$("div.elFinder").each( function () { 		// elFinder pivots
		var $elFinder = $(this);
		var path = $elFinder.attr("path");
		var pivots = $elFinder.attr("pivots");
		
		$elFinder.elfinder({
			lang: 'ru', 
			url : path+"?_browse="+pivots
		})
		.elfinder('instance');
	});

	$("div.isotope").each( function () { 		// isotope pivots
		var $isotope = $(this);
		var path = $isotope.attr("path");
		var pivots = $isotope.attr("pivots").split(",");
		var debug = $isotope.attr("debug");
		
//alert("iso path="+path+" pivs="+pivots);

		$('#data').each( function () {
			var $data = $(this);

			if (path)
				$.ajax({
					type: "GET",
					url: path,
					failure: function () {
						alert("isotope could not load data");
					},
					success: function (rtn,status) {
						var Data = rtn.parse({}).data;
						
						if (Data)
							for (var n=0,N=Data.length; n<N; n++) {
								var data = Data[n];
								
								Data[n] = {
									group: 	data[pivots[0]] || pivots[0] || "", 
									image:	data[pivots[1]] || pivots[1] || "",
									name: 	data[pivots[2]] || pivots[2] || "",
									symbol: data[pivots[3]] || pivots[3] || "",
									number: parseFloat(data[pivots[4]] || pivots[4] || "0"),
									weight:	parseFloat(data[pivots[5]] || pivots[5] || "0"),
									age:	parseFloat(data[pivots[6]] || pivots[6] || "0"),
									w:		parseInt(data[pivots[7]] || pivots[7] || "1"),
									h:		parseInt(data[pivots[8]] || pivots[8] || "1")
									//links:	data[pivots[8]] || pivots[8] || ""
								};
								
							}

//alert(JSON.stringify(Data[0]));

						isostart($data,debug,Data);
					}
				});
				else 
					isostart($data, debug, [
						{group: "transition", image: "Mercury", name: "Mercury", symbol: "Hg", number: 80, weight: 200.59, w:1, h:1},
						{group: "metalloid",  image: "Tellurium", name: "Tellurium", symbol: "Te", number: 52, weight: 127.6, w:1},
						{group: "post-transition", image: "Bismuth", name: "Bismuth", symbol: "Bi", number: 83, weight: 208.980, w:1, h:1},
						{group: "transition", image: "Cadmium", name: "Cadmium", symbol: "Cd", number: 48, weight: 112.411, h:3},
						{group: "alkaline-earth", image: "Calcium", name: "Calcium", symbol: "Ca", number: 20, weight: 40.078, h:4},
						{group: "transition", image: "Rhenium", name: "Rhenium", symbol: "Re", number: 75, weight: 186.207, w:2, h:1},
						{group: "post-transition", image: "Thallium", name: "Thallium", symbol: "Tl", number: 81, weight: 204.383, w:2, h:1},
						{group: "metalloid", image: "Antimony", name: "Antimony", symbol: "Sb", number: 51, weight: 121.76, w:2, h:1}
					]);
		});
	});
	
	$("table.jqGrid").each( function () { 		// jqgrid grids
		var $this = $(this);
		var name = $this.attr("id");
		var path = $this.attr("path");
		var cols = $this.attr("cols");
		
		$this.jqGrid({ 
			//pager: '#pager2', 
			//sortname: 'ID', 
			//sortorder: "desc", 
			url: path, 
			datatype: "json", 
			colNames: ['ID','Name','Vision','Status','JIRA'], 
			colModel: FIELDS[name],
			/*[ 
				{name:'ID',		index:'ID', 		width:55},
				{name:'Name',	index:'Name', 		width:150},
				{name:'Vision',	index:'Vision', 	width:150},
				{name:'Status',	index:'Status', 	width:150},
				{name:'JIRA',	index:'JIRA', 		width:150}
			], */
			rowNum:10, 	//	number of records to hold in grid
			rowList:[10,20,30], 
			viewrecords: true, 
			caption: name 
		});  
				
		//$this.jqGrid('navGrid','#pager2',{edit:false,add:false,del:false});
	});
	
	$("table.DataTable").each( function () { 	// datatable grids
		var $this = $(this);
		var name = $this.attr("id");
		var path = $this.attr("path");
		var cols = $this.attr("cols");
		
		console.log({
			ajax: path+"?_index="+cols,
			loader: $this.DataTable
		});
		var dTable = $this.dataTable({
			/*ajax: {
				url: path+"?_index="+cols,
				dataSrc: "data"
			},*/
			AjaxSource: path+"?_index="+cols,
			columns: [ {data: "Message"}, {data:"To"} ]
			/*
			bProcessing: true,		// enable to show background proccesing
			bPaginate: true,		// enable to show page fwd/back
			bLengthChange: true,	// enable to show row count
			bSort: true,			// enable to allow multi-column sorting with shift-select
			bAutoWidth: true,
			oLanguage: {
				sSearch: Search all columns:
			},
			bInfo: true,			// show number of records 
			oSearch: {sSearch: ""},
			bFilter: true,			// data filerting
			bjQueryUI: true, 		// jQuery theme roller via sDom
			aoColumnDefs: [{ 		// default column settings
				aTargets: "_all",	// to target specific/all columns
				bVisible: true, 
				bSortable: true,
				bSearchable: true
			}],
			sDom:  '<"H"lfr>t<"F"ip>' // Layout [H]eader with [l]ength,[f]ilter,[r]pProcessing, then [t]able, then [F]ooter with [i]nfo,[p]agination
			* */
		});
		console.log("dtable");
		
		/* Add the events etc before DataTables hides a column */
		if (0)
		$("thead input").keyup( function () {
			/* Filter on the column (the index) of this element */
			
			dTable.fnFilter( this.value, dTable.oApi._fnVisibleToColumnIndex( 
				dTable.fnSettings(), $("thead input").index(this) ) );
		});
	});
	
	// Stupid plugins (like W2) use verbotten "for (n in array)" constructs so need to purge base.js prototypes 

	if ($plugin.w2grid) 
		for (var x in Array.prototype) delete Array.prototype[x];	

	$("table.w2grid").each( function () {
		var $this = $(this);
		var name = $this.attr("name");
		var path = $this.attr("path");
	
		$this.w2grid({  // this is adding ?request={} to path
			name: name,
			header: "list of names",
			show: {
				toolbar: true,
				footer: true,
				columnHeaders: true,
				lineNumbers: true,
				toolbarDelete: true,
				toolbarSave: true,
				toolbarAdd: true
			},
			url: path,
			recid: "ID",
			method: "GET",
			columns: FIELDS[name],
			//searches: [],
			/*
			records: [ 
				{ recid: 2, ID: 2, Starts: (new Date())+"", Stays: 30+"", Message:"hello2",Category:"x",To:"all" },
				{ recid: 1, ID: 1, Starts: (new Date())+"", Stays: 30+"", Message:"hello1",Category:"x",To:"all" },
			],
			* */
			onRequest: function (ev) {
				ev.postData = {};
			},
			recordHeight: 30,
			recordsPerPage: 50,
			//multiSelect: false,
			onLoad: function  (ev) {
//alert(ev.xhr.responseText);
				var data = ev.xhr.responseText.parse({});
				
				data = data.data || [];
				for (var n=0,N=data.length;n<N;n++) {
					data[n].recid = data[n].ID; // stupid W2
				}
				this.add( data );
				ev.preventDefault();
				// $("#grid_W2UIgrid_edit_" + (this.records.length-1)+"_1").focus();
			}
		});
	});
	
	$("table.print").each( function () {  		// print grids
	});

	$("img#ImageArea").each( function () {
		DARKROOM = new Darkroom("#ImageArea", {
			// Size options
			minWidth: 400,
			minHeight: 400,
			maxWidth: 2000,
			maxHeight: 2000,			
			//ratio: 1, //4/3,
			backgroundColor: '#000',
			
			plugins: {		// Plugins options
				crop: {
					quickCropKey: 67 //key "c"
					//minHeight: 50,
					//minWidth: 50,
					//ratio: 4/3
				},
				grayscale: {},
				save: {},
				contrast: {},
				invert: {},
				brightness: {},
				remove: {}
			},
			
			initialize: function() {	// Post initialize script	

				//var cropPlugin = this.plugins['crop'];
				//cropPlugin.selectZone(0,0,500,500); //170, 25, 300, 300);
				//cropPlugin.requireFocus();
				
				this.image.set({ 
					selectable: true,
					evented: true,
					lockMovementX: false,
					lockMovementY: false,
					lockRotation: false,
					lockScalingX: false,
					lockScalingY: false,
					lockUniScaling: false,
					hasControls: true,
					hasBorders: false
				});
				
				this.UI = {
					parm: $("input#ImageParm"),
					text: $("input#ImageText"),
					name: $("input#ImageName")
				};

				if (0)
				$.ajax({ // retrieve existing marker overlays and tag info
					url		: "/files.db",
					type	: 'GET',
					data	: {Ref: this.UI.name.val()},
					failure	: function () {
						alert("Darkroom image could not be loaded");
					},
					success	: function (rtn,status) {

						if ( !rtn.data.length ) return;

						var data = rtn.data[0];
							
						var UI = DARKROOM.UI,
							canvas = DARKROOM.canvas,
							image = DARKROOM.image;
							
						UI.text.val(data.Tag);
						/*canvas.clipTo = function (ctx) {
							ctx.rect(0,0,1000,1000);
						};*/
						
						canvas.loadFromDatalessJSON( data.Attach, function () {
							image.sendToBack();
							canvas.add(image);
						}, function (fab) {
							//alert("marker");
							//fab.bringToFront();
						});
					}				
				});
			}
		});
	});
	
	/*
	 * $(".post").each( function () {
	});*/
}

/**
 * @method folder
 * */
WIDGET.prototype.folder = function() {
	this.UI = $(this.anchor);
	
	return this.UI.html("".folder(this.UIs));
}

/**
 * @method accordion
 * */
WIDGET.prototype.accordion = function () {
	this.UI = $(this.anchor);
	return this.UI.html("".accordion(this.UIs)); 
}

/**
 * @method grid
 * */
WIDGET.prototype.grid = function () {
	this.UI = $(this.anchor);
	return this.UI.html("".grid(this.UIs,this)); 
}

/**
 * @method image
 * */
WIDGET.prototype.image = function () {
	this.UI = $(this.anchor);
	return this.UI.html("".image(this.UIs,this)); 
}

/**
 * @method post
 * */
WIDGET.prototype.post = function () { 
	this.UI = $(this.anchor);

	var Path = this.path;
	return this.UI.html("".post(this.UIs)).click(function () {
		$("iframe",this).attr({src:Path});
	});
}

/**
 * @method default
 * */
WIDGET.prototype.default = function () { 
	this.UI = $(this.anchor);
	
	return $(this.anchor);
}

/**
 * @method pivot
 * */
WIDGET.prototype.pivot = function () { 
	this.UI = this.anchor;
	
	return $(this.anchor).html("".pivot(this.UIs,this)); 
	//return $(this.anchor).attr({pivots:this.pivots,path:this.path,class:"pivot"});
}

// Called to render DOM when ready

$().ready( function () {

	BASE.start({
		
		parser: {	// Dom widget switches, attribues and parameters
			NIXHTML : false,
			SWITCHES : {debug:false,alert:false},
			ATTRS : {path:"",pivots:"",cols:""},
			PARMS : {},
			LISTS : {}
		},
		
		sockets: {  		// socketio interfaces
			select: function (opts) {},  
			update: function (opts) {},
			insert: function (opts) {},
			delete: function (opts) {},
			execute: function (opts) {}
		}
	}, function (widget) {
		
		Render();
	});
	
	/*
	if (Caman) {
		$("input#crop").click(function () {
			alert("crop "+parm.val());
			this.crop(hlen.val(),vlen.val(),hpos.val(),vpos.val());
		});
		
		$("input#brightness").click(function () {
			var val = (parm.val()-0.5)*200;
			
			Caman(Canvas, function () {
				alert("brightness "+val);
				this.brightness( val ).render();
			});
		});
		
		$("input#noise").click(function () {
			var val = (parm.val()-0.5)*200;
			
			Caman(Canvas, function () {
				alert("noise "+val);
				this.noise( val ).render();
			});
		});
		
		$("input#invert").click(function () {
			var val = (parm.val()-0.5)*200;
			
			Caman(Canvas, function () {
				this.invert().render();
			});
		});
		
		$("input#resize").click(function () {
			var val = (parm.val()-0.5)*200;
			
			Caman(Canvas, function () {
				this.resize({width:100,height:100}).render();
			});
		});
		
		$("input#contrast").click(function () {
			var val = (parm.val()-0.5)*200;
			
			Caman(Canvas, function () {
				this.contrast( val ).render();
			});
		});

		$("input#saturation").click(function () {
			var val = (parm.val()-0.5)*200;
			
			Caman(Canvas, function () {
				this.saturation( val ).render();
			});
		});

		$("input#save").click(function () {
			alert("save");
		});

		$("input#tag").click(function () {
			alert("tag");
		});

		$("input#open").click(function () {
			alert("open");
		});
	}
	*/
});

//BASE.socketio.on('join',GUIDES.PARSER.join);

// UNCLASSIFIED
