// UNCLASSIFIED 

/**
 * This client module interfaces with [Totem's api](/api.view) to support [Totem's content management](/skinguide.view) 
 * function using [Totem's modelling framework](/models.view). 
 *
 * Work flows contain a network of systems (aka machines or engines).  A system can be triggered, sampled,
 * state driven, or petri token driven.  Each system has a URL identifing the path to a restful
 * engine that sinks and sources event tokens.  
 * 
 * System queueing stats (event rates, delay, utilization, drops, etc), machine states, and petri tokens are
 * logged as the client steps/advances a model with the specified run options (number of steps, step size, 
 * stats snapshot period).  
 * 
 * System ports (and their corresponding event tokens) can be either simple or N-fold threaded: whereas simple 
 * ports are sampled, threaded ports are triggered.  In an algorithm chain of, say, 3 systems, 
 * with 5, 10, and 2 threaded output ports, there are 5*10*2=100 total execution threads that can be shared
 * (hyper-threaded) among K processing cores (if the server implements, say, K=4 processing cores, then 
 * no more than 100/4=25 threads are impacted by a single failing thread).
 * 
 * Each system engine supports TAUINIT, TAUSTEP, TAUFREE, and TAUREAD (restful PUT, POST, DELETE, GET) to
 * program, advance, deallocate and read an engine given itau, otau and state parameters: 
 * 
 *		tau = [event1, event2, ...] events arriving to input (or departing from output) ports 1,2, ... 
 * 		port = name of input/output port
 * 		thread = 0-based system instance counter
 * 
 * This client module supports model editing (clone,delete,open,load,save,info,run), compile and link functions.
 * A model is compiled and linked when its underlying base.js module renders a model (underlying base WIDGET)
 * of the form:
 * 
 * 		#system.label(inputs="link,link,...",outputs="link,link,...")
 * 			#subsystem.label(inputs="link,link,...",outputs="link,link,...")
 * 			#subsystem.label(inputs="link,link,...",outputs="link,link,...")
 * 
 * where for an N-fold threaded port (N=0 simple port by default)
 *  
 * 		input link = name|N|system|name
 * 		output link = name|N
 * 
 * See SYSTEM, PORTS, primeEvents, and THREADS for more information on how to systems are created.
 * 
 * Variable naming conventions herein:
 * 
 * 		Names = array or hash object
 * 		Name = element (object or not) of Names
 * 		iName = input thing
 * 		oName = output thing
 * 		tau = event token of list of tokens
 * 		Thing = hash object
 * 		NAME = global constructor, array or hash object
 */

var DOT = ".";
var PIPE = "|";

/**
 * @cfg MODEL {Object}
 * Parameters for models.
 * */
 
var MODEL = { 				// Model parameters
	status: null, 			// Last system status message
	selected: null,			// Selected system 
	mask: true,				// Hide subsystems on load
	depth : 0,				// Depth of subsystem in current model
	root: null, 			// Root system
	path: { 				// Paths
		options: "/simoptions.db", 	// to simulation options
		engines: "/engines.db",		// to engines store
		viewer: "/flow.view" 		// to model viewer
	},
	wraps: null, 			// System select wrappers
	engines: {}, 			// Engines allocated to each system
	queue: [], 				// External job queue
	state: {				// Current run state
		paused: true,		// paused by default
		step: 0, 			// current simulation step
		t: 0, 				// relative time
		halted: true, 		// halted by default
		client: "guest"		// default client
	},
	option: "stats", 		// Default simulation option set
	options : {				// Default simulation option sets
		stats : {
			steps:3, 		// Number of simulation steps to run
			t: 0,			// Current simulation time [ms]
			delta:100, 		// Simulation time step [ms]
			delaybins: 50, 	// Number of bins to collect delay stats
			delaymax: 20e3,	// Maximum delay to collect delay stats
			name: "stats",  // Simulation option set
			screen: "", 	// Ingest screen
			url: "/simstats.db", 	// url to snapshot sim stats
			sample: 1		// Number of departures before snapshot
		}
	},	
	tau : {					// Default arriving/departing event token
		job: "", 			// Current job thread N.N... 
		work: 0, 			// Anticipated/delivered data volume (dims, bits, etc)
		disem: "", 			// Disemination channel for this event
		classif: "", 		// Classification of this event
		cost: "",			// Billing center
		policy: "", 		// Data retention policy (time+place to hold, method to remove, outside disem rules)
		status: 0, 			// Status code (health, purpose, etc)
		value: 0			// Flow calculation
	},
	seq : 0,				// Sequence number for new systems
	lib : {},				// System library
	PARSER : {				// Base widget parsing switches, attribues, etc
		NIXHTML: true,
		QUERY: "",			// Last query parms set by base
		SWITCHES : {run:0}, // Switch parms
		ATTRS : 			// Attribute parms
			{stats:"",path:""},
		PARMS : {},			// Parameter parms
		LISTS :  			// List parms
			{inputs:[],outputs:[],routes:[],markers:[]}
	},
	arrow : function (Type,x1,y1,x2,y2) {		// Legacy method to make sprite edges
		x1 += 5;
		var
			x0 = (x1+x2)/2, 
			y0 = (y1+y2)/2,
			arr = "l-2,-2v4l2,-2";

		switch (Type) {
			case "zig": return "M"+x1+" "+y1 + "H"+x0 + "V"+y2 + "H"+x2 + "M"+x2+" "+y2+arr;
			case "zap": return "M"+x1+" "+y1 + "L"+x2+" "+y2+arr;
			default: return "M"+(x1+5)+" "+y1 + "L"+x2+" "+y2;
		}			
	}
};

/**
 * @class client.models.Array
 * @method contains
 * Returns true if this array contains test.
 * @param {Object} test Element to locate in this array
 */
Array.prototype.contains = function (test) {
	var N=this.length;
	for (n=0;n<N;n++) if (this[n] == test) return true;
	return false;	
}

/**
 * @method threadSerial
 * Serialize (thread) this array from the specified index idx with a callback cb at each element and a final
 * callback endcb when the array has been completely processed.
 * 
 * @param {Number} idx starting index (typically 0 on first call).
 * @param {Function} cb callback(element,args,cb) which callsback cb(args) when the element has completed.
 * @param {Object} args hash to endcb.
 * @param {endcb} endcb optional final callback(args) when array has been completely processed.
 * */
Array.prototype.threadSerial = function (idx,cb,args,endcb) {
	var This = this;
console.log("thread array="+This.length);

	if (idx < this.length) {
		//console.log("thread "+idx+" of "+this.length);
		cb(this[idx], idx+1, function (idx) {
			This.threadSerial(idx,cb,args,endcb);
		});
	}
	else {
		//console.log("thread end");
		if (endcb)
			endcb(args);
	}
}

/**
 * @method threadParallel
 * Spawn elements in this array with callback cb at each element and a final callback endcb when the 
 * array has been completely processed.
 * 
 * @param {Function} cb callback(element,cb) which callsback cb() when the element has completed.
 * @param {Object} args hash to endcb.
 * @param {endcb} endcb optional final callback(args) when array has been completely processed.
 * */
Array.prototype.threadParallel = function (cb,args,endcb) {
	var cnt = 0, cnts = this.length;
	
	this.Each(function (n,val) {
		cb(val, function () {
			//console.log("threadParallel "+cnt+" of "+cnts);
			cnt++;
			if (cnt == cnts) {
				//console.log("threadParallel end");
				if (endcb) endcb(args);
			}
		});
	});
}		

/**
 * @method primeEvents
 * Constructs an tau event token.
 * @param {Numeric} N Number of event tokens to return
 * @return {Array} Event tokens
 */
function primeEvents(N, Taus) {
	for (n=0;n<N;n++) Taus.push( new Object(MODEL.tau) );
	return Taus;
}

/**
 * @class client.models.THREADS
 * @constructor
 * Constructs an N-event thread (event stream, stash, and states) associated to a specified Port.
 * @param {Numeric} N Number of event tokens to return
 * @param {Object} Port Associated system i/o point
 * @return {Object} Thread containing associated event token and state vectors
 */
function THREADS(N,Port) {
	var thread = { 				// io thread
		tau: primeEvents(N,[]),  		// token stream
		stash: primeEvents(N,[]), 		// token stash used to accelerate system threading
		state: new Array(N) 	// signal states
	};
	
	for (n=0;n<N;n++)
		thread.state[n] = {
			job: "", 			// current job on this signal
			idle: true, 		// current idle condition (not used)
			port: Port, 		// link back to associated io Port
			tau: thread.tau[n] 	// link back to associated io Token
		};
	
	return thread;
}

/**
 * @class client.models.PORTS
 * @constructor
 * Constructs i/o ports (threaded or simple) from the array of port Links.  The defined event 
 * tokens Taus, port Labels and threaded xPorts are also returned.
 * 
 * @param {Array} Links list of i/o port links
 * @param {Array} Taus list of event tokens for every i/o port
 * @return {Array} Labels list of corresponding display labels for every i/o port
 * @return {Array} xPorts list of corresponding threaded i/o ports
 * @return {Object} Ports event token and state info for every i/o port
 */
