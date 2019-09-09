// UNCLASSIFIED

/**
 * @module grids
 * extjs 5.1 https://cdn.sencha.com/ext/gpl/ext-5.1.0-gpl.zip
 * This client module interfaces with [Totem's api](/api.view) to support [Totem's content management](/skinguide.view) 
 * function using [Totem's extjs framework](/extjs.view).  This framework typically loads itself as follows:
 * 
 * 		script(src="/clients/extjs/include-ext.js")
 * 		script(src="/clients/extjs/ext-all.js")
 * 		script.
 * 			Ext.Loader.setConfig({enabled: true});
 * 			Ext.Loader.setPath('Ext.ux', 'clients/extjs/plugins');
 * 		script(src="/clients/grids.js")
 * */
Ext.require([
	// general
	'Ext.toolbar.*',
	'Ext.tip.*',
	'Ext.data.*',
	'Ext.util.*',
	'Ext.grid.*',
	'Ext.tab.*',
	'Ext.tree.*',
	'Ext.form.*',
	'Ext.window.*',
	'Ext.panel.*', 
	'Ext.ux.IFrame',

	'Ext.container.Viewport', 
	'Ext.dd.DD',

	// grids
	'Ext.ux.statusbar.StatusBar',
	'Ext.ux.BoxReorderer',
	'Ext.ux.ToolbarDroppable',
	'Ext.ux.data.PagingMemoryProxy',
	'Ext.ux.SlidingPager',
	'Ext.ux.CheckColumn',
	'Ext.ux.grid.Printer',
	'Ext.selection.CellModel',
	'Ext.selection.RowModel',
	'Ext.XTemplate',
	'Ext.chart.*',
	'Ext.filters.file.*',

	// htmleditor
	'Ext.layout.component.field.HtmlEditor',
	'Ext.layout.container.VBox',
	'Ext.layout.container.boxOverflow.Menu',
	'Ext.picker.Color',
	'Ext.tip.QuickTipManager',
	'Ext.toolbar.Item',
	'Ext.toolbar.Toolbar',
	'Ext.util.Format',
	'Ext.util.TaskManager'
]);

const {Copy,Each,isString} = BASE;

function DBstore( name, path, cols, opts ) {
	
	var
		proxy = {	// Proxy to read/write from/to the server.
			type: 'rest',						// wonderful restful
			url: path,							// HTTP path to this dataset
			reader: {							// parms to read JSON from server
				type			: "json",		// of course
				rootProperty	: PROXY.ROOT,	
				idProperty		: PROXY.KEY,
				totalProperty  	: PROXY.TOTAL,	
				successProperty	: PROXY.STATE,	
				messageProperty	: PROXY.MESSAGE	
				// dataProperty implicitly "data"
				// insertIDProperty explicitly handled in store update
			}, 
			writer	: {   						// methods to write parms to server
				writeAllFields: false			// false to only send revised fields on updates (implied true in TreeStore)
			},
			appendId: false,					// no sense in appending as server has this info in its req
			idParam	: PROXY.KEY,			// yep - record ID yet again - stupid EXTJS
			filterParam: PROXY.FILTER,
			sortParam:	PROXY.SORT,				
			startParam: PROXY.START,
			limitParam: PROXY.LIMIT,				
			pageParam: PROXY.PAGE,					
			//extraParams: links ? Copy(links,{}) : null,					// linking parms (EXTJS BUG -- ignored on form submits)
			actionMethods: 						// HTTP methods corresponding to CRUD operations
				{create: PROXY.INSERT, read: PROXY.SELECT, update: PROXY.UPDATE, destroy: PROXY.DELETE}
		},
		
		model = Ext.define( name, {
			extend: 'Ext.data.Model',
			fields: cols,
			idProperty: PROXY.KEY,
			proxy: proxy
		});
	
	return isString(path)
		? Ext.create('Ext.data.Store', Copy( opts || {}, {
				model: model,
				proxy: proxy /*{
					type: "rest",
					url: url,
					reader: {
						type: "json",
						rootProperty : PROXY.ROOT,	
						idProperty	: PROXY.KEY,
						totalProperty : PROXY.TOTAL,	
						successProperty	: PROXY.STATE,	
						messageProperty	: PROXY.MESSAGE
					},
					filterParam: PROXY.FILTER,
					sortParam:	PROXY.SORT,				
					startParam: PROXY.START,
					limitParam: PROXY.LIMIT,				
					pageParam: PROXY.PAGE				
				} */
			}))
	
		: Ext.create('Ext.data.Store', Copy( opts || {}, {
				model: model,
				data: path
		}));
}

var 
	EDCTX = {  // reserve context for editors
		states: {
			jsonEditor: "json",
			textEditor: "text",
			codeEditor: "code"
		},
		save: null,
		state: "text",
		json: {},
		text: {},
		code: {}
	},
	
	EDDOC = {  // reserve handles for editors
		text: null,
		code: null,
		json: null
	},
	
	EDWIN = Ext.create('Ext.window.Window', {  // popup for editors
		title: 'Editor',
		closeAction: "hide",
		height: 400,
		width: 600,
		scrollable  : true,
		layout: 'fit',
		tools: [{
			type: "save",
			callback: function(me) {
				EDCTX.save( EDGET() );
				EDWIN.hide();
			}
		}],
		/*
		buttons: [{
			text: 'Save',
			listeners: {
				click: function () {
					var 
						store = EDCTX.store,
						key = EDCTX.key,
						rec = store.getAt(EDCTX.row);

					rec.set( key, EDGET() );
					
					EDWIN.hide();
				}
			}
		},{
			text: 'Discard',
			listeners: {
				click: function () {
					EDWIN.hide();
				}
			}
		}], */
		items: [ Ext.create('Ext.tab.Panel', {  // panel to hold editors
			border		: true,
			header		: false,
			tabPosition: "right",
			activeTab	: 0, 
			layout		: "fit",
			listeners: {
				tabchange: function (tabpan, tabcard) {
					
					var 
						oldState = EDCTX.state,
						newState = EDCTX.states[tabcard.id],
						jsonOpts = {
							change: function jsonChange(data) {  // called on every change
								delete EDCTX.json;
								EDCTX.json = new Object(data);
							},
							propertyclick: function(path) { // called when a property is clicked with the JS path to that property
								//alert(path);
							}
							// propertyElement: '<textarea>', // element of the property field, <input> is default
							// valueElement: '<textarea>'  // element of the value field, <input> is default							
						};
					
					EDCTX.state = newState;

					if ( !EDDOC[newState] ) {		// json editor need setup
						var doc = EDDOC.json = Ext.get("jsonEditor"); //$("#jsonEditor");

						//$("#jsonEditor-bodyEl").remove();  // stupid extjs adds a turd div
						Ext.get("jsonEditor-bodyEl").destroy();  // stupid extjs adds a turd div

						doc.getValue = function () {
							return JSON.stringify( EDCTX.json );
						};

						doc.setValue = function (val) {
							try {
								EDCTX.json = JSON.parse(val);
								doc.jsonEditor( EDCTX.json, jsonOpts );
							}
							catch (err) {  // ignore "...on" error
							}
						};

						doc.jsonEditor( EDCTX.json, jsonOpts );  // primes doc but errors so halts here						
					}
					
					EDDOC[newState].setValue( EDDOC[oldState].getValue() );
					/*if (EDCTX.state)
					CodeMirror.fromTextArea(EDDOC[true].getEl(), {
						lineNumbers: true,
						lineWrapping: true,
						extraKeys: {"Ctrl-Q": function(cm){ cm.foldCode(cm.getCursor()); }},
						foldGutter: true,
						gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],	
						mode: "javascript",
						value: EDDOC[false].getValue()
					}); */
				}
			},
			items		: [		// editors are created only when tabs are first selected
				Ext.create( "Ext.form.field.HtmlEditor", {	// text editor
					title: "text",
					id: "textEditor",
					scrollable  : true,
					value: "hello there",
					enableColors: true,
					enableAlignments: true,
					listeners: {
						afterrender: function (cmp) {  // set attributes
							EDDOC.text = cmp;
							cmp.toggleSourceEdit(true);  // disallow html
						}
					},
					plugins: [
						Ext.create('Ext.ux.form.plugin.HtmlEditor', {
							enableAll:  true,
							enableMultipleToolbars: false //true
						})
					] 
				}),
				
				Ext.create( "Ext.form.field.TextArea", {  // code editor
					id: "codeEditor",
					title: "code",
					layout: "fit",
					scrollable  : true,
					hideLabel: true,
					//maxWidth: 100
					listeners: {
						afterrender: function (cmp) {	// attach editor
							var doc = cmp.getEl(); 
							//console.log(doc);
							EDDOC.code = CodeMirror(doc, {
								lineNumbers: true,
								lineWrapping: true,
								extraKeys: {"Ctrl-Q": function(cm){ cm.foldCode(cm.getCursor()); }},
								foldGutter: true,
								gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],	
								mode: "javascript",
								value: EDDOC.text.getValue()
							});
							// $("#codeEditor-bodyEl").remove();  // stupid extjs adding
							if (el=Ext.get("codeEditor-bodyEl")) el.destroy();
						}
					}
				}), 
				
				Ext.create( "Ext.form.field.TextArea", {  // json editor
					title: "json",
					id: "jsonEditor",
					cls: "json-editor",
					layout: "fit",
					scrollable  : true,
					//maxWidth: 100
					listeners: {
						afterrender: function (cmp) {
						}
					} 					
				})				
			]
		}) ] 
	}),

	EDSET = function ( val ) {
		//EDDOC.code.setValue( val );
		EDDOC.text.setValue( val );
		//EDDOC.json.setValue( val );
		try {
			delete EDCTX.json;
			EDCTX.json = JSON.parse(val);
		}
		catch (err) {
			//alert("val="+val);
		} 
	},
	
	EDGET = function () {
		return EDDOC[EDCTX.state].getValue();
	},
	
	PROXY = {				// proxy parameters
		ROOT: "data",		// contains array of data records
		TOTAL: "count",		// contains max number of records
		STATE: "success",	// contains success state
		KEY: "ID",			// contains unique record ID
		MESSAGE: "msg",		// contains status message
		FILTER: "_filters",  // contains filter fields
		SORT: "_sort",		// contains sort fields
		START: "_offset",	// paging parm for starting record offset 1
		LIMIT: "_limit",	// paging parm for number of records from offset
		PAGE: "_page", 		// paging parm for page being requested
		INSERT: "POST",		// CRUD create
		SELECT: "GET",		// CRUD read
		UPDATE: "PUT",		// CRUD update
		DELETE: "DELETE"	// CRUD delete
	},	

	LOOKUPS = {
		keys: {},
		
		store: DBstore( 'lookups', '/lookups.db', [
				{name: "Name", type: "string"},
				{name: "Ref", type: "string"},
				{name: "Path", type: "string"}
			], { 	
			autoLoad: true 
		}) 
	},
	
	ACTIONS = {
		insert: "plus", 
		delete: "minus", 
		update: "pin", 
		select: "restore", 
		execute: "gear", 
		capture: "unpin",
		help: "help",
		print: "print",
		refresh: "refresh",
		delta: "toggle",
		blog: "right",
		import: "up",
		export: "down"
	},
	
	CHARTS = {  			// allowed charts
		bar:"cartesian",
		bar3d:"cartesian",
		candlestick:1,
		line:"cartesian",
		scatter:"cartesian",
		gauge:"polar",
		pie:"polar",
		pie3d:"polar",
		radar:"polar"
	},
	
	STATUS = {								// status messages
		EMPTY: "empty", 
		FAULT: "fault", 
		OK: "ok",
		NOSELECT: "please select a record"
	},	
		
	SELECT_CELL = {},					// holds grid shift left-right context
	
	// Syync loaded datasets
	PARMS = {},								// dataset attributes 
	ROLES = {},								// role Data Table 
	
	CALC = { 								// grid calculator options
		BLOG : {width:800,height:600},
		TAGTEXT : {"R ":"red", "G ":"green", "B ":"blue", "K ":"black", "Y ":"yellow", "O ":"orange"},
		TAGCELL : {"0 ":"Cell-0","1 ":"Cell-1","2 ":"Cell-2","3 ":"Cell-3","4 ":"Cell-4","5 ":"Cell-5","6 ":"Cell-6","7 ":"Cell-7","8 ":"Cell-8","9 ":"Cell-9"}
	},

	DEFAULT = { 							// general options
		ROLES : {
			Table: "", 
			Special: "", 
			Expose: true, 
			Journal: false,
			Log: false,
			INSERT: "guest",
			UPDATE: "guest",
			DELETE: "guest",
			SELECT: "guest",
			EXECUTE: "guest",
			INSERTS: 0,
			UPDATES: 0,
			DELETES: 0,
			SELECTS: 0,
			EXECUTES: 0
		},
		NOIFRAME : "your browser does not support frames",
		DROP_WIDTH : 80,
		SELECT_LOCKING : false, 			// form select record locking status bar
		TITLE_FORMAT : ">$N", 				// title $NPLS = name,path,linking,select
		LINK_LABEL : " linked by ",			// symbol when table is linked
		LINK_SYMBOL : "="					// table name for static linking
	},
	
	NODE = {								// node pivot options
		ROOT: "root", 						// root value (never use "")
		ID: "NodeID", 						// property name of node's unique ID
		CHILDREN: "data",					// property name of node's childrens
		PARENT: "parentId",					// property name of node's parent ("" to ignore)
		RELOAD: true						// relink slaves when grid pivots changed
	},
	
	TABLIST = { 				// must track all created tabsdue to extjs bug
	},

	DSLIST = {},  				// created datasets
	WINDOWS = [], 			// reserved for popup windows
	DATES = {					// date formates
		MediumDate: "d-M-y",
		DefaultDate: "m-d-Y",
		ISO8601Long:"Y-m-d H:i:s",
		ISO8601Short:"Y-m-d",
		ShortDate: "n/j/Y",
		LongDate: "l, F d, Y",
		FullDateTime: "l, F d, Y g:i:s A",
		MonthDay: "F d",
		ShortTime: "g:i A",
		LongTime: "g:i:s A",
		SortableDateTime: "Y-m-d\\TH:i:s",
		UniversalSortableDateTime: "Y-m-d H:i:sO",
		YearMonth: "F, Y"
	};	

function defineProxy(path,links,key) {  
/**
 * @method defineProxy
 * @private
*/
	//if (links) alert(JSON.stringify(links)); 
	return {								// Proxy to read/write from/to the server.
		type: 'rest',						// wonderful restful
		url: path,							// HTTP path to this dataset
		reader: {							// parms to read JSON from server
			type			: "json",		// of course
			rootProperty	: PROXY.ROOT,	
			idProperty		: key || PROXY.KEY,
			totalProperty  	: PROXY.TOTAL,	
			successProperty	: PROXY.STATE,	
			messageProperty	: PROXY.MESSAGE	
			// dataProperty implicitly "data"
			// insertIDProperty explicitly handled in store update
		}, 
		writer	: {   						// methods to write parms to server
			writeAllFields: false			// false to only send revised fields on updates (implied true in TreeStore)
		},
		appendId: false,					// no sense in appending as server has this info in its req
		idParam	: key || PROXY.KEY,			// yep - record ID yet again - stupid EXTJS
		filterParam: PROXY.FILTER,
		sortParam:	PROXY.SORT,				
		startParam: PROXY.START,
		limitParam: PROXY.LIMIT,				
		pageParam: PROXY.PAGE,					
		extraParams: links ? Copy(links,{}) : null,					// linking parms (EXTJS BUG -- ignored on form submits)
		actionMethods: 						// HTTP methods corresponding to CRUD operations
			{create: PROXY.INSERT, read: PROXY.SELECT, update: PROXY.UPDATE, destroy: PROXY.DELETE}
	};
}

