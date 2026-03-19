const path = require('path');
const db = require(path.join(__dirname, '../shared/db'));
const { Sequelize, Op } = require('sequelize');

module.exports = {
	getAll,
	getById,
	getTemplateBannersById,
	getBannerContainersByBannerId,
	getBannerContainerComponentsByContainerId,
	getBannerContainerComponentsMetaByComponentId,
	create,
	update,
	updateStatus,
	restore,
	delete: _delete
};

async function getAll(reqRole) {

	const paranoidRequest = (reqRole === 'Admin') ? false : true;

	const modelsHistories = await getHistory();

    const models = await db.Banner.findAll({
		paranoid: paranoidRequest,
		include:[
			{
				model: db.BannerType,
				as:'bannertype',
				required:false
			},
			{
				model: db.BannerSize,
				as:'bannersize',
				required:false
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
								//as:'componenttype',
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
			{
				model: db.Templates,
				as: 'template',
				required:false,
				include:[
					{
						model: db.Client,
						as:'client',
						required:false
					}
				]
			}
		],
		order: [
			['name', 'ASC'],
			[ {model: db.Container, as: 'containers'}, 'displayorder', 'ASC'],
			[ {model: db.Container, as: 'containers'}, {model: db.Component, as: 'components'}, 'id', 'ASC'],
			[ {model: db.Container, as: 'containers'}, {model: db.Component, as: 'components'}, {model: db.Animation, as: 'animations'}, 'timelineorder', 'ASC']
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

    return models.map(x => basicDetails(x));
}

async function getById(id) {
    const model = await getBanner(id);
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
	//if (await db.Banner.findOne({ where: {
	//	[Op.or]: [{name: params.name}, {description: params.description}]
	//	} }))
	//{
	//	throw 'Banner already exists. Please provide a unique Name and description.';
	//}

	const websiteFilesInput = extractWebsiteFilesPayload(params);
	const bannerPayload = stripWebsiteFileFields(params);

	const model = new db.Banner(bannerPayload);
	model.lastEditedBy = editId;
    // save model
    await model.save();

	if (websiteFilesInput.length > 0) {
		await replaceWebsiteFiles(model.id, websiteFilesInput, editId);
	}

    return basicDetails(await getBanner(model.id));
}

async function update(id, params, editId) {
    const model = await getBanner(id);
	const websiteFilesWasProvided = params.websiteFiles !== undefined || params.websiteProjectTree !== undefined;
	const websiteFilesInput = extractWebsiteFilesPayload(params);
	const bannerPayload = stripWebsiteFileFields(params);

	// validate (if name/shortname was changed)
	//if (params.name && model.name == params.name && model.description == params.description ) {
	//	throw 'Banner hasn\'t been updated.';
	//}
	// validate (if name/shortname is unique in db)
	if ( params.name && (model.name !== params.name) && await db.Banner.findOne({ where: { name: params.name } })) {
		throw 'Banner already exists.';
	}

    // copy params to model and save
	Object.assign(model, bannerPayload);
    model.updated = Date.now();
	model.lastEditedBy = editId;
    await model.save();

	if (websiteFilesWasProvided) {
		await replaceWebsiteFiles(model.id, websiteFilesInput, editId);
	}

    return basicDetails(await getBanner(model.id));
}

async function updateStatus(id, params, editId) {
	const model = await getBanner(id);

	model.status = params.status;
	model.updated = Date.now();
	model.lastEditedBy = editId;

	await model.save();

	return basicDetails(model);
}

// 1) delete banner
// 2) delete banner containers
// 3) delete banner containers components and component meta data
// 4) delete banner containers components and component meta data
async function _delete(id, editId) {
	// 1)
    const model = await getBanner(id);
	await model.update({updated: Date.now(), lastEditedBy: editId, status: false });
    await model.destroy();

	// 2)
	await getBannerContainersByBannerId(id).then(function(containers) {
		containers.forEach( async function(container) {
			await container.update({updated: Date.now(), lastEditedBy: editId, status: false });
			await container.destroy();

			// 3)
			getBannerContainerComponentsByContainerId(container.id).then(function(components) {
				components.forEach( async function(component) {

					await component.update({updated: Date.now(), lastEditedBy: editId, status: false });
					await component.destroy();

					// 4)
					getBannerContainerComponentsMetaByComponentId(component.id).then(function(componentsMeta) {

						componentsMeta.forEach( async function(meta) {

							await meta.update({updated: Date.now(), lastEditedBy: editId, status: false });
							await meta.destroy();

						});

						return basicDetails(model);

					});

				});

			});
		});
	});
}

// 1) restore banner
// 2) restore banner containers
// 3) restore banner containers components and component meta data
// 4) restore banner containers components and component meta data
async function restore(id, editId) {
	// 1)
	const model = await getBanner(id);
	await model.restore();
	await model.update({lastEditedBy: editId, status: true });

	// 2)
	await getBannerContainersByBannerId(id).then( async (containers) =>{
		await containers.forEach( async (container) =>{

			await container.restore();
			await container.update({updated: Date.now(), lastEditedBy: editId, status: true });

			// 3)
			getBannerContainerComponentsByContainerId(container.id).then( async (components) =>{
				await components.forEach( async (component) =>{
					await component.restore();
					await component.update({updated: Date.now(), lastEditedBy: editId, status: true });

					// 4)
					getBannerContainerComponentsMetaByComponentId(component.id).then( async (componentsMeta) => {

						await componentsMeta.forEach( async (meta) =>{
							await meta.restore();
							await meta.update({updated: Date.now(), lastEditedBy: editId, status: true });

						});

						return basicDetails( await getBanner(id));

					});

				});

			});
		});
	});

	//return basicDetails(await getBanner(id));
}

// helper functions

async function getBanner(id) {
	//const transaction = await db.sequelizeInstance.transaction({isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED});
    const model = await db.Banner.findByPk(id, {
		paranoid: false,
		include:[
			{
				model: db.BannerType,
				as:'bannertype',
				required:false
			},
			{
				model: db.BannerSize,
				as:'bannersize',
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
								//as:'componenttype',
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
			{
				model: db.Templates,
				as: 'template',
				required:false,
				include:[
					{
						model: db.Client,
						as:'client',
						required:false
					}
				]
			}
		],
		order: [
			['name', 'ASC'],
			[ {model: db.Container, as: 'containers'}, 'displayorder', 'ASC'],
			[ {model: db.Container, as: 'containers'}, {model: db.Component, as: 'components'}, 'name', 'ASC'],
			[ {model: db.Container, as: 'containers'}, {model: db.Component, as: 'components'}, {model: db.Animation, as: 'animations'}, 'timelineorder', 'ASC']
		]
		/**/
		//lock: true,
		//transaction,
		/** /
		lock: {
			level: transaction.LOCK,
			of: db.Banner
		},
		/**/
	});
    if (!model) throw 'Banner not found';
    return model;
}

async function getTemplateBannersById(id) {

	const templateBanners = await db.Banner.findAll({
		paranoid: false,
		where: {templateId: id},
		include:[
			{
				model: db.BannerType,
				as:'bannertype',
				required:false
			},
			{
				model: db.BannerSize,
				as:'bannersize',
				required:false
			},
			{
				model: db.Templates,
				as: 'template',
				required:false,
				include:[
					{
						model: db.Client,
						as:'client',
						required:false
					}
				]
			},
			{
				model: db.BannerWebsiteFile,
				as: 'websitefiles',
				required: false
			},
			{
				model: db.Container,
				//as:'container',
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

						]
					},
				]
			},
		]
	});

	return templateBanners;
}

async function getBannerContainersByBannerId(id) {

	const bannerContainers = await db.Container.findAll({
		paranoid: false,
		where: {bannerId: id},
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

				]
			}
		]
	});

	return bannerContainers;
}

