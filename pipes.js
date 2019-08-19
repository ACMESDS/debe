// UNCLASSIFIED
/**
@requires child_process
@requires fs
@requires randpr
@requires reader
@requires man
@requires totem
@requires stream
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
	STREAM = require("stream"),
	RAN = require("randpr");

const { Copy,Each,Log,isObject,isString,isFunction,isError,isArray,isEmpty } = ENUM;
const { getVoxels } = GEO;
const { getFile, getSite, thread } = TOTEM;

var PIPE = module.exports = {
	config: function(opts) {
		Copy( opts || {}, PIPE );
	},
	
	pipeStream: function(sql, job, cb) {
		FS.open( "."+job.path, "r", (err, fd) => {
			if (err) 
				cb(null);

			else {
				var 
					evs = [],
					rem = "",
					src = FS.createReadStream( "", { fd:fd, encoding: "utf8" }),
					sink = new STREAM.Writable({
						objectMode: true,
						write: function (recs,en,cb) {
							(rem+recs).split("\n").forEach( rec => {
								if (rec)
									try {
										evs.push( JSON.parse(rec) );
									}
									catch (err) {
										rem = rec;
									}
							});
							cb(null);  // signal no errors
						}
					});

				sink
					.on("finish", () => {
						Log(">pipe streamed", evs.length);
						cb( {$: evs} );
					})
					.on("error", err => cb(null) );

				src.pipe(sink);  // start the pipe
			}
		});		
	},
	
	pipeImage: function (sql, job, cb) {
		$.JIMP.read( "."+ job.path )
			.then( img => { 
				Log(">pipe image", img.bitmap.height, img.bitmap.width);
				img.readPath = path;
				cb( {$:img} ); 
				return img; 
			} )
			.catch( err => cb(null) );	
	},
	
	pipeJson: function(sql, job, cb) { // pipe json data with callback cb(json,job) || cb(null)
		getSite( job.path, null, info => cb( {$: info.parseJSON( null )} ) );
	},
	
	pipeDoc: function(sql, job, cb) { // pipe nlp docs with callback cb(doc,job) || cb(null)
		function sumScores(metrics) {
			var 
				entities = metrics.entities,
				count = metrics.count,
				scores = metrics.scores,
				ids = metrics.ids,
				topics = metrics.topics;
				//dag = metrics.dag;

			scores.forEach( score => {
				metrics.sentiment += score.sentiment;
				metrics.relevance += score.relevance;
				metrics.agreement += score.agreement;
			}); 
		}

		function scoreDoc( doc, cb ) {	// callback cb(metrics)
			var 
				docs = doc.replace(/\n/g,"").match( /[^\.!\?]+[\.!\?]+/g ) || [],
				scored = 0;

			docs.forEach( doc => {
				if (doc) {
					freqs.addDocument(doc);									
					methods.forEach( nlp => nlp( doc , metrics, score => {
						scores.push( score );
						if ( ++scored == docs.length ) {
							["DTO", "DTO cash"].forEach( word => {
								freqs.tfidfs( word, (n,freq) => {
									if ( score = scores[n] ) score.relevance += freq;
								});
							});

							sumScores( metrics );	
							cb( metrics );
						}

						else
						if (scored > docs.length) // no dcos
							cb( metrics );
					}) );
				}

				else 
					scored++;
			});
		}

		var
			path = job.path,
			nlps = READ.nlps,
			methods = [nlps.max],
			metrics = {
				// dag: new ANLP.EdgeWeightedDigraph(),
				freqs: READ.docFreqs,
				entity: {
					topics: new READ.docTrie(false),
					actors: new READ.docTrie(false)
				},					
				ids: {
					topics: 0,
					actors: 0
				},
				topics: {},
				actors: {},
				sentiment: 0,
				relevance: 0,
				agreement: 0,
				scores: [],
				level: 0
			},
			scores = metrics.scores,
			freqs = metrics.freqs;
		
		if ( path.startsWith("/") )	// doc at specified file path
			READ.readFile( "."+path, rec => {
				if (rec) 
					if ( rec.doc ) 
						scoreDoc( rec.doc, metrics => cb({$:rec.doc, $$:metrics}) );

					else 
						Log(">pipe skipped empty doc");

				else
					Log(">pipe read all docs");
			});

		else // doc is the path
			scoreDoc( path, metrics => cb({$:path, $$:metrics}) );
	},
	
	/*
	pipeDoc: function(sql,job,cb) { // pipe nlp docs with callback cb(doc,job) || cb(null)
		function sumScores(metrics) {
			var 
				entities = metrics.entities,
				count = metrics.count,
				scores = metrics.scores,
				ids = metrics.ids,
				topics = metrics.topics;
				//dag = metrics.dag;

			scores.forEach( score => {
				metrics.sentiment += score.sentiment;
				metrics.relevance += score.relevance;
				metrics.agreement += score.agreement;
			}); 
		}

		var
			nlps = READ.nlps,
			methods = [nlps.max],
			metrics = {
				// dag: new ANLP.EdgeWeightedDigraph(),
				freqs: READ.docFreqs,
				entity: {
					topics: new READ.docTrie(false),
					actors: new READ.docTrie(false)
				},					
				ids: {
					topics: 0,
					actors: 0
				},
				topics: {},
				actors: {},
				sentiment: 0,
				relevance: 0,
				agreement: 0,
				scores: [],
				level: 0
			},
			scores = metrics.scores,
			freqs = metrics.freqs;

		sql.insertJob( job, job => { 
			function getDoc( job, cb ) {

				function readFile(path,cb) {	// read file at path with callback cb( {docs, metrics} )
					
					function scoreDoc( doc, cb ) {
						var 
							docs = doc.replace(/\n/g,"").match( /[^\.!\?]+[\.!\?]+/g ) || [],
							scored = 0;

						docs.forEach( doc => {
							if (doc) {
								freqs.addDocument(doc);									
								methods.forEach( nlp => nlp( doc , metrics, score => {
									scores.push( score );
									if ( ++scored == docs.length ) {
										["DTO", "DTO cash"].forEach( word => {
											freqs.tfidfs( word, (n,freq) => {
												if ( score = scores[n] ) score.relevance += freq;
											});
										});

										sumScores( metrics );	
										cb( {Doc: doc, Metrics: metrics} );
									}

									else
									if (scored > docs.length) // no dcos
										cb( {Doc: doc, Metrics: metrics} );
								}) );
							}

							else 
								scored++;
						});
					}

					if ( path.startsWith("/") )	// doc at specified file path
						READ.readFile( "."+path, rec => {
							if (rec) 
								if ( rec.doc ) scoreDoc( rec.doc, cb );

								else 
									Log("pipe ignored empty doc");

							else
								Log("pipe read all docs");
						});
					
					else // doc is the path
						scoreDoc( path, cb );
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

						`read( path, Doc => Doc ? cb( ${query[key]} ) : cb( null ) )`
						.parseJS( Copy(ctx, { // define parse context
							read: readFile,
							path: path,
							cb: doc => {
								if (doc) { // read worked
									data[firstKey] = doc;
									query[firstKey] = firstKey;
									cb( doc, job );
								}
								
								else	// read failed
									cb( null );
							}
						}) );
					}  

				if ( !firstKey ) readFile(path, doc => cb( doc, job ) );
			}

			getDoc( job, (doc, job) => cb( doc, job ) );
		});
	},
	*/
	
	pipeDB: function(sql, job, cb) {  // pipe database source with callback cb(rec,job) || cb(null)
		var parts = job.path.substr(1).split(".");
		
		sql.query( isEmpty(job.query)
				? "SELECT * FROM app.??"
				: "SELECT * FROM app.?? WHERE least(?,1)", [parts[0], job.query] )
		
			.on( "result", rec => cb( {Rec: rec} ) )
			.on( "error", err => cb(null) );
	},
	
	pipeAOI: function(sql, job, cb) {	// stream indexed events or chips through supervisor 
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