function DS(anchor) {
/**
 * @class DS
 * @constructor
 * 
 * A DataSet encapsulates the data schema (source path, columns, etc), the widget created 
 * for this DS (given attributes on this DOM anchor), all slave DDs (subsequent DDs that 
 * reference back to this DS via a link), and the corresponding ExtJs component.
 * 
 * @param {HTMLElement} anchor Associated DOM element defining DS widget attributes.
 */
	
	function initializeStore() {  // Defines .Store then starts loading data
		
		/*
		function extendRecs(hash,idxkey,valkey,recs) {
		/ **
		* @method extendRecs
		* @public
		* Build data records from a hash.
		* @param {String} idxkey index key name
		* @param {String} valkey value key name
		* @param {hash} input input key-value hash
		* @return {Array} output records
		* /
			var n = recs.length;

			for (var idx in hash) {
				rec = new Object({ID:n++});
				rec[idxkey] = idx;
				rec[valkey] = hash[idx] || idx;
				recs.push( rec );
			}

			//alert("recs="+JSON.stringify(recs));
			return recs;
		}*/
		
		/**
		 * @property {Object}
		 * Store for this dataset
		 */	
		//alert("init "+name+" path="+path+" url="+url+" key="+key+" fs="+Fields.length);
		
		var 
			//proxy = This.proxy = defineProxy(url,flags,key);
			isResolved = url != "/undefined.db";
		
		if (path.charAt(0) == "[") 
			var type = "inline";
		
		else
		if (path.charAt(0) == "{")
			var type = "options";

		else
			var type = anchor.id;
		
		/*
		Ext.define(name, {   			// create data model for the store
			extend		: 'Ext.data.Model',
			fields		: Fields,
			proxy		: proxy,
			idProperty	: key || PROXY.KEY  // rep - again stupid EXTJS
		}); */
		
		switch (type) { 		// dynamic data
			case "inline":  	// static inline data
				var Store = This.Store = DBstore( name, path.parseJSON([]) );
					
				/*
				Ext.create('Ext.data.Store', {
					model 	: name, 
					data	: path.parseJSON([])
				});  */
					
				Store.setproxy = Store.load = function () {};
				break;
		
			case "options":  // static options data
				var 
					cols = This.cols,
					recs = new Array(),
					opts = path.parseJSON([]);

				for (var key in opts) 
					recs.push( new Object({ID:recs.length+1, Name: key, Ref: name, Path: opts[key]}) );

				//console.log(name, JSON.stringify(recs));
				Store = This.Store = DBstore( name, recs );
					
					/*
					Ext.create('Ext.data.Store', {
						model	: name,
						data	: recs
							// extendRecs( cols[0].dataIndex, cols[ cols[1]?1:0 ].dataIndex, []  )
					}); */

				Store.setproxy = Store.load = function () {};
				break;
				
			case "pivot": 				// tree store
			case "tree":

				var Store = This.Store = Ext.create('Ext.paging.TreeStore', {
					model		: name, 		// data model

					/*root		: {				// optional root node when displayed
						NodeID: "root"		// load requests children with this path 
						//text: name,				// label for this root
						//leaf: false,			// root is not a terminal leaf
						//expanded: false,		// must explictly state that root has not been expanded yet
						//expandable: true,		// must explictly state that root can be expanded
						//data: [{				// children if root expanded
						//	ID:0, NodeID:"root", NodeCount:0, leaf: false, expandable:true, expanded:false
						//}]
					},*/
					/*root: {  
						name: "root",
						expanded: true
					},*/
					/*root: {  
						NodeID: "root",
						expanded: false
					},*/

					autoLoad	: isResolved,

					pageSize	: page,  		// used with paging and vertical scroller
					remoteSort	: true,			// enable remote sorting

					nodeParam: NODE.ID, 		// property for loading children
					
					/*
					defaultRootText: name, 			// root label
					defaultRootId: NODE.ROOT,			// root value (EXTJS BUG "" causes bazzare things)
					defaultRootProperty: "children", //$$ NODE.CHILDREN,	// root children
					parentIdProperty: NODE.PARENT,   // seems to be ignored
					*/
					
					listeners: {
						/*
						EXTJS BUG -- paging support absent so must force support with
						this event handler, as well as the Ext.paging.Tree extension class.
						beforeload: function ( store, op, eOpts ) {
							op.params._start = (store.currentPage - 1) * store.pageSize;
							op.params._limit = store.pageSize;

							//
							//if (store.currentPage == 1)
							//	NodeID = op.params.NodeID;
							//else
							//	op.params.NodeID = NodeID;
						},
						*/
						load: function (store) {
							var 
								raw = store.getProxy().reader.rawData,
								data = raw.data,
								root = store.getRootNode();

							if (false) {  // following for debugging
								/* 
								parentId being derived correctly, and nodes are being added
								to the store; but will not display when node expanded.  ExtJS
								seems to be handeling ID,parentId in a logical fashion: parentId
								returns as expanded NodeID, ID starts at 0 and increments.  ExtJS
								ignores, however, the ID,parentId returned by the server.  ExtJS
								will scan for ID,parentId in specified PROXY.ROOT.
								*/
								alert("loaded="+data.length);
								alert(JSON.stringify(raw));					
								alert("nodes="+store.getCount());

								data.forEach( data => {
									alert([n,data.ID,"("+data.parentId+")",data.leaf,data.expanded]);
								});

								data.forEach( data => {
									//data.ID += 100;
									root.appendChild(data);
								});

								root.appendChild({
									name: "newguy",
									exapnded: true,
									children: data
								});

								store.getRootNode().expand(true);

								data.forEach( data => {
									var rec = Ext.create(name, data);
									store.add(rec);
									alert("added "+[n,store.getCount(),rec.get("NodeID")]);
								});

								data.forEach( datarec => {
									if (datarec.parentId != "root") {
										//datarec.NodeID = datarec.NodeID + "." + n;
										var newRec = Ext.create(name, datarec);
										store.getNodeById(datarec.parentId).appendChild(newRec);
										//newRec.save();
									}

									alert("added "+[n,store.getCount()]);
								});

								data.forEach( datarec => {
									if (datarec.parentId != "root") 
										root.appendChild(datarec);

									//alert("added "+[n,store.getCount()]);
								});

								store.getRange().forEach( rec => {
									var data = rec.getData();
									//rec.setId(data.NodeID);
									//alert([data.ID,data.NodeID,data.name,data.TRL,data.NodeCount,data.leaf,data.expandable,data.expanded]);
								});
							}
						}
					}
				});
				break;

			case "grid":
			case "hold":
			case "data":
			case "find":				// regular store

				var Store = This.Store = DBstore( name, path, Fields, {
					autoLoad	: isResolved,
					//autoSync	: false,  	// disabled forces use of update to sync changes
					//buffered	: false, 	// used with paging and verticalScroller but EXTJS BUG
					pageSize	: page,  	// used with paging and verticalScroller
					remoteFilter: true,
					remoteSort	: true	// enable remote sorting
				});
				
					/*Ext.create('Ext.data.Store', {
					model		: name,
					autoLoad	: isResolved,
					/ *autoLoad: {			// call its load method after store created
							params: Copy(Link.Flag, {}) // EXTJS BUG - load revises params
						},  * /
					
					//autoSync	: false,  	// disabled forces use of update to sync changes
					//buffered	: false, 	// used with paging and verticalScroller but EXTJS BUG
					pageSize	: page,  	// used with paging and verticalScroller
					remoteFilter: true,
					remoteSort	: true	// enable remote sorting
				});*/
				break;

			case "border":
			case "folder":
			case "content":
			case "form": 				// provide store for excess form records

				var Store = This.Store = DBstore( name, path, Fields, {
					data	: [],
					autoLoad: isResolved 
				});
					
					/*Ext.create('Ext.data.Store', {
						model	: name,
						data	: [],
						autoLoad: isResolved 
					}); */
				
				Store.load = function () {
					Ext.Ajax.request({
						url : This.Store.getProxy().url, //This.proxy.url,
						method: "GET",
						success: function (res) {
							var info = Ext.decode(res.responseText);
							var UI = This.Widget.dataUI || This.Widget.UI;
							UI.getForm().loadRecord( Ext.create(This.name, info.data[0]) );
						},
						failure: function (res) {
						}								
					});	
				};
				break;

			case "post":				// use Iframe for a "store"
			default:

				var Store = This.Store = Ext.create('Ext.ux.IFrame', {   
					// Basic	
					//overflowX	: "auto",
					//overflowY	: "auto",

					// Specfic
					autoRender	: true,
					autoShow	: true
				});

				Store.setProxy = function (proxy) {
					Copy(proxy, Store.getProxy() );
						 // Store.ds.proxy);
				};
				//Store.ds = This;
				Store.load = function () {
					var
						dims = This.dims, // Store.ds.dims,
						tags = {
							src: (type=="post") ? path : path ? `/${type}.view?ds=${path}` : 
								This.Store.getProxy().url,
								// Store.ds.proxy.url,
							width: dims[0],
							height: dims[1]
						},
						iframe = DEFAULT.NOIFRAME.tag("iframe", tags);
//alert(iframe);

					Store.update( iframe );
				};
				
				if (isResolved) Store.load();
				
				if (This.refresh) 
					setInterval( function () {
						Store.load();
					}, This.refresh*1000 );
				
				break;
		}	
	}
	
	function mapper(data,map,key) {
		data.forEach( rec => {
			map[rec[key]] = Copy(rec,{});
		});
	}
	
	var  	// Define widget attributes
		This	= this,
/**
* @property {String}
* name supplied for this DS
*/
		hover = this.hover = anchor.getAttribute("hover") || "",  
		name 	= this.name = anchor.getAttribute("class") || "",  
/**
 * @property {String}
 * path serving JSON 
 */
		path 	= this.path = anchor.getAttribute("path") || "",  
		
/*
 * @property {String}
 * Database table specified in path
 */
		dataset = this.dataset = ( "[{".indexOf(path.charAt(0)) >= 0 ) 
			? ""
			: path.split("?")[0].split(".")[0];
/**
 * @property {String}
 * pivots pivots to use on each load.
 */
		pivots	= this.pivots = anchor.getAttribute("pivots"),	
/**
 * @property {String}
 * key Record ID field.
 */	
		key		= this.key = anchor.getAttribute("key") || PROXY.KEY,
/**
 * @property {String}
 * track tracking parameter
 */
		track	= this.track = anchor.getAttribute("track") || "",
/**
 * @property {String}
 * sorts
 */
		// sorts = this.sorts ? hashify( this.sorts ) : null,
		sorts = anchor.getAttribute("sorts"),
		sorts = sorts ? sorts.split(",").hashify( {} ) : null,
	
		//shifts	= anchor.getAttribute("shifts") ? true : false,
		
		page 	= parseInt(anchor.getAttribute("page")) || 0,
		sync 	= anchor.getAttribute("sync"),
		refresh = this.refresh = parseInt(anchor.getAttribute("refresh") || "0"),
		dims = this.dims = (anchor.getAttribute("dims") || "200,200").split(","),
		readonly =  (name.charAt(0) == "_"),

/**
 * @property {Array}
 * cols Data fields
 */
		cols	= anchor.getAttribute("cols")	 || "",
		ag	= anchor.getAttribute("summary"),
		calc	= anchor.getAttribute("calc")  ? true : false ; //[] : null;
		//create	= anchor.getAttribute("create") || "";

	//alert(JSON.stringify([name,sorts]));
		  
	if (!path && !WIDGET.prototype[anchor.id]) path = this.path = "/"+anchor.id+".view";
	
/**
 * @property {Boolean}
 * Data locked during edit
 */
	this.Locked		= false;
/**
 * @property {Array}
 * Slaves Pointer to Data Tables linked to this DS 
 */
	this.Slaves 	= {};
/**
 * @property {Array}
 * List of  bloggable fields
 */
	var Blogs = this.Blogs = [];
	
	// Derive fields, types, labels, tips and groups if specified.

/**
 * @property {Array}
 * Fields field descriptors associated with columns
 */
	var Fields = this.Fields = [];	
	var NodePivots = []; 
		
	// Handle pivot shortcut altneratives
	
	if (pivots) cols = "Pivot(NodeID.t,NodeCount.n,"+pivots+"),"+cols;  

	// Each token from the parser corresponds to an ExtJS column.

	cols = this.cols = cols.lisp( PARMS, function cb(tok,args) {

		function gridColumn(fSpec, fCalc) { 
		/**
		 * @method gridColumn
		 * @private
		 *
		 * Return a editor for the given field type {fType} residing in the specified Data Table 
		 * named {DDname}.  Will attempt to contruct a combobox/multiselect field from the specified 
		 * 
		 * @param {String} fType The field type is one of checkbox, text, date, %, numeric, integer, boolean, 
		 * price, svg (reserved), autonum, html, xtended text, file, combobox (:DS;F1:...), or 
		 * multiselect (;DS;F1;...).
		 * @param {String} FTname name of Data Table that owns this field.
		 * 
		 * @return {Object} ExtJS field editor
		 * @docauthor Brian James
		 */

			function calcRender(cellVal, cellMeta, rec, rowIdx, colIdx, store, view) { 
				function calc(val,meta,$f,$) { //rc,d,a) {
					//var r = rc.row, c = rc.col;
					//var f = Math;

					try {

						var tags = {
							text: CALC.TAGTEXT[val.substr(0,2)],
							cell: CALC.TAGCELL[val.substr(0,2)]
							//blog: val.substr(0,1) == "/",
							//jade: val.substr(0,1) == "$" 
						};

						if (tags.text)
							return val.substr(2).fontcolor(tags.text);

						else
						if (tags.cell) {
							meta.tdCls = tags.cell;
							return val.substr(2);
						}

						/*
						else
						if (tags.blog)
							if (CALC.BLOG) {
								CALC.BLOG.src= val;
								return CALC.BLOG.src+"<br>" + "".tag("iframe",CALC.BLOG);
							}
							else
								return val.fontcolor("red");
						*/

						/*
						else 
						if (tags.jade)  { 
							CALC.BLOG.srcdoc = val.substr(1);
							return "".tag("iframe",CALC.BLOG);
						}
						*/

						else {
							eval("var rtn="+val);
							return rtn;
						}
					}
					catch (err) {
						return (err+"").fontcolor("red");
					}
				}

				//console.log(cellVal);
				if (cellVal == null)
					return "";

				/*
				else  
				if (cellVal.constructor == Object) 
					for (var n in cellVal) 
						return "".tag(n,cellVal[n]);*/

				else
				if (calc)
					if (cellVal.charAt(0) == "=") 
						/*if (!fCalc.length) 
							store.getRange().Each( function (n,rec) {
								fCalc.push( rec.getData() );
							});*/

						return calc(cellVal.substr(1),cellMeta,Math, rec.getData()); //{r:rowIdx,c:colIdx},rec.getData(),fCalc);
					
					else 
						return cellVal;
				
				else
					return cellVal;
			}	

			/*function fieldRender(value,meta,rec,row,col) {
				meta.tdAttr = "field="+fKey;
				return value;
			}*/

			var 
				fOpts = fSpec.split("."),
				fKey = fOpts[0],
				fParm = PARMS[ fKey ] || {Type: calc ? "mediumtext" : "text", Label:fKey, Special:""},
				fType = LOOKUPS.keys[ fKey ] ? "o" : fOpts[1] || fParm.Type || "text",
				fDoc = unescape(fOpts[2] || "please follow link to document this field"), //.replace(/\$dot/g,"."),
				fQual = fOpts[3] || "",
				//fLabel = fOpts[2] || fParm.Label || fKey,
				//fChange = HISTORY[path+"."+fKey] || {Moderators:""},
				fTip = [
					fKey.tag("a",{href:`/parms.view?parm=${fKey}`}) ,
			//		fChange.Moderators,
					"moderate".tag("a", {href:"/moderate.view"}),
					fDoc
					//fParm.Special || "" 
				].join(" || "),
				fListen = {
					afterrender: function (me) {
						Ext.create('Ext.tip.ToolTip', {  // grid tooltip
							target	: me.getEl(),                 
							html	 	: me.qtip,
							//title	 	: me.qtitle,
							autoHide : false, 
							closable: true,
							resizable: true,
							scrollable: true,
							//overlapHeader: true,
							maxWidth : 800,
							minWidth : 200,
							maxHeight: 400,
							showDelay: 1000,
							//mouseOffset: [0,0],
							//trackMouse: true,
							//getTargetXY: function () { return [0,0]; },
							collapisible: true
							//dismissDelay: 300
						});
					}
				},
				fChar = fType.charAt(0),
				fLabel = (fQual.indexOf("short")>=0) ? fKey.split("_").pop() : fKey,
				fHide = (fQual.indexOf("hide")>=0), //fChar >= "A" && fChar <= "Z",
				fOff = readonly || ((fQual.indexOf("off")>=0) ? true : false), //false,
				fLock = (fQual.indexOf("lock")>=0) ? true : false,  //pivots ? true : sorts ? !(fKey in sorts) : false,
				fTipTitle = fKey; //fTips[0] || fKey; //fTips.pop() || fKey;

			switch (fType) {
				case '#': 	// actions		
					var actions = [];

					fType.forEach( type => {
						actions.push({
							getClass: function(val, meta, rec, rowIdx, colIdx, store) {
								var states = rec.get(fKey);
								var icons = val.split("<img");
								return "Action-" + states.charAt(icons.length-1);
							},
							handler: function(grid, rowIndex, colIndex) {
								// Ext.Msg.alert(fKey,"Cannot edit an action field");
							}
						});
					});

					return {
						xtype		: "actioncolumn", 
						//fType		: fType,
						dataIndex	: fKey,
						sortable	: false,
						hideable	: true,
						hidden: fHide,
						layout		: "hbox",
						menuDisabled: true,
						locked		: fLock,
						disabled	: fOff,
						width		: fType.length*20,
						text		: fLabel,
						qtip		: fTip, 
						//qtitle	 	: fTipTitle,
						renderer 	: function(cellVal, cellMeta, rec, rowIdx, colIdx, store, view) { 
							return "";
						},
						items		: actions,
						//renderer	: fieldRender,				
						listeners	: fListen
					};

				case 'b':
				case 'boolean':	// boolean			
				case 'c':
				case 'check':	// checkbox
				case 'tinyint':
					return {
						xtype		: "checkcolumn", 
						//fType		: fType,
						dataIndex	: fKey,
						filter		: "boolean",
						sortable	: true,
						hideable	: true,
						hidden: fHide,
						locked		: fLock,
						disabled	: fOff,
						width		: 50,
						text		: fLabel,
						qtip		: fTip, 
						//qtitle	 	: fTipTitle,
						editor		: {
							xtype: 'checkboxfield',
							defaultValue: 0,
							format: "",
							uncheckedValue: 0,
							inputValue: 1,
							disabled: fOff,					
							cls: 'x-grid-checkheader-editor',
							width: 20
						},
						//renderer	: fieldRender,				// EXTJS BUG
						listeners	: fListen
					};

				case 'd':
				case 'date':	// date
				case 'datetime':
					return {
						xtype		: "datecolumn", 				
						//fType		: fType,
						dataIndex	: fKey,
						filter		: "date",
						sortable	: true,
						hideable	: true,
						hidden: fHide,
						locked		: fLock,
						disabled	: fOff,
						width		: 100,
						text		: fLabel,
						qtip		: fTip, 
						//qtitle	 	: fTipTitle,
						editor		: {	
							xtype: 'datefield',
							format: DATES.MediumDate,
							defaultValue: "", //new Date(),	
							allowBlank: false,
							minValue: '01/01/1900',
							disabled: fOff,
							disabledDays: [],
							disabledDaysText: 'Invalid date',
							width: 100
						},
						formatter	: "date('Y-m-d')",
						//renderer	: fieldRender,				
						listeners	: fListen
					};

				case 'p': 		// percentage
				case 'percent':
					return {
						xtype		: "numbercolumn", 				
						//fType		: fType,
						dataIndex	: fKey,
						filter		: "number",
						sortable	: true,
						hideable	: true,
						hidden: fHide,
						locked		: fLock,
						disabled	: fOff,
						width		: 50,
						text		: fLabel,
						qtip		: fTip, 
						//qtitle	 	: fTipTitle,
						editor		: {	
							xtype: 'numberfield',
							format: "0.0%",
							defaultValue: "",
							allowBlank: true,
							width: 75
						},
						formatter	: "percent('0.00')",
						//renderer	: fieldRender,				
						listeners	: fListen
					};

				case 'n':
				case 'number':
				case 'float':	// numeric
				case 'double':
					return {
						xtype		: "numbercolumn", 				
						//fType		: fType,
						dataIndex	: fKey,
						filter		: "number",
						sortable	: true,
						hideable	: true,
						hidden: fHide,
						locked		: fLock,
						disabled	: fOff,
						width		: 50,
						text		: fLabel,
						qtip		: fTip, 
						//qtitle	 	: fTipTitle,
						editor		: {	
							xtype: 'numberfield',
							format: "0.0000",
							decimalPrecision: 4,
							defaultValue: "",
							disabled: fOff,					
							allowBlank: true,
							width: 150
						},
						formatter	: "number('0.0000')",
						//renderer	: fieldRender,				
						listeners	: fListen
					};

				/*
				case 'b':
				case 'boolean':	// boolean
					return {
						//xtype		: "booleancolumn", 				
						//fType		: fType,
						dataIndex	: fKey,
						filter		: "boolean",
						sortable	: true,
						hideable	: true,
						locked		: fLock,
						disabled	: fOff,
						width		: 50,
						text		: fLabel,
						qtip		: fTip, 
						//qtitle	 	: fTipTitle,
						editor		: {	
							xtype: 'numberfield',
							format: "0",
							defaultValue: "",
							disabled: fOff,
							allowBlank: true,
							width: 75
						},
						renderer	: fieldRender,
						listeners	: fListen
					};	*/

				case 'a':
				case 'i':
				case 'auto':	// autonum
				case 'autonum':
				case 'int':	// integer
				case 'tinyint':
				case 'bigint':
					return {
						xtype		: "numbercolumn", 				
						//fType		: fType,
						dataIndex	: fKey,
						filter		: "number",
						sortable	: true,
						hideable	: true,
						hidden: fHide,
						locked		: fLock,
						disabled	: fOff,
						width		: 50,
						text		: fLabel,
						qtip		: fTip, 
						//qtitle	 	: fTipTitle,
						formatter	: "number('0')",
						editor		: {	
							xtype: 'numberfield',
							format: "0",
							defaultValue: "",
							disabled: fOff,					
							allowBlank: true,
							width: 150
						},
						//renderer	: fieldRender,				
						listeners	: fListen
					};			

				case 'm':
				case 'money':	// currency
					return {
						xtype		: "numbercolumn", 				
						//fType		: fType,
						dataIndex	: fKey,
						filter		: "number",
						sortable	: true,
						hideable	: true,
						hidden: fHide,
						locked		: fLock,
						disabled	: fOff,
						width		: 75,
						text		: fLabel,
						qtip		: fTip, 
						//qtitle	 	: fTipTitle,
						formatter	: "number('$0.00')",
						editor		: {
							xtype: 'numberfield',
							format: "$0.00",
							defaultValue: "",
							disabled: fOff,
							allowBlank: false,
							minValue: 0,
							width: 75
						},
						//renderer	: fieldRender,
						listeners	: fListen
					};			

				case 'svg':	// SVG
					return {};

				case 'h':
				case 'html':	// html
				case 'mediumtext':	
				case 'longtext':
					Blogs.push( fKey );
				
				case 'j':
				case 'json':
					return  {
						xtype: 	"",
						//fType		: fType,
						//filter		: "string",
						dataIndex	: fKey,
						sortable	: false,
						//hideable	: true,
						hidden: fHide,
						locked		: fLock,
						disabled	: fOff,
						width		: 400,
						text		: fLabel,
						cellWrap: true,
						qtip		: fTip,
						//qtitle	 	: fTipTitle,
						/*
						editor	: {
							xtype: "htmleditor",
							clicksToEdit: 2,
							listeners: {
								beforeadd: function (container, add, idx) {
									alert("tada " + container.column.dataIndex);
									//container.value = "hello there oh wise one";
									console.log(container,add);							
								}
							}
						}*/
						/*
						editor		: {	
							xtype: 'htmleditor',
							//scrollable: true,
							//grow: true,
							//autoEncode: true,
							/ *enableColors: true,
							enableAlignments: true,
							plugins: [
								Ext.create('Ext.ux.form.plugin.HtmlEditor', {
									enableAll:  true,
									enableMultipleToolbars: false //true
								})
							],	* /
							//width: 400,
							//height: 400
							//disabled: fOff
						} */
						/*
						listeners: {
							afterrender: function () {
								alert("cked" + CKEDITOR);
								//CKEDITOR.replace( "ckedit1" );
							}
						},
						renderer: function (cellVal, cellMeta, rec, rowIdx, colIdx, store, view) { 
							//console.log("val-meta", cellVal, cellMeta);
							if (cellMeta.column.dataIndex == "Description")
								return cellVal.tag("textarea", {id: "ckedit1", name: "ckeditor", rows: 10, cols: 60});
							else
								return cellVal;
						}*/
						//renderer 	: fCalc ? calcRender : null
						listeners	: fListen   // EXTJS widget gets confused when embedded in grid
					};	

				case 'z': 		// ignore
				case 'zilch':
				case 'g':
				case 'geometry':
					return {
						xtype	: "",
						//fType		: fType,
						dataIndex	: fKey,
						sortable	: false,
						hideable	: true,
						hidden: fHide,
						locked		: true,
						width		: 10,
						text		: fLabel,
						qtip		: fTip
						//qtitle	 	: fTipTitle
					};

				case 'x':		// text area
				//case 'json':
				case 'textarea':
				case 'xtextarea':
					return {
						xtype : "",
						//fType		: fType,
						enableKeyEvents: true,
						dataIndex	: fKey,
						sortable	: true,
						hideable	: true,
						hidden: fHide,
						cellWrap: true,
						locked		: fLock,
						disabled	: fOff,
						width		: 400,
						text		: fLabel,
						qtip		: fTip, 
						//qtitle	 	: fTipTitle,
						editor		: {	
							xtype: 'textareafield', 
							format: "",
							defaultValue: "",
							//scrollable: true,
							//minHeight: 200,
							grow: true,
							allowBlank: true,
							disabled: fOff,
							width: 600

							/*
							//enableKeyEvents: true,  
							listeners: {
								keydown: function (f,e) {
									e.stopEvent();

									var 
										el = f.inputEl.dom, 
										key = e.getKey(),
										pos = el.selectionStart;

									//alert(key);
									switch (key) {
										case 8:  //backspace
											if (pos) {
												el.value = el.value.substring(0,pos-1) + el.value.substring(pos);
												pos--; 
											}
											//el.setSelectionRange(pos,pos);
											break;

										case 13: //return
										case 9:  //tab
											el.value = 
												el.value.substring(0,pos) 
												+ String.fromCharCode(key) 
												+ el.value.substring(el.selectionEnd);
											pos++;
											break;

										case 35: //end
											pos = el.value.length;
											break;

										case 36: //home
											pos=0;
											break;

										case 38:  //up
										case 40:  //down
											break;

										case 37: //left
											if (pos) pos--;
											break;

										case 39: //right
											if (pos<el.value.length) pos++;
											break;

										case 46:  //del
											el.value = 
												el.value.substring(0,pos) 
												+ el.value.substring(el.selectionEnd);								
											break;

										case 112:
										case 113:
										case 114:
										case 115:
										case 116:
										case 117:
										case 118:
											el.value = 
												el.value.substring(0,pos) 
												+ "." 
												+ el.value.substring(el.selectionEnd);
											pos++;
											break;

										default:
											el.value = 
												el.value.substring(0,pos) 
												+ String.fromCharCode(key) 
												+ el.value.substring(el.selectionEnd);
											pos++;
									}

									el.setSelectionRange(pos,pos);

								}
							}  */
						}, 
						renderer 	: fCalc ? calcRender : null,
						listeners	: fListen
					};

				case 't':
				case 'text':
				case 'varchar':	// text			
					return {
						xtype:	"",
						//fType		: fType,
						dataIndex	: fKey,
						filter		: "string",
						sortable	: true,
						//hideable	: true,
						hidden: fHide,
						locked		: fLock,
						disabled	: fOff,
						width		: 100,
						text		: fLabel,
						qtip		: fTip, 
						//qtitle	 	: fTipTitle,
						editor		: {	
							xtype		: 'textfield',
							disabled: fOff
							//stripCharsRe: /[A-Z]/,
							//maxLength: 4,
							//defaultValue: "",
							//format: "",
							//minLength: 0,
							//allowBlank: true,
							//width: 400,
							//disabled: fOff
						},
						//renderer	: fieldRender,
						listeners	: fListen
					};		

				case 'f':
				case 'file':	// file
					return {
						xtype		: "actioncolumn",
						//fType		: fType,
						dataIndex	: fKey,
						sortable	: true,
						hideable	: true,
						hidden: fHide,
						locked		: fLock,
						disabled	: fOff,
						width		: 30,
						text		: fLabel,
						qtip		: fTip, 
						//qtitle	 	: fTipTitle,
						editor		: {	
							xtype: 'filefield',
							format: "",
							defaultValue: "",
							allowBlank: true,
							width: 50
						},
						items 		: [{
							icon: 'default.ico',  
							tooltip: 'Upload file',
							handler: function(grid, rowIndex, colIndex) {
								// todo: need to add hidden form with the Field.File component (xtype=filefield)
								var uploadField = Ext.getCmp('Field.File');

								uploadField.fileInputEl.dom.click();
							}
						}],
						//renderer	: fieldRender,
						listeners	: fListen /*{
							afterrender: tipRender function (me) {
								Ext.create('Ext.tip.ToolTip', {
									target	 : me.getEl(),                 
									html	 : me.qtip,
									title	 : me.qtitle,
									autoHide : false,
									draggable: true,
									maxWidth : 500,
									minWidth : 200,
									dismissDelay: 0
								});
							}
						}*/
					};		

				case 'combo': 	// queue pulldown
				case 'o':

					return {
						xtype: "",
						//fType		: fType,
						dataIndex	: fKey,
						filter		: "string",
						sortable	: true,
						hideable	: true,
						hidden: fHide,
						locked		: fLock,
						disabled	: fOff,
						width		: 100,
						text		: fLabel,
						qtip		: fTip, 
						//qtitle	 	: fTipTitle,
						editor		: {
							xtype: 'combobox',
							disabled: fOff,
							defaultValue: "",
							forceSelection: false,
							//format: "",
							emptyText: '<<null>>',
							listConfig : { minWidth: 400 }, //, itemTpl: "{"+fDisp+"}" },
							allowBlank: true,
							typeAhead: true,
							triggerAction: 'all',
							//multiSelect: false, 
							store : LOOKUPS.store,
							displayField : "Name",
							valueField : "Path",
							selectOnTab: true,
							queryMode: 'local',	
							//submitValue: true, 
							width: 100,
							//renderer	: fieldRender,
							listeners	: {
								// EXTJS BUG - combobox bound to out-of-band store (i.e. store not containing the
								// target valueField) always sets newValue to null.  Must slap EXTJS upside its
								// head by resetting value to selected value.
								afterRender: function (me,eOpts) { 
									me.store.filter("Ref", fKey);
									//combo.setValue(null); // EXTJS BUG set globally
								}, 

								change: function ( scope, newValue, oldValue, eOpts ) {
									var rawValue = scope.getRawValue();

									//console.log("chg", oldValue, rawValue, newValue);
									if ( typeof oldValue == "object" ) //isArray(oldValue)) 
										scope.setRawValue(rawValue.split(","));
									else
									if (newValue === null) 
										scope.setValue(newValue);

									return true;
								}
							} 
						}
					};

				default:	// punt

					return DATES[fType]
						? {	// date
							xtype		: "datecolumn", 				
							//fType		: fType,
							dataIndex	: fKey,
							filter		: "date",
							sortable	: true,
							hideable	: true,
							hidden: fHide,
							locked		: fLock,
							disabled	: fOff,
							width		: 100,
							text			: fLabel,
							qtip			: fTip, 
							//qtitle	 		: fTipTitle,
							editor		: {	
								xtype: 'datefield',
								format: DATES.MediumDate,
								defaultValue: "", //new Date(),						
								allowBlank: false,
								//minValue: '01/01/1900',
								disabled: fOff,
								disabledDays: [],
								disabledDaysText: 'Invalid date',
								width: 100
							},
							formatter	: "date('Y-m-d')",
							//renderer	: fieldRender,
							listeners	: fListen
						}

						: {	// text
							xtype: 	"",
							//fType		: fType,
							dataIndex	: fKey,
							filter			: "string",
							sortable	: true,
							hideable	: true,
							hidden: fHide,
							locked		: fLock,
							disabled	: fOff,
							width		: 100,
							text			: fLabel,
							qtip			: fTip, 
							//qtitle	 		: fTipTitle,
							editor		: {	
								xtype: 'textfield',
								defaultValue: "",
								format: "",
								disabled: fOff,						
								minLength: 0,
								allowBlank: true,
								width: 400
							},
							//renderer 	: fieldRender,
							listeners	: fListen
						};		

			}

		}		
		
		var 
			fCol = gridColumn(tok, calc), //fType,fKey,fLock,fLabel,fTip,calc);
			fKey = fCol.dataIndex;

		switch (ag) {			// Add row aggregator if needed
			case "min":
			case "max":
			case "count":
			case "average":
			case "sum":
				fCol.summaryType = fAg;
				break;
				
			case "util":
				fCol.summaryType = function (recs) {
					var N=recs.length, idles=0, cnts=0;
					for (var n=0; n<N; n++) {
						var rec = recs[n];
						if (rec.get("SeqNum") == "Deliverables") {
							cnts++;
							if (rec.get(fKey) == "XXXXXX") idles++;
						}
					}
					return 1 - idles/cnts;
				};
				fCol.summaryRenderer = function (val) {
					return val;
					//return Ext.util.Format.number(val*100,"% 000").tag("font",{color: (val>0.8) ? "red" : "green"});
				};
				
				break;
				
			case "any":
				fCol.summaryType = function (recs) {
					var N=recs.length, any=0;
					for (var n=0; n<N && !any; n++) any = recs[n].get(fKey) ? 1 : 0;
					return any;
				};
				
				break;

			case "all":
				fCol.summaryType = function (recs) {
					var N=recs.length, all=1;
					for (var n=0; n<N && all; n++) all = recs[n].get(fKey) ? 1 : 0;
					return all;
				};
				
				break;

			case "prod":
				fCol.summaryType = function (recs) {
					var N=recs.length, prod=1;
					for (var n=0; n<N; n++) prod *= recs[n].get(fKey);
					return prod;
				};
				
				break;

			case "nills":
				fCol.summaryType = function (recs) {
					var N=recs.length, nills=0;
					for (var n=0; n<N; n++) nills += recs[n].get(fKey) ? 0 : 1;
					return nills;
				};
				
				break;
		}
		
		switch (fKey) {		// Handle reserved field names <<<<<<<< may need to revise names
			case "NodeCount":
				fCol.persist = false;
				break;
				
			case "NodeID":   
				fCol.xtype = "treecolumn"; 
				fCol.persist = false;
				key = fKey; 
				break;
				
			case "Pivot":
				fCol.cls = "pivot";  // used when moving columns
				
				if (args) 
					args.forEach( arg => {
						switch (arg.dataIndex) {
							case "NodeID":
							case "NodeCount":
								break;
							default:
								NodePivots.push(arg.dataIndex);
						}
					});
				
				break;
		}
		
		if (args) { 			// Return column list to the column grouper if tokens supplied
			fCol.columns = args;
			
			/*alert(["cols",fCol.columns.length]);
			args.Each(function (n,arg) {
				alert([n,arg.dataIndex]);
			});*/
			
			// EXTJS BUG does not allow tree in locked column
			if (fKey == "Pivot" && args[0].xtype != "treecolumn") fCol.locked = true;
			
			return fCol;
		}
		
		Fields.push( fCol );	// Define column and its associated field
		
		return fCol;			// Return the column descriptor to the column grouper.
	});

	/*
	if (create) {				// Process dataset make request
		var fields = {}; 
		Fields.Each( function(n,f) { 
			fields[f.name] = f.fType;
		});
		
		Ext.Ajax.request({
			url : path.replace(".db",".make"),
			params: fields,
			method: "GET"
		});					
	}*/

	// Flag tree grouping, inline data, and posting
	
	this.anchor = anchor;
	var pivots = this.pivots = NodePivots.join(",");

	// Build master-slave DS links

	var flags = { // non-record fields attached to all ajax calls
		_view: (anchor.id == "hold") ? "" : BASE.user.source, 		// view-dataset crossref
		_pivot: pivots, 	// pivot fields
		_limit: page || ""
	};

	//alert(name+" "+calc);
	var Menu = this.Menu = new Ext.menu.Menu({ 	// cell linking context menu
			items: calc //shifts
				? [{
					text: "Shift Left",
					handler: function () {	
						var shifts=1, 
							idxL = SELECT_CELL.idx, 
							idxR = idxL+shifts, 
							moves = Fields.length-shifts-idxL,
							rec = This.Store.getById(SELECT_CELL.ID);
						
						//alert(["L",shifts,idxR,idxL,moves,Fields.length,SELECT_CELL.ID, rec?true:false]);

						if (rec) {
							for (var n=0; n<moves; n++,idxL++,idxR++) {
								//alert(Fields[idxL].dataIndex+'='+Fields[idxR].dataIndex);	
								rec.set(Fields[idxL].dataIndex, rec.get(Fields[idxR].dataIndex));
							}

							for (var n=0; n<shifts; n++,idxL++) 
								rec.set(Fields[idxL].dataIndex, ""); 
						}

						//Widget.getView().refreshNode(SELECT_CELL.rowIdx);  // some say extjs needs a kick to refresh
					}
				}, {
					text: "Shift Right",
					handler: function () {	
						var 
							shifts = 1, 
							idxR = Fields.length-1, // if ID placed into last field then -2
							idxL = idxR-shifts, 
							moves = idxL-SELECT_CELL.idx+1,		
							rec = This.Store.getById(SELECT_CELL.ID);

						//alert(["R",shifts,idxR,idxL,moves,Fields.length,SELECT_CELL.ID,rec?true:false]);
						
						if (rec) {
							for (var n=0; n<moves; n++,idxL--,idxR--) {
								//alert(Fields[idxR].dataIndex+'='+Fields[idxL].dataIndex );
								rec.set(Fields[idxR].dataIndex, rec.get(Fields[idxL].dataIndex));
							}

							for (var n=0; n<shifts; n++,idxR--) 
								rec.set(Fields[idxR].dataIndex, ""); 
						}
					}
				}] 
			: []
		});

	var Links = this.Links = {};
		
	url = path.parseURL(Links);
	if (!url || url.indexOf("undefined")>=0) url = "/undefined.db";
	//alert(name+":"+path+"->"+url);
	
	for (var master in Links) 
		if ( masterDS = DSLIST[master] ) {
			masterDS.Slaves[name] = This;

			if (! masterDS.Widget.kiss) {  
				masterDS.Widget.selects += " > " +name;				
				masterDS.Widget.UI.setTitle(masterDS.Widget.selects);
			}

			//alert( "Select to " + name +" by " + ((masterDS.dataset == dataset) ? "field" : "link") );

			masterDS.Menu.add({
				text: "Select to " + name +" by " + ((masterDS.dataset == dataset) ? "field" : "link"),
				handler: function () { 	// relink the slave
					var slaveDS = DSLIST[name];
					
					slaveDS.relink( function (proxy) {
						proxy.url = slaveDS.path.parseURL({ 
							def: masterDS.Store.getById(SELECT_CELL.ID).getData()
						});
					});

					// open the slave's container (may have to smarten if not in a tab folder)
					var 
						TabCard = slaveDS.Widget.UI,
						TabPan = TabCard.up("tabpanel");

					TabPan.setActiveTab(TABLIST[TabCard.title]);
				}
			});
		}
	
	// initialize the store
	if (sync) 
		BASE.syncReq("GET", path, function (res) {
			var data = Ext.decode(res).data;
			switch (name) {
				case "Parms":
					mapper( data, PARMS, sync );
					break;

				case "History":
					//mapper( data, HISTORY, sync );
					break;
			}
		});	
	
	else
	if (name && path) {
		if ( DSLIST[name] )
			alert(`widget "${name}" already used`);
		
		else {
			//alert("preinit "+this.name+"="+this.title+"="+This.title+"="+anchor.getAttribute("title"));
			initializeStore();
			DSLIST[name] = this;
		}
	}
}

