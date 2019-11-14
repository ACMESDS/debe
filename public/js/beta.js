module.exports = {  
	xkeys: {		// plugin context ctx keys are defined here
		alpha: "float default 0 comment 'alpha parameter' ",
		beta: "float default 0 comment 'beta parameter' ",
		snr: "float default 0 comment 's/n value' ",
		gain: "float default 0 comment 'coding gain value' ",
		density: "float default 0 comment 'lattice density valkue' ",
		N: "int(11) default 10 comment 'number samples' ",
		
		Save: "json", 		
		Pipe: "json",		// ctx.Pipe contains path to plugin data source		
		Description: "mediumtext"	// ctx.Description documents usecase 		
	},
	
	engine: function beta(ctx, res) {  // Engine code.  If the engine 
	/*
	Generate beta function with specified alpha,beta ctx parameters.
	*/

		var vmctx = $( "x = 0:1/N:1; y = beta(x,a,b);", {
			a: ctx.alpha,
			b: ctx.beta,
			N: ctx.N
		}, vmctx => {
			//console.log( vmctx );
			ctx.Save = { x: vmctx.x, y: vmctx.y };
			res(ctx);
		});	

	}
}