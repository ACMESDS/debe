// UNCLASSIFIED
/**
@requires child_process
@requires fs
@requires randpr
@requires reader
@requires man
@requires totem
@requires geohack

Provide a (stream, image, etc) PIPE(sql,job,cb) for DEBE plugins.   Each PIPE will callback 

	cb(data,job) 
	
with a data object suitable for the specific pipe.  The PIPE may optionally regulate the job using sql.insertJob.  If the PIPE needs to 
save its data (e.g. when it supervising a workflow), it will callback 

		cb(data, job, (ctx,save) => { 
			save( data, ctx );		// save its data under plugin context ctx
		});

The pipe job contains:

		qos: ms job regulation interval
		priority: 0, 1, ... job prirority
		client: "client name"
		class: "name of pipe"
		credit: >=0 remaining job credits
		name: "name of plugin"
		task: "plugin usecase"
		notes: ".... notes"
		query: {...} query parms
		path: "/dataset.type?..." pipe path
		ctx: {...} plugin context keys
*/

var
	READ = require("reader"),
	FS = require("fs"),
	CP = require("child_process"), 	
	GEO = require("geohack"),
	TOTEM = require("totem"),
	ENUM = require("enum"),
	$ = require("man"),
	RAN = require("randpr");

const { Copy,Each,Log,isObject,isString,isFunction,isError,isArray } = ENUM;
const { getVoxels } = GEO;
const { getFile, getSite, thread } = TOTEM;