function PORTS(Links,Taus,Labels,xPorts) {
	var Ports = {};
	var toSystem = "";
	
	Links.Each( function (n,link) {
		var parts = (link+"|||").split("|");
		var name = parts[0];
		var threads = parseInt(parts[1]) || 0;
		var toName = parts[3] || name;

		toSystem = parts[2] || toSystem;
		
		var Port = Ports[name] = {  // (*) reset when edge added
			tau: Taus[n],			// event token controlled by this port (*)
			edge: {					// connection to sourcing system and port
				system: toSystem,
				port: toName
			},
			link: null, 			// link to sourcing/sinking system  (*)
			copy: null,				// event token if controlled by another port (*)
			idle: true, 			// current idle state
			name: name,   			// unique name 
			label: name,			// default display label
			index: n,				// index 
			job: "",				// current job state
			thread: 0, 				// relative thread number
			idle: true,				// current idle state
			x: null 				// no threads by default
		};

		if (threads) {
			Port.x = THREADS(threads,Port);
			Port.label += ":"+threads;
			Port.thread = xPorts.length;  
			xPorts.push(Port);
		}
		
		Labels.push(Port.label);
		
//console.log("port["+name+"] "+Port.label+" x="+Ports[name].x);				
	});
	
	return Ports;
}

/**
 * @class client.models. 
 * @constructor
 * Returns a system hash with specified attributes.
 * @param {String} Name name of system
 * @param {String} Label Label on system
 * @param {Object} Model subsystems to be embeded in this system
 * @param {Array} iLinks input port names [name, name|threads, name|threads|system|name , ...]
 * @param {Array} oLinks output port names [name, name|threads, ...]
 * @param {Array} Routes state machine rules [from-state|to-state|on-condition|exit|entry, ... , 0|to-state|start]
 * @param {Array} Markers petri transition rules [from|from|...||tx||to|to|..., ... , N|N|... ]
 * @param {String} Stats name of stats snapshot options (null to disable snapshots)
 * @param {String} Path url?{arg1:u.x, ...} path to system application (defaults to /Name.db)
 */
function SYSTEM(Name,Label,Model,iLinks,oLinks,Routes,Markers,Stats,Path) {
	var 
		x=10,y=10,W=50,H=50,ID="system-"+Name+"-"+(MODEL.seq++);
	
	var 
		iLabels = [], oLabels = [],				// i/o port labels
		iThreads = [], oThreads = [],			// i/o port threads
		Thread = (Name in MODEL.engines) 		// Engine thread counter
			? ++MODEL.engines[Name]
			: MODEL.engines[Name] = 0;
	
	// Define the system 

	var This = MODEL.lib[Label] = Copy({
		custody	: Name,								// leaf name for chain of custody 
		name	: Name,								// system name
		label 	: Label, 							// display name
		id		: ID,								// unique system id (not used)
		chain  	: new Array(),						// subsystem execution chain
		snap	: MODEL.options[(Stats||"").toLowerCase()], // stats snapshot options
		stats 	: {	 								// stats to snapshot at arrival/departure points
			load:0, 								// number of events arriving to queue
			backlog:0,  							// work backlog in queue
			depth:0,								// job backlog in queue
			util:0, 								// queue utilization
			jobs:0, 								// number of jobs serviced by queue
			delay:0, 								// last delay thru queue
			scale:1,								// delay stats scale
			drops:0, 								// number of events dropped
			job: "",								// job thread
			snaps: 0,								// sample counter for snapshot trigger
			prunes 	: 0,							// number filtered on arrival
			faults 	: 0,							// number faulted on arrival
			ts: new Date(),							// current time stamp
			step:	0, 								// simulation step
			t:		0								// relative simulation time (step*delta)
		},		
		thread 	: Thread, 							// engine thread index
		/*
		state	: {
			step:	0, 								// simulation step
			t:		0,								// relative simulation time (step*delta)
			depth:	0,								// depth of queue
			drops:	0 								// dropped from queue
			//thread: Thread	 						// index to allocated engine
			//reset: 	0, 								// port reset when stepping an i/o thread (0 otherwise)
			//name: 	"", 							// port name when stepping an i/o thread (empty otherwise)
			//index:  -1 								// port index when stepping an i/o thread (-1 otherwise)
		},
		* */							
		watch 	: [], 								// deep status watch list
		queue 	: [],								// default arrival queue
		trace	: true,								// trace switch
		sm		: null, 							// state machine
		pn		: null,								// petri pn
		parent	: null,								// parent driving system
		tau 	: {									// reserve event vector for each port
			i: primeEvents(iLinks.length, []),				// input 
			o: primeEvents(oLinks.length, [])				// output 
		},
		graph 	: new joint.dia.Graph,				// reserve jointjs graph for this system
		config	: {									// config info for cloning system
			subs : [],			
			links	: {
				i: Copy(iLinks,{}),
				o: Copy(oLinks,{})
			},
			routes	: Copy(Routes,{}),
			markers	: Copy(Markers,{}),
			stats 	: Stats,
			path	: Path
		},
		path 	: Path || ("/"+Name+".sim") 			// url path to application
	}, this);
	
	this.i = PORTS(iLinks,this.tau.i,iLabels,iThreads);		// input ports 
	this.o = PORTS(oLinks,this.tau.o,oLabels,oThreads);		// output ports
	
	this.x = {										// threaded ports
		i: iThreads, 								// input
		o: oThreads									// output
	};

	// Setup default atom, frame and graph
	
	this.frame = new joint.shapes.devs.Coupled({	// jointjs cell that will contain subsystems
		id: Name+"-frame",
		position: { x:x, y:y },
		size: { width:W*(5+3), height:H*3 },
		inPorts: iLabels,
		outPorts: oLabels,
		attrs: {
			rect: { fill: 'lightblue' },
			'.label': { text: Label, ref:'rect', 'ref-x': .5, 'ref-y': 100, 'x-alignment':'middle' },
            '.inPorts text': { x:+10, y: 4, 'font-size':10, 'text-anchor': 'start' },
            '.outPorts text':{ x:-10, y: 4, 'font-size':10, 'text-anchor': 'end' }
		}
	});
	
	this.atom = new joint.shapes.devs.Atomic({		// jointjs cell for this system when used in another system
		id: Name+"-atom",
		position: { x:0, y:0 },
		size: { width:1.5*W, height:Math.max(3,Math.max(oLabels.length,iLabels.length))*20 },
		inPorts: iLabels,
		outPorts: oLabels,
		attrs: {
			rect: { 
				fill: Routes.length ? '#77F5BD' : Markers.length ? '#0CA6DF' : '#F57777'
				/*fill: {
					type: 'linearGradient',
					stops: [{ color: '#13cede' }, { color: '#49a5bf' }],
					attrs: { x1: '0%', y1: '0%', x2: '0%', y2: '100%' }
				}*/
			},
            			
			'.label': { text: Label, ref:'rect', 'ref-x': .5, 'ref-y': -20, 'x-alignment':'middle' },
            '.inPorts text': { x:+5, y: 5, 'font-size':10, 'text-anchor': 'start'  },
            '.outPorts text':{ x:-5, y: 5, 'font-size':10, 'text-anchor': 'end' }
		}
	});
		
	/*
	// Start ajax request to override defaults
	
	$.ajax({
		type: "GET",
		url: MODEL.path.engines.tag({Name: Name,Engine:"model"}),
		failure: function () {
			alert("system get failed "+Name);
		},
		success: function (rtn,status) {
			JSON.parse(rtn).data.Each(function (n,rec) {
				This.graph.fromJSON(JSON.parse(rec.Code));
			})
		}
	});  */ 

	// Establish a place to render everything
	
	this.paper = new joint.dia.Paper({
		el: $('#'+this.name),
		width: 1000,
		height: 600,
		gridSize: 1,
		//perpendicularLinks: true,	
		model: this.graph
	});

	// Render and compile the graph

	if (Model)
		this.compile(Routes,Markers,Model);
	
	//console.log("resize"+this.name);
	
	this.frame.resize( W*(2*this.config.subs.length+3), H*3 );

	if (false)  	// auto reroute links when obstacle moved
		this.graph.on('change:position', function(cell) {
			if (_.contains(obstacles, cell)) This.paper.findViewByModel(link).update();
		});

	if (false) 		// system animation initialization
		this.atom.on("transition:start", function (cellView,evt,x,y) {  
			//console.log(cellView);
		});
	
	// Retain system watch list for deep status
	
	var watch = this.watch;
	Each(Model, function (name,sys) {
		if ( name != Name )
			watch.push({
				system: sys,
				view: This.paper.findViewByModel(sys.atom)
			});
	});
}

/**
 * @method open
 * */
SYSTEM.prototype.open = function () {
	this.status("opening");
	
	q = JSON.parse(MODEL.PARSER.QUERY||"null") || {};
	//alert( MODEL.path.viewer+"?start="+this.name	);
	//alert("subs="+this.chain.length);
	
	var simWindow = window.open(
		MODEL.path.viewer+"?start="+this.name,
		this.name,
		"titlebar=yes,scrollbars=yes,toolbar=yes,menubar=no,width=200,height=100");
	
	//simWindow.document.write("<p>This is 'simWindow'</p>");                // Text in the new window
	//simWindow.opener.document.write("<p>This is the source window!</p>"); // Text in the window that created the new window
}

