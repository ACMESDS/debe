module.exports = {
	usecase: {
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
		LIBS.HACK.voxelizeAOI(SQL, ctx);
	}	

}
