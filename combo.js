#!/usr/bin/env node

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var YUI = require('yui').YUI;

YUI.add('gallery-linkedlist', function(Y) {

"use strict";

/**********************************************************************
 * Item stored by LinkedList.
 * 
 * @class LinkedListItem
 */

/**
 * @method constructor
 * @param value {Mixed} value to store
 * @private
 */

function LinkedListItem(
	/* object */	value)
{
	this.value = value;
	this._prev = this._next = null;
}

LinkedListItem.prototype =
{
	/**
	 * @return {LinkedListItem} previous item or null
	 */
	prev: function()
	{
		return this._prev;
	},

	/**
	 * @return {LinkedListItem} next item or null
	 */
	next: function()
	{
		return this._next;
	}
};

Y.LinkedListItem = LinkedListItem;
/**********************************************************************
 * Iterator for LinkedList.  Stable except when the next item is removed by
 * calling list.remove() instead of iter.removeNext().  When items are
 * inserted into an empty list, the pointer remains at the end, not the
 * beginning.
 *
 * @class LinkedListIterator
 */

/**
 * @method constructor
 * @param list {LinkedList}
 * @private
 */

function LinkedListIterator(
	/* LinkedList */    list)
{
	this._list = list;
	this.moveToBeginning();
}

LinkedListIterator.prototype =
{
	/**
	 * @return {Boolean} true if at the beginning
	 */
	atBeginning: function()
	{
		return (!this._next || (!this._at_end && !this._next._prev));
	},

	/**
	 * @return {Boolean} true if at the end
	 */
	atEnd: function()
	{
		return (!this._next || this._at_end);
	},

	/**
	 * Move to the beginning of the list.
	 */
	moveToBeginning: function()
	{
		this._next   = this._list._head;
		this._at_end = !this._next;
	},

	/**
	 * Move to the end of the list.
	 */
	moveToEnd: function()
	{
		this._next   = this._list._tail;
		this._at_end = true;
	},

	/**
	 * @return {Mixed} next value in the list or undefined if at the end
	 */
	next: function()
	{
		if (this._at_end)
		{
			return;
		}

		var result = this._next;
		if (this._next && this._next._next)
		{
			this._next = this._next._next;
		}
		else
		{
			this._at_end = true;
		}

		if (result)
		{
			return result.value;
		}
	},

	/**
	 * @return {Mixed} previous value in the list or undefined if at the beginning
	 */
	prev: function()
	{
		var result;
		if (this._at_end)
		{
			this._at_end = false;
			result       = this._next;
		}
		else if (this._next)
		{
			result = this._next._prev;
			if (result)
			{
				this._next = result;
			}
		}

		if (result)
		{
			return result.value;
		}
	},

	/**
	 * Insert the given value at the iteration position.  The inserted item
	 * will be returned by next().
	 * 
	 * @param value {Mixed} value to insert
	 * @return {LinkedListItem} inserted item
	 */
	insert: function(
		/* object */	value)
	{
		if (this._at_end || !this._next)
		{
			this._next = this._list.append(value);
		}
		else
		{
			this._next = this._list.insertBefore(value, this._next);
		}

		return this._next;
	},

	/**
	 * Remove the previous item from the list.
	 * 
	 * @return {LinkedListItem} removed item or undefined if at the end
	 */
	removePrev: function()
	{
		var result;
		if (this._at_end)
		{
			result = this._next;
			if (this._next)
			{
				this._next = this._next._prev;
			}
		}
		else if (this._next)
		{
			result = this._next._prev;
		}

		if (result)
		{
			this._list.remove(result);
			return result;
		}
	},

	/**
	 * Remove the next item from the list.
	 * 
	 * @return {LinkedListItem} removed item or undefined if at the end
	 */
	removeNext: function()
	{
		var result;
		if (this._next && !this._at_end)
		{
			result = this._next;
			if (this._next && this._next._next)
			{
				this._next = this._next._next;
			}
			else
			{
				this._next   = this._next ? this._next._prev : null;
				this._at_end = true;
			}
		}

		if (result)
		{
			this._list.remove(result);
			return result;
		}
	}
};
/**********************************************************************
 * <p>Doubly linked list for storing items.  Supports iteration via
 * LinkedListIterator (returned by this.iterator()) or Y.each().  Also
 * supports all the other operations defined in gallery-funcprog.</p>
 * 
 * <p>Direct indexing into the list is not supported, as a reminder that it
 * is an expensive operation.  Instead, use find() with a function that
 * checks the index.</p>
 * 
 * @module gallery-linkedlist
 * @class LinkedList
 * @constructor
 * @param list {Mixed} (Optional) any scalar or iterable list
 */

function LinkedList(list)
{
	this._head = this._tail = null;

	if (arguments.length > 1)
	{
		list = Y.Array(arguments);
	}
	else if (!Y.Lang.isUndefined(list) && !(list instanceof LinkedList) && !Y.Array.test(list))
	{
		list = Y.Array(list);
	}

	if (!Y.Lang.isUndefined(list))
	{
		Y.each(list, function(value)
		{
			this.append(value);
		},
		this);
	}
}

function wrap(value)
{
	if (value instanceof LinkedListItem)
	{
		this.remove(value);
	}
	else
	{
		value = new LinkedListItem(value);
	}

	return value;
}

LinkedList.prototype =
{
	/**
	 * @return {Boolean} true if the list is empty
	 */
	isEmpty: function()
	{
		return (!this._head && !this._tail);
	},

	/**
	 * Warning:  This requires traversing the list!  Use isEmpty() whenever
	 * possible.
	 *
	 * @return {Number} the number of items in the list
	 */
	size: function()
	{
		var count = 0,
			item  = this._head;

		while (item)
		{
			count++;
			item = item._next;
		}

		return count;
	},

	/**
	 * @return {LinkedListIterator}
	 */
	iterator: function()
	{
		return new LinkedListIterator(this);
	},

	/**
	 * Creates a new, empty LinkedList.
	 *
	 * @return {LinkedList}
	 */
	newInstance: function()
	{
		return new LinkedList();
	},

	/**
	 * @return {LinkedListItem} the first item in the list, or null if the list is empty
	 */
	head: function()
	{
		return this._head;
	},

	/**
	 * @return {LinkedListItem} the last item in the list, or null if the list is empty
	 */
	tail: function()
	{
		return this._tail;
	},

	/**
	 * @param needle {Mixed} the item to search for
	 * @return {Number} first index of the needle, or -1 if not found
	 */
	indexOf: function(needle)
	{
		var iter = this.iterator(), i = 0;
		while (!iter.atEnd())
		{
			if (iter.next() === needle)
			{
				return i;
			}
			i++;
		}

		return -1;
	},

	/**
	 * @param needle {Mixed} the item to search for
	 * @return {Number} last index of the needle, or -1 if not found
	 */
	lastIndexOf: function(needle)
	{
		var iter = this.iterator(), i = this.size();
		iter.moveToEnd();
		while (!iter.atBeginning())
		{
			i--;
			if (iter.prev() === needle)
			{
				return i;
			}
		}

		return -1;
	},

	/**
	 * Clear the list.
	 */
	clear: function()
	{
		this._head = this._tail = null;
	},

	/**
	 * @param value {Mixed} value to insert
	 * @param item {LinkedListItem} existing item
	 * @return {LinkedListItem} inserted item
	 */
	insertBefore: function(
		/* object */	value,
		/* item */		item)
	{
		value = wrap.call(this, value);

		value._prev = item._prev;
		value._next = item;

		if (item._prev)
		{
			item._prev._next = value;
		}
		else
		{
			this._head = value;
		}
		item._prev = value;

		return value;
	},

	/**
	 * @param item {LinkedListItem} existing item
	 * @param value {Mixed} value to insert
	 * @return {LinkedListItem} inserted item
	 */
	insertAfter: function(
		/* item */		item,
		/* object */	value)
	{
		value = wrap.call(this, value);

		value._prev = item;
		value._next = item._next;

		if (item._next)
		{
			item._next._prev = value;
		}
		else
		{
			this._tail = value;
		}
		item._next = value;

		return value;
	},

	/**
	 * @param value {Mixed} value to prepend
	 * @return {LinkedListItem} prepended item
	 */
	prepend: function(
		/* object */	value)
	{
		value = wrap.call(this, value);

		if (this.isEmpty())
		{
			this._head = this._tail = value;
		}
		else
		{
			this.insertBefore(value, this._head);
		}

		return value;
	},

	/**
	 * @param value {Mixed} value to append
	 * @return {LinkedListItem} appended item
	 */
	append: function(
		/* object */	value)
	{
		value = wrap.call(this, value);

		if (this.isEmpty())
		{
			this._head = this._tail = value;
		}
		else
		{
			this.insertAfter(this._tail, value);
		}

		return value;
	},

	/**
	 * Remove the item from the list.
	 */
	remove: function(
		/* item */	item)
	{
		if (item._prev)
		{
			item._prev._next = item._next;
		}
		else if (item === this._head)
		{
			this._head = item._next;
			if (item._next)
			{
				item._next._prev = null;
			}
		}

		if (item._next)
		{
			item._next._prev = item._prev;
		}
		else if (item === this._tail)
		{
			this._tail = item._prev;
			if (item._prev)
			{
				item._prev._next = null;
			}
		}

		item._prev = item._next = null;
	},

	/**
	 * Reverses the items in place.
	 */
	reverse: function()
	{
		var list = new LinkedList();
		var iter = this.iterator();
		while (!iter.atEnd())
		{
			var item = iter.removeNext();
			list.prepend(item);
		}

		this._head = list._head;
		this._tail = list._tail;
	},

	/**
	 * @return {Array}
	 */
	toArray: function()
	{
		var result = [],
			item   = this._head;

		while (item)
		{
			result.push(item.value);
			item = item._next;
		}

		return result;
	}
};

Y.mix(LinkedList, Y.Iterable, false, null, 4);

	/**
	 * Executes the supplied function on each item in the list.  The
	 * function receives the value, the index, and the list itself as
	 * parameters (in that order).
	 *
	 * @method each
	 * @param f {Function} the function to execute on each item
	 * @param c {Object} optional context object
	 */

	/**
	 * Executes the supplied function on each item in the list.  Iteration
	 * stops if the supplied function does not return a truthy value.  The
	 * function receives the value, the index, and the list itself as
	 * parameters (in that order).
	 *
	 * @method every
	 * @param f {Function} the function to execute on each item
	 * @param c {Object} optional context object
	 * @return {Boolean} true if every item in the array returns true from the supplied function, false otherwise
	 */

	/**
	 * Executes the supplied function on each item in the list.  Returns a
	 * new list containing the items for which the supplied function
	 * returned a truthy value.  The function receives the value, the
	 * index, and the object itself as parameters (in that order).
	 *
	 * @method filter
	 * @param f {Function} the function to execute on each item
	 * @param c {Object} optional context object
	 * @return {Object} list of items for which the supplied function returned a truthy value (empty if it never returned a truthy value)
	 */

	/**
	 * Executes the supplied function on each item in the list, searching
	 * for the first item that matches the supplied function.  The function
	 * receives the value, the index, and the object itself as parameters
	 * (in that order).
	 *
	 * @method find
	 * @param f {Function} the function to execute on each item
	 * @param c {Object} optional context object
	 * @return {Mixed} the first item for which the supplied function returns true, or null if it never returns true
	 */

	/**
	 * Executes the supplied function on each item in the list and returns
	 * a new list with the results.  The function receives the value, the
	 * index, and the object itself as parameters (in that order).
	 *
	 * @method map
	 * @param f {String} the function to invoke
	 * @param c {Object} optional context object
	 * @return {Object} list of all return values
	 */

	/**
	 * Partitions an list into two new list, one with the items for which
	 * the supplied function returns true, and one with the items for which
	 * the function returns false.  The function receives the value, the
	 * index, and the object itself as parameters (in that order).
	 *
	 * @method partition
	 * @param f {Function} the function to execute on each item
	 * @param c {Object} optional context object
	 * @return {Object} object with two properties: matches and rejects. Each is a list containing the items that were selected or rejected by the test function (or an empty object if none).
	 */

	/**
	 * Executes the supplied function on each item in the list, folding the
	 * list into a single value.  The function receives the value returned
	 * by the previous iteration (or the initial value if this is the first
	 * iteration), the value being iterated, the index, and the list itself
	 * as parameters (in that order).  The function must return the updated
	 * value.
	 *
	 * @method reduce
	 * @param init {Mixed} the initial value
	 * @param f {String} the function to invoke
	 * @param c {Object} optional context object
	 * @return {Mixed} final result from iteratively applying the given function to each item in the list
	 */

	/**
	 * Executes the supplied function on each item in the list.  Returns a
	 * new list containing the items for which the supplied function
	 * returned a falsey value.  The function receives the value, the
	 * index, and the object itself as parameters (in that order).
	 *
	 * @method reject
	 * @param f {Function} the function to execute on each item
	 * @param c {Object} optional context object
	 * @return {Object} array or object of items for which the supplied function returned a falsey value (empty if it never returned a falsey value)
	 */

	/**
	 * Executes the supplied function on each item in the list.  Iteration
	 * stops if the supplied function returns a truthy value.  The function
	 * receives the value, the index, and the list itself as parameters
	 * (in that order).
	 *
	 * @method some
	 * @param f {Function} the function to execute on each item
	 * @param c {Object} optional context object
	 * @return {Boolean} true if the function returns a truthy value on any of the items in the array, false otherwise
	 */

Y.LinkedList = LinkedList;


}, '@VERSION@' ,{requires:['gallery-iterable-extras'], optional:['gallery-funcprog']});

