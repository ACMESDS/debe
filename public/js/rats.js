module.exports = {  // learn hidden intensity parameters of a Markov process
	keys: {
		//Symbols: "json comment '[sym, sym, ...] state symbols or null to generate' ",
		//Steps: "int(11) default 0 comment 'steps to next supervised learning' ",
		//Batch: "int(11) default 0 comment 'override File.Steps' ",
		MinEigen: "float default 1e-1 comment 'smallest eigenvalue for pc estimates > 0' ",
		Dim: "int(11) default 150 comment 'pc model dimension (max coherence intervals) > 0' ",
		Model: "varchar(16) default 'sinc' comment 'complex correlation model for pc estimates [sinc || rect || tri || ...]' ",
		Shortcut: "boolean default 0 comment 'bypass pc with erfc model' ",

		Save_end: "json",
		Save_config: "json",
		Save_batch: "json",
		Pipe: "json",
		Description: "mediumtext",
		Autorun: "boolean default 0"
	},
	
	engine: function rats(ctx,res) {  
	/* 
	Return MLEs for random event process [ {x,y,...}, ...] given ctx parameters:

		Dim || 150  // max coherence intervals when pc created
		Model || "sinc"  // assumed correlation model for underlying CCGP
		MinEigen || 0	// min eigen value to use

	ctx.Flow parameters:
		
		T = observation interval [1/Hz]
		
	and ctx.Stats parameters:
		
		coherence_intervals = number of coherence intervals 
		mean_intensity = mean event arrival rate [Hz]
	*/
		var
			stats = ctx.Stats,
			flow = ctx.Flow;
		
		Log("rates ctx stats,T,N,meanI", stats, flow.T, flow.N, stats.mean_intensity);
		
		if (stats)
			$.arrivalRates({  // parms for Karhunen Loeve (intensity profile) solver
				trace: false,   // eigen debug
				T: flow.T,  // observation interval  [1/Hz]
				M: stats.coherence_intervals, // coherence intervals
				lambdaBar: stats.mean_intensity, // event arrival rate [Hz]
				Mstep: 1,  // coherence step size when pc created
				Mmax: ctx.Dim || 150,  // max coherence intervals when pc created
				model: ctx.Model || "sinc",  // assumed correlation model for underlying CCGP
				min: ctx.MinEigen || 0	// min eigen value to use
			}, stats => {
				ctx.Save = stats;
				Log("save", stats);
				res(ctx);
			});
		
		else
			res(null);
		
	}

}