var ENV = process.env;

module.exports = {   //< data integsters
	test: {
		url: function (cb) {
			var 
				evs  = [];
			
			const {random} = Math;
			for (var t=new Date()-0,n=0,N=20; n<N; t+=1, n++)
				for (var a=0,A=1; a<A; a++)
					evs.push( new Object({x:random(),y:random(),z:0,t:new Date(t),actorID:a}) );
			
			//console.log(evs);
			cb(evs);
		},
		put: null,
		get: null,
		ev: null
	},
	
	fino: {
		url: "https://kaching/TBD",
		put: {
			terms: "pakistan",
			cursors: "*",
			perPage: 20,
			page: 1,
			facet: true
		},
		get: null,
		ev: (rec) => rec
	},

	missiles: {
		url: ENV.SRV_MISSILES,
		put: null,
		get: "events",
		ev: (rec,idx) => {
			return { 
				x: rec.lat,
				y: rec.lon,
				z: 0,
				t: idx,
				s: idx,
				n: rec.id
			};
		}
	},

	artillery: {
		url: ENV.SRV_ARTILLERY,
		put: null,
		get: "events",
		ev: (rec,idx) => {
			return { 
				x: rec.lat,
				y: rec.lon,
				z: 0,
				t: idx,
				s: idx,
				n: rec.id
			};
		}
	}
};

