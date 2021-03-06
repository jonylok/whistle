var values = require('../../lib/values');
var properties = require('../../lib/properties');

module.exports = function get() {
	return {
		current: properties.get('currentValuesFile'),
		fontSize: properties.get('valuesFontSize'),
		showLineNumbers: properties.get('valuesShowLineNumbers'),
		theme: properties.get('valuesTheme'),
		list: values.list()
	};
};