/**
 * @method load
 * @experimental
 * Load, Save, Clone and Delete need to be substantially fixed
 * */

SYSTEM.prototype.load = function () {
	var This = this;
	var engine = MODEL.path.engines.tag({Name: name,Engine:"model"});
	
	/*
	$.ajax({
		type: "GET",
		url: engine,
		success: function (rtn,status) {
			rtn.data.Each(function (n,rec) {
				var code = JSON.parse(rec.Code);

				This.config.subs.Each(function (n,sub) {
					var sys = MODEL.lib[sub] = sys.load(sub);
				});
			});
		}
	});
	*/
}

/**
 * @method save
 * @experimental
 * Load, Save, Clone and Delete need to be substantially fixed
 * */
SYSTEM.prototype.save = function () {
	var This = this;
	var engine = MODEL.path.engines.tag({Name: this.name,Engine:"model"});
	
	this.chain.Each( function(n,sys) {
		sys.save();
	});
	
	$.ajax({
		type: "DELETE",
		url: engine,
		success: function () {
			$.ajax({
				type: "POST",
				url: engine,
				data: {
					Code: JSON.stringify(This.graph.toJSON()),
					Name: This.name,
					Engine: "model",
					Enabled: 0
				},
				success: function () {
					This.status("saved");
				}
			});	
		}
	});
}

/**
 * @method clone
 * @experimental
 * Load, Save, Clone and Delete need to be substantially fixed
 * */
SYSTEM.prototype.clone = function () {	
	var iLinks = this.config.links.i,
		oLinks = this.config.links.o,
		Routes = this.config.routes,
		Markers = this.config.markers,
		Model = this.config.model,
		Stats = this.config.stats,
		Path = this.config.path,
		Name = this.name + "-clone",
		Label = this.label + "-clone";
		
	this.status("cloning");
	
	// Generate the cloned SYSTEM
	var sys = new SYSTEM(Name,Label,Model,iLinks,oLinks,Routes,Markers,Stats,Path);

	// Give atom a nudge so we can see it
	
	var bb = this.atom.getBBox();
	sys.atom.translate(bb.x+10,bb.y+10);
	
	// Display atom in graph (the parent is known when cloning)
	
	if (this.parent) {
		this.parent.graph.addCell(sys.atom);
		this.parent.frame.embed(sys.atom);
	}
}

/**
 * @method delete
 * @experimental
 * Load, Save, Clone and Delete need to be substantially fixed
 * */
SYSTEM.prototype.delete = function () {	
	this.status("deleting");
	
	//this.frame.remove();
	//this.graph.clear();
	this.parent.graph.getCell(this.name+"-atom").remove({disconnectLinks:true});
}

/**
 * @method info
 * Provide general information about this system.
 * */
SYSTEM.in = function () {
	alert(JSON.stringify({
		name: this.name+"/"+this.label,
		stats: this.stats,
		state: this.state
	}));
}

/**
 * @method reset
 * */
SYSTEM.prototype.reset = function () {
	var This = this;
	
	MODEL.state.paused = false;
	MODEL.state.halted = true;

	$.ajax({ 
		type: "DELETE",
		url: This.path,
		success: function (rtn) {
			This.status("reset");
		}
	});	
}

/**
 * @method oPorts
 * */
SYSTEM.prototype.oPorts = function (Sys) {
	return (Sys==this) ? this.i : this.o;
}

/**
 * @method iPorts
 * */
SYSTEM.prototype.iPorts = function (Sys) {
	return (Sys==this) ? this.o : this.i;
}

/**
 * @method connect
 * */
SYSTEM.prototype.connect = function (Model) {
	var This = this;
	
	This.status("connecting");

	// The model consists of the parent system plus all its subsystems
	
	Model[this.label] = this; 
	
	// Connect output (sourcing) ports to input (sinking) ports

	Each(Model, function (n,iSys) {
		var iPorts = iSys.iPorts(This);
		Each(iPorts, function (iName,iPort) {
			var oSys = Model[iPort.edge.system];
			if (oSys) {
				var oPorts = oSys.oPorts(This);
				var oPort = oPorts[iPort.edge.port];
				if (oPort) 
					This.addEdge(oPort,oSys,iPort,iSys,DOT);
			}
		});
	});
				
	// Build the execution path through this model.
	
	This.link(This);
}

/**
 * @method compile
 * Prime this system by adding specified triggered subsystems (a model), state machine (with specified routes) and petri net (with specified markers).
 * @param {Array} Model triggered subsystems
 * @param {String} Routes state machine routes
 * @param {String} Markers petri net markers
 * */
SYSTEM.prototype.compile = function (Routes,Markers,Model) {
	var Graph = this.graph;
	
	// add any system model, state machine, and/or petri net specified
	
	this.status("compiling");
	
	this.addTrigSystem(Model);
	this.addStateMachine(Routes);
	this.addPetriNet(Markers);
}

/**
 * @method link
 * Link this system by tracing all subsystem outputs to subsystem inputs.  Also allocates unconnected 
 * sinking ports.

 * @param {Object} Leaf topmost system to initiate the link
 * @return {Object} this Leaf hash
 * */
SYSTEM.prototype.link = function (Leaf) {  
	var This = this;
	
	This.status("linking");
//console.log("linking "+this.name);
	
	// Place source link on execution path, if target port has a source link, if not at terminal source,  
	// and if source link not already on execution path.
	
	var iPorts = Leaf.iPorts(This);
	
	Each(iPorts, function (n,iPort) {
		var oSys = iPort.link;
		
		if (oSys) {	
/*
 console.log(
	"iPort="+iPort.name
	+" oSys="+oSys.id+":"+oSys.name+":"+oSys.name.length
	+" path="+This.chain.length
	+" isroot="+(oSys == This)
	+" root="+This.name);
*/
			if (oSys != This) 
				if (!This.chain.contains(oSys)) 
					This.chain.push(This.link(oSys));
		}
		else {
//console.log("link trap "+iPort.label+" tau="+iPort.tau+" rev="+(Leaf==This));
			/*
			if (Leaf == This)
				Leaf.tau.o[iPort.index] = iPort.tau = Clone(MODEL.tau);
			else
				Leaf.tau.i[iPort.index] = iPort.tau = Clone(MODEL.tau);
			*/
		}
	});

	return Leaf;
}

/**
 * @method driveEngine
 * Queue the system by submitting ajax post to this systems url, passing all input
 * events tokens, and returning all output event vectors to/from this system.  The
 * callback is called when the system responds with its output tokens.  Simulation 
 * stats at departure points are snapshot when the system completes each service step.
 * 
 * @param {Function} cb callback(delay) where delay is in ms
 */
SYSTEM.prototype.driveEngine = function (port,taus,args,cb) {  
	var This = this;
	var at = new Date();
	var path = this.path;
	var trace = this.trace;
	var stats = this.stats;
	var thread = this.thread;

//console.log("queue "+this.name+" url="+path+" port="+port);

	// Establish the ajax call and the request monitor
		
	var req = ((window.XMLHttpRequest) 
		? new XMLHttpRequest()
		: new ActiveXObject("Microsoft.XMLHTTP"));
		
	req.onreadystatechange = function() {
		if (req.readyState==4) 
			if (req.status==200) {							// Service completed 
				if (cb) 								// Callback with delay stats (service time kept at server)
					try {
						cb(args, JSON.parse(req.responseText || "null") || [], stats);
					}
					catch (err) {
						This.stats.faults++;
					}
			}
	};

	stats.jobs++;
	taus.Each( function (n,tau) {  						// Adjust service stats
		stats.backlog += tau.work;
	});
	
	if (false) { 			// start foreign service
		req.open("GET", path.tag({i:taus,p:port,s:stats,t:thread}), true); 
		req.send( );
	}
	else { 					// start domestic service
		req.open("POST", path, true); 
		req.send( JSON.stringify({tau:taus, port:port, thread:thread}) );
	}
}

/**
 * @method snapshot
 * */
SYSTEM.prototype.snapshot = function (at) {
	var This = this;
	var snap = this.snap;
	var state = this.state;
	var stats = this.stats;
	var sim = MODEL.state;
	
	if (snap)
		if (++stats.snaps >= snap.sample) {
			stats.snaps = 0;
			var dt = new Date();
			var delay = dt.getTime() - at.getTime();
			
			$.ajax({
				type: "POST",
				url: snap.url,
				data: Copy({
					tokens: This.pn ? JSON.stringify(This.pn.tokens) : "",
					state: This.sm ? This.sm.state : "",
					name: This.custody,
					delay: delay,
					ts: dt,
					user: sim.client,
					step: sim.step
				}, stats )
			});
		}				
}
	
/**
 * @method evalCode
 * */
SYSTEM.prototype.evalCode = function (code) {
	if (code)
		try {
			return eval(code);
		}
		catch (err) {
			alert(this.name+" could not eval ["+code+"] while in state ["+this.machine.state+"]. Error: "+err);
			return false;
		}
	else
		return false;
}
	
/**
 * @method triggerEngine
 * */