DS.prototype.relink = function (cb) {  // Relink dataset proxy to a new url
	var 
		//Proxy = this.proxy,
		Store = this.Store,
		Proxy = Store.getProxy();

	if (cb) {
		cb(Proxy, Proxy.extraParams, this);
		
	/*
		var recData = rec.getData();
		for (var n in Soft)	Soft[n] = recData;
		proxy.url = this.path.parseURL(Soft);
	*/
		
		Store.setProxy( Proxy );
	}
	
	//alert("relink="+proxy.url + " for="+this.name );
	
	Store.load();
};

//=========================================================================
// EXTJS fixups/setups/overrides

/*
 * Define a paging TreeStore by extending Ext.data.TreeStore
 * */
Ext.define('Ext.paging.TreeStore', {
	extend: 'Ext.data.TreeStore',
	alias: 'pagingtreestore',
	currentPage: 1,

	config:{
		totalCount: null,
		pageSize: null
	},
	
	// Load a specific page
	loadPage: function(page) {
		var me = this;
		me.currentPage = page;
		me.read({
			page: page,
			start: (page - 1) * me.pageSize,
			limit: me.pageSize
		});
	},
	
	// Load next page
	nextPage: function() {
		this.loadPage(this.currentPage + 1);
	},
	
	// Load previous page
	previousPage: function() {
		this.loadPage(this.currentPage - 1);
	},
	
	// Overwrite function in order to set totalCount
	onProxyLoad: function(operation) {
		// This method must be overwritten in order to set totalCount
		var me = this,
			resultSet = operation.getResultSet(),
			node = operation.node;
		// If the node doesn't have a parent node, set totalCount
		if (resultSet && node.parentNode == null) {
			me.setTotalCount(resultSet.total);
		}
		// We're done here, call parent
		this.callParent(arguments);
	},
	
	getCount : function() {
		return this.getRootNode().childNodes.length;
	},
	
	getRange : function(start, end) {
		var me = this,
			items = this.getRootNode().childNodes,
			range = [],
			i;
			
		if (items.length < 1) return range;
		
		start = start || 0;
		end = Math.min((typeof end == "undefined") ? items.length - 1 : end, items.length - 1);
		
		if (start <= end) 
			for (i = start; i <= end; i++) {
				range[range.length] = items[i];
			}
		else 
			for (i = start; i >= end; i--) {
				range[range.length] = items[i];
			}

		return range;
	}
	
});

