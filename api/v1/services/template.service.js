const path = require('path');
const db = require(path.join(__dirname, '../shared/db'));
const { Sequelize, Op } = require('sequelize');

module.exports = {
	getAll,
	getById,
	create,
	update,
	updateStatus,
	restore,
	delete: _delete
};

async function getAll(reqRole) {

	const paranoidRequest = (reqRole === 'Admin') ? false : true;

	const modelsHistories = await getHistory();

    const models = await db.Templates.findAll({
		paranoid: paranoidRequest,
		include:[
			{
				model: db.Client,
				as:'client',
				required:false
			},
			{
				model: db.BannerType,
				as:'bannertype',
				required:false
			},
			{
				model: db.Banner,
				as:'banners',
				required:false,
				//paranoid: false,
				include:[
					{
						model: db.BannerSize,
						as:'bannersize',
						required:false
					},
					{
						model: db.BannerType,
						as:'bannertype',
						required:false
					},
					{
						model: db.BannerWebsiteFile,
						as: 'websitefiles',
						required: false
					},
					{
						model: db.Container,
						//as:'container',
						//paranoid: false,
						required:false,
						include:[
							{
								model: db.Component,
								as:'components',
								required:false,
								//paranoid: false,
								include:[
									{
										model: db.ComponentType,
										//as:'componentmeta',
										required:false
									},
									{
										model: db.ComponentMeta,
										//paranoid: false,
										//as:'componentmeta',
										required:false
									},
									{
										model: db.Animation,
										required:false,
										include: [
											{
												model: db.AnimationMeta,
												as:'animationmeta',
												required:false
											},
											{
												model: db.AnimationType,
												required:false
											},
											{
												model: db.EasingType,
												required:false
											},
										]
									}
								]
							},
						]
					},
				]
			}
		],
		order: [
			['name', 'ASC'],
			[ {model: db.Banner, as: 'banners'}, 'name', 'ASC'],
			[ {model: db.Banner, as: 'banners'}, {model: db.Container, as: 'containers'}, 'displayorder', 'ASC'],
			[ {model: db.Banner, as: 'banners'}, {model: db.Container, as: 'containers'}, {model: db.Component, as: 'components'}, 'name', 'ASC'],
			[ {model: db.Banner, as: 'banners'}, {model: db.Container, as: 'containers'}, {model: db.Component, as: 'components'}, {model: db.Animation, as: 'animations'}, 'timelineorder', 'ASC']
		]
	});

	if( modelsHistories.length > 0 ) {
		models.forEach( function(prime) {
			prime.history = modelsHistories.filter( function (sub) {
				return sub.id === prime.id;
			});
		});
	} else {
		models.forEach( function(prime) {
			prime.history = [];
		});
	}

	//return models;

    return models.map(x => basicDetails(x));
}

async function getById(id) {
    const model = await getTemplate(id);
	const modelHistory = await getHistoryById(id);

	if( modelHistory.length > 0 ) {
		model.history = modelHistory.filter( function (sub) {
			return sub.id === model.id;
		});
	} else {
		model.history = [];
	}

    return basicDetails(model);
}

async function create(params, editId) {
	// validate
	if (await db.Templates.findOne({ where: {
		[Op.or]: [{name: params.name}, {description: params.description}]
		} }))
	{
		throw 'Template already exists. Please provide a unique Name and description.';
	}

	////console.log('Made it to create:', params);

	//return false;

	let TemplateName = params.name;

	// save template
    const modelTemplate = new db.Templates({
		name: TemplateName,
		description: params.description,
		clientId: params.clientId,
		bannertypeId: params.bannertypeId,
		lastEditedBy: editId
	});
    await modelTemplate.save();

	return basicDetails(await getTemplate(modelTemplate.id));

}