SYSTEM.prototype.triggerEngine = function(args,cb) {
	var This = this;
	var iPorts = this.x.i;

	iPorts.threadSerial(0,function (iPort,args,cb) {	// serialize input ports
//console.log("trigger iport="+iPort.name);	
		var iTau0 = iPort.tau;
		var iStates = iPort.x.state;

		iStates.threadSerial(0,function (iState,args,cb) {	// serialize input stream on current port
			
			if (iState.job != iState.tau.job) { 		// process only triggered event
				iState.job = iState.tau.job;			// untrigger the event
				Copy(iState.tau,iTau0);					// park event at its corresponding thread
				
				This.driveInput(iPort,args,cb);
			}
			
		}, args,cb);
		
	}, args,cb);	
}

/**
 * @method driveInput
 * */
SYSTEM.prototype.driveInput = function (iPort,args,cb) {
	var This = this;
	var iTaus = this.tau.i, oTaus = this.tau.o;
	var oPorts = this.x.o;

	This.driveEngine(iPort.name,iTaus,oTaus, null, function() { 	// reset input thread
		oPorts.threadParallel( function (oPort,cb) {
			
			This.driveOutput(iPort,oPort,null, function (args) {
				cb();
			});
			
		}, args,cb);
		
	});
}
	
/**
 * @method driveOutput
 * */
SYSTEM.prototype.driveOutput = function(iPort,oPort,args,cb) {
	var This=this;
	var oStream = oPort.x.tau, oStash = oPort.x.stash;
	var iTaus = this.tau.i;
	
//console.log("call i="+iPort.name+" o="+oPort.name+" ostreams="+oStream.length+" ostash="+oStash.length);

	oStash.Copy(oStream);  // what does this do?
	oStash.Each( function (oN,oTau) { 	// park events in the event stash
		oTau.job = iPort.tau.job + DOT + This.name + DOT + oPort.name + DOT + oN;
	});

	this.driveEngine(oPort.name,iTaus,oStash, null, function (xargs,stats) {  
		if (!stats.faults)
			oStash.Each( function (oN,oTau) { // repark events from their event stash
				if (oTau.job)
					Copy(oTau,oStream[oN]); 
				else
					This.stats.prunes++;
			});
						
//console.log("end call i="+iPort.name+" o="+oPort.name+" ostash="+oStash.length);
		This.status(stats.delay+" ms");
		
		cb(args);
	});
}

/**
 * @method demux
 * */
SYSTEM.prototype.demux = function () {
	var iPorts = this.i;
	var oPorts = this.o;
}

/**
 * @method mux
 * */
SYSTEM.prototype.mux = function () {
	var iPorts = this.i;
	var oPorts = this.o;
	var mux = [],n=0;
	
	Each(iPorts, function (iN,iPort) {
		if (iPort.x)
			mux = mux.concat(iPort.x.tau);
		else
			mux.push(iPort.tau);
	});
	
	Each(oPorts, function (oN,oPort) {
		if (oPort.x)
			oPort.x.tau.Each(function (k,tau) {
				Copy(mux[n++],tau);
			});
		else
			Copy(mux[n++],oPort.tau);
	});
	
//console.log("muxlen="+mux.length+"="+n);
}
	
/**
 * @method sampleEngine
 * */
SYSTEM.prototype.sampleEngine = function () {
	var This = this;
	var iPorts = this.i, oPorts = this.o;
	var stats = this.stats;
	
	Each(iPorts, function(iName,iPort) {		// scan all input ports
		if (!iPort.x) { 						// sample only non-threaded ports
//console.log("ijob="+iPort.job+"="+iPort.tau.job);

			if (iPort.job != iPort.tau.job) { 	// check if port needs sampling
				iPort.job = iPort.tau.job;

				This.driveEngine(iName,[iPort.tau], oPorts, function(oPorts,rtns,stats) {  // queue the request

					//This.status(stats.delay+" ms");
					
					var job = MODEL.state.client+DOT+This.name+DOT;
					
					Each(oPorts, function(oName,oPort) { 	// scan all output ports
						if (!oPort.x) {						// update only non-threaded ports
							switch (oName) { 				// update output port
								case "$DROPS": 	job = state.drops; break;
								case "$STEP": 	job = MODEL.state.step; break;
								case "$FAULTS": job = stats.faults; break;
								case "$JOBS": 	job = stats.jobs; break;
								case "$T": 		job = stats.t; break;
								case "$DROPS": 	job = stats.drops; break;
								default:		job += oName + DOT + stats.jobs;
							}

							oPort.tau.job = job;
							
							This.driveEngine(oName,[oPort.tau], oPort, function(oPort,rtns,stats) {  // queue the request
								Copy(rtns[0],oPort.tau);
//console.log(oPort.tau);
							});
						}
					});
				});
			}
		}
	});
}

/**
 * @method run
 * Run this system by stepping its triggered system, state machine or petri net per the specified simulation 
 * options. The system is queued (stepped) after binding input/output events.  Simulation stats at departure 
 * points are snapshot when the system completes each serviced step.
 * 
 * @param {Object} Options hash of simulation options
 */
SYSTEM.prototype.run = function (options) {  
	var This = this;
	var iTaus = this.tau.i, iPorts = this.i;
	var oTaus = this.tau.o, oPorts = this.o;
	var sm = this.sm;
	var pn = this.pn;
	var chain = this.chain;
	var stats = this.stats;
	var queue = options ? MODEL.queue : this.queue;
	var sim = MODEL.state;

if (0)
console.log(JSON.stringify({
	name: this.name,
	step: sim.step,
	run: this.custody,
	ins: iTaus.length,
	outs: oTaus.length,
	subs: this.chain.length
}));
	

	if (options) {  					// Prime simulation if options provided
		This.status("starting");
		
		sim.paused = false;
		sim.halted = false;
		
		if (options.steps) 		
			var timer = setInterval(  	// Setup simulation sample times
				function (options) {
					
					Each(iPorts, function (iN,iPort) {	// Prime the job
						var job = iN+"."+sim.step; //null; 
						
						switch (iPort.name) {
							case "$FILE": 				// Pull job from external queue
								if (queue.length) {					
									job = MODEL.state.client+DOT+queue[queue.length-1]+"_"+stats.jobs;
									queue.length--;
									$(MODEL.ui.jobs).text(MODEL.queue.length);
									//alert("job="+job+" at="+sim.step+" qlen="+queue.length);
								}
								break;

							case "$MAIL":
								break;

							case "$TEST": 				// Make job only at first step
								if (!MODEL.state.step) 
									job = MODEL.state.client+".job"+MODEL.state.step;
								break;

							case "$LOG":  				// Job from job  	//##

							case "$PIPE": 				// Job fromm pipe	//##

							case "$STEP": 				// Make job at this step
								job = MODEL.state.client+".job"+MODEL.state.step;
								break;
						}
						
//console.log(iPort.name+" >> job="+job);
						if (job) 
							if (iPort.x) 
								iPort.x.tau[0].job = job;
							else
								iPort.tau.job = job;
					});
					
					if (false)  	// Animate systems
						chain.Each(function (n,sys) { 
							sys.atom.transition('position/x', 10, {//'attrs/rect/fill','lightgreen', {
								delay: 0,
								duration: options.delta*10,
								valueFunction: function (a,b) {
//console.log(a,b);
									return function (t) { return a+(b-a)*t; }
								}
							});							
						});
					
					// Advance the simulation
					
					This.run();
					
					sim.step++;
					sim.t += options.delta;
					
					// Note simulation progress
					
					progress(Math.round(sim.step/options.steps*100),MODEL.ui.progress);
					$(MODEL.ui.step).text(sim.step);

					// Test to halt/stop simulation
					
					if (sim.step >= options.steps || sim.halted) {
						sim.step = 0;
						sim.t = 0;
						sim.paused = true;
						clearInterval(timer);
					}
					else
					if (sim.paused) {
						sim.paused = true;
						clearInterval(timer);
					}
					
				}, 	
				options.delta, 
				options );
		
		return false;
	}

	chain.Each(function (n,sys) { 		// Run all subsystems at this time step
		sys.run();
	});

	if (chain.length) return;

	Each(iPorts, function (n,port) { 	// Bind unconnected input event vectors
		var tau = iTaus[port.index];
		if (port.copy) {
			//console.log(">>>>icopy "+n);
			Copy(port.copy,tau);
		}
	});

	Each(oPorts, function (n,port) {	// Bind unconnected output event vectors
		var tau = oTaus[port.index];
		if (port.copy) {
			//console.log(">>>>ocopy "+n);
			Copy(port.copy,tau);
		}
	});
	
	if (sm) {  							// Step state machine
		var from = sm.states[sm.state];
		Each(from.on, function (state,on) { // Test each state transition
			if (This.evalCode(on)) {		// Jump to state and eval entry-exit code
				var to = sm.states[state];
				
//console.log("transitioning "+This.name+" "+This.state+"->"+state+" entry="+to.entry+" exit="+from.exit);
				$(MODEL.ui.state).text(state);
				
				This.evalCode(from.exit);
				This.evalCode(to.entry);
					
				sm.state = state;
				return true;
			}
		});
	}
	
	if (pn) {  							// Step petri net
		dotadd(pn.Wtx,pn.tx,pn.tokens);
		$(MODEL.ui.tokens).text(pn.tokens);
		//dump(pn.tokens);
	}
	
	switch (this.name) { 				// Step discrete system
		case "mux":
			this.mux();
			break;
		
		case "demux":
			this.demux();
			break;
		
		default:  
			//this.triggerEngine();
			this.sampleEngine();
	}
		
	return;
	
	function progress(percent, $element) {
		var progressBarWidth = percent * $element.width() / 100;
		$element.find('div').animate({ width: progressBarWidth }, 500).html(percent + "%&nbsp;");
	}
				
	function dotadd(WT,T,X) {
		var N = WT.length, M = WT[0].length;
		var dot,WTi,WTij,Xi;
		
		// Disable transitions that would produce negative tokens at any input place.
		
		for (var j=0;j<M;j++) {
			T[j][0] = 1;	// Enable Tx by default
			for (var i=0;i<N;i++) {
				Xi = X[i][0]; WTij = WT[i][j];
				if (WTij<0) // This is an input place
					if (Xi+WTij<0) T[j][0] = 0;  // Disable Tx
			}
		}
		
		for (var i=0;i<N;i++) {
			dot = 0; WTi = WT[i]; Xi = X[i];
			for (var j=0;j<M;j++) 
				if (T[j][0]) dot += WTi[j];
			
			Xi[0] += dot;
		}
		
	}
	
	function dump(A) {
		var N = A.length, M = A[0].length;
		
		A.Each(function (n,An) {
			console.log(n+": "+An);
		});
	}	
}

