module.exports = {  // generate a Markov process given its transition probability parameters
	keys: {
		emProbs: "json comment 'gaussian mixing parameters { dims: [D1, D2 , ...] weights: [W1, W2 , ...] }' ",
		trProbs: "json comment 'KxK transition probs [ [pr, pr, ...], ...] or {fr: {to: pr, ... }, ... K: states} ' ",
		Symbols: "json comment '[S1, S2, ... ] state symbols or null to generate defaults' ",
		Members: "int(11) default 100 comment 'number in process ensemble' ",
		Wiener: "int(11) default 0 comment 'number of wiener processes; 0 disables' ",
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
	Return random [ {x,y,...}, ...] process for given ctx parameters.
	*/

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
		}

		var 
			exp = Math.exp, log = Math.log, sqrt = Math.sqrt, floor = Math.floor, rand = Math.random;

		var
			/*
			mvd = [], 	// multivariate distribution parms
			mix = ctx.emProbs || {},
			mixing = ctx.emProbs ? true : false,

			walking = ctx.Wiener ? true : false, // random walking		
			mode = mixing ? parseFloat(mix.theta) ? "oo" : mix.theta || "gm" : "na",  // Process mode

			mu0 = mix.mu,	// mean 
			sigma0 = mix.sigma,  // covariance
			theta0 = mix.theta,  	// oo time lag
			x0 = mix.x0, 		// oo initial pos
			ooW = [], // wiener/oo process look ahead

			a = {  // process fixed parms
				wi: 0,
				gm: 0,
				br: sigma0 * sigma0 / 2,
				oo: sigma0 / sqrt(2*theta0)
			},  		// sampler constants
			samplers = {  // customize the random walk
				na: function (u) {  // ignore
					return u;
				},

				wi: function (u) {  // wiener (need to vectorize)
					var 
						t = ran.s, 
						Wt = ran.W[0];

					return mu0 + sigma0 * Wt;
				},

				oo: function (u) {  // ornstein-uhlenbeck (need to vectorize)
					var 
						t = ran.s, 
						Et = exp(-theta0*t),
						Et2 = exp(2*theta0*t),
						Wt = ooW[floor(Et2 - 1)] || 0;

					ooW.push( WQ[0] );

					return x0 
							? x0 * Et + mu*(1-Et) + a.oo * Et * Wt 
							: mu + a.oo * Et * Wt;
				},

				br: function (u) { // geometric brownian (need to vectorize)
					var 
						t = ran.s, 
						Wt = ran.WQ[0];

					return exp( (mu0-a.br)*t + sigma0*Wt );
				},

				gm: function (u) {  // mixed gaussian (vectorized)
					return mvd[u].sample();
				}
			},  // samplers
			labels = ["x","y","z"], // vector sample labels
			sampler = samplers[mode], // sampler
			*/
			states = ctx.trProbs.length;

		//Log(ctx);
		Log({emP:ctx.emProbs,trP:ctx.trProbs,steps:ctx.Steps, States:states}); 
			/*
			mix.each( function (k,mix) {  // scale mix mu,sigma to voxel dimensions
				//Log([k, floor(k / 20), k % 20, mix, dims]);

				offsetvec( scalevec( mix.mu, dims), [
					floor(k / 20) * dims[0] + Offsets[0],
					(k % 20) * dims[1] + Offsets[1],
					mix.mu[2] + Offsets[2]
				]);  
				//for (var i=0;i<mixdim; i++) scalevec( mix.sigma[i], dims );

				mvd.push( RAN.MVN( mix.mu, mix.sigma ) );
			});
			*/
		// [{"mu":[0,0,0],"sigma":[[0.9,0.4,0],[0.4,0.7,0],[0,0,0.1]]}, {"mu":[0.3,0.5,0], "sigma":[[0.8,0.2,0],[0.2,0.8,0],[0,0,0.1]]}]

		var Super = new RAN({ // generating supervisor
			N: ctx.Members,  // ensemble size
			wiener: ctx.Wiener,  // wiener process steps
			trP: ctx.trProbs, // state transition probs 
			symbols: ctx.Symbols,  // state symbols
			nyquist: ctx.Nyquist, // oversampling factor
			steps: ctx.Steps, // process steps
			emP: ctx.emProbs,  	// mixing/emission/observation parms
			batch: ctx.Batch || 0,   // supervised learning every batch steps
			//sigma = mix.sigma || [ [ scalevec([0.4, 0.3, 0],dims), scalevec([0.3, 0.8, 0],dims), scalevec([0, 0, 1],dims)] ],
			//solve: ctx.Solve, // learning parameters
			filter: function (str, ev) {  // filter output events
				switch ( ev.at ) {
					case "jump":
						var 
							ys = ev.obs || [];

						str.push({
							at: ev.at,  // step name
							t: ev.t, // time sampled
							state: ev.state,   // state occupied
							class: 0,							
							index: ev.index, 	// unique identifier
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
									state: 0,
									class: 0,
									index: 0
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
									class: 0,
									state: state,   // state occupied
									index: index, 	// unique identifier
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
		});  // create a randpr compute thread

		Super.pipe( function (evs) {  // sync pipe
			ctx.Save = evs;
			res( ctx );
		});   // run process and capture results
		
	}

}
