module.exports = {  // generate a Markov process given its transition probability parameters
	keys: {
		emProbs: "json comment 'gaussian mixing parameters { dims: [D1, D2 , ...] weights: [W1, W2 , ...] }' ",
		Symbols: "json comment '[S1, S2, ... ] state symbols or null to generate defaults' ",
		Members: "int(11) default 100 comment 'number in process ensemble' ",
		
		type_Markov: "json comment 'Markov process with KxK (K^2-K parameters) transition probs [ [pr, ...], ...] || {states: K, fr: {to: pr, ... } , ... \"fr,...\": \"to,...\" }' "	,
		type_Wiener: "int(11) default 0 comment 'Wiener process with specified diffusion steps' ",
		type_Bayes: "json comment 'Bayes-Dirchlet process with specified equilibrium probs [pr, ... ]' ",
		type_Gauss: "json comment 'Gauss proccess with specified {coints, mean, dim, mineig, model} parameters' ",
		type_Gillespie: "int(11) comment 'Gillespie-Dobbs process with specified number of states' ",
		type_Ornstein: "int(11) comment 'Ornstein-Ulenbeck process with specified theta, a = sigma/sqrt(2 theta) parameters' ",
		
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
			
			function getpcs(model, coints, dim, cb) {  // callback cb(pcs) || cb(null)

				function genpcs(coints, model, dim, cb) {  // callback callback cb(pcs = {values,vectors,ref})
					function evd( models, coints, dim, cb) {   // eigen value decomp with callback cb(pcs)
						models.forEach( function (model) {	// enumerate over all models
							coints.forEach( (coints) => {	// enumerate over all coherence intervals
								var 
									ctx = {
										N: dim,
										M: coints,
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

									if (solve.trace)  { // debugging
										ME.exec(`
disp({
M: M,
ccfsym: sum(Xccf-Xccf'),
det: [det(Xccf), prod(R.values)],
trace: [trace(Xccf), sum(R.values)]
})`, ctx);
									}
									
/*
basis: R.vectors' * R.vectors,
vecres: R.vectors*diag(R.values) - Xccf*R.vectors,
*/
									cb({
										model: model,
										intervals: coints,
										values: ctx.R.values._data,
										vectors: ctx.R.vectors._data
									});
								});
							});
						});
					}

					evd( [model], [coints], dim, function (pcs) {

						var 
							vals = pcs.values,
							vecs = pcs.vectors,
							ref = ME.max(vals);

						pcs.ref = ref;
						pcs.dim = dim;
						
						Log(">>>evded pcs", vals.length );
						
						SQL.beginBulk();

						vals.forEach( (val, idx) => {  // save pcs
							var
								save = {
									correlation_model: model,
									coherence_intervals: coints,
									eigen_value: val,	// val/ref
									eigen_index: idx,
									ref_value: ref,
									max_intervals: dim,
									eigen_vector: JSON.stringify( vecs[idx] )
								};

							//Log(save);
							
							SQL.query("INSERT INTO app.pcs SET ? ON DUPLICATE KEY UPDATE ?", [save,save] );
						});
						
						SQL.endBulk();
						Log(">>>>saved pcs");

						cb( pcs );  // forward the saved pcs
					});
				}

				function findpcs( coints, model, lims, cb ) {		// callback cb(pcs = {values,vectors,ref})
					var q = SQL.query(
						"SELECT *, abs(? - coherence_intervals)  AS coeps FROM app.pcs WHERE coherence_intervals BETWEEN ? AND ? AND eigen_value / ref_value > ? AND least(?,1) ORDER BY coeps desc,eigen_value", 
						[ coints, coints*(1-lims.coints), coints*(1+lims.coints), lims.mineig, {
							max_intervals: lims.dim, 
							correlation_model: model
						}],
						(err, pcs) => {

							if ( err ) 
								Log( err );

							else {
								var vals = [], vecs = [], dim = lims.dim, ref = pcs.length ? pcs[0].ref_value : 0;

								pcs.forEach( (pc) => {
									if ( vals.length < dim ) {
										vals.push( pc.eigen_value );
										vecs.push( JSON.parse( pc.eigen_vector ) );
									}
								});

								cb({
									values: vals,
									vectors: vecs,
									dim: dim,
									ref: ref
								});
							}
					});

					Log(q.sql);
				}

				findpcs( solve.coints, solve.model, { 
					coints: 0.1,
					mineig: solve.mineig,
					dim: solve.dim
				}, (pcs) => {
					Log(">>>>found pcs");
					if ( pcs.values.length )   // found pcs so send them on
						cb( pcs );
					
					else  // try to generate pcs
						genpcs( coints, model, dim, (pcs) => {  
							Log(">>>>gened pcs", pcs.values.length);
							if ( pcs.values.length )
								findpcs( solve.coints, solve.model, { // must now find pcs per limits
									coints: 0.1,
									mineig: solve.mineig,
									dim: solve.dim
								}, (pcs) => {
									if ( pcs.values.length) 
										cb( pcs );
									
									else
										cb(null);
								});
							
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

			if ( solve.model )
				getpcs( solve.model, solve.coints, solve.dim, (pcs) => {
					pcs.mean = solve.mean;
					cb(pcs);
				});
			
			else
				cb( null );
		}
		
		function genProc(ctx, opts, res) {
			var ran = new RAN(opts);  // create a random process compute thread

			ran.pipe( function (evs) {  // sync the process events to this callback
				ctx.Save = evs;
				res( ctx );
			});   // run process and capture results
		}
		
		var opts = { // supervisor config 
			N: ctx.Members,  // ensemble size
			symbols: ctx.Symbols,  // state symbols
			
			wiener: ctx.type_Wiener, // walks
			markov: ctx.type_Markov, // trans probs
			gauss: ctx.type_Gauss, // [mean count, coherence intervals]
			bayes: ctx.type_Bayes, // equlib probs
			ornstein: ctx.type_Ornstein,   // theta,  a = sigma / sqrt(2*theta)
			
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

		if (gparms = opts.gauss) {	// generate gaussian process using exact pcs or approx negbin
			var 
				N = ctx.Steps, 
				T = N,
				dt = 1/ctx.Nyquist;
			
			if (gparms.model && gparms.coints)	// exact using pcs
				KL({  // parms for Karhunen Loeve solver
					trace: false,   // eigen debug
					T: T,  // observation interval  [1/Hz]
					coints: gparms.coints , // coherence intervals
					mean: gparms.mean * dt / T, // mean events over sample time
					dim: gparms.dim || N,  // max coherence intervals when pcs are generated
					model: gparms.model || "sinc",  // assumed correlation model for underlying CCGP
					mineig: gparms.mineig || 0.1	// min eigen/ref level (typically >= 0.05 to use stable eigenvectors)
				}, (pcs) => {

					if (pcs) {  // use eigen expansion to generate counts
						opts.gauss = pcs;
						
						genProc(ctx, opts, res);
					}

					else 
						res( null );
				});
			
			else { // approx via a K-state MCMC/MH with negbin equlib probs specified by mean and coints
				Log("mh/mcmc tbd");
				opts.bayes = gparms.coints ? [] : []; // negbin || poisson
				genProc(ctx, opts, res);
			}	
		}
		
		else
			genProc(ctx, opts, res);
		
	}

}