/**
 * @method status
 * Display system status in status area of associated ui.
 * @param {String} oper operation being performed
 * @param {String} msg message to display
 * */
SYSTEM.prototype.status = function (oper) {
	// Set dom.disable_window_status_change = false in FF about:config to get window.status to work

	if (false)
	this.watch.Each(function (n,watch) {
		var state = watch.system.state;
		var stats = watch.system.stats;
		watch.view.$(".label").text("S"+state.step+"D"+state.drops+"F"+stats.faults+"J"+stats.jobs+"Q"+stats.depth);
	});
	
	if (this.trace)
		//window.status = oper+" "+this.name+" "+(msg||"");
		if (MODEL.ui)
			//$(MODEL.ui.status).text(MODEL.status);
			$(MODEL.ui.progress).find("div").text(  this.name + " " + oper );
		else
			console.log(  this.name + " " + oper );
}

$().ready(function () {

	$.ajax({	// Fetch simulation use-case options for this model
		type: "GET",
		url: MODEL.path.options,
		success: function (rtn,status) {
			JSON.parse(rtn).data.Each(function (n,opt) {
				MODEL.options[opt.name.toLowerCase()] = Copy(opt,{});
			});
		}
	});
	
	// Establish callback for model obstical avoidance
	
	$('.router-switch').on('click', function(evt) {
		var router = $(evt.target).data('router');
		var connector = $(evt.target).data('connector');

		if (router) {
			link.set('router', { name: router });
		} else {
			link.unset('router');
		}

		link.set('connector', { name: connector });
	});

	// Prime ui.  Force selection wrapper, get toolbar, define tooltips, attach listeners
	
	if (false)
		$("svg").each(function () {
			console.log("fixing "+$(this).attr("id"));
			$(this).css("position","fixed");
		});

	MODEL.ui = {
		progress: $("#progressBar"),
		run: $("input#run"),
		open: $("input#open"),
		save: $("input#save"),
		load: $("input#load"),
		clone: $("input#clone"),
		delete: $("input#delete"),
		select: $("input#select"),
		info: $("input#info"),
		reset: $("input#reset"),
		status: $("#status"),
		state: $("#state"),
		step: $("#step"),
		tokens: $("#tokens"),
		jobs: $("#jobs"),
		msg: $("#msg"),
		db: $("#db")
	};
	
	// $(document).tooltip();
	
	MODEL.ui.run.click(function () { 	// run model with specified simulation options
		var sys = MODEL.root;

		try {
			if (MODEL.state.paused) 
				sys.run(MODEL.root.snap || MODEL.options.stats);
			else 
				MODEL.state.paused = true;
		}
		catch (err) {
			alert("could not run");
		}					
	});
	
	MODEL.ui.save.click(function () { 	// save model to engines db
		var sys = MODEL.selected || MODEL.root;
		try {
			sys.save();
			alert("saved "+sys.name);
		}
		catch (err) {
			alert("could not save");
		}
	});

	MODEL.ui.load.click(function () {	// load model from engine db
		var sys = MODEL.selected || MODEL.root;
		
		try {
			sys.delete();
			sys.load();
			alert("loaded "+sys.name);
		}
		catch (err) {
			alert("could not load");
		}
	});	

	MODEL.ui.clone.click(function () {	// clone selected system
		var sys = MODEL.selected || MODEL.root;

		try {
			sys.clone();
		}
		catch (err) {
			alert("could not clone");
		}
	});	

	MODEL.ui.delete.click(function () {	// delete selected system
		var sys = MODEL.selected;
			sys.deselect();
			sys.delete();
			MODEL.selected = null;
		try {
		}
		catch (err) {
			alert("could not delete");
		}
	});	

	MODEL.ui.info.click(function () {	// status selected system
		var sys = MODEL.selected; // || MODEL.root;
		try {
			sys.info();
		}
		catch (err) {
			alert("could not status");
		}		
	});				
	
	MODEL.ui.reset.click(function () {	// reset model
		var sys = MODEL.root;
		try {
			sys.reset();
		}
		catch (err) {
			alert("could not reset");
		}		
	});				
	
	MODEL.ui.open.click(function () {	// open selected system in new window
		var sys = MODEL.selected;
		try {
			sys.open();
		}
		catch (err) {
			alert("could not open");
		}		
	});
	
	var Select = {el: null, x: 0, y: 0, sys: null};

	MODEL.ui.select.click(function () {	// select a system
console.log("sel", MODEL.selected);
		
		if (MODEL.selected) {  // unselect it
			MODEL.selected.deselect();	
			MODEL.selected = null;

			MODEL.root.paper.on('cell:pointerup',null);
			MODEL.root.paper.on('cell:pointerdown',null);
		}
		else {  // select it
			MODEL.root.paper.on('cell:pointerup',function (cellView,evt,x,y) {
console.log("up "+[x,y]+"="+[Select.x,Select.y], cellView.$(".label").text() );	
				
				if ( x == Select.x && y == Select.y ) { 		// selecting/deselecting system
					if (MODEL.selected) MODEL.selected.deselect();
console.log(cellView.model);
					MODEL.selected.select(Select.el,cellView.model,x,y);
					MODEL.selected = Select.sys;
console.log("selsys",MODEL.selected);
					
					while (Select.el.nodeName != "svg") Select.el = Select.el.parentNode;

console.log("svg ="+Select.el.className+" "+Select.el.id+" sys="+Select.sys.name+" node="+Select.el.nodeName);

					/*
					//cellView.remove();
					//console.log(cellView.get("parent"));
					//sel.remove({deep:true});
					//var bb = cellView.getBBox();
					//MODEL.selected.atom.resize(100,100);
					//bb.moveAndExpand(0,0,40,60);
					//cellView.$el.addClass("x");
					//cellView.$el.css("width","100px");
					//console.log(cellView.$el.hasClass("x"));
					//console.log(cellView.$el.prop("tagName"));
					//MODEL.lib[cellView.$(".label").text()].open();
					//This.paper.off('cell:pointerdown');
					* */
				}
				else {  // moving system
					Select.x = x;
					Select.y = y;
				}
			});
console.log("on up", MODEL.root);
			
			MODEL.root.paper.on('cell:pointerdown',function (cellView,evt,x,y) {
console.log("down "+[x,y], cellView);
				Select.el = cellView.el;
				Select.x = x;
				Select.y = y;
				Select.sys = MODEL.lib[cellView.$(".label").text()];
			});
		}	
	});
		
});

////////////////////////////////////////////////////////////////////
// Supporting UI methods are crafted for jointjs (could develop d3 counterparts)

/**
 * @method addEdge
 * Add an edge between output (sourcing) and input (sinking) system ports.  The output/input Port.index
 * specifies the port number being connected.  The Port.tau event token and Port.link linkback are 
 * initialized with respect to the sourcing (or sinking) system-port.  Input/output logic is reversed 
 * automatically when connecting a subsystem to its parent system.
 * */
