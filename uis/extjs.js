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

var 
	PROXY = {				// proxy parameters
		ROOT: "data",		// contains array of data records
		TOTAL: "count",		// contains max number of records
		STATE: "success",	// contains success state
		KEY: "ID",			// contains unique record ID
		MESSAGE: "msg",		// contains status message
		SORT: "_sort",		// contains sort fields
		START: "_start",	// paging parm for starting record offset 1
		LIMIT: "_limit",	// paging parm for number of records from offset
		PAGE: "_page", 		// paging parm for page being requested
		INSERT: "POST",		// CRUD create
		SELECT: "GET",		// CRUD read
		UPDATE: "PUT",		// CRUD update
		DELETE: "DELETE"	// CRUD delete
	},	

	STATUS = {								// status messages
		EMPTY: "empty", 
		FAULT: "fault", 
		OK: "ok"
	},	
		
	SELECT_CELL = {},					// grid shifting context
	
	// Syync loaded datasets
	PARMS = {},								// parameter attributes dataset 
	HISTORY = {}, 						// change history dataset
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
	
	TABLIST = { 								// tracks tabs as they are created due to extjs bug
	},

	DSLIST = {},  				// list of all created dataset
	WINDOWS = []; 			// reserved for popup windows
	DATES = {
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

String.prototype.format = function (xx,pin) {

	/**
	 * @method Format
	 * 
	 * Format a string S containing ${X.key} tags.  The String wrapper for this
	 * method extends X with optional plugins like X.F = {fn: function (X){}, ...}.
	 * */
	function Format(X,S) {

		try {
			var rtn = eval("`" + S + "`");
			return rtn;
		}
		catch (err) {
			return "[bad]";
		}

	}

	var x = d = {};
	function xs(n) {
		if (n)
			if ( x = xx[n] )
				return x;
			else
				return x = xx[n] = xx.def || {};
		else
			return x;
	}

	function ds(n) {
		if (n)
			if ( d = xx[n] = DSLIST[n] ) 
				return d;
			else
				return d = xx[n] = xx.def || {};
		else
			return d;
	}
	
	if (pin) xx.pin = pin;
	
	return Format(xx,this);
};

/**
 * @method defineProxy
 * @private
*/
function defineProxy(path,links,key) {  
	//if (links) alert(JSON.stringify(links)); 
	return {								// Proxy to read/write from/to the server.
		type: 'rest',						// wonderful restful
		url: path,							// HTTP path to this dataset
		reader: {							// parms to read JSON from server
			type			: "json",		// of course
			root			: PROXY.ROOT,	
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
		idParam	: key || PROXY.KEY,			// record ID (yet again)
		sortParam:	PROXY.SORT,				
		startParam: PROXY.START,
		limitParam: PROXY.LIMIT,				
		pageParam: PROXY.PAGE,					
		extraParams: links ? Copy(links,{}) : null,					// linking parms (EXTJS BUG -- ignored on form submits)
		actionMethods: 						// HTTP methods corresponding to CRUD operations
			{create: PROXY.INSERT, read: PROXY.SELECT, update: PROXY.UPDATE, destroy: PROXY.DELETE}
	};
}

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
function gridColumn(fType, fName, fOff, fLock, fLabel, fTip, fCalc) {
	
	function calcRender(cellVal, cellMeta, rec, rowIdx, colIdx, store, view) { 

		function calc(val,meta,rc,d,a) {
			var r = rc.row, c = rc.col;
			var f = Math;

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
		
		if (cellVal == null)
			return "";
			
		else  
		if (cellVal.constructor == Object) 
			for (var n in cellVal) 
				return "".tag(n,cellVal[n]);
				
		else
		if (cellVal.charAt(0) == "=") {
			if (!fCalc.length) 
				store.getRange().Each( function (n,rec) {
					fCalc.push( rec.getData() );
				});
			
			return calc(cellVal.substr(1),cellMeta,{r:rowIdx,c:colIdx},rec.getData(),fCalc);
		}
		else 
			return cellVal;
	}	

	function fRender(value,meta,rec,row,col) {
		meta.tdAttr = "field="+fName;
		return value;
	}

	var fListen = {
		afterrender: function (me) {
			Ext.create('Ext.tip.ToolTip', {
				target	: me.getEl(),                 
				html	 	: me.qtip,
				title	 	: me.qtitle,
				autoHide : false, 
				closable: true,
				resizable: true,
				scrollable: true,
				overlapHeader: true,
				maxWidth : 800,
				minWidth : 200,
				mouseOffset: [0,0],
				//trackMouse: true,
				//getTargetXY: function () { return [0,0]; },
				collapisible: true,
				dismissDelay: 0
			});
		}
	},
	
	fTips = fTip.split("||"),
	fTip = fTips.pop() || "",
	fTipTitle = fTips.pop() || fName;
		
	switch (fType || "text") {
		case '#': 	// actions		
			var actions = [];

			fType.Each(function (i,type) {
				actions.push({
					getClass: function(val, meta, rec, rowIdx, colIdx, store) {
						var states = rec.get(fName);
						var icons = val.split("<img");
						return "Action-" + states.charAt(icons.length-1);
					},
					handler: function(grid, rowIndex, colIndex) {
						// Ext.Msg.alert(fName,"Cannot edit an action field");
					}
				});
			});
				
			return {
				xtype		: "actioncolumn", 
				fType		: fType,
				dataIndex	: fName,
				sortable	: false,
				hideable	: true,
				layout		: "hbox",
				menuDisabled: true,
				locked		: fLock,
				disabled	: fOff,
				width		: fType.length*20,
				text		: fLabel,
				qtip		: fTip, 
				qtitle	 	: fTipTitle,
				renderer 	: function(cellVal, cellMeta, rec, rowIdx, colIdx, store, view) { 
					return "";
				},
				items		: actions,
				renderer	: fRender,				
				listeners	: fListen
			};
			
		case 'c':
		case 'check':	// checkbox
			return {
				xtype		: "checkcolumn", 
				fType		: fType,
				dataIndex	: fName,
				filter		: "boolean",
				sortable	: true,
				hideable	: true,
				locked		: fLock,
				disabled	: fOff,
				width		: 50,
				text		: fLabel,
				qtip		: fTip, 
				qtitle	 	: fTipTitle,
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
				//renderer	: fRender,				// EXTJS BUG
				listeners	: fListen
			};
					
		case 't':
		case 'text':
		case 'varchar':	// text			
			return {
				fType		: fType,
				dataIndex	: fName,
				filter		: "string",
				sortable	: true,
				hideable	: true,
				locked		: fLock,
				width		: 100,
				text		: fLabel,
				qtip		: fTip, 
				qtitle	 	: fTipTitle,
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
				renderer	: fRender,
				listeners	: fListen
			};		
			
		case 'd':
		case 'date':	// date
		case 'datetime':
			return {
				xtype		: "datecolumn", 				
				fType		: fType,
				dataIndex	: fName,
				filter		: "date",
				sortable	: true,
				hideable	: true,
				locked		: fLock,
				disabled	: fOff,
				width		: 100,
				text		: fLabel,
				qtip		: fTip, 
				qtitle	 	: fTipTitle,
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
				renderer	: fRender,				
				listeners	: fListen
			};		
		
		case 'p': 		// percentage
		case 'percent':
			return {
				xtype		: "numbercolumn", 				
				fType		: fType,
				dataIndex	: fName,
				filter		: "number",
				sortable	: true,
				hideable	: true,
				locked		: fLock,
				disabled	: fOff,
				width		: 50,
				text		: fLabel,
				qtip		: fTip, 
				qtitle	 	: fTipTitle,
				editor		: {	
					xtype: 'numberfield',
					format: "0.0%",
					defaultValue: "",
					allowBlank: true,
					width: 75
				},
				formatter	: "percent('0.00')",
				renderer	: fRender,				
				listeners	: fListen
			};
			
		case 'n':
		case 'number':
		case 'float':	// numeric
		case 'double':
			return {
				xtype		: "numbercolumn", 				
				fType		: fType,
				dataIndex	: fName,
				filter		: "number",
				sortable	: true,
				hideable	: true,
				locked		: fLock,
				disabled	: fOff,
				width		: 50,
				text		: fLabel,
				qtip		: fTip, 
				qtitle	 	: fTipTitle,
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
				renderer	: fRender,				
				listeners	: fListen
			};
			
		case 'b':
		case 'boolean':	// boolean
			return {
				xtype		: "booleancolumn", 				
				fType		: fType,
				dataIndex	: fName,
				filter		: "boolean",
				sortable	: true,
				hideable	: true,
				locked		: fLock,
				disabled	: fOff,
				width		: 50,
				text		: fLabel,
				qtip		: fTip, 
				qtitle	 	: fTipTitle,
				editor		: {	
					xtype: 'numberfield',
					format: "0",
					defaultValue: "",
					disabled: fOff,
					allowBlank: true,
					width: 75
				},
				renderer	: fRender,
				listeners	: fListen
			};				
			
		case 'a':
		case 'i':
		case 'auto':	// autonum
		case 'autonum':
		case 'int':	// integer
		case 'tinyint':
		case 'bigint':
			return {
				xtype		: "numbercolumn", 				
				fType		: fType,
				dataIndex	: fName,
				filter		: "number",
				sortable	: true,
				hideable	: true,
				locked		: fLock,
				disabled	: fOff,
				width		: 50,
				text		: fLabel,
				qtip		: fTip, 
				qtitle	 	: fTipTitle,
				formatter	: "number('0')",
				editor		: {	
					xtype: 'numberfield',
					format: "0",
					defaultValue: "",
					disabled: fOff,					
					allowBlank: true,
					width: 150
				},
				renderer	: fRender,				
				listeners	: fListen
			};			
			
		case 'm':
		case 'money':	// currency
			return {
				xtype		: "numbercolumn", 				
				fType		: fType,
				dataIndex	: fName,
				filter		: "number",
				sortable	: true,
				hideable	: true,
				locked		: fLock,
				disabled	: fOff,
				width		: 75,
				text		: fLabel,
				qtip		: fTip, 
				qtitle	 	: fTipTitle,
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
				renderer	: fRender,
				listeners	: fListen
			};			

		case 'svg':	// SVG
			return {};
			
		case 'h':
		case 'html':	// html
		case 'mediumtext':	
			return false  // (navigator.browser == "xxFireFox")  // EXTJS-FF BUG (xx->"" to enable)
			? {
				fType		: fType,
				dataIndex	: fName,
				sortable	: true,
				hideable	: true,
				locked		: fLock,
				disabled	: fOff,
				width		: 400,
				text		: fLabel,
				qtip		: fTip, 
				qtitle	 	: fTipTitle,
				editor		: {	
					xtype: 'textareafield', 
					format: "",
					defaultValue: "",
					scrollable: true,
					//grow: true,
					disabled: fOff,					
					allowBlank: true,
					width: 600
				},
				renderer 	: fCalc ? calcRender : null,
				listeners	: fListen
			}	
			
			: {
				fType		: fType,
				dataIndex	: fName,
				//sortable	: true,
				//hideable	: true,
				//locked		: fLock,
				//disabled	: fOff,
				width		: 400,
				text		: fLabel,
				cellWrap: true,
				qtip		: fTip, 
				qtitle	 	: fTipTitle,
				editor		: {	
					xtype: 'htmleditor',
					//scrollable: true,
					//grow: true,
					width: 400,
					height: 400
					//disabled: fOff
				},
				renderer 	: fCalc ? calcRender : null,
				listeners	: fListen   // EXTJS widget gets confused when embedded in grid
			};
						
		case 'x':		// text area
		case 'textarea':
		case 'xtextarea':
			return {
				fType		: fType,
				enableKeyEvents: true,
				dataIndex	: fName,
				sortable	: true,
				hideable	: true,
				cellWrap: true,
				locked		: fLock,
				disabled	: fOff,
				width		: 400,
				text		: fLabel,
				qtip		: fTip, 
				qtitle	 	: fTipTitle,
				editor		: {	
					xtype: 'textareafield', 
					format: "",
					defaultValue: "",
					//scrollable: true,
					grow: true,
					allowBlank: true,
					disabled: fOff,
					//minHeight: 200,
					width: 600,
					// If standalone widget
					enableKeyEvents: true,  
					listeners: {
						keypress: function (f,e) {
							e.stopEvent();

							var el = f.inputEl.dom, 
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
									
								case 46:  //del
									el.value = 
										el.value.substring(0,pos) 
										+ el.value.substring(el.selectionEnd);								
									break;
									
								default:
									el.value = 
										el.value.substring(0,pos) 
										+ String.fromCharCode(key) 
										+ el.value.substring(el.selectionEnd);
									pos++;
							}

							el.setSelectionRange(pos,pos);

							/*if (e.getKey() == e.TAB) {
								var tabText = '\t';
								if (el.setSelectionRange) {
								}
								else
								if (document.selection) {
									document.selection.createRange().text = tabText;
								}
							}*/
						}
					}
				},
				renderer 	: calcRender,
				listeners	: fListen
			};
						
		case 'f':
		case 'file':	// file
			return {
				xtype		: "actioncolumn",
				fType		: fType,
				dataIndex	: fName,
				sortable	: true,
				hideable	: true,
				locked		: fLock,
				disabled	: fOff,
				width		: 30,
				text		: fLabel,
				qtip		: fTip, 
				qtitle	 	: fTipTitle,
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
				renderer	: fRender,
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
			
			var comboDS = DSLIST[ fName ] || { Fields: [] },
				fParms = fType.split(":"),
				f0 = comboDS.Fields[0] || {dataIndex:"Name"},
				f1 = comboDS.Fields[1] || f0,
				fDisp = fParms[1] || f0.dataIndex,
				fValue = fParms[2] || f1.dataIndex;

			return comboDS 
				? {	// DS exists
					fType		: fType,
					dataIndex	: fName,
					filter		: "string",
					sortable	: true,
					hideable	: true,
					locked		: fLock,
					disabled	: fOff,
					width		: 100,
					text		: fLabel,
					qtip		: fTip, 
					qtitle	 	: fTipTitle,
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
						store : comboDS.Store,
						displayField : fDisp,
						valueField : fValue,
						selectOnTab: true,
						queryMode: 'local',	
						//submitValue: true, 
						width: 100,
						renderer	: fRender,
						listeners	: {
							// EXTJS BUG - combobox bound to out-of-band store (i.e. store not containing the
							// target valueField) always sets newValue to null.  Must slap EXTJS upside its
							// head by resetting value to selected value.
							
							change: function ( scope, newValue, oldValue, eOpts ) {
								var rawValue = scope.getRawValue();
								
								if (isArray(oldValue)) 
									scope.setRawValue(rawValue.split(","));
								else
								if (newValue === null) 
									scope.setValue(rawValue);
								
								return true;
							}
						} 
					}
				}
				
				: { // DS does not exists
					fType		: fType,
					dataIndex	: fName,
					filter		: "string",
					sortable	: true,
					hideable	: true,
					locked		: fLock,
					disabled	: fOff,
					width		: 100,
					text			: fLabel,
					qtip			: fTip, 
					qtitle	 	: fTipTitle,
					editor		: {	
						xtype: 'textfield',
						disabled: fOff,
						defaultValue: "",
						format: "",
						minLength: 0,
						allowBlank: true,
						width: 400
					},
					renderer	: fRender,
					listeners	: fListen
				};
			
		default:	// punt

			return DATES[fType]
				? {	// date
					xtype		: "datecolumn", 				
					fType		: fType,
					dataIndex	: fName,
					filter		: "date",
					sortable	: true,
					hideable	: true,
					locked		: fLock,
					disabled	: fOff,
					width		: 100,
					text			: fLabel,
					qtip			: fTip, 
					qtitle	 		: fTipTitle,
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
					renderer	: fRender,
					listeners	: fListen
				}
				
				: {	// text
					fType		: fType,
					dataIndex	: fName,
					filter			: "string",
					sortable	: true,
					hideable	: true,
					locked		: fLock,
					disabled	: fOff,
					width		: 100,
					text			: fLabel,
					qtip			: fTip, 
					qtitle	 		: fTipTitle,
					editor		: {	
						xtype: 'textfield',
						defaultValue: "",
						format: "",
						disabled: fOff,						
						minLength: 0,
						allowBlank: true,
						width: 400
					},
					renderer 	: fRender,
					listeners	: fListen
				};		

	}
	
}

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
function DS(anchor) {
	
	function initialize() {  // Defines This.proxy, .Store, .load(), and .setProxy() then starts loading data
		/**
		 * @property {Object}
		 * Store for this dataset
		 */	
		//alert("init "+name+" path="+path+" url="+url+" key="+key+" fs="+Fields.length);
		
		var 
			proxy = This.proxy = defineProxy(url,flags,key);
			isResolved = url != "/undefined.db";
		
		Ext.define(name, {   			// create data model for the store
			extend		: 'Ext.data.Model',
			fields		: Fields,
			proxy		: proxy,
			idProperty	: key
		});

		if (path.charAt(0) == "[") 
			var type = "inline";
		
		else
		if (path.charAt(0) == "{")
			var type = "options";
		
		else
			var type = anchor.id;
		
		switch (type) { 		// dynamic data
			case "inline":  	// static inline data
				var Store = This.Store = Ext.create('Ext.data.Store', {
					model 	: name,
					data	: (path||"").json([])
				});
				Store.setproxy = Store.load = function () {};
				break;
		
			case "options":  // static options data
				var Store = This.Store = Ext.create('Ext.data.Store', {
					model	: name,
					data	: listify( (path||"").json([]), This.cols[0].dataIndex, This.cols[1].dataIndex  )
				});
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

					//defaultRootText: name, 			// root label
					//defaultRootId: NODE.ROOT,			// root value (EXTJS BUG "" causes bazzare things)
					//defaultRootProperty: "children", //$$ NODE.CHILDREN,	// root children
					nodeParam: NODE.ID, 		// property for loading children
					//parentIdProperty: NODE.PARENT,   // seems to be ignored

					listeners: {
						/*
						// EXTJS BUG -- paging support absent so must force support with
						// this event handler, as well as the Ext.paging.Tree extension class.
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

							//alert("loaded="+data.length);
							//alert(JSON.stringify(raw));					
							//alert("nodes="+store.getCount());

							// parendIf being derived correctly, and nodes are being added
							// to the store; but will not display when node expanded.  ExdtJS
							// seems to be handeling ID,parentId in a logical fashion: parentId
							// returns as expanded NodeID, ID starts at 0 and increments.  ExtJS
							// ignores, however, the ID,parentId returned by the server.  ExtJS
							// will scan for ID,parentId in specified PROXY.ROOT.

							if (false)
							data.Each(function (n,data) {
								alert([n,data.ID,"("+data.parentId+")",data.leaf,data.expanded]);
							});

							if (false)
							data.Each(function (n,data) {
								//data.ID += 100;
								root.appendChild(data);
							});

							if (false && data.length != 5) 
								root.appendChild({
									name: "newguy",
									exapnded: true,
									children: data
								});

							// alert("tree loaded "+[store.getCount(),data.length,store.getParentIdProperty()]);

							//store.getRootNode().expand(true);

							if (false)
							data.Each(function (n,data) {
								var rec = Ext.create(name, data);
								store.add(rec);
								alert("added "+[n,store.getCount(),rec.get("NodeID")]);
							});

							if (false)
							data.Each(function (n,datarec) {
								if (datarec.parentId != "root") {
									//datarec.NodeID = datarec.NodeID + "." + n;
									var newRec = Ext.create(name, datarec);
									store.getNodeById(datarec.parentId).appendChild(newRec);
									//newRec.save();
								}

								alert("added "+[n,store.getCount()]);
							});

							if (false) 
								data.Each(function (n,datarec) {
									if (datarec.parentId != "root") 
										root.appendChild(datarec);

									//alert("added "+[n,store.getCount()]);
								});

							if (false)
							store.getRange().Each( function (n,rec) {
								var data = rec.getData();
								//rec.setId(data.NodeID);
								//alert([data.ID,data.NodeID,data.name,data.TRL,data.NodeCount,data.leaf,data.expandable,data.expanded]);
							});
						}
					}
				});
				break;

			case "grid":
			case "hold":
			case "data":
			case "find":				// regular store

				var Store = This.Store = Ext.create('Ext.data.Store', {
					model		: name,
					autoLoad	: isResolved,
					/*autoLoad: {			// call its load method after store created
							params: Clone(Link.Flag) // EXTJS BUG - load revises params
						}, */
					
					//autoSync	: false,  	// disabled forces use of update to sync changes
					//buffered	: false, 	// used with paging and verticalScroller but EXTJS BUG
					//pageSize	: page,  	// used with paging and verticalScroller
					//remoteSort	: true	// enable remote sorting
				});
				break;

			case "border":
			case "folder":
			case "content":
			case "form": 				// provide store for excess form records

				var Store = This.Store = Ext.create('Ext.data.Store', {
					model	: name,
					data	: [],
					autoLoad: isResolved 
				});
				
				Store.load = function () {
					Ext.Ajax.request({
						url : This.proxy.url,
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
					Copy(proxy, Store.ds.proxy);
				};
				Store.ds = This;
				Store.load = function () {
					var
						dims = Store.ds.dims,
						src = Store.ds.proxy.url,
						tags = {
							src: src,
							width: dims[0],
							height: dims[1]
						},
						iframe = DEFAULT.NOIFRAME.tag("iframe", tags);
//alert(iframe);

					Store.update( iframe );
				};
				
				if (isResolved) Store.load();
				
				if (This.refresh) 
					setInterval(function () {
						Store.load();
					}, This.refresh*1000 );
				
				break;
		}	
	}
	
	function mapper(data,map,key) {
		data.Each(function (n,rec) {
			map[rec[key]] = Copy(rec,{});
		});
	}
	
	var  	// Define widget attributes
		This	= this,
/**
* @property {String}
* name supplied for this DS
*/
		name 	= this.name = anchor.getAttribute("class"),  
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
		sorts	= hashify( this.sorts = (anchor.getAttribute("sorts") || "").split(",") ),
		shifts	= anchor.getAttribute("shifts") ? true : false,
		
		page 	= anchor.getAttribute("page"),
		sync 	= anchor.getAttribute("sync"),
		refresh = this.refresh = parseInt(anchor.getAttribute("refresh") || "0"),
		dims = this.dims = (anchor.getAttribute("dims") || "200,200").split(","),
		
/**
 * @property {Array}
 * cols Data fields
 */
		cols	= anchor.getAttribute("cols")	 || "",
		index	= anchor.getAttribute("index") || "",  
		summary	= anchor.getAttribute("summary"),
		calc	= anchor.getAttribute("calc")  ? [] : null,
		create	= anchor.getAttribute("create") || "";

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

	cols = this.cols = cols.parse( PARMS, function cb(tok,args) {

		var 
			fOpts = tok.split("."),
			fName = fOpts[0],
			fParm = PARMS[ fName.toLowerCase() ] || {Type:calc ? "html" : "text",Label:fName,Special:""},
			fType = fOpts[1] || fParm.Type || "text",
			fLabel = fOpts[2] || fParm.Label || fName,
			fSum = fOpts[3],
			//fChange = HISTORY[path+"."+fName] || {Moderators:""},
			fTip = 	fName.tag("a",{href:`/parms.view?parm=${fName}`}) 
			//		+ " | " + fChange.Moderators 
					+ " | " + "moderate".tag("a", {href:"/moderate.view"})
					+ "||" + (fOpts[4] || fParm.Special || ""),
			fChar = fType.charAt(0),
			fOff = fChar >= "A" && fChar <= "Z",
			fLock = pivots ? undefined : fName in sorts;
		
		var fCol = gridColumn(fType,fName,fOff,fLock,fLabel,fTip,calc);
				
		if (fType == "x" || fType=="h") Blogs.push( fName );

		switch (fSum) {			// Add row aggregator if needed
			case "min":
			case "max":
			case "count":
			case "average":
			case "sum":
				fCol.summaryType = fSum;
				break;
				
			case "util":
				fCol.summaryType = function (recs) {
					var N=recs.length, idles=0, cnts=0;
					for (var n=0; n<N; n++) {
						var rec = recs[n];
						if (rec.get("SeqNum") == "Deliverables") {
							cnts++;
							if (rec.get(fName) == "XXXXXX") idles++;
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
					for (var n=0; n<N && !any; n++) any = recs[n].get(fName) ? 1 : 0;
					return any;
				};
				
				break;

			case "all":
				fCol.summaryType = function (recs) {
					var N=recs.length, all=1;
					for (var n=0; n<N && all; n++) all = recs[n].get(fName) ? 1 : 0;
					return all;
				};
				
				break;

			case "prod":
				fCol.summaryType = function (recs) {
					var N=recs.length, prod=1;
					for (var n=0; n<N; n++) prod *= recs[n].get(fName);
					return prod;
				};
				
				break;

			case "nills":
				fCol.summaryType = function (recs) {
					var N=recs.length, nills=0;
					for (var n=0; n<N; n++) nills += recs[n].get(fName) ? 0 : 1;
					return nills;
				};
				
				break;
		};
		
		switch (fName) {		// Handle reserved field names
			case "NodeCount":
				fCol.persist = false;
				break;
				
			case "NodeID":   
				fCol.xtype = "treecolumn"; 
				fCol.persist = false;
				key = fName; 
				break;
				
			case "Pivot":
				fCol.cls = "pivot";  // used when moving columns
				
				if (args) 
					args.Each(function (n,arg) {
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
			
			// EXTJS BUG does not allow tree in locked column
			if (fName == "Pivot" && args[0].xtype != "treecolumn") fCol.locked = true;
			
			return fCol;
		}
		
		Fields.push( fCol );	// Define column and its associated field
		
		return fCol;			// Return the column descriptor to the column grouper.
	});

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
	}

	// Flag tree grouping, inline data, and posting
	
	this.anchor = anchor;
	var pivots = this.pivots = NodePivots.join(",");

	// Build master-slave DS links

	var flags = { // non-record fields attached to all ajax calls
		_view: (anchor.id == "hold") ? "" : BASE.user.source, 		// view-dataset crossref
		_pivot: pivots, 	// pivot fields
		_limit: page, 
		_index: index		// field generators  
	};

	var Menu = this.Menu = new Ext.menu.Menu({ 	// cell linking context menu
			items: shifts
				? [{
					text: "Shift Left",
					handler: function () {	
						var shifts=1, 
							idxL = SELECT_CELL.idx, 
							idxR = idxL+shifts, 
							moves = Fields.length-shifts-idxL-1,
							rec = This.Store.getById(SELECT_CELL.ID);
						
						alert(["L",shifts,idxR,idxL,moves,rec]);

						for (var n=0; n<moves; n++,idxL++,idxR++) {
							//alert(Fields[idxL].dataIndex+'='+Fields[idxR].dataIndex);	
							rec.set(Fields[idxL].dataIndex, rec.get(Fields[idxR].dataIndex));
						}
						
						for (var n=0; n<shifts; n++,idxL++) 
							rec.set(Fields[idxL].dataIndex, ""); 
							
						//Widget.getView().refreshNode(SELECT_CELL.rowIdx);  // some say extjs needs a kick to refresh
					}
				}, {
					text: "Shift Right",
					handler: function () {	
						var shifts = 1, 
							idxR = Fields.length-2, // last field is always the key ID
							idxL = idxR-shifts, 
							moves = idxL-SELECT_CELL.idx+1,		
							rec = This.Store.getById(SELECT_CELL.ID);

						alert(["R",shifts,idxR,idxL,moves,Fields.length]);
						
						for (var n=0; n<moves; n++,idxL--,idxR--) {
							//alert(Fields[idxR].dataIndex+'='+Fields[idxL].dataIndex);
							rec.set(Fields[idxR].dataIndex, rec.get(Fields[idxL].dataIndex));
						}

						for (var n=0; n<shifts; n++,idxR--) 
							rec.set(Fields[idxR].dataIndex, ""); 
					}
				}] 
			: []
		})

	var Links = this.Links = {};
		
	url = (path || "").format(Links);
	if (!url || url.indexOf("undefined")>=0) url = "/undefined.db";
	//alert(name+":"+path+"->"+url);
	
	for (var master in Links) {
		var masterDS = DSLIST[master];

		if (masterDS) {
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
						proxy.url = slaveDS.path.format({ 
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
					mapper( data, HISTORY, sync );
					break;
			}
		});	
	
	else
	if (name && path) {
		if ( DSLIST[name])
			alert(`widget "${name}" already used`);
		
		else {
			//alert("preinit "+this.name+"="+this.title+"="+This.title+"="+anchor.getAttribute("title"));
			initialize();
			DSLIST[name] = this;
		}
	}
}

DS.prototype.relink = function (cb) {  // Relink dataset proxy to a new url
	var 
		proxy = this.proxy,
		Store = this.Store;

	if (cb) {
		cb(proxy, proxy.extraParams, this);
		
	/*
		var recData = rec.getData();
		for (var n in Soft)	Soft[n] = recData;
		proxy.url = this.path.format(Soft);
	*/
		
		Store.setProxy( proxy );
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

/*
 * Define Ext extend classes, establish a view portal for all components, and
 * setup defaul quick tips.
 */
Ext.onReady( function () {
	// Enable the display
	
	Ext.ux.grid.Printer.printAutomatically = false;
	Ext.ux.grid.Printer.stylesheetPath = "clients/extjs/plugins/grid/printer/print.css";
	
	Ext.apply(Ext.tip.QuickTipManager.getQuickTip(), {
		maxWidth: 500,
		minWidth: 200,
		showDelay: 1000,    // Show delay after entering target
		hideDelay: 50,		// hide delay after exiting target
		dismissDelay: 0		// disable dismissal
	});

	Ext.QuickTips.init();
					
	BASE.start({
		
		parser: {								// Dom parsing widget switches, attribues and parameters
			NIXHTML : true,
			SWITCHES : {
				kiss: false,
				nowrap: false,hide:false,crush:false,track:false,disable:false,
				calc:false,kiss:false,summary:false,trace:false,notes:true,joins:false,
				shifts:false
			},
			ATTRS : {
				region:"",active:"",refresh:"",
				dims:"1200,600",title:"",page:"",plugins:"cXF",
				//guard:"",
				dock:"head",sync:"",
				head:"Status,Search,Datasets,Insert,Update,Delete,Select,Execute,|,Blog,Print,Refresh,Delta,Help",
				update:"",select:"",execute:"",delete:""},
			PARMS : {
				left:"dock",right:"dock",top:"dock",bottom:"dock",head:"dock",
				north:"region",south:"region",east:"region",west:"region",center:"region"},
			LISTS : { 
				sorts:"" 
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
							toc = (req.timeout || 10e3) * 1e-3;

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
								cb(`/riddle?guess=${val}&ID=${req.ID}`);
							},

							this, 	// scope
							false, 	// multiline
							""	 	// default val			
						).setWidth(600);
					});
				}
				else
				if (req.message)
					Ext.Msg.alert("Welcome! ".blink().bold().fontcolor('red'), req.message);

			},

			update: function (req) {
				
//alert(JSON.stringify(req)+BASE.user.client);
				if (req.from != BASE.user.client) {
					var table = req.table;
					var body = req.body;
					var ID = Number(req[PROXY.KEY]);

					for (var n in DSLIST) {
						var Data = DSLIST[n];
						if (Data.table == table) {
							if (BASE.user.content) 
								BASE.user.content.setTitle(req.from+">"+req.msg);

							var rec = Data.Store.getById(ID);
							if (rec) for (var b in body) rec.set(b,body[b]);
						}
					}
				}
			},

			delete: function (req) {
				if (req.frome != BASE.user.client) {
					var table = req.table;
					var body = req.body;
					var ID = Number(req[PROXY.KEY]);

					for (var n in DSLIST) {
						var Data = DSLIST[n];
						if (Data.table == table) {
							if (BASE.user.content) 
								BASE.user.content.setTitle(req.from+">"+req.msg);

							var rec = Data.Store.getById(ID);
							if (rec) Data.Store.remove(rec);
						}
					}
				}
			},

			insert: function (req) {
				if (req.from != BASE.user.client) {
					var table = req.table;
					var body = req.body;
					var ID = Number(req[PROXY.KEY]);

					for (var n in DSLIST) {
						var Data = DSLIST[n];
						if (Data.table == table) {
							var rec = Ext.create(Data.name, body);
							if (rec) {
								if (BASE.user.content) 
									BASE.user.content.setTitle(req.from+">"+req.msg);

								rec.setId(ID);
								Data.Store.add(rec);
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
									//image: canvas.toDataURL("image/png"),
									image: "1234",
									filename: "snapshot.jpg"
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

function postFile(url, data, parms) {
	
	var 
		base64 = ";base64,",
		idx = data.indexOf(base64),
		opts = "";
	
	Each(parms, function (n,parm) {
		opts += n+"="+parm+";";
	});

	Ext.Ajax.request({
			url	: url,
			method	: "POST",
			params	: opts 
					+ data.substr(0,idx).replace("data:","type=") 
					+ "\r\n" 
					+ data.substr(idx+base64.length)
		});
}

WIDGET.prototype.menuTools = function () {

	function Status(msg) {
		if (Message)
			Message.setText(msg);
		else
			alert(msg);
	}

	/**
	* @method feed
	* @private
	* Force feed this DS with the specifed records recs where.  Optional "?tokens" in the query are replaced with 
	* the corresponding fields from recs.  The icon on the target widget is adjusted depending on the state 
	* of the load.	
	* @param {String} query "TargetDT" (for grids) or "TargetDT/path/link/link ..." (for posts)
	* @param {Array} recs Records to feed int this store
	*/
	function feed (query,recs) {	
		var tarDS = DSLIST[query];
		
		if (tarDS) {							// query = TargetDT 
			var store = tarDS.Store;
			var links = tarDS.Links;

			recs.Each( function (i,rec) {
				
				// Forget about priming the target model with the source record, as
				// EXTJS will hose-up any conversions (e.g. multiselects) being performed.
				// Work around is to load the data store after the model is created.  And dare
				// we not use set() as this too stumbles into same conversion bug.
				
				var srcRec = rec.getData();
				var tarMod = Ext.create(tarDS.name);
				
				tarMod.data = Copy(links,Clone(srcRec,{NodeID:1,NodeCount:1}));
				
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
			recs.Each( function (n,rec) {
				var link = body(query,rec.getData()).split("/"); 
				var tarDS = DSLIST[link[0]];

				tarDS.relink( function (proxy) {
					proxy.url = link.format({ def: rec.getData() });
				});
			});
	}

	function combo (label, ds, cb) {
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
				afterRender: function (combo,eOpts) { 
					if (ds.path == "/lookups.db") 
						combo.store.filter("Ref", name);
					// (anchor.id == "grid" ) ? name : label );
					//combo.setValue(null); // EXTJS BUG set globally
				}, 
				change: function (field,newValue,oldValue,eOpts) {
					var parms = {};
					parms[label.substr(0,label.length-1).toLowerCase()] = newValue;
					if (cb) cb(newValue,parms);
				}	
			},
			width: DEFAULT.DROP_WIDTH,
			displayField: ds.Fields[0].dataIndex,
			valueField: ds.Fields[1] ? ds.Fields[1].dataIndex : ds.Fields[0].dataIndex,
			value: label,
			//itemTpl: "{"+ds.Fields[0].dataIndex+"}" ,
			listConfig: {
				minWidth: 500
			},

			store: ds.Store
		});
	}
	
	function button (label, cb) {
		return Ext.create("Ext.Button", {
			textAlign: "left",
			cls: "x-menu-button",
			
			text: label,
			icon: "/clients/icons/tips/"+label+".ico",
			
			//iconCls: "icon-client",
			width: DEFAULT.DROP_WIDTH,
			
			handler: function (me) {
				if (cb) cb(me);
			} 
		});	
	}
	
	function action (label,roles,cbs) {
		var Label = label.toUpperCase();
		
		return {
			itemId: label,
			type: actionSign[label],
			icon: "/clients/icons/tips/"+label+".ico",					
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
				var 
					dataUI = Widget.dataUI || Widget.UI, // deal with potentially wrapped widgets
					Form = dataUI.getForm ? dataUI.getForm() : null,
					View = dataUI.getView ? dataUI.getView() : null,
					Data = Widget.Data;
				
				if (cbs.constructor == Function) 
					cbs = {onAction: cbs};

				if (Widget[label] && cbs.onAction)
					cbs.onAction( Data, Status );
					
				else
				if (Form && cbs.onForm) 
					cbs.onForm( Form.getRecord(), Form, Data, Status, function (met, flags, cb) {
						Ext.Ajax.request({
							url : Data.proxy.url,
							params: flags,
							method: met,
							success: function (res) {
								cb( Ext.decode(res.responseText) );
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
		};
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
		nada = { xtype: "tbseparator" },
		roles = this.roles = ROLES[this.Data.dataset] || DEFAULT.ROLES;

	var actionSign = {
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
		blog: "right"
	};

	// define widget help text
	var help = (this.HTML || "") + "<br>" + roles.Special;

	// retain only non-region UIs
	var helpUIs = [];
	this.UIs.Each( function (n,UI) {
		if (UI)
			if ( !UI.region ) helpUIs.push( UI );
	});

	// parse menu 
	
	var menu = this[this.dock || "head"];
	var Message, MessageTip;
	
	if (menu == this.dock) menu = this.head;

//alert("menu="+menu);
	 
	if (menu)  
		this.Menu = menu.parse( null, function (tok,args) { 
			var 	Action = anchor.getAttribute(tok);
			var 	pullDS = DSLIST[tok];
			var 	key = tok.toLowerCase();
			
			if (args)  			// nowrap sub menu items in another pulldown menu
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
										head: "Status,Insert,Update,Delete,Print,Refresh",
										//dims: "500,100",
										nowrap: true,
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
												proxy = Widget.Data.proxy;
												
											//Widget.Data.Store.setProxy(defineProxy(rec.get("Path")));
											proxy.url = rec.get("Path");
											Store.setProxy(proxy);
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
									render: function (me) {

										Ext.create('Ext.tip.ToolTip', {
											target : me.getEl(),
											html	 : help ,
											title	 : name,
											autoHide : false,
											items 	 : helpUIs,
											layout	 : "fit",
											overflowY  : "scroll",
											closable : true,
											maxWidth : "80%",
											minWidth : 600,
											minHeight: 100,
											maxHeight: 800,
											showDelay: 1000,
											hideDelay: 50,
											collapisible: true,
											collapseFirst: true,
											dismissDelay: 0
										});
									}
								}
							}, 

							action( key, {HELP:"N/A",Special:"Help."}, function () {
								if (Tips) 
									Ext.QuickTips.disable(); 
								else 
									Ext.QuickTips.enable();

								Tips = !Tips;
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
														Data.relink( function (proxy,flags) {
															flags._has = escape(SearchBox);
														});
													}},
												{	text: "<i>Natural Language</i>",
													icon: "/clients/icons/tips/NaturalLanguage.ico",
													handler: function (item) {
														Data.relink( function (proxy,flags) {
															flags._nlp = escape(SearchBox);
														});
													}},
												{	text: "<i>Binary Expression</i>",
													icon: "/clients/icons/tips/Relevance.ico",
													handler: function (item) {
														Data.relink( function (proxy,flags) {
															flags._bin = escape(SearchBox);
														});
													}},
												{	text: "<i>Implied Knowledge</i>",
													icon: "/clients/icons/tips/ImpliedKnowledge.ico",
													handler: function (item) {
														Data.relink( function (proxy,flags) {
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

						return button(tok, function () {
							Widget.fireEvent('saveview');
							Ext.Msg.alert(name,"Widget view was held");
						});	

					case "delta":

						var deltaed = true;
						
						if (isForm)
							return nada;
						
						else
							return action( key, {DELTA:"N/A",Special:"Delta baseline changes."}, function () {
								//Flag = Data.Link.Flag;								
								//Flag._delta = delta ? "Num" : "";
								//Widget.Data.Store.setProxy(defineProxy(Widget.Data.proxy.url, delta ? {_delta:"Num"} : null));
								
								Widget.Data.relink( function (proxy,flags) {
									flags._delta = deltaed ? "Num" : "";
								});
								deltaed = !deltaed;
							});

					case "refresh":

						if (Widget.refresh) setInterval(function () {
							Widget.Data.relink();
						}, Widget.refresh*1000);

						if (isForm)
							return nada;
						else
							return action( key, {REFRESH:"N/A",Special:"Refresh."}, function () {
								Widget.Data.relink();
							});

					case "print":

						if (isForm)
							return nada;
						else
							return action( key, {PRINT:"N/A",Special:"Print."}, function () {
								Ext.ux.grid.Printer.print(Widget.dataUI);
							});

					case "blog":
	
						var blogged = false;
						
						if (isForm)
							return nada;
						else
							return action( key, {BLOG:"N/A",Special:"Blog."}, function () {
								Widget.Data.relink( function (proxy, flags) {
									var parms = Ext.Object.fromQueryString(proxy.url);

									if (blogged) 
										delete parms._blog;
									else
										parms._blog = Widget.Data.Blogs.join(",");

									proxy.url = unescape(Ext.Object.toQueryString(parms)).replace("?=","?");
									/*
									if (blogged)
										proxy.url = proxy.url.substr(0,proxy.url.indexOf("?"));
									else
										proxy.url = proxy.url +"_blog=" + Widget.Data.Blogs.join(",");
									*/
									blogged = !blogged;
								});
							});

					case "|":

						return nada;

					case "insert":

						return action( key, roles, {
							onForm: function (Rec, Form, Data, Status) {

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
								});	
							},

							onSelect: function (Recs, Data, Status) {

								var 
									Store = Data.Store;

								Recs.Each( function (n,Rec) {
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
										Data.Store.remove(Rec);
										Status(info.msg || STATUS.OK); 
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
							onForm: function (Rec, Form, Data, Status,cb) {
								
								cb( 
									"PUT", 
								   	Copy( 	
										Form.getValues(false, true, true),
										{ID:Rec.getId(), _lock:!Data.Locked} 
									), 
									function (info) {
										//Data.Locked = !Data.Locked;
										Status(info.msg || STATUS.OK);
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
									{_lock: ! Data.Locked},
									function (info) {
										Data.Locked = !Data.Locked;			
										Status(Data.Locked?"locked":"unlocked");
										Form.loadRecord( Ext.create(Data.name, info.data[0]) );
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
									url : Data.proxy.url.replace(".db",".exe"),
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
								Recs.Each(function (n,Rec) {
									var parms = {ID: Rec.getId()};
									
									Ext.Ajax.request({
										url : Data.proxy.url.replace(".db",".exe"),
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
									url : Data.proxy.url.replace(".db",".exe"),
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

						return action( key, {CAPTURE:"N/A",Special:"Capture screen."}, function () {

							if (html2canvas)
								html2canvas(document.body).then( function (canvas) {
									document.body.appendChild(canvas);
									postFile( "/uploads.db", canvas.toDataURL("image/png"), {
											filename: "snapshot.png",
											name: "capture"
									});
								})
							else
								Ext.Msg.alert("Status","client has no capture feature");
						});

					case "$stores": 		// reserved file uploaders
					case "$uploads":

						var upid = key.substr(1),
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

					case "$$uploads":  // legacy

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
										  
					case "summary":

						if (pullDS) 
							return combo( tok, pullDS , function (val) {
							});
						else
							return button( tok, function () {
							});

					case "datasets":
						
						if (ds = DSLIST[tok]) 
							return combo( tok, ds, function (path, parms) {
								Widget.Data.relink( function (proxy, flags) {
									proxy.url = path;
								});
							});

						else
							return button( tok, function () {
							});
					
					default:

						if (Action)  		// pulldown via widget attribute
							if (pullDS) 
								return combo( tok, pullDS, function (val) {
								});
							else
								return button( tok, function () {
									if (Action.indexOf(".db") >= 0)
										Ext.Ajax.request({
											url : Action,
											method: "GET",
											success: function (res) {
												Ext.Msg.alert("status",res.responseText);
											},
											failure: function (res) {
												Ext.Msg.alert("status",STATUS.FAULT);
											}
										});
									else
										window.open(Action);
								});
						
						else
						if (pullDS)
							return combo( tok, pullDS, function (val,parms) {

								if (val.charAt(0) == "/") 
									window.open(val);

								else  {
									if (parms.option) {
										var ps = val.split("+"),
											ns = val.split("-");

										parms.more = ps.length-1;
										parms.less = ns.length-1;
										parms.option = ps[0];
									}

									location.search = Ext.Object.toQueryString(
										Ext.apply(
											Ext.Object.fromQueryString(location.search),
											parms
										));
								}

							});
						else
							return button( tok, function () {
							});
				}
		});
		
	else
		this.Menu = [];
		
}

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
WIDGET.prototype.terminal = function (term,opts) {	
	
	/**
	* @method sortTools
	* @private
	*/
	function sortTools (docks) {
		// Returns an array of sortData from the sorter buttons
		function getSorters () {
			var sorters = [];
			Ext.each( docks, function (act) {
				if (act.sortData) 
					sorters.push(act.sortData);
			});
			return sorters;
		}

		// Tells the store to sort itself according to our sort data
		function doSort () {
			Widget.Data.Store.sort(getSorters());
		}

		// Callback handler used when a sorter button is clicked or reordered
		// operations as we wish to preserve ordering there
		function changeSortDirection (button, changeDirection) {
			var sortData = button.sortData,
				iconCls  = button.iconCls;
		
			if (sortData) {
				if (changeDirection !== false) {
					button.sortData.direction = Ext.String.toggle(button.sortData.direction, "ASC", "DESC");
					button.setIconCls(Ext.String.toggle(iconCls, "sort-asc", "sort-desc"));
				}
				Widget.Data.Store.clearFilter();
				doSort();
			}
		}

		// Creates toolbar Buttons that are tied to sorters
		function createSorterButtonConfig (config) {
			config = config || {};
			Ext.applyIf(config, {
				listeners: {
					click: function(button, e) {
						changeSortDirection(button, true);
					}
				},
				iconCls: 'sort-' + config.sortData.direction.toLowerCase(),
				reorderable: true,
				xtype: 'button'
			});
			return config;
		}

		// EXTJS BUG - adding sortTools to a grid contained in an accordion causes the accordion to act goofy.

		if (Sorts.length) {	
			docks.push(nada);

			docks.push( {	
				xtype: 'tbtext',
				text: 'Sorts:',
				reorderable: false 
			} );

			Sorts.Each( function (i, sort) {
				docks.push( createSorterButtonConfig({
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
							changeSortDirection(button, false);
						}
					}
				}),
					
				Ext.create('Ext.ux.ToolbarDroppable', {  // dropping tool
					lockableScope: "normal",

					// Creates the new toolbar item from the drop event
					createItem: function(data) {
						var header = data.header,
							headerCt = header.ownerCt,
							reorderer = headerCt.reorderer;
					
						// hide the drop indicators of the standard HeaderDropZone
						// in case client had a pending valid drop in 
						if (reorderer) reorderer.dropZone.invalidateDrop();

						var act = createSorterButtonConfig({
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
				
					afterLayout: doSort
				}) 
			];
		}
		
		else 
			return [];
	}

	/**
	* @method agTools
	* @private
	*/
	function agTools  () {
		var features = [];

		if (Widget.summary) 
			features.push( { ftype: 'summary' });

		return features;
	}

	/**
	* @method pageTools
	* @private
	*/
	function pageTools () {
		var ctrls = [];

		if (Widget.page)
			ctrls.push( Ext.create('Ext.PagingToolbar', {
				store: Widget.Data.Store,
				dock: "bottom",
				displayInfo: true,
				displayMsg: 'Showing {0} - {1} of {2}',
				emptyMsg: "No records"
			}));

		return ctrls;
	}
			
	var Widget = this,
		Sorts = this.sorts,
		Plugins = this.plugins || "",
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
	
	Widget.Editor = [];
	for (var n=0,N=Plugins.length; n<N; n++) 
		switch (Plugins.charAt(n)) {
				case "c": 
					Widget.Editor.push(Ext.create('Ext.grid.plugin.CellEditing', {
						clicksToEdit: 1
					}));
					break;
					
				case "r":
					Widget.Editor.push(Ext.create('Ext.grid.plugin.RowEditing', {
						clicksToEdit: 2,
						autoCancel: false
					}));
					break;
					
				case "X":
				case "x":
					Widget.Selector = Ext.create('Ext.selection.CheckboxModel', {	
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
					
				case "R":
					Widget.Selector = Ext.create('Ext.selection.RowModel', {	
						mode: 'multi',
						ignoreRightMouseSelection: true
					});
					break;
					
				case "C":
					Widget.Selector = Ext.create('Ext.selection.CellModel', {	
						mode: 'multi',
						ignoreRightMouseSelection: true
					});
					break;
					
				case "F":
				case "f":
					Widget.Editor.push("gridfilters");
					break;
			}

	this.UI = this.dataUI = Ext.create(term || "Ext.grid.Panel", Copy(opts || {}, {    // create the terminal UI
		// Basic attribute and appearance 
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

		//overflowX	: "auto",
		//overflowY	: "auto",

		//iconCls	: 'Loads-0',
		icon		: "/clients/icons/widgets/"+this.name,

		// region in next level container
		region		: this.region,
		layout		: "fit",

		// Toolbars, selection models, sorters and features
		plugins		: Widget.Editor,

		selModel	: Widget.Selector, 

		bbar		: pageTools(),

		tools		: isHead ? this.Menu : null,
		
		dockedItems	: isHead 
			? null
			: { 
				xtype: 'toolbar',
				dock: this.dock, //"top", //this.dock || "top",
				items: this.Menu,
				plugins: sortTools(this.Menu)
			},

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
			
			// regen pivots and slaved posts if pivot column moved
			columnmove: function ( header, column, fromIdx, toIdx, eOpts ) {  
				var data = Widget.Data;
				
				if (data.pivots) {
					var cols = header.getGridColumns();		// get columns in pivot group
					var NodePivots = [];

					cols.Each( function (n,col) {			// find new pivots
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
								proxy.url = slave.path.format({});
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

	if (! this.nowrap ) this.wrapper();
}

/**
* Due to EXTJS BUG -- iframes, forms, and panels do not expose their
* header, so these componets must be wrapped in yet another panel
*/
WIDGET.prototype.wrapper = function () {
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

/**
 * @method content
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a content component for this widget from the supplied component UIs and HTML.  
 * Tab docking qualifiers can be [top,bottom].
*/
WIDGET.prototype.content = function () { 

	this.UI = Ext.create('Ext.panel.Panel', {
		layout: "border",
		region: "center",
		overflowY: "auto",  // EXTJS bug - ignored
		items: [ 
			Ext.create('Ext.panel.Panel', { 		// header
				layout: "fit",
				html: this.title,
				region: "north",
				bodyStyle: "background: yellow;text-align:center;color:black;"
			}),

			Ext.create('Ext.panel.Panel', { 		// content
				// Basic attributes and appearance
				title		: null, //this.title,
				header		: false,
				animCollapse: false,			// EXTJS BUG - must not animate the collapse
				collapsed	: false, //this.crush,
				collapsible	: false, //!this.Headless,
				titleCollapse: false,
				icon		: "/clients/icons/widgets/"+this.name,
				hidden		: this.hide,
				maximizable	: true,
				// Container				
				region		: "center",
				disabled	: this.disable,
				// Subcomponents				
				layout		: "fit",
				items		: this.UIs,
				html		: this.HTML
			}),

			Ext.create('Ext.panel.Panel', {			// footer
				layout: "fit",
				html: this.title,
				region: "south",
				bodyStyle: "background: yellow;text-align:center;color:black;"
			})
		]
	});
}

/**
 * @method hold
 * Returns a null component for holding a data store.  Null components are removed from the parents's UIs list.
 * @return {null} 
 */
WIDGET.prototype.hold = function () {
	var 
		name = this.name,
		store = this.Data.Store;
	
	if (this.refresh) 
		setInterval(function () {
			store.load();
		}, this.refresh*1000);
		
	this.UI = null; 
}

/**
 * @method post
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a post component for this widget from the supplied component UIs and HTML.  
 * Tab docking qualifiers can be [top,bottom].
 */
WIDGET.prototype.post = function () { 
	this.dataUI = this.UI = this.Data.Store;

	if (! this.nowrap ) this.wrapper();

}

/**
 * @method layout
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct the anchor, fit, hbox, vbox, box, table and colmn wrappers.  
*/

for (var layout in {anchor:1, fit:1, hbox:1, vbox:1, box:1, table:1, column:1}) 
	WIDGET.prototype[layout] = function () {
		if (this.HTML) 
			this.UIs = [{ 
				html: this.HTML, 
				xtype: "panel"
			}].concat(this.UIs);
			
		this.UI = Ext.create('Ext.panel.Panel', {
			// Basic
			title		: this.title, //this.head ? this.title : null,
			header		: this.title ? true : null, //this.head ? true : null, //this.Headless ? false : true,
			animCollapse: false,	// EXTJS BUG - some componenets must not animate the collapse
			collapsed	: this.crush,
			collapsible	: this.crush,
			overflowY	: "auto",
			frame		: false, //dims[2]>1,
			//iconCls	: 'Loads-1',
			icon		: "/clients/icons/widgets/"+this.name,
			hidden		: this.hide,
			maximizable	: true,
			
			// Container				
			region		: this.region,
			disabled	: this.disable,
			
			// Specific
			align: "stretch",
			pack: "start", 

			// Subcomponents	

			defaults		: {
				overflowX: "auto",
				overflowY: "auto",
				width: this.dims[0],
				height: this.dims[1] },
				
			layout		: {
				type: this.anchor.id,
				columns: 2
			},
			
			items		: this.UIs
			//html		: this.HTML
		});			
	}

/**
 * @method default
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct the default component for this widget from the supplied component UIs and HTML.  
*/
WIDGET.prototype.default = function () { 
	this.post();
}

/**
 * @method border
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a border component for this widget from the supplied component UIs and HTML.  
 */
WIDGET.prototype.border = function () { 
	this.menuTools();	
	
	//this.UIs.Each(function (n,ui) { alert(ui.region); });
	
	this.UI = Ext.create('Ext.panel.Panel', {
		// Basic
		title		: this.title,
		header		: this.title ? true : null,	
		animCollapse: false,	// EXTJS BUG - some componenets must not animate the collapse
		collapsed	: this.crush,
		collapsible	: this.crush,
		titleCollapse: false,
		overflowY	: "auto",
		frame		: false, //dims[2]>1,
		icon		: "/clients/icons/widgets/"+this.name,
		hidden		: this.hide,
		maximizable	: true,
		
		// Specific
		
		tools		: this.Menu, 
		items		: this.UIs
	});	
}

/**
 * @method folder
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a folder component for this widget from the supplied component UIs and HTML.  
 */
WIDGET.prototype.folder = function() {
	var Widget = this;
	var Data = this.Data;
	var crush = this.crush;
	var UIs = this.UIs;
	
	// Build redundant hash due to EXTJS BUG with TabPanel methods
	
	UIs.Each(function (n,UI) { 
		
		TABLIST[UI.title] = UI;
		
	});
	
	this.UI = Ext.create('Ext.tab.Panel', {
		// Basic
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

		tabPosition: (this.dock||"top").replace("head","top"),
		
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

/**
 * @method accordion
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct an accordion component for this widget from the supplied component UIs and HTML.  
 */
WIDGET.prototype.accordion 	= function () {
	
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

/**
 * @method window
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Null} 
 *
 * Construct a window component for this widget from the supplied component UIs and HTML.  
 */
WIDGET.prototype.window = function (UIs,HTML) { 
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
		icon		: "/clients/icons/widgets/"+this.name,
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

/**
 * @method grid
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a grid component for this widget from the supplied component UIs and HTML.  
 */
WIDGET.prototype.grid = function () { 
	this.terminal('Ext.grid.Panel'); 
}

/**
 * @method find
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a find component for this widget from the supplied component UIs and HTML.  
 */
WIDGET.prototype.find = function () { 
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

/**
 * @method pivot
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a pivot component for this widget from the supplied component UIs and HTML.  
 */
WIDGET.prototype.pivot = function () { 
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

/**
 * @method form
 * @param {Object[]} UIs A list of components to be aggregated.
 * @param {String} HTML Help information to append.
 * @return {Object} component created
 *
 * Construct a form component for this widget from the supplied component UIs and HTML.  
 */

var FieldIDs = {};

WIDGET.prototype.form = function () {
	var	Widget = this;
		Data = this.Data;
		
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

		cols.Each(function (i,Col) {
			// EXTJS BUG.  Because most browsers require field labels to be unique -- the stupidity
			// here seemingly motivated by a misplaced need for form cacheing -- we need to make 
			// sure that field ids are unique.  EXTJS failed to document this behavior.
			
			var fLabel = Col.text;
			var fName = Col.dataIndex;
			var fOff = false; //Col.hidden; 
			
			if (FieldIDs[fLabel]) {
				var fID = "Field." + fLabel + FieldIDs[fLabel];
				FieldIDs[fLabel]++;
			}
			else {
				var fID = "Field." + fLabel;
				FieldIDs[fLabel] = 1;
			}

			if (Col.columns) 	// have column grouping
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
			else { 				// single column
				// Return the field item while mixing-in the editor to preserve combobox etc.
				// NOTE: any listeners in the editor are lost in this process; this is the preferred 
				// approach as editor listeners should/can be customized for grids and forms.

				var UI = UIs[i] = Copy({	
						id			: fID,
						fieldLabel	: fLabel,
						name		: fName,
						xtype		: 1 //  correct EXTJS BUG -- all browsers
							? (Col.editor.xtype == "numberfield" || Col.editor.xtype == "datefield") ? "textfield" : Col.editor.xtype
							: Col.editor.xtype,
						value		: Col.editor.defaultValue,
						qtip		: Col.qtip,
						qtitle		: Col.qtitle,
						disabled	: false,
						listeners	: {
							afterrender: function (me) {
								Ext.create('Ext.tip.ToolTip', {
									target	: me.getEl(),
									html	 : me.qtip,
									title	 : me.qtitle,
									autoHide : false,
									//closable : true,
									maxWidth : 300,
									minWidth : 200,
									showDelay: 1000,
									hideDelay: 50,
									collapisible: true,
									//collapseFirst: true,									
									dismissDelay: 0
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
					}, Clone(Col.editor) );
			
				// EXTJS BUG -- disabled form fields are not submitted.  Ext argues this is the expected
				// behavior, yet it dutifully submits disabled fields when they are on grids.  Best way to 
				// normalize this behavior is to make them hidden and enabled on the form.
				
				/*
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

		//overflowX	: "auto",
		overflowY	: "auto",

		//iconCls		: 'Loads-0',
		icon		: "/clients/icons/widgets/"+this.name,

		// Next level container
		region		: this.region,

		// specific
		trackResetOnLoad: true,
		
		// layout
		layout		: "anchor",
		html		: this.HTML,

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

var DISPLAYS = {
	bar:"cartesian",
	bar3d:"cartesian",
	candlestick:1,
	line:"cartesian",
	scatter:"cartesian",
	gauge:"polar",
	pie:"polar",
	pie3d:"polar",
	radar:"polar"
};

for (var chart in DISPLAYS)	
	WIDGET.prototype[chart] = function () {
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
					autoHide: false,
					trackMouse: false,
					dismissDelay: 0,
					showDelay: 1000,
					hideDelay: 50,	 
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
