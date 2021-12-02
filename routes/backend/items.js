const express = require('express');
const router = express.Router();

const { body, validationResult } = require('express-validator');

const collectionName = 'items';
const MainModel = require(__path_models + collectionName);
const UtilsHelpers = require(__path_helpers + 'utils');
const ParamsHelpers = require(__path_helpers + 'params');
const NotifyHelpers = require(__path_helpers + 'notify');
const systemConfigs = require(__path_configs + 'system');
const Validates = require(__path_validates + collectionName);

const folderView = `${__path_views_admin}pages/${collectionName}`;
const linkIndex = `/${systemConfigs.prefixAdmin}/${collectionName}`;


/* POST Delete multi */
router.post('/change-ordering', async (req, res) => {
	const id		    = ParamsHelpers.getParam(req.body, 'cid', '');
	const ordering		= ParamsHelpers.getParam(req.body, 'ordering', '');
	const task 			= Array.isArray(id) ? 'change-ordering-multi' : 'change-ordering-one';

	await MainModel.changeOrdering(id, ordering, {task});
	NotifyHelpers.showNotifyAndRedirect(req, res, linkIndex, {task: 'change-ordering'});
});

/* GET Delete one */
router.get('/delete/:id', async (req, res) => {
	const id		    = ParamsHelpers.getParam(req.params, 'id', '');

	await MainModel.deleteItem(id, {task: 'delete-one'});
	NotifyHelpers.showNotifyAndRedirect(req, res, linkIndex, {task: 'delete-one'});
});

/* POST Delete multi */
router.post('/delete/', async (req, res) => {
	const id		    = ParamsHelpers.getParam(req.body, 'cid', '');

	const result = await MainModel.deleteItem(id, {task: 'delete-multi'});
	NotifyHelpers.showNotifyAndRedirect(req, res, linkIndex, {task: 'delete-multi', total: result.deletedCount});
});

/* GET Change status one */
router.get('/change-status/:status/:id', async (req, res) => {
	const currentStatus = ParamsHelpers.getParam(req.params, 'status', 'active');
	const id		    = ParamsHelpers.getParam(req.params, 'id', '');

	await MainModel.changeStatus(id, currentStatus, {task: 'change-status-one'});
	NotifyHelpers.showNotifyAndRedirect(req, res, linkIndex, {task: 'change-status-one'});
});

/* POST Change status multi */
router.post('/change-status/:status', async (req, res) => {
	const currentStatus = ParamsHelpers.getParam(req.params, 'status', 'active');
	const id		    = ParamsHelpers.getParam(req.body, 'cid', '');

	const result = await MainModel.changeStatus(id, currentStatus, {task: 'change-status-multi'});
	NotifyHelpers.showNotifyAndRedirect(req, res, linkIndex, {task: 'change-status-multi', total: result.modifiedCount});
});

/* GET list page. */
router.get('(/status/:status)?', async (req, res, next) => {
	const condition = {};
	const messages	= req.flash('notify');
	const currentStatus = ParamsHelpers.getParam(req.params, 'status', 'all');
	const currentPage = ParamsHelpers.getParam(req.query, 'page', 1);
	const search_value = ParamsHelpers.getParam(req.query, 'search_value', '');
	const filterStatus = await UtilsHelpers.createFilterStatus(currentStatus, collectionName, search_value);

	if (currentStatus !== 'all') condition.status = currentStatus;
	if (search_value) condition.name = new RegExp(search_value, 'i');

	const pagination = {
		itemsTotal: await MainModel.countItems(condition),
		itemsOnPerPage: 6,
		currentPage,
		pageRanges : 3,
	}
	pagination.pagesTotal = Math.ceil(pagination.itemsTotal / pagination.itemsOnPerPage);
	const options = {
		limit: pagination.itemsOnPerPage,
		skip: (pagination.currentPage - 1) * pagination.itemsOnPerPage,
	}
	const items = await MainModel.getList(condition, options);

	res.render(`${folderView}/list`, { 
		pageTitle: 'Items',
		messages,
		items,
		currentStatus,
		filterStatus,
		search_value,
		pagination,
	});
});

// Get FORM --- ADD/EDIT
router.get('/form(/:id)?', async (req, res) => {
	const id = ParamsHelpers.getParam(req.params, 'id', '');
	let item = {id: '', name: '', ordering: 1, content: ''};
	const errors = [];
	const pageTitle = id ? 'Edit' : 'Add';
	item = id ? await MainModel.getItem(id) : item;
	
	res.render(`${folderView}/form`, {pageTitle, errors, item});
});

// POST ADD/EDIT
router.post('/form', Validates.formValidate(body), async (req, res) => {
	const item = req.body;
	const errors = validationResult(req).array();
	const pageTitle = item && item.id ? 'Edit' : 'Add';
	const task = item && item.id ? 'edit' : 'add';
	
	if (errors.length > 0) {
		res.render(`${folderView}/form`, {pageTitle, errors, item});

	} else {
		await MainModel.saveItem(item, {task});
		NotifyHelpers.showNotifyAndRedirect(req, res, linkIndex, {task});
	}
});

module.exports = router;
