module.exports = {  // learn hidden trigger function of a Markov process
	usecase: {
		Symbols: "json",
		Steps: "int(11) default 0",
		Batch: "int(11) default 0",
		lma: "json",
		lfa: "json",
		bfs: "json",
		Use: "varchar(8) default 'lma'",
		
		Save_end: "json",
		Save_config: "json",	
		Save_batch: "json",
		Pipe: "json",
		Description: "mediumtext"
	},
	
	engine: function triggerFunction(ctx, res) {  
	/* 
	Estimate hidden trigger function for Markov process:
		Symbols = [sym, ...] state symbols or null to generate
		Batch = steps to next supervised learning
		Steps = override _File.Steps
		Use = "lma" || "lfs" || "bfs" alg results used retained for estimated intervals		
		lma = [init] initial estimate of coherence intervals for levenberg-marquardt alg
		lfs = [init] "" for linear factor alg (use at your own risk)
		bfs = [start,end,step] "" for brute force search
		_File.Actors = ensembe size
		_File.States = number of states consumed by process
		_File.Steps = number of time steps
		_Events = query to get events
	*/
		Log("trigs", ctx);
		res({
			nothing: "here",
			test: 123
		});

	}

}