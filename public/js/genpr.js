module.exports = {  // generate a random process with specified parameters
	_keys: {
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
	Return random gaussian, markov, ornstein, bayes, gillespie, or weiner process [ {x,y,...}, ...] given ctx parameters:
	
			Members  // ensemble size
			Symbols  // state symbols
			type_Wiener // wiener process walks
			type_Markov // markov process transition probs
			type_Gauss  // gaussian process [mean count, coherence intervals]
			type_Bayes  // bayes process equlib probs
			type_Ornstein   // ornstein process theta with parameter a = sigma / sqrt(2*theta)
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

		$.gen( ctx, evs => {
			ctx.Save = evs;
			res( ctx );
		});

	}

}
