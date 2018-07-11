module.exports = {  // learn transition and emission probs of a Markov process
	keys: {
		Batch: "int(11) default 0 comment 'override _File.Steps' ",
		Save_end: "json",
		Save_config: "json",	
		Pipe: "json",
		Description: "mediumtext",
		Autorun: "boolean default 0"
	},
	
	engine: function routes(ctx, res) {  
	/* 
	Save supervisor's MLEs for transition and smission probs.
	*/
		var
			stats = ctx.Stats,
			file = ctx.File,
			voxel = ctx.Voxel,
			flow = ctx.Flow;

		Log("routes", voxel.ID, ctx.Stats);
		ctx.Save = ctx.Stats;
		res(ctx);
	}

}