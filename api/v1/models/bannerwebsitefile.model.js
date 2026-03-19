const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
	const attributes = {
		name: { type: DataTypes.STRING, allowNull: false },
		nodeType: { type: DataTypes.ENUM('folder', 'file'), allowNull: false },
		parentId: { type: DataTypes.INTEGER, allowNull: true },
		content: { type: DataTypes.TEXT('long'), allowNull: true },
		mimeType: { type: DataTypes.STRING, allowNull: true },
		sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
		lastEditedBy: { type: DataTypes.INTEGER, allowNull: false }
	};

	const options = {
		timestamps: true,
		createdAt: 'created',
		updatedAt: 'updated',
		paranoid: true,
		version: true,
	};

	return sequelize.define('bannerwebsitefile', attributes, options);
}