Ext.onReady( function () {
/*
 * Define Ext extend classes, establish a view portal for all components, and
 * setup defaul quick tips.
 */

	// Enable the display
	
	Ext.ux.grid.Printer.printAutomatically = false;
	Ext.ux.grid.Printer.stylesheetPath = "clients/extjs/plugins/grid/printer/print.css";
	
	Ext.apply(Ext.tip.QuickTipManager.getQuickTip(), {
		maxWidth: 500,
		minWidth: 200,
		showDelay: 1000,    // Show delay after entering target
		hideDelay: 50,		// hide delay after exiting target
		//autoHide: true
		dismissDelay: 0		// disable dismissal
	}); 

	Ext.QuickTips.init();

	Ext.Ajax.request({
		async: false,
		url: "/lookups.db?_pivot=Ref",
		method: "GET",
		success: (res) => {
			res.responseText.parseJSON({data:[]}).data.hashify( LOOKUPS.keys, "Ref" );
			//alert(JSON.stringify(LOOKUPS.keys));
		},
		failure: (res) => {
		}
	});
	
	BASE.start({
		
		parser: {								// Dom parsing widget switches, attribues and parameters
			NIXHTML : true,
			SWITCHES : {
				kiss: false,
				wrap: false,hide:false,crush:false,track:false,disable:false,
				calc:false,kiss:false,summary:false,trace:false,notes:true,joins:false,
				shifts:false
			},
			ATTRS : {
				region:"",active:"",refresh:"",
				dims:"1200,600",title:"",page:"",plugins:"cXF",hover:"",
				//guard:"",
				dock:"head",sync:"",
				head:"Status,Execute,|,Select,Insert,Update,|,Delete,|,Blog,|,Print,Refresh,Export,Import,Delta,|,Help",
				menu: "",
				update:"",select:"",execute:"",delete:""},
			PARMS : {
				left:"dock",right:"dock",top:"dock",bottom:"dock",head:"dock",
				north:"region",south:"region",east:"region",west:"region",center:"region"},
			LISTS : { 
				sorts:null, blogs:null
			}
		},
		
		sockets: {							// socketio interfaces
			select: function (req) {

				if (req.rejected)
					Ext.Msg.alert("Reject! ".blink().bold().fontcolor('red'), req.message);

				else
				if (req.riddles) {
					
					var	
							msgbox = null,
							status = "",
							toc = req.timeout;

					if (toc)
						BASE.fuse = setInterval( function () {
							msgbox.setTitle( status+"."+toc);

							if (--toc <=0 )
								BASE.bodyAnchor.innerHTML = "";	

						}, 1e3);
					else
						BASE.fuse = null;
					
					BASE.reprompt( {
						tries: req.retries || 1, 
						title: "Attempt"
					}, function (retry,cb) {

						status = `${retry.title} ${retry.tries}`;
						msgbox = Ext.Msg.prompt(
							status,
							req.message,
							function (sel,val,opt) {
								cb(`${req.callback}?guess=${val}&ID=${req.ID}`);
							},

							this, 	// scope
							false, 	// multiline
							""	 	// default val			
						).setWidth(600);
					});
				}
				
				else
				if (req.message) {
					Ext.Msg.alert("Welcome! ".blink().bold().fontcolor('red'), req.message);
					// cb(`${req.callback}?guess=0&ID=${req.ID}`);
				}

			},

			update: function (req) {
				
//alert(JSON.stringify(req)+BASE.user.client);
				if (req.from != BASE.user.client) {
					var path = req.tabpathle;
					var body = req.body;
					var ID = Number(req[PROXY.KEY]);

					for (var n in DSLIST) {
						var ds = DSLIST[n];
						if (ds.path == path) {
							if (BASE.user.content) 
								BASE.user.content.setTitle(req.from+">"+req.msg);

							var rec = ds.Store.getById(ID);
							if (rec) for (var b in body) rec.set(b,body[b]);
						}
					}
				}
			},

			delete: function (req) {
				if (req.frome != BASE.user.client) {
					var path = req.path;
					var body = req.body;
					var ID = Number(req[PROXY.KEY]);

					for (var n in DSLIST) {
						var ds = DSLIST[n];
						if (ds.path == path) {
							if (BASE.user.content) 
								BASE.user.content.setTitle(req.from+">"+req.msg);

							var rec = ds.Store.getById(ID);
							if (rec) ds.Store.remove(rec);
						}
					}
				}
			},

			insert: function (req) {
				if (req.from != BASE.user.client) {
					var path = req.path;
					var body = req.body;
					var ID = Number(req[PROXY.KEY]);

					for (var n in DSLIST) {
						var ds = DSLIST[n];
						if (ds.path == path) {
							var rec = Ext.create(ds.name, body);
							if (rec) {
								if (BASE.user.content) 
									BASE.user.content.setTitle(req.from+">"+req.msg);

								rec.setId(ID);
								ds.Store.add(rec);
								rec.setId(ID);		// EXTJS Bug -- need to reset othwise it autoincrements
							}
						}
					}
				}
			},

			execute: function (req) {

				function sendSnapshot () {
					if (html2canvas)
						html2canvas(document.body).then( function (canvas) {
							document.body.appendChild(canvas);
							Ext.Ajax.request({
								url		: "/uploads.db",
								method	: "POST",
								params	: JSON.stringify({
									image: canvas.toDataURL("image/png"),
									filename: BASE.user.client+"_snapshot.jpg",
									location: BASE.user.location
									//image: "1234",
									/*owner: BASE.user.client,
									classif: "TBD",
									tag: "snapshot",
									geo: BASE.user.location*/
								})
							});
						});
				}

				if (req.from == BASE.user.client || req.from == "all")
					if (req.SnapInterval) 
						if (req.msg == "clear")
							clearInterval(SNAPID);
						else
							var SNAPID = setInterval(function () {
								sendSnapshot();
								}, req.SnapInterval*1000
							);
					else
						if (BASE.user.content) 
							BASE.user.content.setTitle(req.from.tag("a",{href:"email:"+req.from})+">"+req.msg);
						else
							Ext.Msg.alert("Alert",req.msg);
			}
		}
		
	}, function (widget) {
		
		Ext.create('Ext.container.Viewport', {  
			layout: "fit",
			overflowY: "auto",
			items: [widget.UI],
			listeners: {
				afterRender: function () {
					// If the extjs default of keeping the body visible is
					// overridden, then this makes the body visible when 
					// the document becomes ready.

					var body = window.document.getElementsByTagName("body");
					body[0].style.visibility = "visible";
				}
			}
		});	
		
	});
	
});

