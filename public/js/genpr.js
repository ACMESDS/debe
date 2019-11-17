
module.exports = {  // generate a random process with specified parameters
	modkeys: {
		emProbs: `json comment '
Gaussian mixing parameters:

	{ dims: [N1, N2 , ...] weights: [X1, X2 , ...] }	||
	{ mu: [ vector, ...], sigma: [ cov matrix, ...] }	||
	{ mixes: N, oncov: [ X1, ... ], offcov: [ X1, ... ], snr: X, dim: N, cone: DEG }

' `,
		Symbols: "json comment '[S1, S2, ... ] state symbols (null defaults 0,+/-1, +/-2, ...)' ",
		Members: "int(11) default 100 comment 'size of process ensemble' ",
		Nyquist: "float default 1 comment 'process step over-sampling factor' ",
		Steps: "int(11) default 0 comment 'number of process steps' ",
		Batch: "int(11) default 0 comment 'supervisor batching size in steps (0 disables)' ",
		
		Pipe: `json comment 'Use the pipe to generate enumerated datasets ' `,
		
		Type: `json comment '
markov: [ [...], ....] 		# given the K^2 (K^2-K independent) transition probs 

markov: {	# condensed
	states: K	# number of states
	TxPrs: { from: {to: pr, ... } , ... "from, ..." : "to, ..." }		#  such that $$ \\sum_k TxPrs_{n,k} = 1 $$.
}

wiener: N 	# number of walks at each time step (0 disables)

bayes: {	# network conditional independencies
	eqP: [pr, ...] the K equilibrium probabilities 
	net: [ {var: probs, ...}, ... ] the conditional dependencies 
}

bayes: {	# expressed as a DAG:
	dag: { ... }
}

gauss: { 	# Correlated, stateless random process whose parameters:
	values: [ ... ] pc eigen values  [unitless]
	vectors: [ [... ], ...] pc eigen values	[sqrt Hz]
	ref: reference eigenvalue 
	dim: max pc dimension = number of correlation intervals $$ M = T / T_c $$ with $$ SNR = \\sqrt{ M / ( 1 + deltaC / M) } $$
	mean: mean count in observation interval T.  
}

gillespie: {	# Inhomogenious K-state process where its $$ K^2 $$ transition probabilities are synthesized using the gillespie model given
	states: number of states K
}

ornstein: {		# Stateless Ornstein-Ulenbeck process with:
	theta: value
	a: value where $$ a = \\frac {\\sigma } { \\sqrt {2 \\theta} } $$.
}
' `,

		Save_end: "json",
		Save_batch: "json",
		Save_config: "json",
		Description: "mediumtext"
	},
	
	engine: function genpr(ctx,res) {
	/* 
	Generate gaussian || markov || ornstein || bayes || gillespie || weiner || logistic process [ {x,y,...}, ...] given ctx parameters:
	
			Members  // ensemble size
			Symbols  // state symbols
			Type	 // wiener, markov, gauss, bayes, ornstein, mixing, beta parameters (see RANDPR)
			Nyquist // oversampling factor
			Steps // process steps
			Batch    // supervised learning every batch steps (0 disables)
	*/

		function gen(opts, res) {	// generate gauss, wiener, markov, bayesian, ornstein process

			function genLogistic(N, beta0, beta1, seed) {
				var 
					gen = GEN.create(),
					u = seed ? gen.seed( seed ) : 0,
					rand = gen.random,
					X = $( N, (n,x) => x[n] = [2*rand()-1, 2*rand()-1] ),
					Y = $( N, (n,y) => {
						var
							x = X[n],
							p = 1.0/(1.0+ exp( -(beta0 + beta1[0]*x[0] + beta1[1]*x[1]) ));

						y[n] = (random()>=p) ? 1 : 0;
						//Log(n,p,y[n], beta0, beta1, x,  beta0 + beta1[0]*x[0] + beta1[1]*x[1] );
					});

				return {x: $.matrix(X), y: $.matrix(Y)};			
			}

			function KL( solve, cb ) { // Karhouen-Loeve expansion with callback cb(pcs) || cb(null)

				function getpcs(model, coints, dim, cb) {  // get pcs with callback cb(pcs) || cb(null)

					$.sqlThread( sql => {
						function genpcs( coints, model, dim, cb) {  // make pcs with callback cb(pcs = {values,vectors,ref})
							function evd( models, coints, dim, cb) {   // eigen value decomp with callback cb(pcs)
								models.forEach( function (model) {	// enumerate over all models
									coints.forEach( (coints) => {	// enumerate over all coherence intervals
										$( `
		t = rng(-T, T, 2*N-1);
		Tc = T/M;
		xccf = ${model}( t/Tc );
		Xccf = xmatrix( xccf ); 
		R = evd(Xccf); `,   
										{
											N: dim,
											M: coints,
											T: 50
										}, ctx => {

											if (solve.trace)  { // debugging
												$(`
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
											cb({  // return computed stats
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
									ref = $.max(vals);

								pcs.ref = ref;
								pcs.dim = dim;

								Log(">>>evded pcs", vals.length );

								sql.beginBulk();

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

									sql.query("INSERT INTO app.pcs SET ? ON DUPLICATE KEY UPDATE ?", [save,save] );
								});

								sql.endBulk();
								Log(">>>>saved pcs");

								cb( pcs );  // forward the saved pcs
							});
						}

						function findpcs( coints, model, lims, cb ) { // get pcs with callback cb(pcs = {values,vectors,ref})
							sql.query(
								"SELECT *, abs(? - coherence_intervals)  AS coeps FROM app.pcs WHERE coherence_intervals BETWEEN ? AND ? AND eigen_value / ref_value > ? AND least(?,1) ORDER BY coeps desc,eigen_value", 
								[ coints, coints*(1-lims.coints), coints*(1+lims.coints), lims.mineig, {
									max_intervals: lims.dim, 
									correlation_model: model
								}], (err, pcs) => {
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
						}

						findpcs( solve.coints, solve.model, { 
							coints: 0.1,
							mineig: solve.mineig,
							dim: solve.dim
						}, pcs => {
							Log(">>>>found pcs");
							if ( pcs.values.length )   // found pcs so send them on
								cb( pcs );

							else  // try to generate pcs
								genpcs( sql, coints, model, dim, pcs => {  
									Log(">>>>gened pcs", pcs.values.length);
									if ( pcs.values.length )
										findpcs( solve.coints, solve.model, { // must now find pcs per limits
											coints: 0.1,
											mineig: solve.mineig,
											dim: solve.dim
										}, pcs => {
											if ( pcs.values.length) 
												cb( pcs );

											else
												cb(null);
										});

									else
										cb( null );
								});
						});
					});
				}

				// Should add a ctx.Shortcut parms to bypass pcs and use an erfc model for eigenvalues.

				if ( solve.model )
					getpcs( solve.model, solve.coints, solve.dim, pcs => {
						pcs.mean = solve.mean;
						cb(pcs);
					});

				else
					cb( null );
			}

			function genProcess(opts, cb) {  // generate gaussian process
				//Log("new ran", opts);
				var ran = new $.RAN(opts);  // create a random process compute thread

				ran.pipe( evs => cb(evs) );   // run process and capture results
			}

			if (gauss = opts.gauss) {	// generate correlated gaussian process using exact pcs or approx negbin
				var 
					N = T = opts.steps, 
					dt = 1/opts.nyquist;

				if (gauss.model && gauss.coints)	// exact using pcs with specified coherence intervals
					KL({  // parms for Karhunen Loeve solver
						trace: false,   // eigen debug
						T: T,  // observation interval  [1/Hz]
						coints: gauss.coints , // coherence intervals
						mean: gauss.mean * dt / T, // mean events over sample time
						dim: gauss.dim || N,  // max coherence intervals when pcs are generated
						model: gauss.model || "sinc",  // assumed correlation model for underlying CCGP
						mineig: gauss.mineig || 0.1	// min eigen/ref level (typically >= 0.05 to use stable eigenvectors)
					}, pcs => {

						if (pcs) {  // use eigen expansion to generate counts
							opts.gauss = {
								values: pcs.values,   // pc eigen values  [unitless]
								vectors: pcs.vectors, // pc eigen values	[sqrt Hz]
								ref: pcs.ref,	// ref eigenvalue
								dim: pcs.dim,	// max pc dim = obs interval
								mean: gauss.mean  // mean count
							};

							Log("gauss pr", opts.gauss);
							genProcess(opts, res);
						}

						else 
							res( null );
					});

				else { // approx via a K-state MCMC/MH with negbin equlib probs specified by mean and coints
					Log("mh/mcmc tbd");
					opts.bayes = gparms.coints ? [] : []; // negbin || poisson
					genProcess(opts, res);
				}	
			}

			else	// generate logistic process with known beta parameters
			if (beta = opts.beta) 
				res( genLogistic(opts.N, beta[0], beta[1], opts.seed) );

			else	// generate random gauss/markov/etc process
				genProcess(opts, res);

		}
	
		var 
			Type = ctx.Type || {},
			opts = { // supervisor config 
				N: ctx.Members || 10,  // ensemble size
				symbols: ctx.Symbols,  // state symbols

				wiener: Type.wiener, // {walks}
				markov: Type.markov, // trans probs
				gauss: Type.gauss, // {mean, coints,dim,model,mineig}
				bayes: Type.bayes, // equlib probs
				ornstein: Type.ornstein,   // {theta,  a = sigma / sqrt(2*theta)}
				mixing: Type.mixing, 	// gauss mixing mu,sigma || snr,cone,mixes,oncov,offcov
				beta: Type.beta, // logistic beta params

				dt: 1/(ctx.Nyquist||1), // oversampling factor
				steps: ctx.Steps || 5, // process steps
				//emP: ctx.emProbs,  	// mixing/emission/observation parms
				batch: ctx.Batch || 0,   // supervised learning every batch steps
				filter: (str,ev,ran) => {
					switch (ev.at) {
						case "step":
							if ( mixing = opts.mixing ) {	// save gaussian mixing process
								var mixes = mixing.gen.length;
								mixing.obs.forEach( (ob,n) => str.push({ x: ob, n: n % mixes }) );
							}
							break;

						case "jump":
						case "config":
							str.push( ev );
					}
				}
				/*
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
				}  */
			};
		
		gen( opts, evs => {
			ctx.Save = evs;
			Log( evs.length ? evs.length: "no", "events generated");
			res( ctx );
		});

	}

}