async function getBannerContainerComponentsByContainerId(id) {

	const containerComponents = await db.Component.findAll({
		paranoid: false,
		where: {containerId: id},
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

		]
	});

	return containerComponents;
}

async function getBannerContainerComponentsMetaByComponentId(id) {

	const componentMeta = await db.ComponentMeta.findAll({
		paranoid: false,
		where: {componentId: id}
	});

	return componentMeta;
}

async function getHistory() {

	const modelHistories = await db.sequelizeInstance.query(
		"SELECT * FROM `bannerHistories`",
		{
			type: db.sequelizeInstance.QueryTypes.SELECT
		}
	);

	return modelHistories;
}

async function getHistoryById(id) {

	const modelHistories = await db.sequelizeInstance.query(
		"SELECT * FROM `bannerHistories` WHERE id = ?",
		{
			replacements: [id],
			type: db.sequelizeInstance.QueryTypes.SELECT
		}
	);

	return modelHistories;
}

function basicDetails(model) {
	const { id, name, description, websiteHtml, websiteCss, websiteJs, websitefiles, status, created, updated, deletedAt, history, version, lastEditedBy, bannertypeId, bannertype, bannersizeId, bannersize, containers, containerId, template, templateId } = model;
	return {
		id,
		name,
		description,
		websiteHtml,
		websiteCss,
		websiteJs,
		websiteFiles: websitefiles || [],
		status,
		created,
		updated,
		deletedAt,
		history,
		version,
		lastEditedBy,
		bannertypeId,
		bannertype,
		bannersizeId,
		bannersize,
		containers,
		containerId,
		template,
		templateId
	};
}