WIDGET.prototype.menuTools = function () {

	function Status(msg) {
		if (Message)
			Message.setText(msg);
		else
			Ext.Msg.alert(this.name,msg);
	}

	function postFile(url, data, parms) {

		var 
			base64 = ";base64,",
			idx = data.indexOf(base64);

		Ext.Ajax.request({
				url	: url,
				method	: "POST",
				params	: 
						"".tag(";", parms)
						+ data.substr(0,idx).replace("data:","type=") 
						+ "\r\n" 
						+ data.substr(idx+base64.length)
			});
	}

	function feed (query,recs) {	
	/**
	* @method feed
	* @private
	* Force feed this DS with the specifed records recs where.  Optional "?tokens" in the query are replaced with 
	* the corresponding fields from recs.  The icon on the target widget is adjusted depending on the state 
	* of the load.	
	* @param {String} query "TargetDT" (for grids) or "TargetDT/path/link/link ..." (for posts)
	* @param {Array} recs Records to feed int this store
	*/
		var tarDS = DSLIST[query];
		
		if (tarDS) {							// query = TargetDT 
			var store = tarDS.Store;
			var links = tarDS.Links;

			recs.forEach( rec => {
				
				// Forget about priming the target model with the source record, as
				// EXTJS will hose-up any conversions (e.g. multiselects) being performed.
				// Work around is to load the data store after the model is created.  And dare
				// we not use set() as this too stumbles into same conversion bug.
				
				var srcRec = rec.getData();
				var tarMod = Ext.create(tarDS.name);
				
				tarMod.data = Copy(links,Copy(srcRec,{NodeID:1,NodeCount:1}));
				
				// Add the target links, clear its ID field (to force
				// a post), save (vs insert or loadrecs which causes buggy interaction
				// with the server), clear its phantom state (otherwise the loadrec goes
				// haywire), then do the loadrec.  And despite all this, EXTJS may continue 
				// renegade PUTS to the server.  
				
				//tarMod.setId(undefined);
				tarMod.save();
				tarMod.phantom = false;
				
				// Have to add records one at a time, despite what EXTJS says.
				
				store.loadRecords([tarMod],{addRecords:true});
			});
		}
		else									// query = TargetDT/path/link/link/ ...
			recs.forEach( rec => {
				var link = body(query,rec.getData()).split("/"); 
				var tarDS = DSLIST[link[0]];

				tarDS.relink( proxy => {
					proxy.url = link.parseURL({ def: rec.getData() });
				});
			});
	}

	function combo (label, cb) {
		return Ext.create("Ext.form.ComboBox", {
			disabled: false,
			forceSelection: false,
			//format: "",
			allowblank: true,
			icon: "/clients/icons/tips/"+label+".ico",			
			//typeAheads: true,
			//triggerAction: "all",
			emptyText: '<missing>',
			multiSelect: false,
			selectOnTab: true,
			queryMode: "local",
			submitValue: false,
			clearFilterOnBlur: true,
			//matchFieldWidth: false,
			editable: false,
			listeners: {
				afterRender: function (me,eOpts) { 
					/*var recs = me.store.getRange();					
					/console.log("recs", recs.length);
					recs.forEach( (rec) => console.log( rec.getData() ) ); */
					
					me.store.filter("Ref", (label=="Datasets") ? name+"_"+label : label);
					//combo.setValue(null); // EXTJS BUG set globally
				}, 
				change: function (field,newValue,oldValue,eOpts) {
					//console.log("rtn", newVale);
					if (cb) cb(newValue);
				}	
			},
			width: DEFAULT.DROP_WIDTH,
			displayField: "Name", //ds.Fields[0].dataIndex,
			valueField: "Path", //ds.Fields[ ds.Fields[1]?1:0 ].dataIndex,
			value: label,
			//itemTpl: "{"+ds.Fields[0].dataIndex+"}" ,
			listConfig: {
				minWidth: 500
			},

			store: LOOKUPS.store
		});
	}
	
	function callback(label,cbs) {	
		var 
			dataUI = Widget.dataUI || Widget.UI, // deal with potentially wrapped widgets
			Form = dataUI.getForm ? dataUI.getForm() : null,
			View = dataUI.getView ? dataUI.getView() : null,
			Data = Widget.Data;

		if (!cbs) 
			cbs = {};
		
		/*
		else
		if (cbs.constructor == Function) 
			cbs = {onAction: cbs};
		*/
		
		if (Widget[label] && cbs.onAction)
			cbs.onAction( Data, Status );

		else
		if (Form && cbs.onForm) 
			cbs.onForm( Form.getRecord(), Form, Data, Status, function (meth, flags, cb) {
				
				//alert(JSON.stringify(flags));
				
				Ext.Ajax.request({
					url : Data.Store.getProxy().url,
					params: (meth=="GET") ? flags : JSON.stringify(flags),
					method: meth,
					success: function (res) {
						//alert("res="+res.responseText);
						cb( Ext.decode(res.responseText, true) || {
							success: false,
							data: [],
							msg: res.responseText
						});
					},
					failure: function () {
						Status(STATUS.FAULT);
					}		
				});	
			});

		else
		if (View) {
			if (Selector = View.getSelectionModel()) {
				var Recs = Selector.getSelection();

				Selector.deselectAll();
				
				if (Recs.length && cbs.onSelect)
					cbs.onSelect( Recs, Data, Status );
				else
				if (cbs.onAction)
					cbs.onAction( Data, Status );

			}
			
			else
			if (cbs.onAction)
				cbs.onAction( Data, Status );
		}
		
		else 
		if (cbs.onAction)
			cbs.onAction( Data, Status );
	}
	
	function button (label, cbs) {
		return Ext.create("Ext.Button", {
			textAlign: "left",
			cls: "x-menu-button",
			
			text: label,
			icon: "/clients/icons/tips/"+label+".ico",
			
			//iconCls: "icon-client",
			width: DEFAULT.DROP_WIDTH,
			
			handler: function (me) {
				callback(label,cbs);
			} 
		});	
	}
	
	function action (label,roles,cbs) {
		var Label = label.toUpperCase();
		
		return {
			itemId: label,
			type: ACTIONS[label],
			icon: "/clients/icons/actions/"+label+".png",
			//text: label,
			// EXTJS bug - fails in some versions of Chrome
			//tooltip: (roles.constructor == String) ? roles : roles[Label+"S"] + " " + label + "s as " +roles[Label],
			qtip: "edit".tag("a",{href:"/engines.view?Engine="+label+"&Name="+Widget.Data.dataset}),
			qtitle: label + " as " +roles[Label],
			disabled: false,
			canToggle: false,
			listeners: {
				
				afterrender: function (me) {
					Ext.create('Ext.tip.ToolTip', {
						target	: me.getEl(),                 
						html	 	: me.qtip,
						title	 	: me.qtitle,
						autoHide : true,
						maxWidth : 500,
						minWidth : 200,
						collapisible: true,
						collapseFirst: true,
						dismissDelay: 0
					});
				}
				
				/*afterrender: function (button) {
					button.el.on("contextmenu", function (e) {
						window.open(ACTION_CONTEXT_URL+"?Engine="+label+"&Name="+Widget.Data.table);
					});
				}*/
			},
			handler: function(me) {
				callback(label,cbs);
			}
		};
	}
	
	function isLink(action) {
		var pre = ["/", "http:", "https:"];
		
		for (var n=0; n<pre.length; n++)  
			if (action.indexOf(pre[n]) == 0) 
				return true;

		return false;
	}
	
	var 
		Widget = this,
		Data = this.Data,
		name = this.name,
		anchor = this.anchor,
		isForm = anchor.id == "form",
		isHead = this.dock == "head",
		opts = BASE.parser,
		Tips = true,
		agent = "",
		nada = { xtype: "component", width: 10}, //{ xtype: "tbseparator" },
		roles = this.roles = ROLES[this.Data.dataset] || DEFAULT.ROLES;

	// define widget help text
	var help = (this.HTML || "") + "<br>" + roles.Special;

	// retain only non-region UIs
	var helpUIs = [];
	this.UIs.forEach( UI => {
		if (UI)
			if ( !UI.region ) helpUIs.push( UI );
	});

	// parse menu 
	
	var menu = this[this.dock || "head"];
	var Message, MessageTip;
	
	if (menu == this.dock) menu = this.head;
	if (this.menu) menu = this.menu + "," + menu;
		 
	if (menu)  
		this.Menu = menu.lisp( {}, function (tok,args) { 
			var 
				key = tok.toLowerCase();
			
			if (args)  			// wrap sub menu items in another pulldown menu
				return Ext.create("Ext.Button", {
					width: DEFAULT.DROP_WIDTH,
					text: tok,
					textAlign: "left",
					icon: "/clients/icons/tips/"+tok+".ico",
					//iconCls: "icon-client",
					menu: {allowOtherMenus: true, items: args}
				});

			else 				// standalone menu item
				switch (key) {		// scan for special menu items

					case "status":

						return Message = Ext.create('Ext.Button', { 	// attach a message area
							//itemId: 'status',
							xtype: 'button',
							text: STATUS.OK, 
							textAlign: "right",
							width: 80,
							maxWidth:500,
							disabled: true,	
							//tooltip: "",
							listeners: {
								textchange: function (me, oldText, newText) {
									//me.setWidth( Math.max(60,Math.min( 300, newText.length*10)) );
									if (MessageTip) MessageTip.update( newText );
								},
								afterrender: function (me) {
									MessageTip = Ext.create('Ext.tip.ToolTip', {
										target: me.getEl(),
										html: me.getText(),
										autoHide : false,
										maxWidth : 500,
										minWidth : 200,
										collapisible: true,
										collapseFirst: true,										
										dismissDelay: 3000
									});
								}			
							}
						});
		
					case "help":

						// add a data notepad to border widgets
						if (Widget.notes && Widget.anchor.id == "border") {
							//&& name != "notes" 	// and request not recursive
							//&& Widget.Data.table 	// and not a dataless widget (like border etc)
							//&& Widget.anchor.id != "form"	// and not a form
							
							var notes = new WIDGET(  
								new ANCHOR("spoof", {}, [
									new ANCHOR("grid", {  // anchor new notes widget to a form
										class: "notes",
										path: "/notes.db?Dataset=" + Widget.name ,
										head: "Status,Insert,Update,|,Delete,|,Print,Refresh",
										//dims: "500,100",
										//nowrap: true,
										crush: true,
										cols: "Note.h"
									})
								]
							));

							helpUIs.push(notes.UIs[0]); // add to other helpUIs for this widget
						}

						if (false) 
						if (Widget.joins && name != "joins") {
							var joins = new WIDGET(new ANCHOR("grid", {
									class: "joins",
									path: "/joins.db",
									links: "Ref." + Widget.name,
									head: opts.DEFAULT.grid.head,
									execute: function (Recs) {
										var rec = Recs[0];
										if (rec) {
											var 
												Store = Widget.Data.Store,
												Proxy = Store.getProxy(); //Widget.Data.proxy;
												
											//Widget.Data.Store.setProxy(defineProxy(rec.get("Path")));
											Proxy.url = rec.get("Path");
											Store.setProxy(Proxy);
											Store.load();
										}
									},
									crush: "1",
									cols: "Name,Path.x"
								}));

							helpUIs.push( joins.UI );
						}

						return Copy({ 
								listeners: {
									render: function (me) {  // help tooltip

										Ext.create('Ext.tip.ToolTip', {
											target : me.getEl(),
											html	 : help ,
											title	 : name,
											items 	 : helpUIs,
											layout	 : "fit",
											overflowY  : "scroll",
											closable : true,
											autoHide : false,
											//maxWidth : "80%",
											minWidth : 600,
											//minHeight: 100,
											maxWidth: 1000,
											maxHeight: 800,
											showDelay: 1000,
											//hideDelay: 50,
											//dismissDelay: 0,
											collapisible: true,
											resizable: true,
											scrollable: true,
											collapseFirst: true
										});
									}
								}
							}, 

							action( key, {HELP:"N/A",Special:"Help."}, {
									onAction: function () {
									if (Tips) 
										Ext.QuickTips.disable(); 
									else 
										Ext.QuickTips.enable();

									Tips = !Tips;
								}
							}) 
						);

					case "search": 		

						var SearchBox = "";	
						
						if (isForm)
							return nada;
						
						else
							return Ext.create("Ext.Panel", {
								layout: "hbox",
								items: [
									{	xtype: "button",
										width: 40,
										itemId: tok,
										text: "",
										icon: "/clients/icons/tips/"+tok+".ico",
										menu: {
											items: [
												{	text: "Reset",
													icon: "/clients/icons/tips/Reset.ico",
													handler: function (item) {
														Data.relink( function (proxy, flags) {
															delete flags._has;
															delete flags._nlp;
															delete flags._bin;
															delete flags._qex;
														});
													}},
												{	text: "<i>Contains String</i>",
													icon: "/clients/icons/tips/Contains.ico",
													handler: function (item) {
														Data.relink( function (proxy, flags) {
															flags._has = escape(SearchBox);
														});
													}},
												{	text: "<i>Natural Language</i>",
													icon: "/clients/icons/tips/NaturalLanguage.ico",
													handler: function (item) {
														Data.relink( function (proxy, flags) {
															flags._nlp = escape(SearchBox);
														});
													}},
												{	text: "<i>Binary Expression</i>",
													icon: "/clients/icons/tips/Relevance.ico",
													handler: function (item) {
														Data.relink( function (proxy, flags) {
															flags._bin = escape(SearchBox);
														});
													}},
												{	text: "<i>Implied Knowledge</i>",
													icon: "/clients/icons/tips/ImpliedKnowledge.ico",
													handler: function (item) {
														Data.relink( function (proxy, flags) {
															flags._qex = escape(SearchBox);
														});
													}} ]
										}
									},
									{	xtype: "textfield",
										itemId: "searchBox",
										hideLabel:	true,
										canToggle: false,
										width: 300,
										listeners: {
											boxready: function (box,width,height,eOpts) {
												box.setValue("");
											},
											change: function (box,newValue,oldValue,eOpts) {
												SearchBox = newValue;
											}
										}} ]
							});

					case "save":

						return button(tok, {
							onAction: function () {
								Widget.fireEvent('saveview');
								Ext.Msg.alert(name,"Widget view was held");
							}
						});	

					case "delta":

						var deltaed = true;
						
						if (isForm)
							return nada;
						
						else
							return action( key, {DELTA:"N/A",Special:"Delta baseline changes."}, {
									onAction: function () {
									//Flag = Data.Link.Flag;								
									//Flag._delta = delta ? "Num" : "";
									//Widget.Data.Store.setProxy(defineProxy(Widget.Data.proxy.url, delta ? {_delta:"Num"} : null));

									Widget.Data.relink( function (proxy, flags) {
										flags._delta = deltaed ? "Num" : "";
									});
									deltaed = !deltaed;
								}
							});

					case "refresh":

						if (Widget.refresh) setInterval(function () {
							Widget.Data.relink();
						}, Widget.refresh*1000);

						if (isForm)
							return nada;
						
						else
							return action( key, {REFRESH:"N/A",Special:"Refresh."}, {
									onAction: function () {
									Widget.Data.relink();
								}
							});

					case "print":

						if (isForm)
							return nada;
						
						else
							return action( key, {PRINT:"N/A",Special:"Print."}, {
									onAction: function () {
									Ext.ux.grid.Printer.print(Widget.dataUI);
								}
							});

					case "blog":
	
						var blogged = false;
						
						if (isForm)
							return nada;
						
						else
							return action( key, {BLOG:"N/A",Special:"Blog."}, {
								onAction: function () {
									Widget.Data.relink( function (proxy, flags) {
										var 
											parts = proxy.url.split("?"),
											ds = parts[0],
											parms = parts[1] ? Ext.Object.fromQueryString(parts[1]) : {};
										
										if (blogged) 
											delete parms._blog;
										else
											parms._blog = Widget.Data.Blogs.join(",");

										proxy.url = ds + "?" + unescape(Ext.Object.toQueryString(parms));
										blogged = !blogged;
									});
								}
							});

					case "|":

						return nada;

					case "insert":

						return action( key, roles, {
							onForm: function (Rec, Form, Data, Status, cb) {
								cb(
									"POST",
									Copy( Rec.getData(), {ID:Rec.getId(), _lock:1} ) ,
									function (info) {
										//alert( JSON.stringify(info) );
										Status(info.msg,Rec);
										if (info.success) Rec.setId(info.data.insertId);
								});
									
								/*
								Ext.Ajax.request({
									url : Data.proxy.url,
									params: JSON.stringify( Copy( Rec.getData(), {_lock:1} ) ),
									method: "POST",
									success: function (res) {					
										var info = Ext.decode(res.responseText);

										Rec.setId(info.data.insertId);
										//Form.loadRecord( Rec );
										Status(STATUS.OK,Rec);
									},
									failure: function (res) {
										var info = Ext.decode(res.responseText);
										Status(info.msg || STATUS.FAULT);
									}		
								});	*/	
							},

							onSelect: function (Recs, Data, Status) {

								var 
									Store = Data.Store;

								Recs.forEach( Rec => {
									if (false) {	// tree store
										Rec.appendChild(Ext.create(Data.name, Rec.getData()));
										Rec.expand();

										Data.Store.sync({
											success: function (batch) {
												var info = batch.proxy.getReader().rawData;
												newRec.setId(info.data.insertId); 
												// Set NodeID so that the new node is positioned at end of pivots
												// newRec.set("NodeID","0>"+Data.pivots.replace(/,/g,">"));  //##
												// Set NodeID to end of pivots
												// newRec.set("NodeID",newRec.get("NodeID")+">"+newRec.get("ID"));  //##
												// Might as well set a reasonable group count too
												newRec.set("NodeCount",1);
												Status(STATUS.OK || info.msg);
											},

											failure: function (batch) {
												var info = batch.proxy.getReader().rawData;
												Status(info.msg || STATUS.FAULT);
											},

											scope: Widget
										});
									}
									else { 			// regular store
										var tmpData = Rec.getData();
										tmpData[Data.key] = undefined;  		// EXTJS BUG - must unset key
										var tmpRec = Ext.create(Data.name, tmpData);

										Store.insert(0, tmpRec );

										Store.sync({
											success: function (batch) {
												var info = batch.proxy.getReader().rawData;
												if (info.data.insertId) tmpRec.setId(info.data.insertId);
												Status(STATUS.OK || info.msg);
											},
											failure: function (batch) {
												var info = batch.proxy.getReader().rawData;
												Status(info.msg || STATUS.FAULT);
											}
										});	
									}
								});

							},

							onAction: function (Data, Status) {

								var 
									Store = Data.Store;

								var tmpRec = Ext.create(Data.name);  

								tmpRec.setId(undefined);  //  EXTJS BUG - must unset key
								Store.insert(0, tmpRec );

								Store.sync({
									success: function (batch) {   
										var info = batch.proxy.getReader().rawData;
										tmpRec.setId(info.data.insertId);
										Status(STATUS.OK || info.msg);
									},
									failure: function (batch) {
										var info = batch.proxy.getReader().rawData;
										Status(info.msg || STATUS.FAULT);
									}
								});	
							}

						});

					case "delete":

						return action( key, roles, {
							onForm: function (Rec, Form, Data, Status, cb) {
								cb( 
									"DELETE", 
								   	{ID:Rec.getId(), _lock:1},
									function (info) {
										Status(info.msg); 
										if (info.success) Data.Store.remove(Rec);
								});								
							},

							onSelect: function (Recs, Data, Status) {

								Data.Store.remove( Recs );
								Data.Store.sync({
									success: function (batch) { 	
										var info = batch.proxy.getReader().rawData;
										Status(info.err || STATUS.OK);
									},								
									failure: function (batch) {
										var info = batch.proxy.getReader().rawData;
										Status(info.msg || STATUS.FAULT);
									}
								});
							}

						});

					case "update":

						return action( key, roles, {
							onForm: function (Rec, Form, Data, Status, cb) {
								cb( 
									"PUT", 
								   	Copy( 	
										Form.getValues(false, true, true),
										{ID:Rec.getId(), _lock: 1} 
									), 
									function (info) {
										//Data.Locked = !Data.Locked;
										Status(info.msg);
								});
							},

							onAction: function (Data, Status) {
								Data.Store.sync({
									success: function (batch) {  	
										var info = batch.proxy.getReader().rawData;
										Status(STATUS.OK || info.msg);
									},
									failure: function (batch) {
										var info = batch.proxy.getReader().rawData;
										Status(info.msg || STATUS.FAULT);
									}
								});
							}
						});

					case "select":

						return action( key, roles, {
							onForm: function (Rec, Form, Data, Status, cb) {
								cb(
									"GET",
									{ID:Rec.getId(), _lock: 1},
									function (info) {
										Data.Locked = !Data.Locked;			
										Status(Data.Locked?"locked":"unlocked");
										var 
											rec = info.data[0],
											Rec = Ext.create(Data.name, rec);
											
										//alert("id="+rec.ID);
										if (info.success) {
											Rec.setId( rec.ID );
											Form.loadRecord( Rec );
										}
								});
							},

							onAction: function (Data, Status) {
								Status(STATUS.OK);
								Each( Data.Slaves , function (n,slave) {
									slave.relink();
								});
							}
						});

					case "execute":

						return action( key, roles, {

							onForm: function (Rec, Form, Data, Status, cb) {
								Ext.Ajax.request({
									url : "/"+Rec.get("Name")+".exe", //Data.proxy.url.replace(".db",""),
									method: "GET",
									success: function (res) {
										Status(res.responseText);
									},
									failure: function (res) {
										Status(STATUS.FAULT);
									}
								});	
							},

							onSelect: function (Recs, Data, Status) {
								Recs.forEach( Rec => {
									var parms = {ID: Rec.getId()};
									
									Ext.Ajax.request({
										url : Data.Store.getProxy().url.replace(".db",".exe")+agent,
										params: parms,
										method: "GET",
										success: function (res) {
											Status(res.responseText);
										},
										failure: function (res) {
											Status(STATUS.FAULT);
										}
									});
								});
							},

							onAction: function (Data,Status) {
								Ext.Ajax.request({
									url : Data.Store.getProxy().url.replace(".db",".exe"),
									method: "GET",
									success: function (res) {
										Status(res.responseText);
									},
									failure: function (res) {
										Status(STATUS.FAULT);
									}
								});
							}
						});

					case "capture":

						return action( key, {CAPTURE:"N/A",Special:"Capture screen."}, {
							onAction: function () {

							if (html2canvas)
								html2canvas(document.body).then( function (canvas) {
									document.body.appendChild(canvas);
									postFile( "/uploads.db", canvas.toDataURL("image/png"), {
										filename: BASE.user.client+"+snapshot.png",
										name: "capture"
									});
								})
							else
								Ext.Msg.alert("Status","client has no capture feature");
						}
						});

					case "export":
						return action( key, roles, {

							onAction: function (Data,Status) {
								Ext.Ajax.request({
									url : Data.Store.getProxy().url.replace(".db",".export"),
									method: "GET",
									success: function (res) {
										Status(res.responseText);
									},
									failure: function (res) {
										Status(STATUS.FAULT);
									}
								});
							}
						});
						
					case "import":
						return action( key, roles, {

							onAction: function (Data,Status) {
								Ext.Ajax.request({
									url : Data.Store.getProxy().url.replace(".db",".import"),
									method: "GET",
									success: function (res) {
										Status(res.responseText);
									},
									failure: function (res) {
										Status(STATUS.FAULT);
									}
								});
							}
						});
						
					case "$stores": 		// reserved file uploaders
					case "$uploads":

						var 
							upid = key.substr(1),
							upco = `<img src='/clients/icons/tips/${upid}.ico' height=20 width=20 id='cover' onclick="document.getElementById('${upid}').click();">`,
							upin = `<input id='${upid}' type='file' style='display:none' name='uploader' />`;
					
						return Ext.create("Ext.form.Panel", {
							header: false,
							width: 100,
							html: upco + upin,
							listeners: {
								afterrender: function () {
									
									function uploadFiles() {
										var id = this.id;
										var el = document.getElementById(id);
										var files = el.files;
										var file = null;
										var url = `/${upid}.db`;
										var reader = new FileReader();
										
										reader.onload = function (rdr) {
											postFile(url, rdr.target.result, {
												filename: file.name,
												name: id
											});											
										}

										for (var n=0,N=files.length; n<N; n++) {
											file = files[n];
											reader.readAsDataURL(file);
										}
									}

									document.getElementById(upid).addEventListener("change", uploadFiles, false);
								}
							}
						});

					/*
					case "$uploads":  // legacy

						var Uploader = Ext.create("Ext.form.Panel", {
							//layout	: "hbox", 		// EXTJS BUG -- ignored
							items	: [{
								xtype: "filefield",
								width: 20,
								name: tok,
								allowBlank: false,
								buttonOnly: true,
								hideLabels: true,
								
								listeners: {
									change: function (scope,newValue,oldValue,eOpts) {								
										Uploader.getForm().submit({	// submit menu form
											url		: "/" + tok.substr(1)  + ".db",
											method	: "POST",
											clientValidation: false,
											success : function () {
												Ext.Msg.alert("status","uploaded");
											},
											failure : function () {
												//Ext.Msg.alert("status","failed");
											}
										});
									} 
								},
								buttonConfig: {
									text: '',
									tooltip: "upload file to the "+tok+" area",
									icon: "/clients/icons/tips/"+tok+".ico"
									//iconCls: "icon-client"
								}
							}]

						});
						return Uploader;
					*/
						
					case "summary":

						return combo( tok, function (val) {
						});

					case "datasets":
						
						return combo( tok, function (path) {
							Widget.Data.relink( function (proxy, flags) {
								proxy.url = path;
							});
						});
					
					case "agents":
						
						return combo( tok,  function (path) {
							agent = path || "";
						});
					
					default:
						var 
							Action = anchor.getAttribute(tok),			
							parms = Ext.Object.fromQueryString(location.search);

						if (Action)  		// pulldown via attribute to this widget
							return button( tok, {
								onAction: function (Data,Status) {
									if (Action.indexOf(".db") >= 0)
										Ext.Ajax.request({
											url : Action,
											method: "GET",
											success: function (res) {
												Status(res.responseText);
											},
											failure: function (res) {
												Status(STATUS.FAULT);
											}
										});

									else
										window.open(Action);
								}
							});
						
						else	// pulldown via dataset of another widget
							return combo( tok, function (val) {
								switch (key) {
									case "options":
										var 
											mores = val.split("+"),
											lesses = val.split("-"),
											more = mores.length-1,
											less = lesses.length-1;

										if (more) parms.more = more; else delete parms.more;
										if (less) parms.less = less; else delete parms.less;

										parms[key] = more ? mores[0] : lesses[0];
										location.search = Ext.Object.toQueryString( parms );
										//alert(JSON.stringify(parms));
										break;
										
									default:
										if (val.charAt(0) == "/") 
											window.open(val);
										
										else {
											parms[key] = val;
											location.search = Ext.Object.toQueryString( parms );
										}
								}
							});
				}
		});
		
	else
		this.Menu = [];
		
}

