module.exports = {
	keys: {
		chipPixels: "int(11)",
		chipFeatures: "float",
		featureLength: "float",
		ring: "json",
		featureOverlap: "float",
		radius: "float",
		Description: "mediumtext"
	},
	
	engine: function aois(ctx,res) {
		res(ctx);
		$.thread( sql => {
			HACK.voxelizeAOI(sql, ctx);
		});
	}	

}