YUI.add('gallery-mru-cache', function(Y) {

/**********************************************************************
 * <p>Cache which drops items based on "most recently used."  Items are
 * dropped when a user-defined criterion is exceeded, e.g., total size or
 * number of items.</p>
 * 
 * <p>The items are stored in a map of {data,mru_item_ref}.  The MRU items
 * are stored in a doubly linked list (which stores the map keys) to allow
 * easy re-ordering and dropping of items.  Every cache hit moves the
 * associated MRU item to the front of the list.</p>
 * 
 * @module gallery-mru-cache
 * @class MRUCache
 * @constructor
 * @param config {Object}
 *	<dl>
 *	<dt>metric</dt>
 *	<dd>(Required) Function which computes the metric for an item.  It receives the value as an argument and must return a positive number.</dd>
 *	<dt>limit</dt>
 *	<dd>(Required) Maximum allowed value of the metric.  Items are dropped off the end of the MRU list until the metric is less than or equal to the limit.</dd>
 *	<dt>meta</dt>
 *	<dd>Function which attaches meta data to an item when it is added to the cache.  It receives the value as an argument.</dd>
 *	<dt>stats</dt>
 *	<dd>Pass true if you want to collect basic statistics.  Pass a function if you want to control what information is stored for each key.  The function receives the key, the value, and the stat object.</dd>
 *	</dl>
 */

function MRUCache(config)
{
	this._metric_fn = config.metric;
	this._limit     = config.limit;
	this._meta      = config.meta;
	this._stats     = config.stats ? initStats() : null;

	if (Y.Lang.isFunction(config.stats))
	{
		this._stats_key_meta = config.stats;
	}

	this.clear();
}

function initStats()
{
	return { gets: 0, keys: {} };
}

function initKeyStats(keys, key)
{
	if (!keys[key])
	{
		keys[key] = { puts: 0, gets: 0 };
	}
}

MRUCache.prototype =
{
	/**
	 * Retrieve a value.
	 * 
	 * @param key {String} the key of the object to retrieve
	 * @return {Mixed} the stored object, or undefined if the slot is empty
	 */
	get: function(
		/* string */	key)
	{
		var obj = this._store[key];
		if (obj)
		{
			this._mru.prepend(obj.mru);

			if (this._stats)
			{
				this._stats.gets++;

				initKeyStats(this._stats.keys, key);
				this._stats.keys[key].gets++;
			}

			return obj.data;
		}
	},

	/**
	 * Store a value.
	 * 
	 * @param key {String} the key of the value
	 * @param value {Object} the value to store
	 * @return {boolean} false if the key has already been used
	 */
	put: function(
		/* string */	key,
		/* obj/fn */	value)
	{
		var exists = !Y.Lang.isUndefined(this._store[key]);
		if (exists)
		{
			return false;
		}

		var obj =
		{
			data: value,
			mru:  this._mru.prepend(key)
		};

		if (this._meta)
		{
			obj.meta = this._meta(value);
		}

		this._store[key] = obj;

		this._metric += this._metric_fn(value);
		while (this._metric > this._limit)
		{
			this.remove(this._mru.tail().value);
		}

		if (this._stats)
		{
			initKeyStats(this._stats.keys, key);
			this._stats.keys[key].puts++;

			if (this._stats_key_meta)
			{
				this._stats_key_meta(key, value, this._stats.keys[key]);
			}
		}

		return true;
	},

	/**
	 * Store a value.
	 * 
	 * @param key {String} the key of the value
	 * @param value {Object} the value to store
	 * @return {Mixed} the original value that was in the slot, or undefined if the slot is empty
	 */
	replace: function(
		/* string */	key,
		/* obj/fn */	value)
	{
		var orig = this.remove(key);
		this.put(key, value);
		return orig;
	},

	/**
	 * Remove an value.
	 * 
	 * @param key {String} the key of the value
	 * @return {mixed} the value that was removed, or undefined if the slot was empty
	 */
	remove: function(
		/* string */	key)
	{
		var orig = this._store[key];
		delete this._store[key];
		if (orig)
		{
			this._mru.remove(orig.mru);
			this._metric -= this._metric_fn(orig.data);
			return orig.data;
		}
	},

	/**
	 * Remove all values.
	 */
	clear: function()
	{
		this._store  = {};
		this._mru    = new Y.LinkedList();
		this._metric = 0;
	},

	/**
	 * This resets all the values.
	 *
	 * @return {Object} the current stats
	 */
	dumpStats: function()
	{
		var stats   = this._stats;
		this._stats = initStats();
		return stats;
	}
};

Y.MRUCache = MRUCache;


}, '@VERSION@' ,{requires:['gallery-linkedlist']});