WIDGET.prototype.terminal = function (term,opts) {	
/**
 * @method terminal
 * @param {Array} UIs list of components under this terminal widget.
 * @param {String} HTML html under this widget.
 * @param {String} term name of Ext component to create
 * @param {Object} opts hash of config parameters for this terminal.
 * @return {Object} component created
 *
 * Creates a terminal data UI (e.g. a grid, form etc) for this widget.
 */
	
	function sortTools (docks) {  // creates toolbars for sorters
		
		function doSort( clear ) {
			if (clear) 
				Widget.Data.Store.clearFilter();
			else
				Widget.Data.Store.sort( getSorters() );
		}

		function getSorters() {
			var sorters = [];
			Ext.each( docks, function (act) {
				if (act.sortData) 
					sorters.push(act.sortData);
			});
			return sorters;
		}

		function changeSortDirection(button) {  // does a sort
			var 
				sortData = button.sortData,
				iconCls  = button.iconCls;

			if (sortData) {
				button.sortData.direction = Ext.String.toggle(button.sortData.direction, "ASC", "DESC");
				button.setIconCls(Ext.String.toggle(iconCls, "sort-asc", "sort-desc"));		
				//alert(button.sortData.direction);
				doSort( false );
			}
		}
		
		function sortButton (config) {  // creates a sort button
			config = config || {};
			Ext.applyIf(config, {
				listeners: {
					click: function(button, e) {
							changeSortDirection(button);
					}
				},
				iconCls: 'sort-' + config.sortData.direction.toLowerCase(),
				reorderable: true,
				xtype: 'button'
			});
			return config;
		}

		// EXTJS BUG - adding sortTools to a grid contained in an accordion causes the accordion to act goofy.

		//docks.push(nada);

		docks.push( {	
			xtype: 'tbtext',
			text: 'Sorts:',
			reorderable: false 
		} );

		Sorts.forEach( sort => {
			docks.push( sortButton({
				text: sort,
				reorderable: true,
				sortData: {
					property: sort,
					direction: 'ASC'
				}
			}) );
		});

		return [ 
			Ext.create('Ext.ux.BoxReorderer', {	// ordering tool
				lockableScope: "normal",
				listeners: {
					scope: Widget,
					Drop: function(r, c, button) { //update sort direction when button is dropped
						changeSortDirection(button);
					}
				}
			}),

			Ext.create('Ext.ux.ToolbarDroppable', {  // dropping tool
				lockableScope: "normal",

				// Creates the new toolbar item from the drop event
				createItem: function(data) {
					var 
						header = data.header,
						headerCt = header.ownerCt,
						reorderer = headerCt.reorderer;

					// hide the drop indicators of the standard HeaderDropZone
					// in case client had a pending valid drop in 
					if (reorderer) reorderer.dropZone.invalidateDrop();

					var act = sortButton({
						text: header.text,
						sortData: {
							property: header.dataIndex,
							direction: "ASC"
						}
					});

					docks.push(act);
					return act;			
				},

				// Custom canDrop implementation which returns true if a column can be added to the tbar
				// data from the drag source. For a HeaderContainer, it will
				// contain a header property which is the anchor being dragged.
				canDrop: function(dragSource, event, data) {
					var sorters = getSorters();
					var header  = data.header;
					var length = sorters.length;
					var entryIndex = this.calculateEntryIndex(event);
					var targetItem = this.toolbar.getComponent(entryIndex);
					var i;
					// Group columns have no dataIndex and therefore cannot be sorted
					// If target isn't reorderable it could not be replaced
					if (!header.dataIndex || (targetItem && targetItem.reorderable === false)) {
						return false;
					}

					for (i = 0; i < length; i++) {
						if (sorters[i].property == header.dataIndex) {
							return false;
						}
					}

					return true; // alerts prior to exit will cancel the drop
				},

				afterLayout: function () {
					doSort(false);
				}
			}) 
		];
	}

	function agTools  () {
	/**
	* @method agTools
	* @private
	*/
		var features = [];

		if (Widget.summary) 
			features.push( { ftype: 'summary' });

		return features;
	}

	function pageTools () {
	/**
	* @method pageTools
	* @private
	*/
		var ctrls = [];

		ctrls.push( Ext.create('Ext.PagingToolbar', {
			store: Widget.Data.Store,
			dock: "bottom",
			displayInfo: true,
			displayMsg: 'Showing {0} - {1} of {2}',
			emptyMsg: "No records"
		}));

		return ctrls;
	}
			
	var 
		Widget = this,
		Sorts = this.sorts,
		//Plugins = this.plugins || "",
		page = parseInt(this.page) || 0,
		Data = this.Data,
		Name = Data.name,
		Store = Data.Store,
		cols = Data.cols,
		Fields = Data.Fields,
		//Link = Data.Link,
		SelectCol = null,
		SelectRow = null,
		SelectField = null,
		isHead = this.dock == "head";

	this.menuTools();
	var Menu = this.Menu;
	
	/*
	Widget.Editor = [];
	Widget.Editor.push( Ext.create('Ext.grid.plugin.CellEditing', {
		clicksToEdit: 2,
		listeners: {
			beforeedit: function (ed,ctx) {
				console.log(ctx);
			}
		}
	}));	*/
	
	switch ( "check" ) { 
		case "cell": 
			var 
				Editor = Ext.create('Ext.grid.plugin.CellEditing', {
					clicksToEdit: 1
				}),
				Selector = Ext.create('Ext.selection.CellModel', {	
					mode: 'multi',
					ignoreRightMouseSelection: true
				});
			break;

		case "row":
			var 
				Editor = Ext.create('Ext.grid.plugin.RowEditing', {
					clicksToEdit: 2,
					autoCancel: false
				}),
				Selector = Ext.create('Ext.selection.RowModel', {	
					mode: 'multi',
					ignoreRightMouseSelection: true
				});
			break;

		case "check":
			var
				Editor = Ext.create('Ext.grid.plugin.CellEditing', {
					clicksToEdit: 1
				}),
				Selector = Ext.create('Ext.selection.CheckboxModel', {	
					mode: 'multi',
					checkOnly: true,
					showHeaderCheckbox: true,
					listeners: {
						select: function( sel, rec, idx, eOpts ) {
							var kids = rec.childNodes;

							if (kids) { 	// expand/contract tree node
								if (rec.isExpanded())
									Selector.select(kids,false,true);
							}
							/*
							rec.expand(false, function () { 
								rec.cascadeBy(function (n) { 
									n.set('checked', true); 
								}); 
							})
							*/
						}
					}
				});
			break;

	}
	
	//alert(JSON.stringify([ this.dock, Sorts, isHead ]));
		  
	this.UI = this.dataUI = Ext.create(term || "Ext.grid.Panel", Copy(opts || {}, {    // create the terminal UI
		// Basic attribute and appearance 
		headerOverCls: Widget.hover || "",
		columnLines	: false,
		animCollapse: false,  		// EXTJS BUG -- must be disabled due to rendering problems when embedded into other components
		collapsed	: this.crush,
		collapsible	: true,
		border		: false,
		title		: this.title,
		header		: this.title ? true : null,
		titleCollapse	: false,
		hidden		: this.hide,
		closable	: false,
		frame		: false,
		
		store		: Store,
		columns		: cols,

		minHeight	: this.dims[1],
		maxWidth	: this.dims[0],

		overflowX	: "auto",
		overflowY	: "auto",
		//scrollable: true,

		//iconCls	: 'Loads-0',
		icon		: "/clients/icons/widgets/"+Data.dataset +".ico",

		// region in next level container
		region		: this.region,
		layout		: "fit",

		// Toolbars, selection models, sorters and features
		plugins		: [Editor, "gridfilters"], //Widget.Editor,

		selModel: Selector, //Widget.Selector, 

		bbar		: page ? pageTools() : null,

		tools		: isHead ? this.Menu : null,
		
		dockedItems	: !isHead
			? { 
				xtype: 'toolbar',
				dock: this.dock || "left",
				items: this.Menu,
				plugins: Sorts ? sortTools(this.Menu) : []
			}
			: null,

		features	: agTools(),
		disabled	: this.disable,

		verticalScroller: {			// Used with store page buffer.
			trailingBufferZone: 25, // Records buffered in memory behind scroll
			leadingBufferZone: 100  // Records buffered in memory ahead of scroll
		},

		viewConfig: {
			listeners: {
				/*
				// EXTJS BUG ignored
				itemkeydown: function(view,rec,item,idx,e) {
					console.log(e.getKey());
				},
				*/
				// Relink and relink stores of slaved DDs when pivot columns changed.

				cellcontextmenu: function (view,td,cellIdx,rec,tr,rowIdx,ev) {
					ev.stopEvent();
					Widget.Data.Menu.showAt(ev.getXY());
					
					SELECT_CELL.ID = rec.getId();
					SELECT_CELL.idx = cellIdx-1;
					
//alert("shift="+[SELECT_CELL.ID,SELECT_CELL.idx]);
					
					/*
					SELECT_CELL.Name = td.getAttribute("field");  //fix
					 
					 if (SELECT_CELL.Name) {
						var LinkCol = SELECT_CELL.Name;

						var LinkSrc = {};
						
						LinkSrc[LinkCol] = LinkCol;
						
						Each( Data.Slaves, function (m,slave) { 
							if (slave.table == Data.table) {
								slave.LinkSrc = LinkSrc;
								Each(slave.Link.Hard, function (n,v) {
									delete slave.Link.Hard[n];
								}, {} );
							}
							slave.relink(rec);
						});
					}*/
					
					return false;
				}
			},
			stripeRows: true,
			enableTextSelection: true,
			markDirty: true
		},

		/*		
		// State handling (has never worked for me)		
		stateful		: true,
		stateId		: "Hold_"+Name,
		stateEvents	: ["saveview"],
		*/

		// Event handlers	
		listeners: { 
			// EXTJS BUG - some say firefox requires this (vs cellcontextmenu), but does not seem to work
			render: function () {
				Ext.getBody().on("contextmenu", Ext.emptyFn, null, {preventDefault: true});
			},
			itemcontextmenu: function (grid,rec,td,cellIdx,ev) {
				ev.stopEvent();				
				Widget.Data.Menu.showAt(ev.getXY());
				SELECT_CELL.ID = rec.getId();
				SELECT_CELL.idx = cellIdx; //-1;
			},
			
			celldblclick: function (ctx,td,cellIndex,rec,tr,rowIndex) {
				//console.log(ctx);
				var 
					grid = ctx.grid,
					cols = grid.getColumnManager(),
					head = cols.getHeaderAtIndex(cellIndex),
					key = head.dataIndex;
					
				//console.log(td,cellIndex,tr,rowIndex, key);
				//console.log(head);
				if ( !head.disabled ) {
					EDCTX.save = function (val) {
						rec.set(key,val);
					};
					EDCTX.state = "text";

					EDWIN.setTitle( Name + "." + key);  //  must make window before setting contents
					EDWIN.show();
					EDSET( rec.get(key) );
				}
			}, 

			// regen pivots and slaved posts if pivot column moved
			columnmove: function ( header, column, fromIdx, toIdx, eOpts ) {  
				var data = Widget.Data;
				
				if (data.pivots) {
					var cols = header.getGridColumns();		// get columns in pivot group
					var NodePivots = [];

					cols.forEach( col => {			// find new pivots
						if (col.ownerCt.hasCls("pivot"))
							switch (col.dataIndex) {
								case "NodeID":
								case "NodeCount":
									return false;
								default:
									NodePivots.push(col.dataIndex);  
									return false;
							}
						else
							return (col.dataIndex) ? true : false;  // ignore select box with null dataindex
					});
					
					var pivots = data.pivots = NodePivots.join(",");	
					
					Store.setRootNode({
						NodeID: "root"
					});
										
					Data.relink( function (proxy,flags) {  // relink with new pivots
						flags._pivots = pivots;
					});
					
					/*
					Store.setRootNode({				// remind EXTJS that most-root container holds root node
						NodeID	: NODE.ROOT,		// next load will request children nodes whose parentID is ID 
						text	: Name,				// override default root Name
						leaf	: false,			// root is not a terminal leaf
						expanded: false,			// must explictly state that root has not been expanded yet
						expandable: true,			// must explictly state that root can be expanded
						children: []				// no default children 
					});*/
				
					if (NODE.RELOAD) 					    // relink the slaves
						Each( data.Slaves , function (n,slave) {
							slave.relink( function (proxy,flags) {
								proxy.url = slave.path.parseURL({});
							});
						});
				}
			},	
		
			// respond to action selected
			selectionchange: function(selModel, selRecs, eOpts) { 
				var disableSelectors = selRecs.length ? false : true;
				var UI = Widget.UI;
				
				/*Menu.Each( function (n,actionItem) {
					if (actionItem.canToggle) 
						UI.down('#'+actionItem.itemId).setDisabled(disableSelectors);
				});	*/
			}						
		}
	}));

	if ( this.wrap ) this.wrapper();
}