SYSTEM.prototype.addEdge = function (oPort,oSys,iPort,iSys,Label) {
	var Graph = this.graph,
		oReverse = oSys == this,  	// reverse logic when connecting a sourcing subsystem to its parent system
		iReverse = iSys == this;	// reverse logic when connecting a sinking subsystem to its parent system
	
	// Connect output port of sourcing system while reversing i/o logic when connecting a subsystem to its parent system
	
	//console.log("edge "+this.name+" o="+oSys.name+DOT+oPort.label+" rev="+oReverse+" link="+oPort.link+" i="+iSys.name+DOT+iPort.label+" rev="+iReverse+" link="+iPort.link);
		
	if (!oPort.link) {  				// port not yet connected
		oPort.link 	= iSys;
	}

	// Connect input port of sinking system while reversing i/o logic when connecting a subsystem to its parent system
		
	if (!iPort.link) { 					// port not yet connected
		iPort.tau = oPort.tau; 
		iPort.x = oPort.x;
		iPort.link = oSys;
		
		if (iReverse) 
			iSys.tau.o[iPort.index] = iPort.tau;
		else 
			iSys.tau.i[iPort.index] = iPort.tau;
	}
	
	// Sinking port is already connected and therefore controlled by another port.  If unintended (foolish network
	// connection), this will be flagged during runtime.  If intended (linking to previously resolved system), then
	// events will be copied during runtime.
	
	else { 								// port already connected
		iPort.copy = oPort.tau; 
	}
	
//console.log("edge "+oSys.name+"/"+oPort.name+"/"+oPort.tau+" to "+iSys.name+"/"+iPort.name+"/"+iPort.tau);
	
	// Add edges to graph while reversing i/o logic when connecting a subsystem to its parent
	
	connectGraph(	oReverse ? oSys.frame : oSys.atom, oPort.label,
					iReverse ? iSys.frame : iSys.atom, iPort.label);
		
	function connectGraph(oCell, oLabel, iCell, iLabel) {
//console.log("connect src="+oCell.id+"="+oLabel+" tar="+iCell.id+"="+iLabel);
		var edge = new joint.shapes.devs.Link({
			source: { id: oCell.id, port: oLabel },
				//{ id: oCell.id, selector: oCell.getPortSelector(oLabel) },  // jointjs 0.x
			target: { id: iCell.id, port: iLabel },
				//{ id: iCell.id, selector: iCell.getPortSelector(iLabel) },
			//router: { name: 'manhattan' },  	// disables magnetic ports
			connector: { name: 'rounded' },
			attrs: {
				'.connection': {
					stroke: '#333333',
					'stroke-width': 3
				},
				'.marker-target': {
					fill: '#333333',
					d: 'M 10 0 L 0 5 L 10 10 z'
				}
			}
		});
		Graph.addCell(edge);
	};
}

/**
 * @method addTrigSystem
 * Embed a basic model into this system.
 * @param {Array} Model the system model (an array of sub-systems) to add.
 * */
SYSTEM.prototype.addTrigSystem = function (Model) {
	var W=50,H=50,x=25,y=25;
	var This = this; 				// Owner
	var Graph = this.graph; 
	var Frame = this.frame;
	var Subs = this.config.subs;
	
	Graph.addCell(Frame);			// Add owner's frame to its graph
	
	Each(Model, function (n,sys) {	// Add subsystems to owner system
		addSystem(x+=2*W,y,sys);
		Subs.push( sys.name );
	});
	
	This.connect(Model); 			// Interconnect and link subsystems with owner system

	function addSystem(x,y,sys) { 	// Add system's atom to target's graph and frame, linkback system to target, and extend its custody chain
		sys.status("embedding");

		var Atom = sys.atom;
		
		//sys.target = This;
		sys.custody = This.custody + DOT + sys.custody;
		sys.parent = This;
		
		Atom.translate(x,y);
		Graph.addCell(Atom);
		Frame.embed(Atom);
	}
}

/**
 * @method addStateMachine
 * Embed a state machine into this system with state Routes = "route, route, ..." where
 * route = "fromState | toState | condition | exit | entry" defines from-to machine states, condition 
 * code and from state exit-entry code (condition=start to define initial state).
 * @param {String} Routes an array of state routes.
 * */
SYSTEM.prototype.addStateMachine = function (Routes) {
	var W=50,H=50,x=25,y=25;
	var This = this;
	var Graph = this.graph;

	if (Routes.length) this.sm = {	
		states: new Object(),
		state: ""
	};

	var sm = this.sm;	
	var cells = new Object();

	Routes.Each(function (n,route) {
		var tag = (route+"||||").split("|");
		var fromState = tag[0], toState = tag[1], onCode = tag[2], exitCode = tag[3], entryCode = tag[4];

		// Handle from-state
		
		var cellFrom = cells[fromState];
		
		if (!cellFrom) cellFrom = cells[fromState] = addState(x+=2*W, y, 
				fromState
				+ (entryCode ? "\nentry: "+entryCode : "")
				+ (exitCode ? "\nexit: " +exitCode : "") 	);
		
		var route = sm.states[fromState];	
		if (!route) route = sm.states[fromState] = {
			entry: entryCode,
			exit: exitCode,
			on: new Object()
		};
		
		// Handle to-state
		
		var cellTo = cells[toState];
		if (!cellTo) cellTo = cells[toState] = addState(x, y+=2*H, toState);
		
		var on = route.on[toState];
		
		if (!on) {
			on = route.on[toState] = onCode;
			
			addLink(cellFrom,cellTo,onCode);
			if (onCode == "start") sm.state = toState;
		}	
	});	
	
	function addState(x,y,label) {
		var cell = (label == "0")
			? new joint.shapes.fsa.StartState({ position: { x: x, y: y } })
			: new joint.shapes.fsa.State({
					position: { x: x, y: y },
					size: { width: W, height: H },
					attrs: { text : { text: label }}
				});
				
		Graph.addCell(cell);
		
		return cell;
	}
	
	function addLink(source, target, label, vertices) {  
		var cell = new joint.shapes.fsa.Arrow({
			source: { id: source.id },
			target: { id: target.id },
			labels: [{ position: .5, attrs: { text: { text: label || '', 'font-weight': 'bold' } } }],
			vertices: vertices || []
		});
		Graph.addCell(cell);
		return cell;
	}	
}

/**
 * @method addPetriNet
 * Embed a petri net into this system with Markers = "transition, transition, ..." where transition = 
 * "fromPlaces || transition || toPlaces" defines from-to places and transition to take-deposit petri net
 * tokens ("n|k|..." initializes each place with n,k,... tokens), and where places = "place | place | ..." 
 * are the places from which to take-deposit petri net tokens.
 * */
SYSTEM.prototype.addPetriNet = function (Markers) {
	var W=50,H=50,x=25,y=25;
	var This = this;
	var Graph = this.graph;
	var pn = joint.shapes.pn;
	var Nplaces=0,Ntxs=0;
	
	var cells = new Object();
	Markers.Each( function (n,tokens) {
		var tag = tokens.split("||");
	
		if (tag.length == 1) {
			var vals = tokens.split("|");
			
//console.log("places="+Nplaces+" txs="+Ntxs);
			
			var net = This.pn = {
				places: Nplaces,
				txs: Ntxs,
				tokens: Zeros(Nplaces,1),
				markers: new Array(Nplaces),
				Wadd: Zeros(Nplaces,Ntxs),
				Wsub: Zeros(Nplaces,Ntxs),
				Wtx: Zeros(Nplaces,Ntxs),
				tx: Zeros(Ntxs,1)
			};
				
			Graph.getElements().Each(function (n,place) {
				var netPlace = place.get("net");
				if (netPlace)
					if (netPlace.type == "place") {
						net.tokens[netPlace.index][0] = parseInt(vals[netPlace.index]);
						net.markers[netPlace.index] = netPlace.name;
//console.log("["+netPlace.index+"]"+netPlace.name+"="+vals[netPlace.index]);
					}
			});
			
			Graph.getElements().Each(function (n,tx) {
				var netTx = tx.get("net");
				if (netTx)
					if (netTx.type == "tx") {
						netTx.source.Each( function (n,place) {
							var netPlace = place.get("net");
							net.Wsub[netPlace.index][netTx.index] = 1;
						});
						netTx.target.Each( function (n,place) {
							var netPlace = place.get("net");
							net.Wadd[netPlace.index][netTx.index] = 1;
						});
					}
			});
			
			Diff(net.Wadd,net.Wsub,net.Wtx);
			
			//dump(net.tokens);
			//dump(net.Wtx);
		}
		else {
			var srcs = tag[0].split("|");
			var tars = tag[2].split("|");
			var tx = tag[1];
			
			var cellTx = addTx(x+2*W,y,tx);
			var netTx = cellTx.get("net");
			
			srcs.Each( function (n,src) {
				var cellPlace = addPlace(x,y+n*H,src);
				addLink(cellPlace,cellTx);
				netTx.source.push(cellPlace);
			});
			
			x += 4*W;
			tars.Each( function (n,tar) {
				var cellPlace = addPlace(x,y+n*H,tar);
				addLink(cellTx,cellPlace);
				netTx.target.push(cellPlace);
			});			
		}
	});
	
	function Diff(A,B,R) {
		var N = A.length, M = A[0].length;
		
		for (var n=0;n<N;n++)
			for (var m=0;m<M;m++)
				R[n][m] = A[n][m] - B[n][m];
	}
	
	function Zeros(N,M) {
		var rtn = new Array(N);
		
		for (var n=0;n<N;n++) {
			var fill = rtn[n] = new Array(M);
			for (var m=0;m<M;m++) fill[m] = 0;
		}
		
		return rtn;
	}
	
	function dump(A) {
		var N = A.length, M = A[0].length;
		
		A.Each(function (n,An) {
			console.log(n+": "+An);
		});
	}
	
	function addTx(x,y,label) {
		var cell = cells[label];
		
		if (!cell) {
			cell = cells[label] = new pn.Transition({ 
				position: { x:x, y:y }, 
				net: {index: Ntxs++,type:"tx",name:label,source:[],target:[]},
				attrs: { '.label': { text: label} } 
			});
			Graph.addCell(cell);
		}
		return cell;
	}
	
	function addLink(a, b) {
		var cell = new pn.Link({
			source: { id: a.id, selector: '.root' },
			target: { id: b.id, selector: '.root' }
		});
		Graph.addCell(cell);
		return cell;
	}
	
	function addPlace(x,y,label) {
		var cell = cells[label];
		
		if (!cell) {
			cell = cells[label] = new pn.Place({ 
				net: {index: Nplaces++,type:"place",name:label},
				position: { x: x, y: y }, 
				attrs: { '.label': { text: label} }
			});
			Graph.addCell(cell);
		}
		
		return cell;
	}
	
}

