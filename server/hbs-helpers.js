var mod_hbs = require('handlebars');

mod_hbs.registerHelper('each-with-last', function(array, fn)
{
	var total  = array.length,
		last   = total-1,
		buffer = '';

	for (var i=0; i<total; i++)
	{
		var item  = array[i];
		item.last = (i == total-1);

		buffer += fn(item);
	}

	return buffer;
});