YUI.add('gallery-iterable-extras', function(Y) {

/**********************************************************************
 * <p>Functional programming support for iterable classes.  The class must
 * implement the iterator() (which must return an object that implements
 * next() and atEnd()) and newInstance() methods.</p>
 * 
 * <p>Iterable classes must mix these functions:  <code>Y.mix(SomeClass,
 * Y.Iterable, false, null, 4);</code>  Passing false as the third argument
 * allows your class to provide optimized implementations of individual
 * functions.</p>
 * 
 * @module gallery-iterable-extras
 * @class Iterable
 */

Y.Iterable =
{
	/**
	 * Executes the supplied function on each item in the list.  The
	 * function receives the value, the index, and the list itself as
	 * parameters (in that order).
	 *
	 * @method each
	 * @param f {Function} the function to execute on each item
	 * @param c {Object} optional context object
	 */
	each: function(f, c)
	{
		var iter = this.iterator(), i = 0;
		while (!iter.atEnd())
		{
			f.call(c, iter.next(), i, this);
			i++;
		}
	},

	/**
	 * Executes the supplied function on each item in the list.  Iteration
	 * stops if the supplied function does not return a truthy value.  The
	 * function receives the value, the index, and the list itself as
	 * parameters (in that order).
	 *
	 * @method every
	 * @param f {Function} the function to execute on each item
	 * @param c {Object} optional context object
	 * @return {Boolean} true if every item in the array returns true from the supplied function, false otherwise
	 */
	every: function(f, c)
	{
		var iter = this.iterator(), i = 0;
		while (!iter.atEnd())
		{
			if (!f.call(c, iter.next(), i, this))
			{
				return false;
			}
			i++;
		}

		return true;
	},

	/**
	 * Executes the supplied function on each item in the list.  Returns a
	 * new list containing the items for which the supplied function
	 * returned a truthy value.  The function receives the value, the
	 * index, and the object itself as parameters (in that order).
	 *
	 * @method filter
	 * @param f {Function} the function to execute on each item
	 * @param c {Object} optional context object
	 * @return {Object} list of items for which the supplied function returned a truthy value (empty if it never returned a truthy value)
	 */
	filter: function(f, c)
	{
		var result = this.newInstance();

		var iter = this.iterator(), i = 0;
		while (!iter.atEnd())
		{
			var item = iter.next();
			if (f.call(c, item, i, this))
			{
				result.append(item);
			}
			i++;
		}

		return result;
	},

	/**
	 * Executes the supplied function on each item in the list, searching
	 * for the first item that matches the supplied function.  The function
	 * receives the value, the index, and the object itself as parameters
	 * (in that order).
	 *
	 * @method find
	 * @param f {Function} the function to execute on each item
	 * @param c {Object} optional context object
	 * @return {Mixed} the first item for which the supplied function returns true, or null if it never returns true
	 */
	find: function(f, c)
	{
		var iter = this.iterator(), i = 0;
		while (!iter.atEnd())
		{
			var item = iter.next();
			if (f.call(c, item, i, this))
			{
				return item;
			}
			i++;
		}

		return null;
	},

	/**
	 * Executes the supplied function on each item in the list and returns
	 * a new list with the results.  The function receives the value, the
	 * index, and the object itself as parameters (in that order).
	 *
	 * @method map
	 * @param f {String} the function to invoke
	 * @param c {Object} optional context object
	 * @return {Object} list of all return values
	 */
	map: function(f, c)
	{
		var result = this.newInstance();

		var iter = this.iterator(), i = 0;
		while (!iter.atEnd())
		{
			result.append(f.call(c, iter.next(), i, this));
			i++;
		}

		return result;
	},

	/**
	 * Partitions an list into two new list, one with the items for which
	 * the supplied function returns true, and one with the items for which
	 * the function returns false.  The function receives the value, the
	 * index, and the object itself as parameters (in that order).
	 *
	 * @method partition
	 * @param f {Function} the function to execute on each item
	 * @param c {Object} optional context object
	 * @return {Object} object with two properties: matches and rejects. Each is a list containing the items that were selected or rejected by the test function (or an empty object if none).
	 */
	partition: function(f, c)
	{
		var result =
		{
			matches: this.newInstance(),
			rejects: this.newInstance()
		};

		var iter = this.iterator(), i = 0;
		while (!iter.atEnd())
		{
			var item = iter.next();
			result[ f.call(c, item, i, this) ? 'matches' : 'rejects' ].append(item);
			i++;
		}

		return result;
	},

	/**
	 * Executes the supplied function on each item in the list, folding the
	 * list into a single value.  The function receives the value returned
	 * by the previous iteration (or the initial value if this is the first
	 * iteration), the value being iterated, the index, and the list itself
	 * as parameters (in that order).  The function must return the updated
	 * value.
	 *
	 * @method reduce
	 * @param init {Mixed} the initial value
	 * @param f {String} the function to invoke
	 * @param c {Object} optional context object
	 * @return {Mixed} final result from iteratively applying the given function to each item in the list
	 */
	reduce: function(init, f, c)
	{
		var result = init;

		var iter = this.iterator(), i = 0;
		while (!iter.atEnd())
		{
			result = f.call(c, result, iter.next(), i, this);
			i++;
		}

		return result;
	},

	/**
	 * Executes the supplied function on each item in the list.  Returns a
	 * new list containing the items for which the supplied function
	 * returned a falsey value.  The function receives the value, the
	 * index, and the object itself as parameters (in that order).
	 *
	 * @method reject
	 * @param f {Function} the function to execute on each item
	 * @param c {Object} optional context object
	 * @return {Object} array or object of items for which the supplied function returned a falsey value (empty if it never returned a falsey value)
	 */
	reject: function(f, c)
	{
		var result = this.newInstance();

		var iter = this.iterator(), i = 0;
		while (!iter.atEnd())
		{
			var item = iter.next();
			if (!f.call(c, item, i, this))
			{
				result.append(item);
			}
			i++;
		}

		return result;
	},

	/**
	 * Executes the supplied function on each item in the list.  Iteration
	 * stops if the supplied function returns a truthy value.  The function
	 * receives the value, the index, and the list itself as parameters
	 * (in that order).
	 *
	 * @method some
	 * @param f {Function} the function to execute on each item
	 * @param c {Object} optional context object
	 * @return {Boolean} true if the function returns a truthy value on any of the items in the array, false otherwise
	 */
	some: function(f, c)
	{
		var iter = this.iterator(), i = 0;
		while (!iter.atEnd())
		{
			if (f.call(c, iter.next(), i, this))
			{
				return true;
			}
			i++;
		}

		return false;
	}
};


}, '@VERSION@' ,{optional:['gallery-funcprog']});

