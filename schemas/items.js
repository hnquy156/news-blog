const mongoose = require('mongoose');
const { Schema } = mongoose;

const databaseConfigs = require(__path_configs + 'database');

const items = new Schema({
	name: String,
    status: String,
    ordering: String,

});

module.exports = mongoose.model(databaseConfigs.col_items, items);