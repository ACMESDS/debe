module.exports = {  // learn hidden intensity parameters of a Markov process
	keys: {
		//Symbols: "json comment '[sym, sym, ...] state symbols or null to generate' ",
		Steps: "int(11) default 0 comment 'steps to next supervised learning' ",
		Batch: "int(11) default 0 comment 'override _File.Steps' ",
		MinEigen: "float default 1e-1 comment 'smallest eigenvalue for pc estimates' ",
		Dim: "int(11) default 150 comment 'pc model dimension [max coherence intervals]' ",
		Model: "varchar(16) default 'sinc' comment 'name of complex correlation model for pc estimates' ",
		
		Save_end: "json",
		Save_config: "json",
		Save_batch: "json",
		Pipe: "json",
		Description: "mediumtext",
		Autorun: "boolean default 0"
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
										T: 50
									},
									script = `
t = rng(-T, T, 2*N-1);
Tc = T/M;
xccf = ${model}( t/Tc );
Xccf = xmatrix( xccf ); 
R = evd(Xccf); 
`; 

								ME.exec( script,  ctx, function (ctx) {

									if (solve.trace)  // debugging
										ME.exec(`
disp({
M: M,
ccfsym: sum(Xccf-Xccf'),
det: [det(Xccf), prod(R.values)],
trace: [trace(Xccf), sum(R.values)]
})`, ctx);

/*
basis: R.vectors' * R.vectors,
vecres: R.vectors*diag(R.values) - Xccf*R.vectors,
*/
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
						pcRef = pcs.ref,  // [unitless]
						pcVals = pcs.values,  // [unitless]
						N = pcVals.length,
						T = solve.T,
						dt = T / (N-1),
						egVals = $(N, (n,e) => e[n] = solve.lambdaBar * dt * pcVals[n] * pcRef ),  // [unitless]
						egVecs = pcs.vectors,   // [sqrt Hz]
						ctx = {
							T: T,
							N: N,
							dt: dt,
							
							E: ME.matrix( egVals ),
							
							B: $(N, (n,B) => {
								var
									b = sqrt( expdev( egVals[n] ) ),  // [unitless]
									arg = random() * PI;

								Log(n,arg,b, egVals[n], T, N, solve.lambdaBar );
								B[n] = ME.complex( b * cos(arg), b * sin(arg) );  // [unitless]
							}),

							V: egVecs   // [sqrt Hz]
						},
						script = `
A=B*V; 
lambda = abs(A).^2 / dt; 
Wbar = {evd: sum(E), prof: sum(lambda)*dt};
evRate = {evd: Wbar.evd/T, prof: Wbar.prof/T};
x = rng(-1/2, 1/2, N); 
`;

//Log(ctx);

					if (N) 
						ME.exec( script , ctx, (ctx) => {
							//Log("ctx", ctx);
							cb({
								intensity: {x: ctx.x, i: ctx.lambda},
								//mean_count: ctx.Wbar,
								//mean_intensity: ctx.evRate,
								eigen_ref: pcRef
							});
							Log({
								mean_count: ctx.Wbar,
								mean_intensity: ctx.evRate,
								eigen_ref: pcRef
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
			stats = ctx.Stats,
			flow = ctx.Flow;
		
		Log("rats ctx", stats);
		if (stats)
			arrivalRates({  // parms for principle components (intensity profile) solver
				trace: false,   // eigen debug
				T: flow.T,  // observation interval  [1/Hz]
				M: stats.coherence_intervals, // coherence intervals
				lambdaBar: stats.mean_intensity, // event arrival rate [Hz]
				Mstep: 1,  // coherence step size when pc created
				Mmax: ctx.Dim || 150,  // max coherence intervals when pc created
				model: ctx.Model,  // assumed correlation model for underlying CCGP
				min: ctx.MinEigen	// min eigen value to use
			}, function (stats) {
				ctx.Save = stats;
				Log("save", stats);
				res(ctx);
			});
		
		else
			res(null);
		
	}

}