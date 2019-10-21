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
		
		type_Markov: `json comment '
K-state process with specified transition probabilities:

	TxPrs: [ [...], ....] the K^2 (K^2-K independent) transition probs 

or:

	states: K
	TxPrs: { from: {to: pr, ... } , ... "from, ..." : "to, ..." }

where from-to transition probabilities must satisfy $$ \\sum_k TxPrs_{n,k} = 1 $$.
' `,
		type_Wiener: `json comment '
Stateless process with moving 2nd moment (but stationary in 1st increments) where:

	walks: number of walks at each time step (0 disables)

' `,
		
		type_Bayes: `json comment '
K-state process governed by a prescribed conditional independency network:

	eqP: [pr, ...] the K equilibrium probabilities 
	net: [ {var: probs, ...}, ... ] the conditional dependencies 

or expressed as a DAG:

	dag: { ... }

' `,
		
		type_Gauss: `json comment '
Correlated, stateless random process whose parameters:

	values: [ ... ] pc eigen values  [unitless]
	vectors: [ [... ], ...] pc eigen values	[sqrt Hz]
	ref: reference eigenvalue 
	dim: max pc dimension ( number of correlation intervals M )
	mean: mean count in observation interval T

are typically derived for a process with prescribed number of correlation intervals $$ M = T / T_c $$ or 
$$ SNR = \\sqrt{ M / ( 1 + deltaC / M) } $$.
' `,
		
		type_Gillespie: `json comment '
Inhomogenious K-state process with:

	states: number of states K

where its $$ K^2 $$ transition probabilities are synthesized using the gillespie model.
'`, 
		
	type_Ornstein: `json comment '
Stateless Ornstein-Ulenbeck process with:

	theta: value
	a: value

where $$ a = \\frac {\\sigma } { \\sqrt {2 \\theta} } $$.
' `,

		Save_end: "json",
		Save_batch: "json",
		Save_config: "json",
		Description: "mediumtext"
	},
	
	engine: function genpr(ctx,res) {
	/* 
	Return random gaussian, markov, ornstein, bayes, gillespie, or weiner process [ {x,y,...}, ...] given ctx parameters:
	
			Members  // ensemble size
			Symbols  // state symbols
			type_Wiener // wiener process walks
			type_Markov // markov process transition probs
			type_Gauss  // gaussian process [mean count, coherence intervals]
			type_Bayes  // bayes process equlib probs
			type_Ornstein   // ornstein process theta with parameter a = sigma / sqrt(2*theta)
			type_Mix // gaussian mixxing with parmeters {mu[0:N-1], sigma[0:N-1]}
			Nyquist // oversampling factor
			Steps // process steps
			emProbs 	// mixing/emission/observation parms
			Batch    // supervised learning every batch steps (0 disables)
	*/

		/*
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
		}  */

		//Log("genpr", ctx);
		
		var opts = { // supervisor config 
			N: ctx.Members,  // ensemble size
			symbols: ctx.Symbols,  // state symbols
			
			wiener: ctx.type_Wiener, // {walks}
			markov: ctx.type_Markov, // trans probs
			gauss: ctx.type_Gauss, // {mean, coints,dim,model,mineig}
			bayes: ctx.type_Bayes, // equlib probs
			ornstein: ctx.type_Ornstein,   // {theta,  a = sigma / sqrt(2*theta)}
			
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
		
		$.gen( opts, evs => {
			ctx.Save = evs;
			Log( evs.length ? evs.length: "no", "events generated");
			res( ctx );
		});

	}

}
