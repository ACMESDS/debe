module.exports = {  
	xmodkeys: {		// plugin context ctx keys are defined here
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
	
	engine: function beta(ctx, res) {  // Return cummulative beta at N points given alpha,beta ctx parameters.

		const {alpha, beta, N } = ctx;
		
		$( "x = 1/N:1/N:1-1/N; y = cumbeta(x,a,b);", {
			a: alpha || 1,
			b: beta || 1,
			N: N || 10
		}, vmctx => {
			if ( vmctx ) {
				ctx.Save = { x: vmctx.x, y: vmctx.y };
				res(ctx);
			}
			
			else
				res( null );
		});	
	}
}