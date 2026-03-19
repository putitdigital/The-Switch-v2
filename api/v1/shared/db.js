const path = require('path');
const config = require(path.join(__dirname, '../config.json'));
const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');
const Temporal = require('sequelize-temporal');

module.exports = db = {};

initialize();

async function initialize() {

	const { host, port, user, password, database } = process.env.NODE_ENV === 'production' ? config.database.prod : config.database.local;

    //const { host, port, user, password, database } = config.database.local;
	// create db if it doesn't already exist

    const connection = await mysql.createConnection({ host, port, user, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);

    // connect to db
    const sequelize = new Sequelize(database, user, password, {
		host: host,
  		port: port,
		dialect: 'mysql',
		logging: false
	});

	db.sequelizeInstance = sequelize;

	/**
	 * ACCESS ACCOUNTS MODEL
	 */
	// init models and add them to the exported db object
	db.Account = require('../models/account.model')(sequelize);

	db.RefreshToken = require('../models/refresh-token.model')(sequelize);

	// define relationships
	db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
	db.RefreshToken.belongsTo(db.Account);

	/**
	 * DATA MODEL - Banner Types
	 */
	db.BannerType = require('../models/bannertype.model')(sequelize);

	/**
	 * DATA MODEL - Banner Sizes
	 */
	db.BannerSize = require('../models/bannersize.model')(sequelize);

	/**
	 * DATA MODEL - Component Types
	 */
	db.ComponentType = require('../models/componenttype.model')(sequelize);

	/**
	 * DATA MODEL - Animation Types
	 */
	db.AnimationType = require('../models/animationtype.model')(sequelize);

	/**
	 * DATA MODEL - Easing Types
	 */
	db.EasingType = require('../models/easingtype.model')(sequelize);

	/**
	 * DATA MODEL - Event Types
	 */
	db.EventType = require('../models/eventtype.model')(sequelize);

	/**
	 * DATA MODEL - Default Fonts
	 */
	db.FontType = require('../models/fonttype.model')(sequelize);

		/**
	 * DATA MODEL - Default Fonts
	 */
	db.Taxonomy = require('../models/taxonomy.model')(sequelize);

	/**
	 * DATA MODEL - Task Types
	 */
	db.TaskType = require('../models/tasktype.model')(sequelize);

	/**
	 * DATA MODEL - Clients
	 */
	db.Client = require('../models/client.model')(sequelize);

	/**
	 * MODEL - Projects
	 */
	db.Project = require('../models/project.model')(sequelize);

	db.Project.belongsTo(db.Client, { onDelete: 'NO ACTION' });
	db.Client.hasMany(db.Project);

	/**
	 * MODEL - Tasks
	 */
	db.Task = require('../models/task.model')(sequelize);

	/**
	 * MODEL - Templates
	 */
	db.Templates = require('../models/template.model')(sequelize);

	db.Templates.belongsTo(db.Client, { onDelete: 'NO ACTION' });
	db.Client.hasMany(db.Templates);

	db.Templates.belongsTo(db.BannerType, { onDelete: 'NO ACTION' });
	db.BannerType.hasMany(db.Templates);

	/**
	 * DATA MODEL - Banners
	 */
	db.Banner = require('../models/banner.model')(sequelize);

	db.Banner.belongsTo(db.Templates, { onDelete: 'NO ACTION' });
	db.Templates.hasMany(db.Banner);

	db.Banner.belongsTo(db.BannerType, { onDelete: 'NO ACTION' });
	db.BannerType.hasMany(db.Banner);

	db.Banner.belongsTo(db.BannerSize, { onDelete: 'NO ACTION' });
	db.BannerSize.hasMany(db.Banner);

	/*** /
	db.Banner.sync({
		alter: {
			drop: false
		}
	}).catch(function(err){
		//console.log(err);
	});
	/***/


	/**
	 * DATA MODEL - Panels/Containers
	 */
	db.Container = require('../models/container.model')(sequelize);

	db.Container.belongsTo(db.Banner, { onDelete: 'NO ACTION' });
	db.Banner.hasMany(db.Container);

	//db.Container.belongsTo(db.BannerSize, { onDelete: 'NO ACTION' });
	//db.BannerSize.hasMany(db.Container);

	/**
	 * DATA MODEL - Components
	 */
	db.Component = require('../models/component.model')(sequelize);
	db.ComponentMeta = require('../models/component.meta.model')(sequelize);

	db.ComponentMeta.belongsTo(db.Component, { onDelete: 'NO ACTION' });
	db.Component.hasMany(db.ComponentMeta, { onDelete: 'NO ACTION' });

	db.Component.belongsTo(db.ComponentType, { onDelete: 'NO ACTION' });
	db.ComponentType.hasMany(db.Component);

	db.Component.belongsTo(db.Container, { onDelete: 'NO ACTION' });
	db.Container.hasMany(db.Component);

	/*** /
	db.Component.sync({
		alter: {
			drop: false
		}
	}).catch(function(err){
		//console.log(err);
	});
	db.ComponentMeta.sync({
		alter: {
			drop: false
		}
	}).catch(function(err){
		//console.log(err);
	});

	/*** /
	db.Container.sync({
		alter: {
			drop: false
		}
	}).catch(function(err){
		//console.log(err);
	});
	db.Component.sync({
		alter: {
			drop: false
		}
	}).catch(function(err){
		//console.log(err);
	});
	db.BannerSize.sync({
		alter: {
			drop: false
		}
	}).catch(function(err){
		//console.log(err);
	});
	/***/



	/**
	 * DATA MODEL - Animations
	 */
	db.Animation = require('../models/animation.model')(sequelize);
	db.AnimationMeta = require('../models/animation.meta.model')(sequelize);

	db.AnimationMeta.belongsTo(db.Animation, { onDelete: 'NO ACTION' });
	db.Animation.hasMany(db.AnimationMeta, { onDelete: 'NO ACTION' });

	//db.Animation.belongsToMany(db.AnimationMeta, { through: 'AnimationMeta', onDelete: 'NO ACTION' });
	//db.AnimationMeta.belongsToMany(db.Animation, { through: 'AnimationMeta', onDelete: 'NO ACTION' });

	db.Animation.belongsTo(db.AnimationType, { onDelete: 'NO ACTION' });
	db.AnimationType.hasMany(db.Animation);

	db.Animation.belongsTo(db.EasingType, { onDelete: 'NO ACTION' });
	db.EasingType.hasMany(db.Animation);

	//db.Animation.belongsTo(db.EventType, { onDelete: 'NO ACTION' });
	//db.EventType.hasMany(db.Animation);

	db.Animation.belongsTo(db.Component, { onDelete: 'NO ACTION' });
	db.Component.hasMany(db.Animation);


	// Version History Table
	/**/
	Temporal(db.Account, sequelize);
	Temporal(db.BannerType, sequelize);
	Temporal(db.BannerSize, sequelize);
	Temporal(db.ComponentType, sequelize);
	Temporal(db.AnimationType, sequelize);
	Temporal(db.EasingType, sequelize);
	Temporal(db.EventType, sequelize);
	Temporal(db.FontType, sequelize);
	Temporal(db.Taxonomy, sequelize);
	Temporal(db.TaskType, sequelize);

	Temporal(db.Client, sequelize);

	Temporal(db.Project, sequelize);
	Temporal(db.Task, sequelize);

	Temporal(db.Templates, sequelize);
	Temporal(db.Banner, sequelize);
	Temporal(db.Container, sequelize);
	Temporal(db.Component, sequelize);
	Temporal(db.ComponentMeta, sequelize);
	Temporal(db.Animation, sequelize);
	Temporal(db.AnimationMeta, sequelize);

	// sync all models with database
	await sequelize.sync({
		alter: {
			drop: false
		}
	});
}