function stripWebsiteFileFields(params) {
	const bannerPayload = { ...params };
	delete bannerPayload.websiteFiles;
	delete bannerPayload.websiteProjectTree;
	return bannerPayload;
}

function extractWebsiteFilesPayload(params) {
	if (Array.isArray(params.websiteFiles)) {
		return normalizeWebsiteFilesArray(params.websiteFiles);
	}

	if (params.websiteProjectTree && typeof params.websiteProjectTree === 'object') {
		return flattenWebsiteProjectTree(params.websiteProjectTree);
	}

	return [];
}

function normalizeWebsiteFilesArray(websiteFiles) {
	return websiteFiles
		.filter((item) => item && typeof item === 'object' && item.name && item.nodeType)
		.map((item, index) => {
			const sourceId = String(item.id ?? `node-${index}`);
			const parentSourceId = item.parentId !== undefined && item.parentId !== null ? String(item.parentId) : null;
			const nodeType = item.nodeType === 'folder' ? 'folder' : 'file';

			return {
				sourceId,
				parentSourceId,
				name: String(item.name),
				nodeType,
				content: nodeType === 'file' ? normalizeWebsiteFileContent(item.content) : null,
				mimeType: item.mimeType || null,
				sortOrder: Number.isInteger(item.sortOrder) ? item.sortOrder : index,
			};
		});
}

function flattenWebsiteProjectTree(rootNode) {
	const normalizedRows = [];

	const flatten = (node, parentSourceId, sortOrder) => {
		if (!node || !node.name) {
			return;
		}

		const sourceId = String(node.id ?? `node-${normalizedRows.length}`);
		const nodeType = node.type === 'folder' ? 'folder' : 'file';

		normalizedRows.push({
			sourceId,
			parentSourceId,
			name: String(node.name),
			nodeType,
			content: nodeType === 'file' ? normalizeWebsiteFileContent(node.content) : null,
			mimeType: node.mimeType || null,
			sortOrder,
		});

		if (Array.isArray(node.children)) {
			node.children.forEach((childNode, childIndex) => flatten(childNode, sourceId, childIndex));
		}
	};

	flatten(rootNode, null, 0);

	return normalizedRows;
}

function normalizeWebsiteFileContent(content) {
	if (content === undefined || content === null) {
		return '';
	}

	return String(content);
}

async function replaceWebsiteFiles(bannerId, websiteFiles, editId) {
	await db.BannerWebsiteFile.destroy({ where: { bannerId } });

	if (!websiteFiles || websiteFiles.length === 0) {
		return;
	}

	const sourceToDbId = {};
	const pendingRows = [...websiteFiles];
	let madeProgress = true;

	while (pendingRows.length > 0 && madeProgress) {
		madeProgress = false;

		for (let index = pendingRows.length - 1; index >= 0; index--) {
			const row = pendingRows[index];
			const parentReady = row.parentSourceId === null || sourceToDbId[row.parentSourceId] !== undefined;

			if (!parentReady) {
				continue;
			}

			const createdRow = await db.BannerWebsiteFile.create({
				bannerId,
				name: row.name,
				nodeType: row.nodeType,
				parentId: row.parentSourceId ? sourceToDbId[row.parentSourceId] : null,
				content: row.nodeType === 'file' ? row.content : null,
				mimeType: row.mimeType,
				sortOrder: row.sortOrder,
				lastEditedBy: editId,
			});

			sourceToDbId[row.sourceId] = createdRow.id;
			pendingRows.splice(index, 1);
			madeProgress = true;
		}
	}

	for (const row of pendingRows) {
		await db.BannerWebsiteFile.create({
			bannerId,
			name: row.name,
			nodeType: row.nodeType,
			parentId: null,
			content: row.nodeType === 'file' ? row.content : null,
			mimeType: row.mimeType,
			sortOrder: row.sortOrder,
			lastEditedBy: editId,
		});
	}
}
