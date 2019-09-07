/*
Clone this template to PLUGIN.js where PLUGIN is the name of your DEBE plugin.  When DEBE is started (or when /PLUGIN.pub is requested), 
DEBE will run this PLUGIN.js to publish your PLUGIN, thus providing [/PLUGIN.run, /PLUGIN.view, /PLUGIN.exe, etc](/api.view) endpoints.

Your PLUGIN specific keys, code and documentation is defined here.  See the [DEBE api](/api.view) for futher information on plugins.
*/

module.exports = {  
	keys: {		// plugin context ctx keys are defined here
		// Example plugin keys and how they are documented
		EX1: "int(11) default 150 comment 'pc model dimension [max coherence intervals]' ",			// ctx.EX1
		EX2: "varchar(16) default 'sinc' comment 'name of complex correlation model for pc estimates' ",	// ctx.EX2
		
		// Plugins typically define 0 or more save-keys that it uses to return information back to the plugin context
		Save_X: "json",		// ctx.Save.X aggregated and saved to ctx.Save_X
		Save_Y: "json",		// ctx.Save.Y aggregated and saved to ctx.Save_Y
		Save_Z: "json",		// ctx.Save.Z aggregated and saved to ctx.Save_Z
		
		// Plugins typically define the following keys, tho they are optional	
		Pipe: "json",		// ctx.Pipe contains path to plugin data source		
		Description: "mediumtext",	// ctx.Description documents usecase 
		Autorun: "boolean default 0"	// ctx.Autorun toggles autorun-on-ingest
		
		// The followin dynamic keys are added to the context when the plugin is executed:
		// Host name of plugin  
		// File context during a piped workflow  
		// Voxel context during a piped workflow  
		// Sensor context during a piped workflow
		// Chip  filepath for first jpeg collect for current voxel  
		// Flux solar flux at earth's surface for current voxel  
		// Events found in current voxel  
		// Flow context of workflow supervisor  
		// Stats context shared with all plugins		
	},
	
	engine: function logreg(ctx, res) {  // Engine code.  If the engine 
	/* 
	Estimate hidden trigger function for Markov process given context ctx parameters:
	
		Dim 	// samples in profile = max coherence intervals
		Model  	// name correlation model
	
	ctx.Flow parameters:
	
		T = observation time
	
	ctx.File parameters:
	
		Stats_Gain = assumed detector gain = area under trigger function
	
	and ctx.Stats parameters:
	
		coherence_time = coherence time underlying the process
		mean_intensity = ref mean arrivale rate (for debugging)
	*/
		const { sqrt, floor, random, cos, sin, abs, PI, log, exp} = Math;
		
		function LOGIC( solve, cb) {  // use solve parameters then callback cb( computed stats )
		}
		
		var	
			// plugin context keys
			EX1 = ctx.EX1, 		// example
			EX2 = ctx.EX2, 		// example
			
			// dynamic keys added when plugin is executed
			stats = ctx.Stats,		// stats information shared with all plugins
			file = ctx.File,	// info about current file in the workflow
			flow = ctx.Flow;	// workflow information
		
		ctx.Events.$( "all", function (evs) {  // fetch all || group events
			if (evs)	// there are events to process
				LOGIC({  // example solver parameters
					evs: evs,		// events
					refLambda: stats.mean_intensity, // ref mean arrival rate (for debugging)
					alpha: file.Stats_Gain, // assumed detector gain
					N: ctx.Dim, 		// samples in profile = max coherence intervals
					model: ctx.Model,  	// name correlation model
					Tc: stats.coherence_time,  // coherence time of arrival process
					T: flow.T  		// observation time
				}, function (stats) {	// provide callback to save returns stats
					ctx.Save = stats;		// ctx.Save[KEY] keys are aggregated and saved to ctx.Save_KEY
					res(ctx);
				});
			
			else { // end of event stream
			}
		});
	}

}