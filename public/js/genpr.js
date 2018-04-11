module.exports = {
	usecase: {
		Mix: "json",
		TxPrs: "json",
		Symbols: "json",
		Members: "int(11)",
		Wiener: "int(11)",
		Nyquist: "float",
		Steps: "int(11)",
		Solve: "json",
		Description: "mediumtext"
	},
	
	engine: function genpr(ctx,res) {
		/* 
		Return random [ {x,y,...}, ...] for ctx parameters:
			TxPrs = KxK transition probs [ [pr, ...], ... ] or {fr: {to: pr, ...}, ...} 
			K = number of states or [ dim, ... ]
			Mix = mixing params { mu: [...], sigma: [...] }
			Symbols = [sym, ...] state symbols or null to generate
			Members = number in process ensemble
			Wiener = number of wiener processes; 0 disables
			Nyquist = process over-sampling factor
			Steps = number of process steps	
			Solve = { ... } learning parameters
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
			mvd = [], 	// multivariate distribution parms

			mix = ctx.Mix || {},
			mixing = ctx.Mix ? true : false,

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
			states = ctx.TxPrs.length;

		LOG({mix:ctx.Mix,txprs:ctx.TxPrs,steps:ctx.Steps,solve:ctx.Solve, States:states}); 
			/*
			mix.each( function (k,mix) {  // scale mix mu,sigma to voxel dimensions
				//LOG([k, floor(k / 20), k % 20, mix, dims]);

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

		var ran = new RAN({ // configure the random process generator
			N: ctx.Members,  // ensemble size
			wiener: ctx.Wiener,  // wiener process steps
			trP: ctx.TxPrs, // state transition probs 
			symbols: ctx.Symbols,  // state symbols
			nyquist: ctx.Nyquist, // oversampling factor
			steps: ctx.Steps, // process steps
			obs: ctx.Mix,  	// mixing/emission/observation parms

			//sigma = mix.sigma || [ [ scalevec([0.4, 0.3, 0],dims), scalevec([0.3, 0.8, 0],dims), scalevec([0, 0, 1],dims)] ],

			solve: ctx.Solve, // learning parameters
			filter: function (str, ev) {  // append selected events to supplied store/stream
				switch ( ev.at ) {
					case "jump":
						var 
							idx = ev.idx,
							state = ran.U[idx],
							ys = ran.Y[idx];

						str.push({
							at: ev.at,  // step name
							t: ran.t, // time sampled
							u: state,   // state occupied
							n: idx, 	// unique identifier
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
									n: 0
								};

							ran.WU.each(function (id, state) {
								ev[ labels[id] || ("w"+id) ] = state;
							});

							str.push(ev);
							//LOG(ev);
						}

						else
							ran.U.each( function (idx, state) {
								var ys = ran.Y[idx];
								str.push({ 
									at: ev.at,  // step name
									t: ran.t, // time sampled
									u: state,   // state occupied
									n: idx, 	// unique identifier
									x: ys[0],  	// lat
									y: ys[1],  	// lon
									z: ys[2] 	// alt
								});
							});

						break;

					case "_end":
						LOG(ev);
						
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

		ran.pipe( function (evs) {  // sync pipe
			ctx.Save = evs;
			res( ctx );
		});   // run process and capture results

	}

}