WIDGET.prototype.wrapper = function () {
/**
* Due to EXTJS BUG -- iframes, forms, and panels do not expose their
* header, so these componets must be wrapped in yet another panel
*/
	this.UIs = [this.UI];
	
	this.menuTools();
	
	this.UI = Ext.create('Ext.panel.Panel', {
		title		: this.title,
		region		: this.region,
		layout		: "fit",
		items		: this.UIs, 
		defaults	: { overflowY: "scroll" },
		tools		: this.Menu
	});
}

WIDGET.prototype.content = function () { 
/**
 * @method content
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a content component for this widget from the supplied component UIs and HTML.  
 * Tab docking qualifiers can be [top,bottom].
*/
	this.UI = Ext.create('Ext.panel.Panel', {
		layout: "border",
		region: "center",
		overflowY: "auto",  // EXTJS bug - ignored?
		html: this.HTML,
		items: this.title
			? [ 
				Ext.create('Ext.panel.Panel', { 		// header
					layout: "fit",
					collapsed	: false,
					collapsible	: this.crush,
					html: this.title,
					region: "north",
					bodyCls: "contentClassif"
					//bodyStyle: "background: yellow;text-align:center;color:black;"
				}),

				Ext.create('Ext.panel.Panel', { 		// content
					title		: null, //this.title,
					header		: false,
					animCollapse: false,			// EXTJS BUG - must not animate the collapse
					collapsed	: false, //this.crush,
					collapsible	: false, //!this.Headless,
					titleCollapse: false,
					icon		: "/clients/icons/widgets/"+this.name+".ico",
					//frame: true,
					//hidden		: this.hide,
					//maximizable	: true,
					region		: "center",
					//disabled	: this.disable,
					layout		: "fit",
					items		: this.UIs,
					html		: this.HTML
				}),

				Ext.create('Ext.panel.Panel', {			// footer
					layout: "fit",
					html: "<br>",
					region: "south",
					bodyCls: "contentClassif"
					//bodyStyle: "background: yellow;text-align:center;color:black;"
				})
			]
		
			: [ 
				Ext.create('Ext.panel.Panel', { 		// content
					// Basic attributes and appearance
					title		: null, //this.title,
					header		: false,
					animCollapse: false,			// EXTJS BUG - must not animate the collapse
					collapsed	: false, //this.crush,
					collapsible	: false, //!this.Headless,
					titleCollapse: false,
					icon		: "/clients/icons/widgets/"+this.name+".ico",
					hidden		: this.hide,
					maximizable	: true,
					layout		: "fit",
					items		: this.UIs,
					html		: this.HTML
				})
			]
	});
}

WIDGET.prototype.hold = function () {
/**
 * @method hold
 * Returns a null component for holding a data store.  Null components are removed from the parents's UIs list.
 * @return {null} 
 */
	var 
		name = this.name,
		store = this.Data.Store;
	
	if (this.refresh) 
		setInterval(function () {
			store.load();
		}, this.refresh*1000);
		
	this.UI = null; 
}

WIDGET.prototype.post = function () { 
/**
 * @method post
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a post component for this widget from the supplied component UIs and HTML.  
 * Tab docking qualifiers can be [top,bottom].
 */
	this.dataUI = this.UI = this.Data.Store;

	if ( this.wrap ) this.wrapper();

}

for (var layout in {anchor:1, fit:1, hbox:1, vbox:1, box:1, table:1, column:1}) 
	WIDGET.prototype[layout] = function () {
	/**
	 * @method layout
	 * @param {Object[]} UIs A list of components to be aggregated.
	 * @param {String} HTML Help information to append.
	 * @return {Object} component created
	 *
	 * Construct the anchor, fit, hbox, vbox, box, table and colmn wrappers.  
	*/
		//this.menuTools();	
		
		if (this.HTML) 
			this.UIs = [{ 
				html: this.HTML, 
				xtype: "panel"
			}].concat(this.UIs);
			
		this.UI = Ext.create('Ext.panel.Panel', {
			//layout: layout,
			title		: this.title, //this.head ? this.title : null,
			header		: this.title ? true : null, //this.head ? true : null, //this.Headless ? false : true,
			//animCollapse: false,	// EXTJS BUG - some componenets must not animate the collapse
			collapsed	: this.crush,
			collapsible	: this.crush,
			overflowY	: "auto",
			//frame		: false, //dims[2]>1,
			////iconCls	: 'Loads-1',
			//icon		: "/clients/icons/widgets/"+this.name+".ico",
			//hidden		: this.hide,
			//maximizable	: true,
			region		: this.region,
			//disabled	: this.disable,
			//align: "stretch",
			//pack: "start", 
			/*
			defaults		: {
				overflowX: "auto",
				overflowY: "auto",
				//scrollable: true,
				width: this.dims[0],
				height: this.dims[1] },
			*/			
			/*
			layout		: {
				type: this.anchor.id,
				columns: 2
			}, */
			//tools		: this.Menu, 
			items		: this.UIs
			//html		: this.HTML
		});			
	}

WIDGET.prototype.default = function () { 
/**
 * @method default
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct the default component for this widget from the supplied component UIs and HTML.  
*/
	this.post();
}

WIDGET.prototype.border = function () { 
/**
 * @method border
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a border component for this widget from the supplied component UIs and HTML.  
 */
	this.menuTools();	
	
	//this.UIs.Each(function (n,ui) { alert(ui.region); });

	this.UI = Ext.create('Ext.panel.Panel', {
		layout: "border",
		title		: this.title,
		//header		: this.title ? true : null,	
		animCollapse: true,	// EXTJS BUG - some componenets must not animate the collapse
		collapsed	: false, //this.crush,
		collapsible	: this.crush,
		//titleCollapse: false,
		overflowY	: "auto",
		//frame		: false, //dims[2]>1,
		//icon		: "/clients/icons/widgets/"+this.name+".ico",
		//hidden		: this.hide,
		//maximizable	: true,
		tools		: this.Menu, 
		items		: this.UIs
	});	
}

WIDGET.prototype.folder = function() {
/**
 * @method folder
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a folder component for this widget from the supplied component UIs and HTML.  
 */
	var Widget = this;
	var Data = this.Data;
	var crush = this.crush;
	var UIs = this.UIs;
	
	// Build redundant hash due to EXTJS BUG with TabPanel methods
	
	UIs.forEach( UI => { 		
		TABLIST[UI.title] = UI;
	});
	
	this.UI = Ext.create('Ext.tab.Panel', {
		// Basic
		//style: "background: yellow;color:red;",
		animCollapse: true,
		border		: true,
		title		: this.title, //this.head ? this.title : null,
		header		: this.title ? true : null, //this.Headless ? false : true,
		titleCollapse: false,
		hidden		: this.hide,
		minHeight	: 600, //this.dims[1],
		//minWidth	: this.dims[0],
		//height	: this.dims[1],
		//width	: this.dims[0],

		tabPosition: (this.dock||"left").replace("head","left"),
		
		// Specific		
		//tools		: this.menu, 
		
		//tabBar	: this.actionControls([], this.menu),
		activeTab	: TABLIST[this.active] || 0, 
		
		// Container
		region		: this.region,
		disabled	: this.disable,
		
		// Subcomponents
		layout		: "fit",
		defaults 	: {
			bodyPadding : 10,
			closable: this.crush
		},
		items		: this.UIs,
		html 		: this.HTML
	});
}