/**
 * @method select
 * */
SYSTEM.prototype.select = function (jqueryEl,jointAtom,x,y) {
	var wraps = MODEL.wraps;
	
	console.log(wraps);
	
	if (wraps) 
        wraps.Each( function (n,wrap) {
			wrap.atom = jointAtom;
			wrap.adjust();
			wrap.show();
		});
	else {
		wraps = MODEL.wraps = new Array();
		$(jqueryEl).Each( function (n) {
			wraps.push( new WRAPPER(this,jointAtom,x,y,this.id) );
		});
	}
	
	/*
	wraps.Each( function (n,wrap) {
		wrap.show();
	});
	* */
}

/**
 * @method deselect
 * */
SYSTEM.prototype.deselect = function () {
	var wraps = MODEL.wraps;
	
    if (wraps) 
        wraps.Each( function (n,wrap) {
			wrap.hide();
		});
}

////////////////////////////////////////////////////////////////////////
// WRAPPER interface provides system svg move/resize wrappers

function WRAPPER(elementToWrap,atomToWrap,x,y,name) {
	function Actions(wrapper) {		// Query strings for action-triggers.
		return {
			M	: $(wrapper + ' .moveActionTrigger'),
			T	: $(wrapper + ' .topActionTrigger'),
			B	: $(wrapper + ' .bottomActionTrigger'),
			L	: $(wrapper + ' .leftActionTrigger'),
			R	: $(wrapper + ' .rightActionTrigger'),
			TL	: $(wrapper + ' .topLeftActionTrigger'),
			TR	: $(wrapper + ' .topRightActionTrigger'),
			BL	: $(wrapper + ' .bottomLeftActionTrigger'),
			BR	: $(wrapper + ' .bottomRightActionTrigger')
		};
	}

	function Drawings(wrapper) {  	// Query strings for resizing borders.
		return {
			T	: $(wrapper + " .topDrawing"),
			B	: $(wrapper + " .bottomDrawing"),
			L	: $(wrapper + " .leftDrawing"),
			R	: $(wrapper + " .rightDrawing"),
			TL	: $(wrapper + " .topLeftDrawing"),
			TR	: $(wrapper + " .topRightDrawing"),
			BL	: $(wrapper + " .bottomLeftDrawing"),
			BR	: $(wrapper + " .bottomRightDrawing")
		};
	}
	    
    this.element = elementToWrap;
    this.$element = $(elementToWrap);
    this.atom = atomToWrap;
	
	this.actions = {				// Define supported actions
		None: 0,
		L_Resize: 1,
		T_Resize: 2,
		R_Resize: 3,
		B_Resize: 4,
		TL_Resize: 5,
		BL_Resize: 6,
		TR_Resize: 7,
		BR_Resize: 8,
		Move: 9
	};
	
	// current state
	
	this.lastMouseX = x;
	this.lastMouseY = y;
	this.currentAction = this.actions.None;
	this.cornerActionTriggerRadius = 16;
	this.minimalSize = this.cornerActionTriggerRadius * 2;
	
	// Add properties for storing the query strings for the wrapper's elements
    this.name = 'WRAPPER_' + name;
    this.external = '#' + this.name;
    this.internal = '#' + this.name + ' .internalWrapper';

	this.$element.wrap(
		'<div style="position:relative" id="' + this.name + '">' +
        '<div style="left:8px;top:8px;position:absolute" class="internalWrapper"></div></div>'
    );
 
	this.$external = $(this.external);
   	this.$internal = $(this.internal);

    // Wrap the original element, inject handles, then adjust handles to fit around the atom

    this.$internal.after( 			// Inject selection handles
		'<svg xmlns="http://www.w3.org/2000/svg" version="1.1" style="left:0px;top:0px;position:relative;width:100%;height:100%" >' +
		'<style type="text/css"> .actionTrigger { transition: opacity 0.5s; opacity: 0;} .actionTrigger:hover{transition: opacity 0.3s;opacity: 0.3;}</style>' +
		'<line x1="0" y1="0" x2="100%" y2="0" stroke="#808080" stroke-width="1" stroke-dasharray="5,5" class="topDrawing" />' +
		'<line x1="0" y1="100%" x2="100%" y2="100%" stroke="#808080" stroke-width="1" stroke-dasharray="5,5" class="bottomDrawing" />' +
		'<line x1="0" y1="0" x2="0" y2="100%" stroke="#808080" stroke-width="1" stroke-dasharray="5,5" class="leftDrawing" />' +
		'<line x1="100%" y1="0" x2="100%" y2="100%" stroke="#808080" stroke-width="1" stroke-dasharray="5,5" class="rightDrawing" />' +
		'<circle cx="0" cy="0" r="3" stroke="#0000FF" stroke-width="1" fill="#CCCCFF" class="topLeftDrawing" />' +
		'<circle cx="100%" cy="0" r="3" stroke="#0000FF" stroke-width="1" fill="#CCCCFF" class="topRightDrawing" />' +
		'<circle cx="0" cy="100%" r="3" stroke="#0000FF" stroke-width="1" fill="#CCCCFF" class="bottomLeftDrawing" />' +
		'<circle cx="100%" cy="100%" r="3" stroke="#0000FF" stroke-width="1" fill="#CCCCFF" class="bottomRightDrawing" />' +
		'<rect x="0" y="0" width="100%" height="100%" fill-opacity="0.5" opacity="0" class="actionTrigger moveActionTrigger" style="cursor:move" />' +
		'<line x1="0" y1="0" x2="100%" y2="0" stroke="#000" stroke-width="5" opacity="0" class="actionTrigger topActionTrigger" style="cursor:n-resize" />' +
		'<line x1="0" y1="100%" x2="100%" y2="100%" stroke="#000" stroke-width="5" opacity="0" class="actionTrigger bottomActionTrigger" style="cursor:s-resize" />' +
		'<line x1="0" y1="0" x2="0" y2="100%" stroke="#000" stroke-width="5" opacity="0" class="actionTrigger leftActionTrigger" style="cursor:w-resize" />' +
		'<line x1="100%" y1="0" x2="100%" y2="100%" stroke="#000" stroke-width="5" opacity="0" class="actionTrigger rightActionTrigger" style="cursor:e-resize"/>' +
		'<circle cx="0" cy="0" r="8" stroke="#000" stroke-width="0" fill="#000" opacity="0" class="actionTrigger topLeftActionTrigger" style="cursor:nw-resize" />' +
		'<circle cx="100%" cy="0" r="8" stroke="#000" stroke-width="0" fill="#000" opacity="0" class="actionTrigger topRightActionTrigger" style="cursor:ne-resize" />' +
		'<circle cx="0" cy="100%" r="8" stroke="#000" stroke-width="0" fill="#000" opacity="0" class="actionTrigger bottomLeftActionTrigger" style="cursor:sw-resize" />' +
		'<circle cx="100%" cy="100%" r="8" stroke="#000" stroke-width="0" fill="#000" opacity="0" class="actionTrigger bottomRightActionTrigger" style="cursor:se-resize" />' +
		'</svg>'
	);

	// Define jquery shortcuts to handels
    this.$action = Actions(this.external);
    this.$draw = Drawings(this.external);
  
	// Set the jquery event handlers to intercept mouse behaviors
  
    var This = this;
    
    this.$action.M.mousedown(function (event) {
        This.currentAction = This.actions.Move;
    });

    this.$action.T.mousedown(function (event) {
        This.currentAction = This.actions.T_Resize;
    });

    this.$action.B.mousedown(function (event) {
        This.currentAction = This.actions.B_Resize;
    });

    this.$action.L.mousedown(function (event) {
        This.currentAction = This.actions.L_Resize;
    });

    this.$action.R.mousedown(function (event) {
        This.currentAction = This.actions.R_Resize;
    });

    this.$action.TL.mousedown(function (event) {
        This.currentAction = This.actions.TL_Resize;
    });

    this.$action.TR.mousedown(function (event) {
        This.currentAction = This.actions.TR_Resize;
    });

    this.$action.BL.mousedown(function (event) {
        This.currentAction = This.actions.BL_Resize;
    });

    this.$action.BR.mousedown(function (event) {
        This.currentAction = This.actions.BR_Resize;
    });

    $(document).mouseup(function (event) {
        This.currentAction = This.actions.None;
    });

	$(document).mousemove(function (event) {
        This.onMouseAction(event);
    });

	this.adjust();
}

WRAPPER.prototype.onMouseAction = function (event) {
    var currMouseX = event.clientX;
    var currMouseY = event.clientY;

    var deltaX = currMouseX - this.lastMouseX;
    var deltaY = currMouseY - this.lastMouseY;

    this.doMouseAction(deltaX, deltaY);

    this.lastMouseX = event.pageX;
    this.lastMouseY = event.pageY;
}

