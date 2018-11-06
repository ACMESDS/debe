module.exports = {  // generate a Markov process given its transition probability parameters
	keys: {
		emProbs: "json comment 'gaussian mixing parameters { dims: [D1, D2 , ...] weights: [W1, W2 , ...] }' ",
		Symbols: "json comment '[S1, S2, ... ] state symbols or null to generate defaults' ",
		Members: "int(11) default 100 comment 'number in process ensemble' ",
		
		type_Markov: "json comment 'Markov process with KxK transition probs [ [pr, ...], ...] || {states: K, fr: {to: pr, ... } , ... \"fr,...\": \"to,...\" }' "	,
		type_Wiener: "int(11) default 0 comment 'Wiener process with specified diffusion walks' ",
		type_Bayes: "json comment 'Bayes process with specified equilibrium probs [pr, ... ]' ",
		type_Gauss: "json comment 'Gauss proccess with specified {ints: coherence intervals, mean: mean count, maxints: max ints, lim: mineig, model: sinc||rect, }' ",
		type_Gillespie: "int(11) comment 'Gillespie process with specified number of states' ",
		
		Nyquist: "float default 1 comment 'process over-sampling factor' ",
		Steps: "int(11) default 0 comment 'number of process steps' ",
		Batch: "int(11) default 0 comment 'steps to next supervised learning' ",
		Save_end: "json",
		Save_batch: "json",
		Save_config: "json",
		Description: "mediumtext"
	},
	
	engine: function genpr(ctx,res) {
	/* 
	Return random [ {x,y,...}, ...] process for given ctx parameters.
	*/

		function randint(a) {
			return floor((rand() - 0.5)*2*a);
		}

		function scalevec(x,a) {
			for (var n=0;n<3; n++) x[n] *= a[n];
			return x;
		}

		function offsetvec(x,y) {
			for (var n=0; n<3; n++) x[n] += y[n];
			return x;
		}

		function KL( solve, cb ) { // Karhouen-Loeve expansion with callback cb(pcs) || cb(null)
			
			function getpcs(model, Emin, M, Mwin, Mmax, cb) {  // callback cb(pcs) || cb(null)

				function genpcs(dim, steps, model, cb) {  // callback callback cb(pcs = {values,vectors,ref})
					Log("gen pcs", {Mmax: dim, Msteps: steps, model: model}); 
					
					function evd( models, dim, step, cb) {   // eigen value decomp with callback cb(pcs)
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

								Log(">>>>>evd script", M, dim, step);
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

					evd( [model], Mmax, Mwin*2, function (pcs) {

						var 
							vals = pcs.values,
							vecs = pcs.vectors,
							dim = vals.length, 
							ref = pcs.ref = ME.max(vals);

						Log("evd vals=", vals.length );
						cb( pcs );  // forward and save the pcs
						
						SQL.beginBulk();

						vals.forEach( (val, idx) => {
							var
								save = {
									correlation_model: solve.model,
									coherence_intervals: solve.M,
									eigen_value: val / ref,
									eigen_index: idx,
									ref_value: ref,
									max_intervals: dim,
									eigen_vector: JSON.stringify( vecs[idx] )
								};

							//Log(save);
							
							SQL.query("INSERT INTO app.pcs SET ? ON DUPLICATE KEY UPDATE ?", [save,save] );
						});
						
						SQL.endBulk();
						Log("evd saved pcs");
						SQL.release();
					});
				}

				function findpcs( cb ) {		// callback cb(pcs = {values,vectors,ref})
					var M0 = Math.min( M, Mmax-Mwin*2 );

					var q = SQL.query(
						"SELECT * FROM app.pcs WHERE coherence_intervals BETWEEN ? AND ? AND eigen_value / ref_value > ? AND least(?,1) ORDER BY eigen_index", 
						[M0-Mwin, M0+Mwin, Emin, {
							max_intervals: Mmax, 
							correlation_model: model
						}],
						function (err, pcs) {

							if ( err ) 
								Log( TRACE, err );

							else {
								var vals = [], vecs = [];

								pcs.forEach( (pc) => {
									vals.push( pc.eigen_value );
									vecs.push( JSON.parse( pc.eigen_vector ) );
								});

								cb({
									values: vals,
									vectors: vecs,
									ref: pcs.length ? pcs[0].ref_value : 0
								});
								
								SQL.release();
							}
					});

					Log(q.sql);
				}

				findpcs( function (pcs) {
					Log(">>>>found pcs");
					if ( pcs.values.length )   // found pcs so send them on
						cb( pcs );
					
					else  // try to generate pcs
						genpcs( Mmax, Mwin*2, model, (pcs) => {
							Log(">>>>gened pcs", pcs.values.length);
							if ( pcs.values.length )
								cb( pcs );
							
							else
								cb( null );
						});
						/*
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
								
						});*/
				});
			}
	
			// Should add a ctx.Shortcut parms to bypass pcs and use an erfc model for eigenvalues.

			//Log(solve);
			if ( solve.model )
				getpcs( solve.model, solve.min, solve.M, solve.Mstep/2, solve.Mmax, (pcs) => {
					pcs.mean = solve.mean;
					cb(pcs);
				});
			
			else
				cb( null );
				
				/*
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
								//mean_count: ctx.Wbar.evd,
								//mean_intensity: ctx.evRate.evd,
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
*/
		}
		
		function genProc(ctx, opts, res) {
			Log("gen proc");
			var ran = new RAN(opts);  // create a random process compute thread

			ran.pipe( function (evs) {  // sync the process events to this callback
				ctx.Save = evs;
				Log("respond");
				res( ctx );
			});   // run process and capture results
		}
		
		/*
		const {exp,log,sqrt,floor,rand} = Math;
		var 
			//exp = Math.exp, log = Math.log, sqrt = Math.sqrt, floor = Math.floor, rand = Math.random;
			mvd = [], 	// multivariate distribution parms
			mix = ctx.emProbs || {},
			mixing = ctx.emProbs ? true : false,

			walking = ctx.Wiener ? true : false, // random walking		
			mode = mixing ? parseFloat(mix.theta) ? "oo" : mix.theta || "gm" : "na",  // Process mode

			mu0 = mix.mu,	// mean 
			sigma0 = mix.sigma,  // covariance
			theta0 = mix.theta,  	// oo time lag
			x0 = mix.x0, 		// oo initial pos
			ooW = [], // wiener/oo process look ahead

			a = {  // process fixed parms
				wi: 0,
				gm: 0,
				br: sigma0 * sigma0 / 2,
				oo: sigma0 / sqrt(2*theta0)
			},  		// sampler constants
			samplers = {  // customize the random walk
				na: function (u) {  // ignore
					return u;
				},

				wi: function (u) {  // wiener (need to vectorize)
					var 
						t = ran.s, 
						Wt = ran.W[0];

					return mu0 + sigma0 * Wt;
				},

				oo: function (u) {  // ornstein-uhlenbeck (need to vectorize)
					var 
						t = ran.s, 
						Et = exp(-theta0*t),
						Et2 = exp(2*theta0*t),
						Wt = ooW[floor(Et2 - 1)] || 0;

					ooW.push( WQ[0] );

					return x0 
							? x0 * Et + mu*(1-Et) + a.oo * Et * Wt 
							: mu + a.oo * Et * Wt;
				},

				br: function (u) { // geometric brownian (need to vectorize)
					var 
						t = ran.s, 
						Wt = ran.WQ[0];

					return exp( (mu0-a.br)*t + sigma0*Wt );
				},

				gm: function (u) {  // mixed gaussian (vectorized)
					return mvd[u].sample();
				}
			},  // samplers
			labels = ["x","y","z"], // vector sample labels
			sampler = samplers[mode], // sampler
			*/

		var opts = { // supervisor config 
			N: ctx.Members,  // ensemble size
			symbols: ctx.Symbols,  // state symbols
			
			wiener: ctx.type_Wiener, // walks
			markov: ctx.type_Markov, // trans probs
			gauss: ctx.type_Gauss, // [mean count, coherence intervals]
			bayes: ctx.type_Bayes, // equlib probs
			
			dt: 1/ctx.Nyquist, // oversampling factor
			steps: ctx.Steps, // process steps
			emP: ctx.emProbs,  	// mixing/emission/observation parms
			batch: ctx.Batch || 0,   // supervised learning every batch steps
			filter: function (str, ev) {  // filter output events
				switch ( ev.at ) {
					case "jump":
						var 
							ys = ev.obs || [];

						str.push({
							at: ev.at,  // step name
							t: ev.t, // time sampled
							u: ev.state,   // state occupied
							n: ev.index, 	// unique identifier
							x: ys[0],  	// lat
							y: ys[1],  	// lon
							z: ys[2] 	// alt
						});
						break;

					case "_step":
						if (walking) {
							var ev = { 
								at: ev.at,
								t: ran.t,
								u: 0,
								k: 0,
								n: 0
							};

							ran.WU.each(function (id, state) {
								ev[ labels[id] || ("w"+id) ] = state;
							});

							str.push(ev);
							//Log(ev);
						}

						else
							ran.U.each( function (index, state) {
								var ys = ran.Y[index];
								str.push({ 
									at: ev.at,  // step name
									t: ran.t, // time sampled
									u: state,   // state occupied
									n: index, 	// unique identifier
									x: ys[0],  	// lat
									y: ys[1],  	// lon
									z: ys[2] 	// alt
								});
							});

						break;

					case "_end":
						Log(ev);
						
					case "batch":
					case "config":
					case "end":
						str.push(ev);
						break;

					default:
						//str.push(ev);
				}			
			}  // event saver 
		};

		Log(">>>>>>genpr");
		
		if (gparms = opts.gauss) {
			
			var 
				T = ctx.Steps,
				dt = 1/ctx.Nyquist;
			
			if (gparms.model && gparms.ints)
				KL({  // parms for Karhunen Loeve solver
					trace: false,   // eigen debug
					T: T,  // observation interval  [1/Hz]
					M: gparms.ints , // coherence intervals
					mean: gparms.mean * dt / T, // mean events over sample time
					Mstep: 1,  // coherence step size when pcs are generated
					Mmax: gparms.maxints || 150,  // max coherence intervals when pcs are generated
					model: gparms.model || "sinc",  // assumed correlation model for underlying CCGP
					min: gparms.lim || 0	// min eigen value to use
				}, (pcs) => {

					if (pcs) {  // use eigen expansion to gen gauss states/deviates						
						opts.gauss = pcs;
						
						genProc(ctx, opts, res);
					}

					else 
						res( null );
				});
			
			else { // use negbin to gen bayes states
				Log("mh/mcmc tbd");
				opts.bayes = gparms.ints ? [] : []; // negbin || poisson
				genProc(ctx, opts, res);
			}
			
		}
		
		else
			genProc(ctx, opts, res);
		
	}

}