YUI({
	gallery: 'gallery-2012.01.11-21-03'
}).use('json', 'gallery-mru-cache', 'datatype-date', function(Y)
{

var fs       = require('fs'),
	url      = require('url'),
	compress = require('gzip'),
	express  = require('express');

// options

var optimist = require('optimist');

var argv = optimist
	.option('config',
	{
		default:  '/usr/share/yui3-stockpile/combo.json',
		describe: 'Path to configuration file'
	})
	.argv;

try
{
	var defaults = Y.JSON.parse(fs.readFileSync(argv.config));
}
catch (e)
{
	defaults = {};
}

var argv = optimist
	.usage('usage: $0')
	.option('path',
	{
		default:  defaults.path || '/var/yui3-stockpile',
		describe: 'Path to repository'
	})
	.option('port',
	{
		default:  defaults.port || 80,
		describe: 'Port to listen on'
	})
	.option('cache',
	{
		default:  defaults.cache,
		describe: 'Cache size in MB (default 500)'
	})
	.option('cache-log',
	{
		default:  defaults['cache-log'] || '/var/log/yui3-stockpile',
		describe: 'Cache size in MB (default 500)'
	})
	.option('cache-log-interval',
	{
		default:  defaults['cache-log-interval'] || 1,
		describe: 'Cache size in MB (default 500)'
	})
	.option('debug',
	{
		boolean:  true,
		default:  defaults.debug,
		describe: 'Turn on debugging (crashes when receive request from combo-dev.js)'
	})
	.argv;

var debug = argv.debug;
if (debug)
{
	require('long-stack-traces');
}

if (argv.cache)
{
	var size = parseInt(argv.cache, 10) || 500;
	Y.log('cache size: ' + size + 'MB', 'debug', 'combo');

	function cache_metric(value)
	{
		return value.raw.length + value.gzip.length;
	}

	var response_cache = new Y.MRUCache(
	{
		metric: cache_metric,
		limit: size * Math.pow(2, 20),
		stats: function(key, value, stats)
		{
			stats.size = cache_metric(value);
		}
	});

	function scheduleCacheLogDump()
	{
		var now  = new Date().getTime();
		var next = new Date(now + cache_log_dump_interval*3600000);
		if (cache_log_dump_interval > 1)
		{
			next.setMinutes(0);
			next.setSeconds(0);
		}

		Y.later(next.getTime() - now, null, function()
		{
			scheduleCacheLogDump();

			fs.writeFile(
				cache_log_dump_prefix +
					Y.DataType.Date.format(next, { format: cache_log_dump_format }),
				Y.JSON.stringify(response_cache.dumpStats(), null, 2));
		});
	}

	if (argv['cache-log'])
	{
		Y.log('dumping cache stats every ' + argv['cache-log-interval'] + ' hours', 'debug', 'combo');

		var cache_log_dump_prefix = argv['cache-log'] + '/dump-';

		var cache_log_dump_interval = parseFloat(argv['cache-log-interval']);
		var cache_log_dump_format   = '%Y-%m-%d-%H-%M';
		if (cache_log_dump_interval >= 1)
		{
			cache_log_dump_interval = Math.round(cache_log_dump_interval);
			cache_log_dump_format   = '%Y-%m-%d-%H';
		}

		scheduleCacheLogDump();
	}

	var cache_key_pending = {};
}

var app = express.createServer();

var debug_re = /-debug\.js$/;

app.get('/combo', function(req, res)
{
	var query = url.parse(req.url).query;
	if (!query)
	{
		res.end();
		return;
	}

	var module_list = query.split('&'), module_index = 0;

	var key       = module_list.slice(0).sort().join('&');	// sort to generate cache key
	var use_cache = response_cache && /-min\.js/.test(query);
	if (use_cache && cache_key_pending[key])
	{
		var h = Y.on('mru-cache-key-ready', function(e)
		{
			if (e.cacheKey == key)
			{
				h.detach();
				send(req, res, response_cache.get(key));
			}
		});
		return;
	}
	else if (use_cache)
	{
		var cached_data = response_cache.get(key);
		if (cached_data)
		{
			send(req, res, cached_data);
			return;
		}

		cache_key_pending[key] = true;
	}

	var response_data = [];
	loadFile(module_list[0]);

	function loadFile(f)
	{
		fs.readFile(argv.path + '/' + f, 'utf-8', function(err, data)
		{
			if (err && debug_re.test(f))
			{
				Y.log(err.message + '; trying raw', 'debug', 'combo');
				loadFile(f.replace(debug_re, '.js'));
				return;
			}
			else if (err && /\.js$/.test(f) && !/-min\.js$/.test(f))
			{
				Y.log(err.message + '; trying min', 'debug', 'combo');
				loadFile(f.replace('.js', '-min.js'));
				return;
			}
			else if (err)
			{
				Y.log(err.message, 'warn', 'combo');
			}
			else
			{
				response_data.push(data);
			}

			module_index++;
			if (module_index >= module_list.length)
			{
				response_data = response_data.join('');
				compress(response_data, function(err, result)
				{
					var cache_data =
					{
						raw:  response_data,
						gzip: result
					};

					if (use_cache)
					{
						response_cache.put(key, cache_data);

						delete cache_key_pending[key];
						Y.fire('mru-cache-key-ready',
						{
							cacheKey: key
						});
					}

					send(req, res, cache_data);
				});
			}
			else
			{
				loadFile(module_list[module_index]);
			}
		});
	}

	function send(req, res, data)
	{
		res.setHeader('Content-Type', /\.css/.test(query) ? 'text/css' : 'text/javascript');
		res.setHeader('Cache-Control', 'max-age=315360000');
		res.setHeader('Expires',
			Y.DataType.Date.format(new Date(new Date().getTime() + 10*365*24*3600000),
			{
				format: '%a, %d %b %Y %H:%M:%S GMT'
			}));

		var accept_encoding = req.headers['accept-encoding'];
		var send_compressed = (accept_encoding && accept_encoding.indexOf('gzip') >= 0);
		if (send_compressed)
		{
			res.setHeader('Content-Encoding', 'gzip');
		}
		res.send(send_compressed ? data.gzip : data.raw);
	}
});

Y.log('listening on port ' + argv.port, 'debug', 'combo');
app.listen(argv.port);

});
