/**
@class DEBE.Skinning
*/

var		
	ENV = process.env,
	
	// nodejs
	FS = require("fs"),
	JADE = require('jade'),			//< using jade as the skinner	

	// totem
	TOTEM = require("totem"),
	ENUM = require("enum");

function Trace(msg,req,fwd) {	// execution tracing
	"skin".trace(msg,req,fwd);
}

const {Each,Log,Copy,typeOf} = ENUM;
const {site, paths, error, primeSkin, probeSite } = TOTEM;

const {skinContext, renderSkin} = module.exports = {
	skinContext: function (nbook, prime) {
		var
			parts = nbook.split("."),
			name = parts[0] || "NoName",
			type = parts[1] || "js",
			paths = {  
				master: ENV.SERVICE_MASTER_URL + "/" + name,
				worker: ENV.SERVICE_WORKER_URL + "/" + name,
				//nbook: ENV.SERVICE_WORKER_URL + "/" + name,
				repo: ENV.PLUGIN_REPO
			},
			ctx = Copy( prime || {}, {
				Name: name.toUpperCase(),
				name: name,
				product: nbook,
				notebook: nbook,
				by: ENV.BYLINE,

				register: () => 
					"<!---parms endservice=https://myservice/" + ctx.name + "--->" 
					+ ctx.input({a:"aTest", b:"bTest"}),
				
				//input: tags => "<!---parms " + "".tag("&", tags || {}).substr(1) + "--->",

				reqts: {   // defaults
					js: "nodejs-8.9.x and [man-latest](https://sc.appdev.proj.coe.ic.gov://acmesds/man)",
					py: "anconda-4.9.1 (iPython 5.1.0 debugger), numpy 1.11.3, scipy 0.18.1, utm 0.4.2, Python 2.7.13",
					m: "matlab R18, odbc, simulink, stateflow"
				},
				
				summary: "summary tbd",
				//reqts: infokeys.envs[type] || "reqts tbd",
				ver: "ver tbd",
				/*
				status: () => ctx.fetch( paths.master + ".status" ),
				toumd: () => ctx.fetch( paths.master + ".toumd" ),
				suitors: () => ctx.fetch( paths.master + ".suitors" ),
				users: () => ctx.fetch( paths.master + ".users" ),
				fetch: (url,tags) => {
					//console.log(">>>>>", url);
					return "<!---fetch " + url.tag("?", tags || {} ) + "--->";
				},	
				gridify: site.gridify,
				tag: site.tag,
				get: site.get,
				match: site.match,
				replace: site.replace,
				pocs: site.pocs,
				*/
				reqs: {
					info: "request for information/please provide some information",
					help: "need help/please provde me some help on this notebook"
				},
				request: req => {
					var
						parts = (req || ctx.reqs.info || "request/need information").split("/"),
						label = parts[0] || "request",
						body = parts[1] || "request for information",
						pocs = ctx.pocs || {};

					//Log("pocs", pocs, label, body, name, req);
					return (pocs.admin||"").mailify( label, {subject: name, body: body} );
				},

				interface: () => "publish notebook to define interface",
				now: (new Date())+"",
				urls: {
					loopback:  paths.worker + "." + type +"?endservice=" + paths.worker +".users",
					transfer: paths.worker + "." + type + "?endservice=",
					//nbook: paths.worker,
					status: paths.master + ".status",
					md: paths.master + ".md",
					suitors: paths.master + ".suitors",
					run: paths.worker + ".run",
					tou: paths.master + ".tou",
					pub: paths.master + ".pub",
					worker: paths.worker,
					master: paths.master,
					totem: ENV.SERVICE_WORKER_URL,
					//Totem: paths.worker,
					//totem: paths.master,  // generally want these set to the master on 8080 so that a curl to totem on 8080 can return stuff
					repo: paths.repo + name,
					repofiles: paths.repo + name + "/raw/master",
					relinfo: paths.master + "/releases.html?nbook=" + nbook
				}
			}, "."),
			urls = ctx.urls;

		Each( urls, (key,url) => ctx["_"+key] = "%{" + url + "}" );	

		return ctx;
	},
	
	renderSkin: function (req,res) {
	/**
	@method renderSkin
	@member TOTEM
	Totem (req,res)-endpoint to render req.table using its associated jade engine. 
	@param {Object} req Totem request
	@param {Function} res Totem response
	*/
		//Log("render", site);
		
		const { sql, query, table } = req;
		const { urls } = site;
		
		var 
			nb = query.notebook || query.nb,
			//routers = TOTEM.byActionTable.select,
			dsname = table,
			ctx = Copy( nb ? skinContext( nb ) : {}, Copy(site, {  //< default site context to render skin
				typeOf: typeOf,
				table: req.table,
				dataset: req.table,
				type: req.type,
				//parts: req.parts,
				action: req.action,
				//org: req.org,
				client: req.client,
				flags: req.flags,
				query: req.query,
				joined: req.joined,
				profile: req.profile,
				//group: req.group,
				//search: req.search,
				session: req.session,
				/*
				util: {
					cpu: (cpuavgutil() * 100).toFixed(0), // (req.log.Util*100).toFixed(0),
					disk: ((req.profile.useDisk / req.profile.maxDisk)*100).toFixed(0)
				},*/
				started: TOTEM.started,
				filename: TOTEM.paths.jadeRef,  // jade compile requires
				url: req.url
			}) );

		//Log("render", ctx );
		
		/*
		function dsContext(ds, cb) { // callback cb(ctx) with skinning context ctx

			if ( extctx = primeSkin[ds] ) // if there is a ctx extender, render in ds context
				sql.serialize( extctx, {Task: ds}, ctx, cb );

			else  // render in default site context
				cb( ctx );
		}

		dsContext(dsname, ctx => {  // get skinning context for this skin
		}); */
		
		function renderFile( file, ctx ) { 
		/**
		@private
		@method renderFile
		Render Jade file at path this to res( err || html ) in a new context created for this request.  
		**/

			try {
				FS.readFile( file, "utf-8", (err,jade) => {
					if (err) 
						res( err );

					else
						renderJade( jade, ctx );
				})
			}
			catch (err) {
				Log(err);
				res(  err );
			}
		}

		function renderNotebook( name, type, fields, ctx ) { // render using plugin skin
		/**
		@private
		@method renderNotebook
		Render Jade file at path this to res( err || html ) in a new context created for this request.  
		**/

			Copy({		// keys to plugin.jade
				mode: req.type,
				uses: type ? [
					"execute".tag( `${name}.exe?Name=CASE` ),
					"run".tag( `${name}.run` ),
					"view".tag( `${name}.view` ),
					"terms".tag( `${name}.tou` ),
					"publish".tag( `${name}.pub` ),
					"usage".tag( `${name}.use` ),
					"project".tag( `${name}.proj` ),
					"download".tag( `${name}.${type}` ),
					"brief".tag( `/briefs.view?options=${name}` ),
					"reset".tag( `${name}.reset` )
				].join(" || ") : [
					"view".tag( `${name}.view` )
				].join(" || "),
				//page: query.page,
				//refresh: query.refresh,
				//dims: query.dims,
				client: req.client,
				ds: name
			}, query);

			var
				cols = [],
				drops = { id:1, odbcstamp: 1};

			switch (fields.constructor.name) {
				case "Array":
					fields.forEach( field => {
						var 
							key = field.Field, 
							type = field.Type.split("(")[0];
							//group = key.split("_");

						if ( key.toLowerCase() in drops ) {		// drop
						}
						else
						if ( type == "geometry") {		// drop
						}
						else {		// take
							var
								doc = escape(field.Comment).replace(/\./g, "%2E").replace(/\_/g,"%5F"),
								qual = "short";

							if ( key.startsWith("Save") ) qual += "hideoff" ;

							else
							if ( key.startsWith("_" ) ) qual += "off";

							//Log(key,qual);
							cols.push( key + "." + type + "." + doc + "." + qual );
						}
					});
					break;

				case "String":
					fields.split(",").forEach( field => {
						if ( field != "ID") cols.push( field );
					});	
					break;

				default:
					Each(fields, field => {
						if (field != "ID") cols.push( field );
					});	
			}

			query.cols = cols.groupify();
			/*if ( query.mode == "gbrief" ) // better to add this to site.context.plugin
				sql.query("SELECT * FROM ??.??", [req.group, query.ds], function (err,recs) {
					if (err)
						res( TOTEM.errors.badSkin );

					else {
						recs.each( function (n,rec) {
							delete rec.ID;
						});

						query.data = recs;
						pluginPath.render(req, res);
					}
				});

			else	*/

			//Log( paths.jades+"plugin.jade", query);
			renderFile( paths.jades+"plugin.jade", ctx );
		}		

		function buildSchema( ds, type, ctx ) {
		/**
		@private
		@method buildSchema
		Render table at path this to res( err || html ) in a new context created for this request.  
		**/			
			sql.query( 
				"SHOW FULL COLUMNS FROM ??", 
				sql.reroute( ds ), 
				(err,fields) => {

				//Log(err, fields);
					
				if (err) // render jade file
					renderFile( paths.jades+ds+".jade", ctx );

				else // render notebook
					renderNotebook( ds, type, fields, ctx );
			});	
		}

		function renderJade( jade, ctx ) { 
		/**
		@private
		@method renderJade
		Render Jade string this to res( err || html ) in a new context created for this request. 
		**/
			jade.Xskin(ctx, (html, err) => res( err || html ) );
		}

		sql.forFirst( "", paths.engine, { // Probe engine
			Name: dsname,
			Enabled: 1
		}, eng => {

			//Log(eng);

			if (eng)  // render jade view or notebook
				if ( eng.Type == "jade" )
					renderJade( eng.Code || "", ctx );

				else
					buildSchema( dsname, eng.Type, ctx );

			/* else
			if ( route = routers[dsname] )   // render ds returned by an engine 
				route(req, recs => { 
					//Log({eng:recs, ds:req.table});
					if (recs)
						renderNotebook( dsname, "", recs[0] || {}, ctx );

					else
						buildSchema( dsname, ctx );
				});	 */

			else  // render a table
				buildSchema( dsname, "", ctx );

		});
	}
};
