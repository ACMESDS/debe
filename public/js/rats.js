module.exports = {  // learn hidden intensity parameters of a Markov process
	usecase: {
		Symbols: "json comment '[sym, sym, ...] state symbols or null to generate' ",
		Steps: "int(11) default 0 comment 'steps to next supervised learning' ",
		Batch: "int(11) default 0 comment 'override _File.Steps' ",
		MinEigen: "float default 1e-1 comment 'smallest eigenvalue for pc estimates' ",
		Dim: "int(11) default 150 comment 'pc model dimension [max coherence intervals]' ",
		Model: "varchar(16) default 'sinc' comment 'name of complex correlation model for pc estimates' ",
		
		Save_end: "json",
		Save_config: "json",
		Save_batch: "json",
		Pipe: "json",
		Description: "mediumtext"
	},
	
	engine: function rats(ctx,res) {  
	/* 
	Return MLEs for random event process [ {x,y,...}, ...] given ctx parameters and
		_File.Actors = ensembe size
		_File.States = number of states consumed by process
		_File.Steps = number of time steps
		_Events = query to get events
	*/
		function arrivalRates( solve, cb ) { // estimate rates with callback cb(rates) 
			
			function getpcs(model, Emin, M, Mwin, Mmax, cb) {  // get or gen pcs with callback(pcs)

				function genpcs(dim, steps, model, cb) {
					Log("gen pcs", dim, steps, model); 
					
					function evd( models, dim, step, cb) {
						models.forEach( function (model) {

							Log("ran config", model, dim, step);

							for (var M=1; M<dim; M+=step) {
								var 
									ctx = {
										N: dim,
										M: M,
										T: 1
										//A: 
											//ME.matrix( [[1,0,0],[0,2,0], [0,0,3]]) 
											//ME.matrix( model( dim, M ) )
									},
									script = `
t = rng(-T/2, T/2, N);
Tc = T/M;
A = xmatrix( ${model}(t/Tc) ); 
R = evd(A); 
`; 

								ME.exec( script,  ctx, function (ctx) {

										var R = ctx.R;

										if (false) {  // debugging
											//Log("lambda", R.values._data);
											ME.eval( "e=R.vectors'*R.vectors; x=R.vectors*diag(R.values); y = A*R.vectors; ", ctx);
											Log("e", ctx.e._data);  
											Log("x", ctx.x._data[dim-1]);  
											Log("y", ctx.y._data[dim-1]);	 
										}

										cb({
											model: model.name,
											intervals: M,
											values: R.values._data,
											vectors: R.vectors._data
										});
								});
							}
						});
					}

					SQL.beginBulk();

					evd( [model], Mmax, Mwin*2, function (pc) {
						var 
							vals = pc.values,
							vecs = pc.vectors,
							N = vals.length, 
							ref = vals[N-1];

						vals.forEach( (val, idx) => {
							var
								save = {
									correlation_model: pc.model,
									coherence_intervals: pc.intervals,
									eigen_value: val,
									eigen_index: idx,
									ref_value: ref,
									max_intervals: dim,
									eigen_vector: JSON.stringify( vecs[idx] )
								};

							SQL.query("INSERT INTO app.pcs SET ? ON DUPLICATE KEY UPDATE ?", [save,save] );
						});
					});

					SQL.endBulk();
					cb();						
				}

				function sendpcs( pcs ) {
					var vals = [], vecs = [];
					pcs.forEach( function (pc) {
						vals.push( pc.eigen_value );
						vecs.push( JSON.parse( pc.eigen_vector ) );
					});

					cb({
						values: vals,
						vectors: vecs
					});

					SQL.release();
				}

				function findpcs( cb ) {
					var M0 = Math.min( M, Mmax-Mwin*2 );

					SQL.query(
						"SELECT * FROM app.pcs WHERE coherence_intervals BETWEEN ? AND ? AND eigen_value > ? AND least(?,1) ORDER BY eigen_index", 
						[M0-Mwin, M0+Mwin, Emin, {
							max_intervals: Mmax, 
							correlation_model: model
						}],
						function (err, pcs) {
							if (!err) cb(pcs);
					});
				}

				findpcs( function (pcs) {
					if (pcs.length) 
						sendpcs( pcs );

					else
					SQL.query(
						"SELECT count(ID) as Count FROM app.pcs WHERE least(?,1)", {
							max_intervals: Mmax, 
							correlation_model: model
						}, 
						function (err, test) {  // see if pc model exists

						//Log( "modtest", Mmax, model, M, Mwin, pcs);
						if ( !test[0].Count )  // pc model does not exist so make it
							genpcs( Mmax, Mwin*2, model, function () {
								findpcs( sendpcs );
							});

						else  // search was too restrictive so no need to remake model
							sendpcs(pcs);
					});							
				});
			}
	
			getpcs( solve.model||"sinc", solve.min||0, solve.M, solve.Mstep/2, solve.Mmax, function (pcs) {
				
				const { sqrt, random, log, exp, cos, sin, PI } = Math;
				
				function expdev(mean) {
					return -mean * log(random());
				}
				
				if (pcs) {
					var 
						epcs = pcs.values,
						eref = pcs.ref_value,
						evals = $(N, (n,e) => e[n] = epcs[n] * eref ),
						evecs = pcs.vectors,
						T = solve.T,
						N = evals.length,
						ctx = {
							T: T,
							N: N,
							
							E: $(N, (n,E) => E[n] = evals[n] ),
							
							B: $(N, (n,B) => {
								var
									b = sqrt( expdev( evals[n] ) ),
									arg = random() * PI;

								B[n] = ME.complex( b * cos(arg), b * sin(arg) );
							}),

							V: evecs 
						},
						script = `
A=B*V; 
lambda = abs(A); 
Wbar=sum(E); 
t = rng(-T/2, T/2, N); `;

					if (N) {
						ME.exec( script , ctx, (ctx) => {
							//Log("ctx", ctx);
							cb({
								intensity_profile: {t: ctx.t, i: ctx.lambda},
								mean_count: ctx.Wbar,
								mean_intensity: ctx.Wbar / T
							});
						});								
					}

					else
						cb({
							error: `coherence intervals ${stats.coherence_intervals} > max pc dim`
						});
				}

				else
					cb({
						error: "no pcs matched"
					});
			});
		}

		var
			file = ctx._File,
			flow = ctx._Flow;
		
		//Log("rats ctx", ctx);
		arrivalRates({  // parms for principle components (intensity profile) solver
			T: flow.T,  // observation time
			M: file.coherence_intervals, // coherence intervals
			Mstep: 5,  // step intervals
			Mmax: ctx.Dim || 150,  // max coherence intervals / pc dim
			model: ctx.Model,  // assumed correlation model for underlying CCGP
			min: ctx.MinEigen	// min eigen value to use
		}, function (stats) {
			ctx.Save = stats;
			res(ctx);
		});
		
	}

}