WRAPPER.prototype.doMouseAction = function (deltaX, deltaY) {
    var delta = {T:0,L:0,W:0,H:0};
	var bb = this.atom.getBBox();
    
	switch (this.currentAction) { 	// adjust the atom
		case this.actions.BR_Resize:
			delta.H = deltaY;
			delta.W = deltaX;
			this.atom.resize(bb.width+delta.W,bb.height+delta.H);
			break;
			
		case this.actions.BL_Resize:
			delta.L = deltaX;
			delta.W = -deltaX;
			delta.H = deltaY;
			this.atom.resize(bb.width+delta.W,bb.height+delta.H);
			this.atom.translate(delta.L,delta.T);
			break;
			
		case this.actions.B_Resize:
			delta.H = deltaY;
			this.atom.resize(bb.width+delta.W,bb.height+delta.H);
			break;
			
		case this.actions.TR_Resize:
			delta.W = deltaX;
			delta.H = -deltaY;
			delta.T = deltaY;
			this.atom.resize(bb.width+delta.W,bb.height+delta.H);
			break;
		
		case this.actions.R_Resize:
			delta.W = deltaX;
			this.atom.resize(bb.width+delta.W,bb.height+delta.H);
			break;
			
		case this.actions.TL_Resize:
			delta.L = deltaX;
			delta.T = deltaY;
			delta.W = -deltaX;
			delta.H = -deltaY;
			this.atom.resize(bb.width+delta.W,bb.height+delta.H);
			this.atom.translate(delta.L,delta.T);
			break;
			
		case this.actions.L_Resize:
			delta.W = -deltaX;
			delta.L = deltaX;
			this.atom.resize(bb.width+delta.W,bb.height+delta.H);
			this.atom.translate(delta.L,delta.T);
			break;
			
		case this.actions.T_Resize:
			delta.H = -deltaY;
			delta.T = deltaY;
			this.atom.resize(bb.width+delta.W,bb.height+delta.H);
			this.atom.translate(delta.L,delta.T);
			break;
			
		case this.actions.Move:
			delta.L = deltaX;
			delta.T = deltaY;
			this.atom.resize(bb.width+delta.W,bb.height+delta.H);
			this.atom.translate(delta.L,delta.T);
			break;
			
		case this.actions.None:
			return;
    }

	// Adjust the selector too
	this.adjust();
}

WRAPPER.prototype.adjust = function () {
	
	function setRect ($el, x, y, width, height) {
		$el.attr('x', x);
		$el.attr('y', y);   
		$el.attr('width', width);
		$el.attr('height', height);
	}

	function setLine ($el, x1, y1, x2, y2) {
		$el.attr('x1', x1);
		$el.attr('y1', y1);
		$el.attr('x2', x2);
		$el.attr('y2', y2);
	}

	function setCircle ($el, cx, cy) {
		$el.attr('cx', cx);
		$el.attr('cy', cy);
	}
	
    var bb = this.atom.getBBox();
	
	// Position wrapper over the selected atom
	var bb = this.atom.getBBox();

	var el = {
		L: bb.x + 'px',
		T: bb.y + 'px',
		W: (bb.width  + this.cornerActionTriggerRadius) + 'px',
		H: (bb.height + this.cornerActionTriggerRadius) + 'px'
	};

	// Adjust moving rectange.
	setRect(this.$action.M, 	el.L, el.T, el.W, el.H);

	var el = {
		L: bb.x + 'px',
		T: bb.y + 'px',
		R: (bb.x + bb.width  + this.cornerActionTriggerRadius) + 'px',
		B: (bb.y + bb.height + this.cornerActionTriggerRadius) + 'px'
	};

	// Adjust resizing border lines.
	setLine(this.$draw.T, 		el.L, el.T, el.R, el.T);
	setLine(this.$draw.B, 		el.L, el.B, el.R, el.B);
	setLine(this.$draw.L, 		el.L, el.T, el.L, el.B);
	setLine(this.$draw.R, 		el.R, el.T, el.R, el.B);
	setLine(this.$action.T, 	el.L, el.T, el.R, el.T);
	setLine(this.$action.B, 	el.L, el.B, el.R, el.B);
	setLine(this.$action.L, 	el.L, el.T, el.L, el.B);
	setLine(this.$action.R, 	el.R, el.T, el.R, el.B);

	// Adjust resizing border circles.
	setCircle(this.$draw.TL, 	el.L, el.T);
	setCircle(this.$draw.TR, 	el.R, el.T);
	setCircle(this.$draw.BL, 	el.L, el.B);
	setCircle(this.$draw.BR, 	el.R, el.B);
	setCircle(this.$action.TL,	el.L, el.T);
	setCircle(this.$action.TR, 	el.R, el.T);
	setCircle(this.$action.BL, 	el.L, el.B);
	setCircle(this.$action.BR,	el.R, el.B);

	if (0) { 	// adjust internal wrapper div
		var el = {
			L: bb.x + 'px',
			T: bb.y + 'px',
			W: bb.width  + 'px',
			H: bb.height + 'px'
		};
		
		this.$internal.css('left', 		el.L);
		this.$internal.css('top', 		el.T);
		this.$internal.css('width', 	el.W);
		this.$internal.css('height', 	el.H);
	}
	
	if (0) {  	// adjust external wrapper div
		var el = {
			L: (bb.x - this.cornerActionTriggerRadius) + 'px',
			T: (bb.y - this.cornerActionTriggerRadius) + 'px',
			W: (bb.width  + 2*this.cornerActionTriggerRadius) + 'px',
			H: (bb.height + 2*this.cornerActionTriggerRadius) + 'px'
		};
		
		this.$external.css('left', 		el.L);
		this.$external.css('top', 		el.T);
		this.$external.css('width', 	el.W);
		this.$external.css('height', 	el.H);
	}
}

WRAPPER.prototype.show = function () {	
	this.$internal.next().show();
}

WRAPPER.prototype.hide = function () {
	this.$internal.next().hide();
}

WRAPPER.prototype.delete = function () {
    var $element = this.$element;
	$element.unwrap();
	$element.unwrap();
	this.$element.next().remove();
}

/**
 * @class client.models.WIDGET
 * */
 
/**
 * @method default
 * */

WIDGET.prototype.default = function () {
	MODEL.depth++;
	
	var 
		iLinks = this.inputs,
		oLinks = this.outputs,
		Routes = this.routes,
		Markers = this.markers,
		Stats = this.stats,
		Name  = this.anchor.id,
		Label = Name, //this.name;
		Path = this.path,
		Model = {},
		Subs = this.UIs;

	Subs.Each(function (n,sub) { 	// Children widgets are sub-systems of this model
		Model[sub.label] = sub;
	});
	
	var System = MODEL.root = this.UI = new SYSTEM(Name,Label,Model,iLinks,oLinks,Routes,Markers,Stats,Path);
//console.log("newsys="+Name+":"+Label+" subs="+Subs.length+" path="+System.path);
	
	switch (System.name) { 	// Fetch parmeters for this system
		case "mux": 		// Special mux system
		case "demux":		// Special demux system
			break;
			
		default: 			// Normal system
			$.ajax({		// Program and otherwise initialize the engine
				type: "PUT",
				url: System.path,
				data: {
					tau: 	"[]",
					port:	""
					//thread: "0" //System.thread
				},
				failure: function () {
					alert("programming failed");
				},
				success: function (err) {
					System.status( err || "programmed");
					
					//if (Widget.run) 
					//	MODEL.root.run(MODEL.root.snap || MODEL.options.stats);	
				}
			});	
	}	
	
	return this.UI;
}

//BASE.socketio.on('join',MODEL.PARSER.join);

$().ready( function () {    // Render workflow model from the #content(start=MODEL) tag
	BASE.start({	
		parser: MODEL.PARSER
		
		/*
		sockets: {
			select: function (Opts) {  // socketio interfaces
				MODEL.state.client = Opts.to;

				BASE.socketio.emit('response', { msg: MODEL.state.client ? 'accepted' : 'declined'});
			},
			
			update: function (Opts) {
				$(MODEL.ui.msg).text("dirty");		
			},
			
			delete: function (Opts) {
				$(MODEL.ui.msg).text("dirty");		
			},
			
			insert: function (Opts) {
				$(MODEL.ui.msg).text("dirty");		
			},
			
			execute: function (Opts) {
				//socket.emit('screen', { filter: MODEL.options[MODEL.option].screen, file: Opts.job, fileID: Opts.fileID });	
				console.log(Opts);
				if (Opts.client == MODEL.state.client) {
					MODEL.queue.push(Opts.job);
					$(MODEL.ui.jobs).text(MODEL.queue.length+"/"+Opts.jobs);	
				}
			}

		}*/
	}, function (Widget) {

		// Mask subsystems from the dom
		
		MODEL.root = Widget.default();
		
		if (MODEL.mask) 
			$("div",$("#"+MODEL.root.name)).each(function () { 
				//alert("masking "+$(this).attr("id"));
				$(this).hide();
			});
	});
});

// UNCLASSIFIED
