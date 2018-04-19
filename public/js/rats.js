module.exports = {  // learn hidden intensity parameters of a Markov process
	usecase: {
		Symbols: "json",
		Steps: "int(11) default 0",
		Batch: "int(11) default 0",
		Dim: "int(11) default 150",
		MinEigen: "float default 1e-1",
		Model: "varchar(16) default 'sinc'",
		
		Save_end: "json",
		Save_config: "json",
		Save_batch: "json",
		Pipe: "json",
		Description: "mediumtext"
	},
	
	engine: function rats(ctx,res) {  
	/* 
	Return MLEs for random event process [ {x,y,...}, ...] given ctx parameters:
		Symbols = [sym, ...] state symbols or null to generate
		Batch = steps to next supervised learning
		Steps = override _File.Steps
		Model = name of model used for pc estimates
		MinEigen = smallest eigenvalue for pc estimates
		Dim = pc model dims (max coherence intervals)
		_File.Actors = ensembe size
		_File.States = number of states consumed by process
		_File.Steps = number of time steps
		_Events = query to get events
	*/
		function arrivalRates( solve, cb ) {
			function getpcs(model, Emin, M, Mwin, Mmax, cb) {

				function genpcs(dim, steps, model, cb) {
					LOG("gen pcs", dim, steps, model); 
					var
						pcgen = new RAN({
							models: [model],  // models to gen
							Mmax: dim,  	// max coherence intervals
							Mstep: steps 	// step intervals
						});

					SQL.beginBulk();

					pcgen.config( function (pc) {
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

						//LOG( "modtest", Mmax, model, M, Mwin, pcs);
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
						evals = pcs.values,
						evecs = pcs.vectors,
						T = solve.T,
						N = evals.length,
						mctx = {
							T: T,
							N: N,
							
							E: evals,
							
							B: $(N, (n,B) => {
								var
									b = sqrt( expdev( evals[n] ) ),
									arg = random() * PI;

								B[n] = n; //ME.complex( b * cos(arg), b * sin(arg) );
							}),

							V: evecs 
						};

					if (N) {
						ME.exec( "A=B*V; lambda = abs(A); Wbar=sum(E); t = (-T/2) : T/N: (T/2)" , mctx, (mctx) => {
							//Log("mctx", mctx);
							cb({
								intensity_profile: {t: mctx.t, i: mctx.lambda},
								mean_count: mctx.Wbar,
								mean_intensity: mctx.Wbar / T
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
		}, res );	
		
	}

}