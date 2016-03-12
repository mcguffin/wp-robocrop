(function(exports,s,t,$){
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
			faces: null,
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
					file:null,
					faces:null
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
				this._cache[uid].faces = null;

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
		},
		detectFaces:function(uid) {
			var facedetect,self=this;
			
			self.trigger('trackfaces:'+uid);
			
			facedetect = new t.ObjectTracker('face');
			facedetect.on('track',function(event) {
				self.setFaces( uid, event.data );
			});
			t.track( this.getImage(uid), facedetect );
			return this;
		},
		getFaces: function(uid) {
			if ( !! this._cache[uid].faces ) {
				return this._cache[uid].faces.slice(0);
			}
			return null;
		},
		setFaces: function(uid,faces) {
			if ( this._cache[uid].faces == null ) {
				this._cache[uid].faces = faces.slice(0);
				this.trigger('facesready:'+uid );
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
		this.options = $.extend({
			detect_faces : true
		},options);

		// normalize arguments!
		this.size = $.extend({},size);

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
						if ( self.options.detect_faces ) {
							_cache.detectFaces(self.uid);
						} else {
							self._cropImage();
						}
					} else {
						self.trigger('cannotcrop',self.size);
					}
				})
				.on('trackfaces:'+this.uid, function( ) {
					self.trigger('trackfaces');
				})
				.on('facesready:'+this.uid, function( ) {
					if ( self._cancrop( _cache.getImage(self.uid) ) ) {
						self._cropImage();
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

			var faces = _cache.getFaces(this.uid),
				image = _cache.getImage(this.uid),
				options,
				result;

			if ( faces && faces.length ) {
				// crop to faces - actually visible image dimensions
				result = _cropByFaces( faces, this.size, image );
			} else {
				// SmartCrop.crop() - 
				options = {
					width : this.size.min_width,
					height: this.size.min_height,
					minScale : 1.0
				};
				console.log(options);
				result = s.crop(image, options, function(){} ).topCrop;
			}

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
	
	
	

	function _cropByFaces( faces, size, image ) {
		var solutions = [],
			len = faces.length;

		// sort faces by size (biggest first)
		faces.sort(function(a,b){
			return b.width * b.height - a.width * a.height;
		});
		// find cropping solutions
		while ( faces.length > 0 ) {
			solutions.push( _getFacesRect( faces, size, faces.length - len, image) );
			faces.pop();
		}

		// sort by score
		solutions.sort(function(a,b){ return b.score - a.score });
		return solutions[0];
	}
	
	function _getFacesRect( faces, size, score, image ) {
		// scaled to actual image dimensions (might be scaled down)
		/* 
		- hidden face: -1
		- truncated face: -2
		*/
		score = 'undefined' === typeof(score) ? 0 : score;
		var maxW = image.width,
			maxH = image.height,
			imageScale = image.width / image.naturalWidth,
			minW = size.min_width * imageScale,
			minH = size.min_height * imageScale,
			ratio = minW / minH,
			rectRatio,
			rect = {x:0,y:0,width:0,height:0,score:score},
			faceRect = {
				x:maxW,
				y:maxH,
				maxX:0,
				maxY:0
			},
			scale,
			i;


		// generate faces Rect
		for (i=0;i<faces.length;i++) {
			// normalize facerects
// 			faces[i].x      *= imageScale;
// 			faces[i].y      *= imageScale;
// 			faces[i].width  *= imageScale;
// 			faces[i].height *= imageScale;

			faceRect.x = Math.min(faceRect.x,faces[i].x);
			faceRect.y = Math.min(faceRect.y,faces[i].y);
			faceRect.maxX = Math.max(faceRect.maxX, faces[i].x+faces[i].width);
			faceRect.maxY = Math.max(faceRect.maxY, faces[i].y+faces[i].height);
		}

		faceRect.width  = faceRect.maxX - faceRect.x;
		faceRect.height = faceRect.maxY - faceRect.y;
		rectRatio = faceRect.width / faceRect.height;


		if ( ratio > rectRatio ) { // ratio wider than faceRect
			rect.width = faceRect.height * ratio;
			rect.height = faceRect.height;
		} else if (  ratio < rectRatio ) { // faceRect wider than ratio
			rect.width = faceRect.width;
			rect.height = faceRect.width / ratio;
		} else if ( ratio == rectRatio ) {
			rect.width = faceRect.width;
			rect.height = faceRect.height;
		}

		//*
		// scale rect to maximum size
		scale = Math.min(maxW / rect.width, maxH / rect.height);
		rect.width *= scale;
		rect.height *= scale;

		/*/
		// rect too large
		if ( rect.width > maxW || rect.height > maxH ) {
			scale = Math.min(maxW / rect.width, maxH / rect.height);
			rect.width *= scale;
			rect.height *= scale;
		}

		// rect too small
		if ( rect.width < minW || rect.height < minH ) {
			scale = Math.max(minW / rect.width, minH / rect.height);
			rect.width *= scale;
			rect.height *= scale;
		}
		//*/
		rect.x = Math.min( maxW-rect.width, Math.max(0,faceRect.x + faceRect.width  / 2 - rect.width/2));
		rect.y = Math.min( maxH-rect.height, Math.max(0,faceRect.y + faceRect.height / 2 - rect.height/2));

		// score this solution
		for (i=0;i<faces.length;i++) {
			if ( 	( faces[i].x + faces[i].width < rect.x) ||
					( faces[i].y + faces[i].height < rect.y) ||
					( rect.x + rect.width  < faces[i].x ) ||
					( rect.y + rect.height < faces[i].y )
				) {
					// face hidden
					rect.score -= 1;
			} else if ( 
					( faces[i].x < rect.x && faces[i].x + faces[i].width > rect.x ) ||
					( faces[i].y < rect.y && faces[i].y + faces[i].height > rect.y ) ||
					( faces[i].x < rect.x + rect.width && faces[i].x + faces[i].width > rect.x + rect.width ) ||
					( faces[i].y < rect.y + rect.height && faces[i].y + faces[i].height > rect.y + rect.height )
				) {
					// face truncated
					rect.score -= 2;
			}
		}
		rect.x /= imageScale;
		rect.y /= imageScale;
		rect.width  /= imageScale;
		rect.height /= imageScale;
		return rect;
	}
	
	exports.SmarterCrop = SmarterCrop;
})(window,SmartCrop,tracking,jQuery);
