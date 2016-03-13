(function(exports,s,$){
	var counter = 0;
	function strHash(s){
		return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
	}
	function _getFileUid( file ) {
		return 'f'+strHash( file.name + '_' + file.size ) + '-'+(counter++);
	}
	function _getImageUid( image ) {
		return 'i'+strHash(image.src) + '-'+(counter++)
	}
	

	/*
		_cache[ object_uid ] = {
			file: null,
			image: null,
		}
	*/
	
	var Cache = function(){};
	Cache.prototype = {
		_cache:{},
		init: function( uid, cropper ) {
			if ( ! this._cache[uid] ) {
				this._cache[uid] = {
// 					cropper:[cropper],
					image:null,
					file:null
				}
// 			} else {
// 				this._cache[uid].cropper.push(cropper);
			}
			return this;
		},
		get: function(uid) {
			return this._cache[uid];
		},
		clear: function(uid) {
			delete this._cache[uid];
		},
		getFile: function( uid ) {
			return this._cache[uid].file;
		},
		setFile: function(uid,file) {
			var filereader, 
				self = this;
			
			if ( this._cache[uid].file == null ) {
			
				this._cache[uid].file = file;
				this._cache[uid].image = null;

				filereader = new FileReader();
				filereader.onload = function(e) {
					var image = document.createElement('img');
					image.onload = function() {
						self.setImage(uid,image);
					}
					image.src = e.target.result;
				}
				filereader.readAsDataURL( file );
			}
			return this;
		},
		getImage: function(uid) {
			return this._cache[uid].image;
		},
		setImage: function( uid, image ) {
			if ( this._cache[uid].image == null ) {
				this._cache[uid].image = image;
				this.trigger('imageready:'+uid);
			}
			return this;
		}
	};
	_.extend( Cache.prototype, Backbone.Events );
	_cache = new Cache();
	/**
	 *	SmarterCrop
	 *	
	 *	@param	file	File Object representing an image
	 *	@param	size	int
	 *	@param	height	int
	 *
	 */
	
	
	var SmarterCrop = function( size, options ) {
		var self = this;
		
		this.uid = null;
		this.options = options;
		this.size = size;

		this.cropresult = {
			absolute: false,
			relative: false,
		};
		
		
	}
	
	_.extend( SmarterCrop.prototype, Backbone.Events );
	_.extend( SmarterCrop.prototype, {
		
		_init: function( uid ) {
			this.uid = uid;
			var self = this;

			if ( ! _cache.get( this.uid ) ) {
				_cache.on('imageready:'+this.uid, function() {
					var img = _cache.getImage(self.uid);
					if ( self._cancrop( img ) ) {
						self.trigger('cancrop',self.size);
						self._cropImage();
					} else {
						self.trigger('cannotcrop',self.size);
					}
				});
				_cache.init( this.uid, this );
			} else if ( _cache.getImage(this.uid) ) {
				if ( this._cancrop( _cache.getImage(this.uid) ) ) {
					this._cropImage();
				}
			}
		},
		_cancrop: function( img ) {
			return img.naturalWidth >= this.size.min_width && img.naturalHeight >= this.size.min_height 
		},
		cropFile: function(file) {
			this._init(_getFileUid( file ));
			_cache.setFile( this.uid, file );
		},
		cropImage: function(image) {
			this._init(_getImageUid(image));
			_cache.setImage( this.uid, image );
		},
		_cropImage: function () {

			var image = _cache.getImage(this.uid),
				options,
				result;

			// SmartCrop.crop() - 
			options = {
				width : this.size.min_width,
				height: this.size.min_height,
				minScale : 1.0
			};
			result = s.crop(image, options, function(){} ).topCrop;

			this.cropresult.absolute = result;
			this.cropresult.relative = {
				x: result.x / image.naturalWidth,
				y: result.y / image.naturalHeight,
				width: result.width / image.naturalWidth,
				height: result.height / image.naturalHeight 
			}
			this.trigger( 'cropresult', this.cropresult, this.size );
		}
	} );
	
	exports.SmarterCrop = SmarterCrop;
})(window,SmartCrop,jQuery);
