module.exports = {  // generate a random process with specified parameters
	_keys: {
		emProbs: "json comment 'gaussian mixing parameters { dims: [D1, D2 , ...] weights: [W1, W2 , ...] }' ",
		Symbols: "json comment '[S1, S2, ... ] state symbols or null to generate defaults' ",
		Members: "int(11) default 100 comment 'number in process ensemble' ",
		
		type_Markov: "json comment 'Markov process with KxK (K^2-K parameters) {TxPrs: [ [pr, ...], ...]} || {states: K, fr: {to: pr, ... } , ... \"fr,...\": \"to,...\" }' "	,
		type_Wiener: "json comment 'Wiener process with specified diffusion {walks}' ",
		type_Bayes: "json comment 'Bayes-Dirchlet process with specified equilibrium probs [pr, ... ]' ",
		type_Gauss: "json comment 'Gauss proccess with specified {mean,coints,dim,model,mineig}' ",
		type_Gillespie: "json comment 'Gillespie-Dobbs process with specified number of {states}' ",
		type_Ornstein: "json comment 'Ornstein-Ulenbeck process with specified {theta, a = sigma/sqrt(2 theta)}' ",
	
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
			Log( evs.length ? evs.length*evs[0].length : "no", " events generated");
			res( ctx );
		});

	}

}