var PIPE = module.exports = {
	config: function(opts) {
		Copy( opts || {}, PIPE );
	},
	
	pipeStream: function(sql, job,cb) { // pipe data from streamed file
		sql.insertJob( job, job => { 
			function getEvents(job, cb) {
				FS.createReadStream("."+job.path,"utf8").get( "", evs => cb( {evs: evs}, job ) );
			}

			getEvents( job, (evs,job) => cb(evs,job) );
		});
	},

	pipeImage: function(sql,job,cb) {   // run image scripting pipe
		sql.insertJob( job, job => { 
			function getImage( job, cb) {

				function readFile(path,cb) {	// read and forward jpg to callback
					$.IMP.read( "."+ path )
					.then( img => { 
						Log("read", path, img.bitmap.height, img.bitmap.width);
						img.readPath = path;
						cb(img); 
						return img; 
					} )
					.catch( err => Log(err) );
				}

				var
					path = job.path,
					ctx = job.ctx,
					query = job.query,
					data = {},
					firstKey = "";

				for (var key in query)  // first key is special scripting-with-callback key
					if ( !firstKey ) {
						firstKey = key;

						`read( path, img => cb( ${query[key]} ) )`
						.parseJS( Copy(ctx, { // define parse context
							read: readFile,
							path: path,
							cb: rtn => {
								data[firstKey] = rtn;
								query[firstKey] = firstKey;
								cb( data, job );
							}
						}) );
					}  

				if ( !firstKey ) readFile(path, img => cb( {Image:img}, job) );
			}

			getImage( job, (data,job) => cb(data,job) );
		});	
	},

	pipeJson: function(sql,job,cb) { // send raw json data to the plugin
		sql.insertJob( job, job => { 
			function getEvents(job, cb) {
				// Log(">>fetch", path);
				getSite( job.path, null, info => cb( info.parseJSON( {} ), job ) );
			}

			getEvents( job, (evs,job) => cb(evs,job) );
		});
	},

	pipeDoc: function(sql,job,cb) { // nlp pipe
		sql.insertJob( job, job => { 
			function getDoc( job, cb) {

				function readFile(path,cb) {	// read and forward doc to callback
					thread( sql => {
						READ.readFile( sql, "."+path, doc => cb(doc) );
						sql.release();
					});
				}

				var
					path = job.path,
					ctx = job.ctx,
					query = job.query,
					data = {},
					firstKey = "";

				for (var key in query)  // first key is special scripting-with-callback key
					if ( !firstKey ) {
						firstKey = key;

						`read( path, doc => cb( ${query[key]} ) )`
						.parseJS( Copy(ctx, { // define parse context
							read: readFile,
							path: path,
							cb: rtn => {
								data[firstKey] = rtn;
								query[firstKey] = firstKey;
								cb( data, job );
							}
						}) );
					}  

				if ( !firstKey ) readFile(path, doc => cb( {Doc:doc}, job) );
			}

			getDoc( job, (data,job) => cb(data,job) );
		});
	},

	pipeDB: function(sql,job,cb) {  // pipe database source
		sql.query( "SELECT * FROM app.??", job.class, (err,recs) => {
			if (!err) cb( {data:recs}, job );
		});
	},

	pipeAOI: function(sql,job,cb) {	// stream indexed events or chips through supervisor 
		getFile( job.client, job.path, file => {
			function chipFile( file, job ) { 
				//Log( "chip file>>>", file );
				var ctx = job.ctx;

				ctx.File = file;
				getVoxels(sql, job.query, file, meta => {  // process voxels over queried aoi
					ctx.meta = meta;

					sql.insertJob( job, job => {  // put voxel into job regulation queue
						function getImage(chips, job, cb) {
							chips.get( "wms", function image(img) {
								//Log("wms recover job", job.ctx.Method);
								cb(img, job);
							});
						}

						var
							ctx = job.ctx, 		 // recover job context
							meta = ctx.meta,
							file = meta.File,
							chips = meta.Chips,
							evs = meta.Events;

						//Log(">>>chips", chips);
						if (chips)   // place chips into chip supervisor
							getImage( chips, job, (img,job) => {
								var ctx = job.ctx;
								//Log(">>>chip ctx", ctx);
								ctx.Image = img;
								cb( [], job );
							});

						else
						if (evs) {		// run voxelized events thru event supervisor
							var
								supervisor = new RAN({ 	// learning supervisor
									learn: function (supercb) {  // event getter callsback supercb(evs) or supercb(null,onEnd) at end
										var 
											supervisor = this;

										//Log("learning ctx", ctx);

										evs.get( "t", evs => {  // route events thru supervisor, run plugin, then save supervisor logs
											Trace( evs 
												  ? `SUPERVISING voxel${ctx.Voxel.ID} events ${evs.length}` 
												  : `SUPERVISED voxel${ctx.Voxel.ID}` );

											if (evs) // feed supervisor
												supercb(evs);

											else // terminate supervisor and start engine
												supercb(null, function onEnd( flow ) {  // attach supervisor flow context
													ctx.Flow = flow; 
													ctx.Case = "v"+ctx.Voxel.ID;
													Trace( `STARTING voxel${ctx.Voxel.ID}` );

													cb( {}, job, (ctx,save) => {
														supervisor.end( ctx.Save || [], logs => {
															save(logs, ctx);
														});
													});
												});	
										});
									},  

									N: query.actors || file._Ingest_Actors,  // ensemble size
									keys: query.keys || file.Stats_stateKeys,	// event keys
									symbols: query.symbols || file.Stats_stateSymbols || file._Ingest_States,	// state symbols
									steps: query.steps || file._Ingest_Steps, // process steps
									batch: query.batch || 0,  // steps to next supervised learning event 
									trP: {},	// transition probs
									filter: function (str, ev) {  // filter output events
										switch ( ev.at ) {
											case "batch":
												//Log("filter", ev);
											case "config":
											case "end":
												str.push(ev);
										}
									}  
								});

							supervisor.pipe( stats => { // pipe supervisor to this callback
								Trace( `PIPED voxel${ctx.Voxel.ID}` );
							}); 
						}
					});	
				});
			}

			function restoreFile( file, job, cb ) {
				CP.exec("", () => {  //<< fix: add script to copy and unzip from S3 buckets
					Trace("RESTORING "+file.Name);
					cb(file,job);
					thread( sql => {
						sql.query("UPDATE app.files SET _State_Archived=false WHERE ?", {ID: file.ID});
						sql.release();
					});
				});
			}										

			["stateKeys", "stateSymbols"].parseJSON(file);

			if (file._State_Archived) 
				restoreFile( file, job, (file, job) => chipFile(file, job) );

			else
				chipFile( file, job );
		});
	}
}

// UNCLASSIFIED