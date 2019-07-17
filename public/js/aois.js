module.exports = {
	keys: {
		Name: "varchar(64)",
		chipPixels: "int(11)",
		chipFeatures: "float",
		featureLength: "float",
		ring: "json",
		featureOverlap: "float",
		radius: "float",
		voxelCount: "int(11)",
		voxelHeight: "float",
		Description: "mediumtext"
	},
	
	engine: function aois(ctx,res) {
		res(ctx);
		$.voxelize(ctx);
	}	

}
