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

							Log("pcs", model, dim, step);

							for (var M=1; M<dim; M+=step) {
								var 
									ctx = {
										N: dim,
										M: M,
										T: 1
									},
									script = `
t = rng(-T, T, 2*N+1);
Tc = T/M;
xccf = ${model}( t/Tc );
Xccf = xmatrix( xccf ); 
R = evd(Xccf); 
`; 

								ME.exec( script,  ctx, function (ctx) {

									if (solve.trace)  // debugging
										ME.exec(`
disp({
basis: R.vectors' * R.vectors,
eig: R.vectors*diag(R.values) - Xccf*R.vectors,
det: det(Xccf)/prod(R.values),
trace: trace(Xccf)/sum(R.values)
})`.replace(/\n/g,""), ctx);
										
									cb({
										model: model,
										intervals: M,
										values: ctx.R.values._data,
										vectors: ctx.R.vectors._data
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
							ref = ME.max(vals);

						vals.forEach( (val, idx) => {
							var
								save = {
									correlation_model: pc.model,
									coherence_intervals: pc.intervals,
									eigen_value: val / ref,
									eigen_index: idx,
									ref_value: ref,
									max_intervals: dim,
									eigen_vector: JSON.stringify( vecs[idx] )
								};

							//Log(save);
							
							SQL.query("INSERT INTO app.pcs SET ? ON DUPLICATE KEY UPDATE ?", [save,save] );
						});
					});

					SQL.endBulk();
					cb();						
				}

				function sendpcs( pcs ) {
					var vals = [], vecs = [];
					
					//Log("sendpcs", pcs);
					pcs.forEach( function (pc) {
						vals.push( pc.eigen_value );
						vecs.push( JSON.parse( pc.eigen_vector ) );
					});

					cb({
						values: vals,
						vectors: vecs,
						ref: pcs[0].ref_value
					});

					SQL.release();
				}

				function findpcs( cb ) {
					var M0 = Math.min( M, Mmax-Mwin*2 );

					SQL.query(
						"SELECT * FROM app.pcs WHERE coherence_intervals BETWEEN ? AND ? AND eigen_value / ref_value > ? AND least(?,1) ORDER BY eigen_index", 
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

						//Log("test", test);
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
						pcref = pcs.ref,  // [unitless]
						pcvals = pcs.values,  // [unitless]
						N = pcvals.length,
						T = solve.T,
						dt = T / N,
						evals = $(N, (n,e) => e[n] = solve.lambdaBar * dt * pcvals[n] * pcref ),  // [unitless]
						evecs = pcs.vectors,   // [sqrt Hz]
						ctx = {
							T: T,
							N: N,
							
							E: ME.matrix( evals ),
							
							B: $(N, (n,B) => {
								var
									b = sqrt( expdev( evals[n] ) ),  // [unitless]
									arg = random() * PI;

								//Log(n,arg,b, evals[n], eref, T, N);
								B[n] = ME.complex( b * cos(arg), b * sin(arg) );  // [unitless]
							}),

							V: evecs   // [sqrt Hz]
						},
						script = `
A=B*V; 
lambda = abs(A).^2; 
Wbar=sum(E); 
lambdaBar = Wbar/T;
t = rng(-T/2, T/2, N); 
`;

//Log(ctx);
					
					if (N) 
						ME.exec( script , ctx, (ctx) => {
							//Log("ctx", ctx);
							cb({
								intensity_profile: {t: ctx.t, i: ctx.lambda},
								mean_count: ctx.Wbar,
								mean_intensity: ctx.lambdaBar
							});
						});	

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
			file = ctx.File,
			flow = ctx.Flow;
		
		//Log("rats ctx", ctx);
		arrivalRates({  // parms for principle components (intensity profile) solver
			trace: false,   // eigen debug
			T: flow.T,  // observation interval  [1/Hz]
			M: file.coherence_intervals, // coherence intervals
			lambdaBar: file.mean_intensity, // [Hz]
			Mstep: 1,  // step intervals
			Mmax: ctx.Dim || 150,  // max coherence intervals / pc dim
			model: ctx.Model,  // assumed correlation model for underlying CCGP
			min: ctx.MinEigen	// min eigen value to use
		}, function (stats) {
			ctx.Save = stats;
			res(ctx);
		});
		
	}

}