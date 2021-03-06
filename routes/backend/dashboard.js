const express = require('express');
const router = express.Router();

const systemConfigs = require(__path_configs + 'system');
const ContactModel = require(__path_schemas + 'contacts')

/* GET home page. */
router.get('(/dashboard)?', async (req, res, next) => {
	let managements = [...systemConfigs.dashboard_managements];
	await Promise.all(
		managements.map((management, index) => {
			const MainModel = require(__path_schemas + management.collection);
			return MainModel.countDocuments({}).then(count => {management.count = count});
		})
	);
	const items = await ContactModel.find({status: 'inactive'}).sort({'created.time': 'desc'}).limit(5);

	res.locals.sidebarActive = `dashboard|list`;;
	res.render('backend/pages/dashboard', { 
		pageTitle: 'Dashboard',
		managements,
		items,
	});
});

module.exports = router;
