const express = require('express');
const router = express.Router();

const { body, validationResult } = require('express-validator');

const collectionName = 'users';
const MainModel = require(__path_models + collectionName);
const GroupsModel = require(__path_models + 'groups');
const UtilsHelpers = require(__path_helpers + 'utils');
const ParamsHelpers = require(__path_helpers + 'params');
const NotifyHelpers = require(__path_helpers + 'notify');
const FileHelpers = require(__path_helpers + 'file');
const systemConfigs = require(__path_configs + 'system');
const NotifyConfigs = require(__path_configs + 'notify');
const Validates = require(__path_validates + collectionName);

const folderView = `${__path_views_admin}pages/${collectionName}`;
const folderUploads = `${__path_uploads}${collectionName}/`;
const linkIndex = `/${systemConfigs.prefixAdmin}/${collectionName}`;
const pageTitle = "Users Management";


// POST ADD/EDIT
router.post('/form', FileHelpers.upload('avatar', 'users'), Validates.formValidate(body), async (req, res) => {
	const item = req.body;
	const groups = await GroupsModel.getList({}, {select: 'name'});
	const userItem = await MainModel.getUserByUsername(item.username );
	const errors = validationResult(req).array();
	const pageTitle = item && item.id ? 'Edit' : 'Add';
	const task = item && item.id ? 'edit' : 'add';
	res.locals.sidebarActive = `${collectionName}|form`;

	if (item && item.id && item.password.length > 20) {
		item.password = systemConfigs.password_default;
		item.password_confirm = systemConfigs.password_default;
	}
	if (userItem && task === 'add') errors.push({param: 'username', msg: NotifyConfigs.ERROR_USERNAME_EXIST});
	if (req.errorMulter) {
		if (req.errorMulter.code && req.errorMulter.code === 'LIMIT_FILE_SIZE')
			errors.push({param: 'avatar', msg: NotifyConfigs.ERROR_FILE_LIMIT});
		else
			errors.push({param: 'avatar', msg: req.errorMulter});
	} else if (!req.file && task === 'add') {
		errors.push({param: 'avatar', msg: NotifyConfigs.ERROR_FILE_REQUIRE});
	}

	if (errors.length > 0) {
		if (req.file) FileHelpers.removeFile(folderUploads, req.file.filename);
		item.avatar = item.avatar_old;
		res.render(`${folderView}/form`, {pageTitle, errors, item, groups});

	} else {
		if (!req.file && task === 'edit') {
			item.avatar = item.avatar_old
		} else {
			item.avatar = req.file.filename;
			FileHelpers.removeFile(folderUploads, item.avatar_old);
		}
		await MainModel.saveItem(item, {task});
		NotifyHelpers.showNotifyAndRedirect(req, res, linkIndex, {task});
	}
});

// Get FORM --- ADD/EDIT
router.get('/form(/:id)?', async (req, res) => {
	const id = ParamsHelpers.getParam(req.params, 'id', '');
	let item = {id: '', name: '', ordering: 1, content: '', group_id: '', group_name: '',
				 username: '', password: '', password_confirm: ''};
	const groups = await GroupsModel.getList({}, {select: 'name'});
	const errors = [];
	res.locals.sidebarActive = `${collectionName}|form`;;
	const pageTitle = id ? 'Edit' : 'Add';
	item = id ? await MainModel.getItem(id) : item;

	item.group_id   = item.group ? item.group.id : '';
	item.group_name = item.group ? item.group.name : '';
	if (item && item.id && item.password.length > 20) {
		item.password = systemConfigs.password_default;
		item.password_confirm = systemConfigs.password_default;
	}

	res.render(`${folderView}/form`, {pageTitle, errors, item, groups});
});

/* GET Filter by Group */
router.get('/filter-group/:group_id', async (req, res) => {
	req.session.group_id	= ParamsHelpers.getParam(req.params, 'group_id', 'default');
	//selectingGroupID
	res.redirect(linkIndex);
});

/* GET SORT */
router.get('/sort/:sortField/:sortType', async (req, res) => {
	req.session.sortType		    = ParamsHelpers.getParam(req.params, 'sortType', 'asc');
	req.session.sortField		    = ParamsHelpers.getParam(req.params, 'sortField', 'ordering');

	res.redirect(linkIndex);
});

/* POST change ordering  */
router.post('/change-ordering', async (req, res) => {
	const id		    = ParamsHelpers.getParam(req.body, 'cid', '');
	const ordering		= ParamsHelpers.getParam(req.body, 'ordering', '');
	const task 			= Array.isArray(id) ? 'change-ordering-multi' : 'change-ordering-one';

	const data = await MainModel.changeOrdering(id, ordering, {task});
	res.send(data);
	// NotifyHelpers.showNotifyAndRedirect(req, res, linkIndex, {task: 'change-ordering'});
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

/* GET Change Group of  */
router.post('/change-group', async (req, res) => {
	const id		    = ParamsHelpers.getParam(req.body, 'id', '');
	const group_id      = ParamsHelpers.getParam(req.body, 'group_id', '');
	const group_name    = ParamsHelpers.getParam(req.body, 'group_name', '');

	const data = await MainModel.changeGroup(id, group_id, group_name, {task: 'change-group'});
	res.send(data);
});

/* GET Change status one */
router.get('/change-status/:status/:id', async (req, res) => {
	const currentStatus = ParamsHelpers.getParam(req.params, 'status', 'active');
	const id		    = ParamsHelpers.getParam(req.params, 'id', '');

	const data = await MainModel.changeStatus(id, currentStatus, {task: 'change-status-one'});
	res.send(data);
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
	const selectingGroupID	= ParamsHelpers.getParam(req.session, 'group_id', 'default');
	const sortType = ParamsHelpers.getParam(req.session, 'sortType', 'asc');
	const sortField = ParamsHelpers.getParam(req.session, 'sortField', 'ordering');
	const sort = {[sortField]: sortType};
	const currentStatus = ParamsHelpers.getParam(req.params, 'status', 'all');
	const currentPage = ParamsHelpers.getParam(req.query, 'page', 1);
	const search_value = ParamsHelpers.getParam(req.query, 'search_value', '');
	res.locals.sidebarActive = `${collectionName}|list`;

	if (currentStatus !== 'all') condition.status = currentStatus;
	if (search_value) condition.name = new RegExp(search_value, 'i');
	if (selectingGroupID !== 'default') condition['group.id'] = selectingGroupID;

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
		sort,
		select: null,
	}

	const filterStatus = await UtilsHelpers.createFilterStatus(currentStatus, collectionName, condition);
	const items = await MainModel.getList(condition, options);
	const groups = await GroupsModel.getList({}, {select: 'name'});

	res.render(`${folderView}/list`, { 
		pageTitle,
		messages,
		items,
		groups,
		selectingGroupID,
		currentStatus,
		filterStatus,
		search_value,
		pagination,
		sortType,
		sortField,
	});
});



module.exports = router;
