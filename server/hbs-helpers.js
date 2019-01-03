var mod_hbs = require('express-hbs');

mod_hbs.registerHelper('each-with-last', function(list, options)
{
	var total  = list.length,
		buffer = '';

	for (var i=0; i<total; i++)
	{
		var item  = list[i];
		item.last = (i == total-1);

		buffer += options.fn(item);
	}

	return buffer;
});