WIDGET.prototype.accordion 	= function () {
/**
 * @method accordion
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct an accordion component for this widget from the supplied component UIs and HTML.  
 */
	
	this.UI = Ext.create('Ext.panel.Panel', {
		// Basic
		animCollapse: true,
		collapsed	: this.crush,
		collapsible	: this.crush, //!this.Headless || this.crush,
		border		: false,
		title			: this.title,
		hidden		: this.hide,
		activeTab	: 0,
		
		// Container
		region		: this.region,
		disabled	: this.disable,
		
		// Subcomponents
		layout		: {
			type: 'accordion',
			titleCollapse: true,
			animateCollapse: false,
			activeOnTop: true
		},

		defaults 	: {
			bodyStyle: 'padding:1px',
			autoScroll: true
			//overflowY: "scroll"
		},
		
		items	: this.UIs, 
		html	: this.HTML
	});
}

WIDGET.prototype.window = function (UIs,HTML) { 
/**
 * @method window
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Null} 
 *
 * Construct a window component for this widget from the supplied component UIs and HTML.  
 */
	Ext.create('Ext.window.Window', {    
		// Basic		
		title		: this.title,
		collapsed	: this.crush,
		collapsible	: this.crush, //!this.Headless || this.crush,
//		header		: This.title ? true : false, //	EXTJS BUG - unallowed in a floating window
		titleCollapse: true,
		maxHeight	: this.dims[1], 
		width		: this.dims[0], 			// EXTJS BUG - wont render correctly with maxWidth
		//overflowX	: "auto",
		//overflowY	: "auto",					
		frame		: this.dims[2]>1,
		//iconCls		: 'Loads-1',
		icon		: "/clients/icons/widgets/"+this.name+".ico",
		hidden		: this.hide,
		maximizable	: true,

		// tools to handle Zindex				
		tools		: Tips,
		
		// Subcomponents			
		layout		: 'anchor',
		items		: UIs,
		html		: HTML
	}).show();

	return null;
}

WIDGET.prototype.grid = function () { 
/**
 * @method grid
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a grid component for this widget from the supplied component UIs and HTML.  
 */
	this.terminal('Ext.grid.Panel'); 
}

WIDGET.prototype.find = function () { 
/**
 * @method find
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a find component for this widget from the supplied component UIs and HTML.  
 */
	this.terminal('Ext.ux.LiveSearchGridPanel'); 
}

/**
 * @method image
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a mini image editor.  
 */
/*
WIDGET.prototype.image = function () { 
	var Data = this.Data;
	var AOIs = [];
	var aoiDS = DSLIST["AOIs"];

	if (aoiDS) {
		//aoiDS.Store.filter([{property:"path", value:Data.path}]);
		
		aoiDS.Store.load(function () {
			aoiDS.Store.getRange().Each(function (n,rec) {
				var aoi = rec.getData();

				var AOI = Ext.create('Ext.window.Window', {
					title: aoi.label,
					width: aoi.cols,
					height: aoi.rows,
					x: aoi.col,
					y: aoi.row
				});
				
				AOIs.push(AOI);
				AOI.show();
			});
		});
	}

	this.UI = Ext.create('Ext.panel.Panel', {
		title		: this.title,
		maxHeight	: this.dims[1]*1.1,
		maxWidth	: this.dims[0]*1.1,
		//overflowX	: "auto",
		//overflowY	: "auto",
		region		: this.region,
		layout		: "fit",
		header		: true //!this.Header,

	});		
}
*/
/*tools		: this.tipControls([], UIs, HTML, function () {
			if (aoiDS) {
				aoiDS.Store.removeAt(0,aoiDS.Store.getCount());
				aoiDS.Store.sync();
				
				AOIs.Each(function (n,AOI) {
					aoiDS.Store.add({
						path:Data.path,
						label:"helipads",
						col:AOI.getPosition()[0],
						row:AOI.getPosition()[1],
						cols:AOI.getWidth(),
						rows:AOI.getHeight()
					});
				});	
					
				aoiDS.Store.sync({
					callback: function (){alert("saved");}
				});	
			}
		}),
		items		: [Ext.create('Ext.Img', {
			title: this.title,
			src: Data.path,
			width: this.dims[0],
			height: this.dims[1],
			region: this.region,
			listeners: {
				click: {
					element: "el",
					fn: function (ev) {						
						var aoi = {
							path:Data.path,
							label:"helipads",
							col:ev.getX(),
							row:ev.getY(),
							cols:50,
							rows:50
						};
						
						var AOI = Ext.create("Ext.window.Window", {
							title: aoi.label,
							width: aoi.cols,
							height: aoi.rows,
							x: aoi.col,
							y: aoi.row
						});
						
						AOIs.push(AOI);
						AOI.show();
					}
				}
			}
		}) ]*/

WIDGET.prototype.pivot = function () { 
/**
 * @method pivot
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a pivot component for this widget from the supplied component UIs and HTML.  
 */
	this.terminal('Ext.tree.Panel', {  
		rootVisible : true,
		useArrows	: true
		//multiSelect	: true,
		//singleExpand: false,
		//hideHeaders	: false
		/*
		sorters: [{
				property: 'leaf',
				direction: 'ASC'
			}, {
				property: Data.Tree,
				direction: 'ASC'
			}] */
	});
}

var FieldIDs = {};

WIDGET.prototype.form = function () {
/**
 * @method form
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a form component for this widget from the supplied component UIs and HTML.  
 */

	var	
		Widget = this,
		Data = this.Data,
		Store = Data.Store;
		
	this.menuTools();

	/**
	 * @method formFields
	 * @private
	 * Returns an array of fields uniquely id-ed to work in a from given a grouped array of columns.
	 * This is used as a work-around to browsers requiring unique field names in forms.  One would
	 * think ExtJS would have abstracted this out - but, as usaul, no luck.
	 * @param {Array} cols grouped columns
	 * @return {Array} Corresponding form fields
	 */
 	function formFields (cols) {
		var name = Widget.name;
		var UIs = new Array(cols.length);

		cols.forEach( (Col,i) => {
			// EXTJS BUG.  Because most browsers require field labels to be unique -- the stupidity
			// here seemingly motivated by a misplaced need for form cacheing -- we need to make 
			// sure that field ids are unique.  EXTJS failed to document this behavior.
			
			var 
				fLabel = Col.text,
				fType = (Col.editor.xtype == "numberfield" || Col.editor.xtype == "datefield") ? "textfield" : Col.editor.xtype,
				fKey = Col.dataIndex,
				fOff = false; //Col.hidden; 
			
			if (FieldIDs[fLabel]) {
				var fID = "Field." + fLabel + FieldIDs[fLabel];
				FieldIDs[fLabel]++;
			}
			
			else {
				var fID = "Field." + fLabel;
				FieldIDs[fLabel] = 1;
			}

			if (Col.columns) 	// columns grouped
				switch (0) {
					case 0:		// preferred method
						UIs[i] = {
							id			: fID,
							title		: Col.text,
							xtype		: 'fieldset',
							layout		: "fit",
							align		: "top",
							collapsible	: true,
							collapsed	: true,
							hidden		: fOff, 
							defaults	: { layout: "100%" },
							items		: formFields(Col.columns)
						};
						break;
					
					case 1:  	// legacy method
						UIs[i] = {
							id			: fID,
							title		: Col.text,
							xtype		: 'fieldcontainer',
							layout		: "anchor",
							defaults	: { layout: "100%" },
							items		: formFields(Col.columns)
						};
						break;
				}
			
			else { 				// no groups
				// Return the field item while mixing-in the editor to preserve combobox etc.
				// NOTE: any listeners in the editor are lost in this process; this is the preferred 
				// approach as editor listeners should/can be customized for grids and forms.

				var UI = UIs[i] = Copy({	
						id			: fID,
						fieldLabel	: fLabel,
						name		: fKey,
						xtype		: fType,
						value		: Col.editor.defaultValue,
						qtip		: Col.qtip,
						//qtitle		: Col.qtitle,
						disabled	: false,
						listeners	: {
							afterrender: function (me) {
								
								var
									el = me.getEl(),
									config = me.getInitialConfig(),
									key = config.name;
								
								if (config.xtype == "textareafield")
									el.on("dblclick", function (me) {
										var
											form = (Widget.dataUI || Widget.UI).getForm(),
											rec = form.getRecord();
								
										EDCTX.save = function (val) {
											rec.set( key, val );
											form.loadRecord(rec);
										};
										EDCTX.state = "text";

										EDSET( rec.get(key) );
										EDWIN.setTitle( name + "." + key);
										EDWIN.show();
									});
								
								Ext.create('Ext.tip.ToolTip', {  // field tooltip
									target	: el,
									html	 : me.qtip,
									//title	 : me.qtitle,
									autoHide : true,
									//closable : true,
									//maxWidth : 300,
									maxWidth: 800,
									maxHeight: 400,
									//minWidth : 200,
									//showDelay: 1000,
									//hideDelay: 50,
									//dismissDelay: 0,
									collapisible: true
									//collapseFirst: true,									
								});
							},
							
							// EXTJS BUG - combobox bound to out-of-band store (i.e. store not containing the
							// target valueField) always sets newValue to null.  Must slap EXTJS upside its
							// head by resetting value to selected value.
							
							change: function ( scope, newValue, oldValue, eOpts ) {
								if (!scope.getRawValue) return
								var rawValue = scope.getRawValue();

								if (oldValue === null) {
								}
								else
								if (oldValue.constructor == Array) 
									scope.setRawValue(rawValue);
								else
								if (newValue === null) 
									scope.setValue(rawValue);
							}
						}
					}, Copy(Col.editor, {}) );
			
				/*
				// EXTJS BUG -- disabled form fields are not submitted.  Ext argues this is the expected
				// behavior, yet it dutifully submits disabled fields when they are on grids.  Best way to 
				// normalize this behavior is to make them hidden and enabled on the form.
				
				if (UI.disabled) {
					UI.disabled = false;
					UI.xtype = 'hiddenfield';
				}*/
			}
		});
		
		return UIs;
	}

	this.UI = this.dataUI = Ext.create('Ext.form.Panel', { 
		// Basic attribute and appearance 
		headerOverCls: Widget.hover || "",
		columnLines	: false,
		animCollapse: false,			// EXTJS BUG - must not animate the collapse
		collapsed	: this.crush,
		collapsible	: this.crush,
		border		: true,
		titleCollapse	: false,
		title			: this.title,
		header		: true, //this.title ? true : null,
		hidden		: this.hide,
		closable	: false,
		frame		: false, 
		disabled	: this.disable,

		overflowX	: "auto",
		overflowY	: "auto",
		//scrollable: true,

		//iconCls		: 'Loads-0',
		icon		: "/clients/icons/widgets/"+Data.dataset+".ico",

		// Next level container
		region		: this.region,

		// specific
		trackResetOnLoad: true,
		
		// layout
		layout		: "anchor",
		//html		: this.HTML,

		// Toolbars, selection models, plugins and features
		
		tools		:  this.Menu,
		
		//plugins		: [],

		// subcomponents
		items		: formFields(Data.cols),
		defaults	: {
			anchor: '100%',
			layout: 'vbox'
		}
	});
	
	this.wrapper();
}

for (var chart in CHARTS)	
	WIDGET.prototype[chart] = function () {
/**
 * @method chart
 * @param {Object[]} UIs A list of Ext component objects aggregated around this chart.
 * @param {String} HTML The HTML to append to this chart.
 * @return {Object} Ext widget created
 *
 * Construct a chart component for this widget from the supplied component UIs and HTML.  Supported 
 * axis style [xgrid,ygrid], 
 * axis step size [steps],* enable point and legends [tips,legend], axis data bindig [left,right,top,bottom].
 */

		var 
			chart = this.anchor.id,
			type = DISPLAYS[chart],

			Data = this.Data, 
			cols = Data.Fields,

			Noff = (Data.pivots ? Data.pivots.split(",").length+2 : 0) + ((cols[0].dataIndex == "ID") ? 1 : 0),
			N = Nhold = cols.length-1 - Noff;  // number of series (skip id,groupcount,groupid fields)
			
		var
			Xcol = cols[Noff],
			Xidx = Xcol.dataIndex,
			Xlab = Xcol.text,
			Xtype = (Xcol.xtype == 'numbercolumn') ? 'numeric' : 'category';

		var
			style = {
				back: 'background:#fff', 		// component style elements 
				animate: { 						// animation parameters
					easing: 'bounceOut', 
					duration: 500
				},
				insert: 25,						// inset between components 
				bind: {x:"bottom", y:"left"},
				grid: {x:"#555", y:"#555"},
				steps: {x:1, y:1, r:10},
				limits: {x:[0,10], y:[0,100]},
				legend: {x:"bottom", y:"left"},
				shadow: true,
				legend: false,
				fill: true,
				highlight: true,
				label: {
					display: 'insideEnd',
					field:  Xidx,
					//renderer: Ext.util.Format.numberRenderer('0'),
					orientation: 'horizontal',
					color: '#333',
					'text-anchor': 'middle'
				},
				marker: {
					type: 'cross',
					size: 4,
					radius: 4,
					'stroke-width': 0
				},
				tips: {
					width: 140,
					maxHeight: 300,
					anchor: 'left',
					anchorOffset: 2,
					closable: true,
					draggable: true,
					//autoHide: false,
					//trackMouse: false,
					//dismissDelay: 0,
					//showDelay: 1000,
					//hideDelay: 50,	 
					renderer: function(rec) {
						this.setTitle( JSON.stringify( rec.getData() ) );
					}				
				}				
			};		

		var Yidx = [],
			Ylab = [],
			Series = [];

		for (var n=0,i=Noff+1; i<N; i++,n++) {
			var Ycol = cols[i];
			Ytype = (Ycol.xtype == 'numbercolumn') ? 'numeric' : 'category';
			Yidx.push( Ycol.dataIndex );
			Ylab.push( Ycol.text );

			Series.push({ 
				type	: chart,
				title	: Ylab[n],

				highlight: style.highlight,
				donut	: style.steps.r,
				fill	: style.fill,
				tooltip	: style.tips,
				marker	: style.marker,
				label	: style.label,

				xField	: Xidx,		
				yField	: [Yidx[n]]
			});
		}

		this.UI = Ext.create('Ext.Container', {
			style		: style.back,
			insetPadding: style.inset,
			animate		: style.animate,
			shadow		: style.shadow,
			maxHeight	: this.dims[1],
			maxWidth	: this.dims[0],
			hidden		: this.hide,
			title		: this.title,
			legend		: style.legend,

			region		: Data.region,
			disabled	: this.disable,
			layout		: "fit",
			
			items		: {
				xtype: type,
				store: Data.Store,
				axes: [{ 	
					type: Ytype,
					position: 'left',
					fields: Yidx,
	//				label: {
	//					renderer: Ext.util.Format.numberRenderer('0,0.0')
	//				},
					title: Ylab.join(", "),
					minimum: 0,
					grid: style.grid.y ? {stroke: style.grid.y} : false,
					steps: style.steps.y
	//				minimum: Limits[2]
	//				maximum: Limits[3]
				}, {
					type: Xtype,
					position: 'bottom',
					fields: [Xidx],
					title: Xlab,
					minimum: 0,
					grid: style.grid.x ? {stroke: style.grid.x} : false,
					steps: style.steps.x
	//				categoryNames: ['a','b','c','d','e','f'],
	//				minimum: Limits[0],
	//				maximum: Limits[1]
				}],
				series: Series
			}
		});		
	}
	
// UNCLASSIFIED
