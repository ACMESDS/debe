var ENV = process.env;

module.exports = {   //< data integsters
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

