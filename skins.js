/**
@class DEBE.Skinning
*/

var		// 3rd party
	JADE = require('jade');				//< using jade as the skinner	

var		// totem
	TOTEM = require("totem"),
	ENUM = require("enum");

function Trace(msg,sql) {	// execution tracing
	"K>".trace(msg,sql);
}

const {Log,Copy} = ENUM;

module.exports = {
	renderSkin: function (req,res) {
	/**
	@method renderSkin
	@member TOTEM
	Totem (req,res)-endpoint to render req.table using its associated jade engine. 
	@param {Object} req Totem request
	@param {Function} res Totem response
	*/
		var 
			sql = req.sql,
			query = req.query,
			paths = TOTEM.paths,
			site = TOTEM.site,  
			error = TOTEM.errors,
			primeSkin = TOTEM.primeSkin,
			urls = site.urls,
			routers = TOTEM.byActionTable.select,
			dsname = req.table,
			ctx = Copy(site, {  //< default site context to render skin
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
			});

		function dsContext(ds, cb) { // callback cb(ctx) with skinning context ctx

			if ( extctx = primeSkin[ds] ) // if there is a ctx extender, render in ds context
				sql.serialize( extctx, {Task: ds}, ctx, cb );

			else  // render in default site context
				cb( ctx );
		}

		dsContext(dsname, ctx => {  // get skinning context for this skin

			function renderFile( file, ctx ) { 
			/**
			@private
			@method renderFile
			Render Jade file at path this to res( err || html ) in a new context created for this request.  
			**/
				try {
					res( JADE.renderFile( file, ctx ) );  
				}
				catch (err) {
					Log("render err", err);
					res(  err );
				}
			}

			function renderPlugin( fields, ctx ) { // render using plugin skin
			/**
			@private
			@method renderPlugin
			Render Jade file at path this to res( err || html ) in a new context created for this request.  
			**/

				Copy({		// keys to plugin.jade
					mode: req.type,
					//page: query.page,
					//refresh: query.refresh,
					//dims: query.dims,
					ds: dsname
				}, query);

				//Log([query, req.search]);

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

			function renderTable( ds, ctx ) {
			/**
			@private
			@method renderTable
			Render table at path this to res( err || html ) in a new context created for this request.  
			**/			
				sql.query( 
					"SHOW FULL COLUMNS FROM ??", 
					sql.reroute( ds ), 
					function (err,fields) {

					if (err) // render jade file
						renderFile( paths.jades+ds+".jade", ctx );

					else // render plugin
						renderPlugin( fields, ctx );
				});	
			}

			function renderJade( jade, ctx ) { 
			/**
			@private
			@method renderJade
			Render Jade string this to res( err || html ) in a new context created for this request. 
			**/
				try {
					res( JADE.compile(jade, ctx) (ctx) );
				}
				catch (err) {
					res( err );
				}
			}

			sql.forFirst("", paths.engine, { // Try a jade engine
				Name: req.table,
				Type: "jade",
				Enabled: 1
			}, eng => {

				if (eng)  // render view with this jade engine
					renderJade( eng.Code || "", ctx );

				else
				if ( route = routers[dsname] )   // render ds returned by an engine 
					route(req, recs => { 
						//Log({eng:recs, ds:req.table});
						if (recs)
							renderPlugin( recs[0] || {}, ctx );

						else
							renderTable( dsname , ctx );
					});	

				else  // render a table
					renderTable( dsname , ctx );

			});
		});
	}
};