async function update(id, params, editId) {
    const model = await getTemplate(id);

	// validate (if name/shortname was changed)
	//if (params.name && model.name == params.name && model.description == params.description ) {
	//	throw 'Template hasn\'t been updated.';
	//}
	// validate (if name/shortname is unique in db)
	if ( params.name && (model.name !== params.name) && await db.Templates.findOne({ where: { name: params.name } })) {
		throw 'Template already exists.';
	}

    // copy params to model and save
	const updateDb = {
		name: params.name,
		description: params.description,
		clientId: params.clientId,
		bannertypeId: params.bannertypeId,
		updated: Date.now(),
		lastEditedBy: editId
	};

    Object.assign(model, updateDb);
    //model.updated = Date.now();
	//model.lastEditedBy = editId;
    await model.save();

    return basicDetails(model);
}

async function updateStatus(id, params, editId) {
	const model = await getTemplate(id);

	model.status = params.status;
	model.updated = Date.now();
	model.lastEditedBy = editId;

	await model.save();

	return basicDetails(model);
}

async function _delete(id, editId) {
    const model = await getTemplate(id);
	await model.update({updated: Date.now(), lastEditedBy: editId, status: false });
    await model.destroy();
	return basicDetails(model);
}

async function restore(id, editId) {
	const model = await getTemplate(id);
	await model.restore();
	await model.update({lastEditedBy: editId, status: true });
	return basicDetails(model);
}

// helper functions

async function getTemplate(id) {
	//const transaction = await db.sequelizeInstance.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED});
    const model = await db.Templates.findByPk(id, {
		paranoid: false,
		include:[
			{
				model: db.Client,
				as:'client',
				required:false
			},
			{
				model: db.BannerType,
				as:'bannertype',
				required:false
			},
			{
				model: db.Banner,
				as:'banners',
				required:false,
				include:[
					{
						model: db.BannerSize,
						as:'bannersize',
						required:false
					},
					{
						model: db.BannerType,
						as:'bannertype',
						required:false
					},
					{
						model: db.BannerWebsiteFile,
						as: 'websitefiles',
						required: false
					},
					{
						model: db.Container,
						as:'containers',
						required:false,
						include:[
							{
								model: db.Component,
								as:'components',
								required:false,
								include:[
									{
										model: db.ComponentType,
										//as:'componentmeta',
										required:false
									},
									{
										model: db.ComponentMeta,
										//as:'componentmeta',
										required:false
									},
									{
										model: db.Animation,
										required:false,
										include: [
											{
												model: db.AnimationMeta,
												as:'animationmeta',
												required:false
											},
											{
												model: db.AnimationType,
												required:false
											},
											{
												model: db.EasingType,
												required:false
											},
										]
									}
								]
							},
						]
					},
				]
			}
		],
		order: [
			['name', 'ASC'],
			[ {model: db.Banner, as: 'banners'}, 'name', 'ASC'],
			[ {model: db.Banner, as: 'banners'}, {model: db.Container, as: 'containers'}, 'displayorder', 'ASC'],
			[ {model: db.Banner, as: 'banners'}, {model: db.Container, as: 'containers'}, {model: db.Component, as: 'components'}, 'id', 'DESC'],
			[ {model: db.Banner, as: 'banners'}, {model: db.Container, as: 'containers'}, {model: db.Component, as: 'components'}, {model: db.Animation, as: 'animations'}, 'timelineorder', 'ASC']
		]
		//lock: true,
		//transaction,
		/** /
		lock: {
			level: transaction.LOCK,
			of: db.Template
		},
		/**/
	});
    if (!model) throw 'Template not found';
    return model;
}

async function getHistory() {

	const modelHistories = await db.sequelizeInstance.query(
		"SELECT * FROM `templateHistories`",
		{
			type: db.sequelizeInstance.QueryTypes.SELECT
		}
	);

	return modelHistories;
}

async function getHistoryById(id) {

	const modelHistories = await db.sequelizeInstance.query(
		"SELECT * FROM `templateHistories` WHERE id = ?",
		{
			replacements: [id],
			type: db.sequelizeInstance.QueryTypes.SELECT
		}
	);

	return modelHistories;
}

function basicDetails(model) {
	const { id, name, description, status, created, updated, deletedAt, history, version, lastEditedBy, client, clientId, bannertypeId, bannertype, banners } = model;
	return { id, name, description, status, created, updated, deletedAt, history, version, lastEditedBy, client, clientId, bannertypeId, bannertype, banners };
}
