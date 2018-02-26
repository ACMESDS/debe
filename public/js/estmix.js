module.exports = {
	usecase: {
		Mixes: "json",
		Refs: "json",
		Description: "mediumtext"
	},
	
	engine: function estmix(ctx,res) {
		/*
		Respond with {mu,sigma} estimates to the [x,y,...] app.events given ctx parameters:
			Mixes = number of mixed to attempt to find
			Refs = [ref, ref, ...] optional references [x,y,z] to validate estimates
			Select = event getter (cb(evs))
		*/
			var 
				RAN = LIBS.RAN,
				Mixes = ctx.Mixes,
				Refs = ctx.Refs,
				Select = ctx.Select;

			function dist(a,b) { 
				var d = [ a[0]-b[0], a[1]-b[1] ];
				return sqrt( d[0]*d[0] + d[1]*d[1] );
			}

			Array.prototype.nearestOf = function (metric) {
				var imin = 0, emin = 1e99;

				this.each( function (i,ctx) {
					var e = metric( ctx );
					if (  e < emin) { imin = i; emin = e; }
				});
				return {idx: imin, err: emin};
			}

			Select( function (evs) {

				var evlist = [];
				//LOG("mix evs", evs.length, Mixes);

				evs.each( function (n,ev) {
					evlist.push( [ev.x,ev.y,ev.z] );
				});

				var 
					obs = {at: "end", mles: RAN.MLE(evlist, Mixes), refs: Refs},
					mles = obs.mles,
					refs = obs.refs;

				if (refs)  {  // requesting a ref check
					mles.each( function (k,mle) {  // find nearest ref event
						mle.find = refs.nearestOf( function (ctx) {
							return dist( refs, mle.mu );
						});
					});

					mles.sort( function (a,b) {  // sort em by indexes
						return a.find.idx < b.find.idx ? 1 : -1;
					});

					mles.each(function (n,mle) {    // save ref checks
						refs.push({
							idx: mle.find.idx,
							err: mle.find.err 
							/*cellParms: JSON.stringify({
								mu: gmm.mu,
								sigma: gmm.sigma
							})*/
						});
					});
				}

				mles.each( function (n,mle) {
					delete mle._gaussian;
					delete mle._sinv;
				});

				//LOG({mixes:JSON.stringify(obs)});
				res([obs]);  //ship it
			});
		}
}