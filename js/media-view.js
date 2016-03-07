(function(wp,$,SmarterCrop,t) {

	var image_ratios = window.wp_smartcrop.image_ratios,
		image_sizes  = window.wp_smartcrop.image_sizes,
		l10n = window.wp_smartcrop.l10n,
		options = window.wp_smartcrop.options;
	// 
	// media view Attachment details - add smartcrop state
	var parentCreateStates = wp.media.view.Attachment.Details.prototype.createStates;
	wp.media.view.Attachment.Details.prototype.createStates = function() {
		parentCreateStates.apply(this,arguments);
		this.states.add(
			new wp.media.controller.SmartcropImage( {
				image: this.image,
				selection: this.options.selection
			} )
		);
	};
	
	// media frame: bind smartcrop events
	var parentBindHandlers = wp.media.view.MediaFrame.EditAttachments.prototype.bindHandlers;
	wp.media.view.MediaFrame.EditAttachments.prototype.bindHandlers = function(){
		parentBindHandlers.apply(this,arguments);
		this.on( 'content:create:smartcrop-image', this.smartcropImageMode, this );
		this.on( 'content:render:smartcrop-image', this.smartcropImageModeRender, this );
	}
	wp.media.view.MediaFrame.EditAttachments.prototype.smartcropImageMode = function( contentRegion ) {
		var smartcropImageController = new wp.media.controller.SmartcropImage( {
			model: this.model,
			frame: this,
			content:this.content
		} );
		smartcropImageController._toolbar = function() {};
		smartcropImageController._router = function() {};
		smartcropImageController._menu = function() {};

		contentRegion.view = new wp.media.view.SmartcropImage( {
			model: this.model,
			frame: this,
			controller: smartcropImageController
		});
	}
	wp.media.view.MediaFrame.EditAttachments.prototype.smartcropImageModeRenderer = function( view ) {
		view.on( 'ready', view.loadEditor );
	}
	
	
	
	/**
	 *	Add Crop button to attachment editor
	 */
	wp.media.view.Attachment.Details.TwoColumn.prototype.old_render = wp.media.view.Attachment.Details.TwoColumn.prototype.render;
	wp.media.view.Attachment.Details.TwoColumn.prototype.render = function(){
		this.old_render.apply(this,arguments);
		var btn = '<button type="button" class="button smartcrop-attachment">'+l10n.cropImage+'</button>';
		this.$('.attachment-actions').append(btn);
	}
	// register action
	wp.media.view.Attachment.Details.TwoColumn.prototype.events['click .smartcrop-attachment'] = 'smartcropAttachment';
	
	// add smartcrop action
	wp.media.view.Attachment.Details.TwoColumn.prototype.smartcropAttachment = function( event ) {
		event.preventDefault();
		this.controller.content.mode( 'smartcrop-image' );
	}


	/**
	 *	Modal message
	 */
// 	wp.media.view.SmartcropModal = wp.media.View.extend({
// 		tagName:  'div',
// 		template: wp.template('smartcrop-modal'),
// 		className: 'smartcrop-modal',
// 
// 		attributes: {
// 			tabindex: 0
// 		},
// 
// 		events: {
// 		},
// 
// 		initialize: function() {
// 			_.defaults( this.options, {
// 				container: document.body,
// 				title:     '',
// 				freeze:    true
// 			});
// 		},
// 		/**
// 		 * @returns {wp.media.view.Modal} Returns itself to allow chaining
// 		 */
// 		attach: function() {
// 			if ( this.views.attached ) {
// 				return this;
// 			}
// 
// 			if ( ! this.views.rendered ) {
// 				this.render();
// 			}
// 
// 			this.$el.appendTo( this.options.container );
// 
// 			// Manually mark the view as attached and trigger ready.
// 			this.views.attached = true;
// 			this.views.ready();
// 
// 			return this;//.propagate('attach');
// 		},
// 
// 		/**
// 		 * @returns {wp.media.view.Modal} Returns itself to allow chaining
// 		 */
// 		detach: function() {
// 			if ( this.$el.is(':visible') ) {
// 				this.close();
// 			}
// 
// 			this.$el.detach();
// 			this.views.attached = false;
// 			return this;//.propagate('detach');
// 		},
// 		setMessage:function( msgText ) {
// 			this.$el.find('.message').text( msgText );
// 		},
// 		setTitle:function( titleText ) {
// 			this.$el.find('.title').text( titleText );
// 		},
// 		/**
// 		 * @returns {wp.media.view.Modal} Returns itself to allow chaining
// 		 */
// 		open: function() {
// 			var $el = this.$el,
// 				options = this.options,
// 				mceEditor;
// 
// 			if ( $el.is(':visible') ) {
// 				return this;
// 			}
// 
// 			if ( ! this.views.attached ) {
// 				this.attach();
// 			}
// 
// 			// If the `freeze` option is set, record the window's scroll position.
// 			if ( options.freeze ) {
// 				this._freeze = {
// 					scrollTop: $( window ).scrollTop()
// 				};
// 			}
// 
// 			// Disable page scrolling.
// 			$( 'body' ).addClass( 'modal-open' );
// 
// 			$el.show();
// 
// 			this.$el.focus();
// 
// 			return this;//.propagate('open');
// 		},
// 
// 		/**
// 		 * @param {Object} options
// 		 * @returns {wp.media.view.Modal} Returns itself to allow chaining
// 		 */
// 		close: function( options ) {
// 			var freeze = this._freeze;
// 
// 			if ( ! this.views.attached || ! this.$el.is(':visible') ) {
// 				return this;
// 			}
// 
// 			// Enable page scrolling.
// 			$( 'body' ).removeClass( 'modal-open' );
// 
// 			// If the `freeze` option is set, restore the container's scroll position.
// 			if ( freeze ) {
// 				$( window ).scrollTop( freeze.scrollTop );
// 			}
// 
// 			if ( options && options.escape ) {
// 				this;//.propagate('escape');
// 			}
// 
// 			return this;
// 		},
// 
// 		/**
// 		 * @param {Array|Object} content Views to register to '.media-modal-content'
// 		 * @returns {wp.media.view.Modal} Returns itself to allow chaining
// 		 */
// 		content: function( content ) {
// 			this.views.set( '.media-modal-content', content );
// 			return this;
// 		}
// 	});

	
	wp.media.view.SmartcropRatioSelect = wp.media.View.extend({
		className: 'smartcrop-select',
		template: wp.template('smartcrop-select'),
		ratios:{},
		model:null,
		events: {
			'click [name="smartcrop-select-ratio"]': 'select'
		},
		initialize: function() {
			wp.Backbone.View.prototype.initialize.apply(this,arguments);
			this.options.l10n = l10n;

		},
		render: function() {
			wp.Backbone.View.prototype.render.apply(this,arguments);
			var self = this;
			
			_.each( this.options.ratios, function( ratio, key ) {
				var names = [],
					tpl_str = '<span class="sizename<%= cancrop ? "" : " disabled" %>"><%= name %> (<%= width %>×<%= height %>)</span>',
					name_tpl = _.template(tpl_str);
				_.each( ratio.sizes, function(sizename,key) {
					var size = $.extend( true, {
						cancrop :	(self.model.get('width') >= image_sizes[sizename].width) &&
									(self.model.get('height') >= image_sizes[sizename].height)
					}, image_sizes[sizename]);
					if ( size.crop ) {
						names.push( name_tpl( size ) );
					}
				});
				self.views.add(new wp.media.view.SmartcropRatioSelectItem({
					ratiokey:key,
					sizenames:names.join(''),
					ratio: key,
					enabled: (self.model.get('width') >= ratio.min_width) &&
							(self.model.get('height') >= ratio.min_height)
				}))
			} );
			
			
		},
		setRatio: function( ratiokey ) {
			this.$el.find('[name="smartcrop-select-ratio"][value="'+ratiokey+'"]').prop('checked',true);
			this.trigger('select');
		},
		getRatio: function( ) {
			return this.$el.find('[name="smartcrop-select-ratio"]:checked').val();
		},
		select: function( event ) {
			this.trigger('select');
		}
	});

	wp.media.view.SmartcropRatioSelectItem = wp.media.View.extend({
		className: 'smartcrop-select-item',
		template: wp.template('smartcrop-select-item'),
		sizekey:'',
		sizenames:'',
		ratio:0,
		enabled:null,
		render: function() {
			wp.Backbone.View.prototype.render.apply(this,arguments);
			this.$el.find('input[type="radio"]').prop('disabled', ! this.options.enabled )
		}
	});
	
	wp.media.view.SmartcropImage = wp.media.view.EditImage.extend({
		className: 'image-smartcrop',
		template:  wp.template('smartcrop'),
		image_ratios:    image_ratios,
		image_sizes:     image_sizes,
		events:    {
			'click .smartcrop-autocrop' : 'autocrop',
			'click .smartcrop-cancel'   : 'cancel',
			'click .smartcrop-save'     : 'save'
		},
		_croppers:null,
		initialize: function(){
			wp.media.view.EditImage.prototype.initialize.apply(this,arguments);
			this._croppers = {}
//			this.controller.on('smartcrop:croprect', this.hasCropRect, this);
		},
		dispose:function() {
			var areaSelect = this.$areaSelect()
			areaSelect && areaSelect.remove();
			wp.media.view.EditImage.prototype.dispose.apply(this,arguments);
		},
		createSelect: function() {
			this.select = new wp.media.view.SmartcropRatioSelect({
				choices: choices
			});
		},
		render: function() {
			var self = this;
			
			wp.Backbone.View.prototype.render.apply(this,arguments);
			this.$img = this.$el.find('img');

			this.$img.imgAreaSelect({
				parent: 		this.$img.closest('.smartcrop-image-wrap'),
				instance:	 	true,
				handles: 		true,
				keys: 			true,
				persistent:		true,
				enabled:		true,
				movable:		true,
				resizable:		true,
				imageHeight:	this.model.get('height'),
				imageWidth:		this.model.get('width'),
				onInit: 	function( img ) {
					// Ensure that the imgareaselect wrapper elements are position:absolute
					// (even if we're in a position:fixed modal)
					var $img = $( img );
					$img.next().css( 'position', 'fixed' )
						.nextAll( '.imgareaselect-outer' ).css( 'position', 'fixed' );
				},
				onSelectEnd: function( image, coords ) {
//					var cropdata = self._pointToRectCoords( self._scaleCoords( coords, 1 / self._image_scale_factor() ) )
					var cropdata = self._pointToRectCoords( coords )
					self._setCropSizes(cropdata);
					self.$saveButton.prop('disabled',false);
				}
			});

			// set ratio seelct
			this.selectRatio = new wp.media.view.SmartcropRatioSelect({
				ratios:this.image_ratios,
				model:this.model
			});
			this.selectRatio.on('select', this.onselect, this );
			this.views.set('.select-ratio', this.selectRatio );	
			// setTimeout( function(){ },20);
			
			this.$saveButton		= this.$el.find('.smartcrop-save');
			this.$cancelButton		= this.$el.find('.smartcrop-cancel');
			this.$autocropButton	= this.$el.find('.smartcrop-autocrop');
			return this;
		},
		ready: function() {
			wp.media.view.EditImage.prototype.ready.apply(this,arguments);
			this.selectRatio.setRatio( _.first(_.keys( this.image_ratios )) ); 
			return this;
		},
		faces : function() {
			var img = this.$el.find('img').get(0),
			facedetect = new tracking.ObjectTracker('face');
			tracking.track( img, facedetect );
			facedetect.on('track',function(event) {
				console.log('faces:',event.data,event.data.length);
			});
			return this;
		},
		save: function() {
			var data = {
					attachments:{}
				}, id = this.model.get('id'),
				$btns = this.$saveButton.add(this.$cancelButton).add( this.$autocropButton ).prop('disabled',true);
			data.attachments[id] = { sizes:this.model.get('sizes') };
			this.model.saveCompat( data, {} ).done( function( resp ) {
				// force reload thumbnail
				var $thumb = $('[data-id="'+resp.id+'"] .thumbnail img'),
					src = $thumb.attr('src'), d = new Date();
				if ( src ) {	
					src = src.replace(/\?.+$/,'');
					$thumb.attr('src',src+'?'+d.getTime());
				}
				$btns.prop('disabled',false)
			});
			return this;
		},
		cancel:function() {
			this.controller.attributes.content.mode('edit-metadata');
			return this;
		},
		onselect: function( ) {
			/**
			 *	On switch ratio
			 */
			var ratiokey = this.selectRatio.getRatio(),
				sizes = this.model.get('sizes'),
				factor, rect, cropdata, self = this, 
				s, areaSelectOptions,
				imgWidth  = this.model.get('width'), 
				imgHeight = this.model.get('height');

			this.current_ratio = this.image_ratios[ratiokey];

			areaSelectOptions = {
				aspectRatio:	this.current_ratio.ratio + ':1',
				minWidth:		this.current_ratio.min_width,
				minHeight:		this.current_ratio.min_height
			};

			_.each(this.current_ratio.sizes, function(size){
				if ( ! cropdata && !! sizes[size] && !! sizes[size].cropdata ) {
					cropdata = sizes[size].cropdata;
				}
				if ( image_sizes[size].width <= imgWidth && image_sizes[size].height <= imgHeight ) {
					areaSelectOptions.minWidth  = Math.max( areaSelectOptions.minWidth,  image_sizes[size].width );
					areaSelectOptions.minHeight = Math.max( areaSelectOptions.minHeight, image_sizes[size].height );
				}
			});

			if ( !cropdata ) {
				// wp default cropdata
				var scale = Math.min( this.model.get('width') / this.current_ratio.ratio, this.model.get('height'));
				
				rect = {
					x:0,
					y:0,
					width:  scale * this.current_ratio.ratio,
					height: scale
				};
				rect.x = (this.model.get('width') - rect.width)/2;
				rect.y = (this.model.get('height') - rect.height)/2;
			} else {
				rect = {};
				
				_.extend(rect,cropdata);
			}
			


			this.$areaSelect().setOptions( areaSelectOptions );
			if ( ! this.$img.get(0).complete ) {
				this.$img.on('load',function() {
					self.selectCrop(rect);
				});
			} else {
				this.selectCrop(rect);
			}
//
			
//			setTimeout(function(){  },50);
			return this;
		},
		autocrop: function( event ) {
			
			var self = this, 
				cropper, 
				btns = this.$saveButton.add( this.$autocropButton ).prop('disabled',true).get(),
				ratio = {};

			if ( ! this._croppers[this.current_ratio.name] ) {
				_.extend( ratio, this.current_ratio );
				var cropper = this._croppers[this.current_ratio.name] = new SmarterCrop( ratio , options );
				cropper.on('cropresult' , function( cropdata, ratio ) {
					self._setCropSizes( cropdata.absolute );
					self.selectCrop( cropdata.absolute );
					$(btns).prop('disabled',false);
				});
			}
			cropper = this._croppers[this.current_ratio.name];
			cropper.cropImage( this.$el.find('img').get(0) );
			
			return this;
		},
		selectCrop:function( rect ) {
			// draw crop UI element.
			var factor = this._image_scale_factor(),
				points = this._rectToPointCoords(rect),
				$areaSelect = this.$areaSelect();
			
			$areaSelect.setSelection( points.x1, points.y1, points.x2, points.y2, false );
			$areaSelect.setOptions( {show:true} );
			$areaSelect.update();
			return this;
		},
		$areaSelect : function(){
			return $('#smartcrop-image').data('imgAreaSelect');
		},
		_image_scale_factor : function() {
			var $container = this.$img.closest('.smartcrop-image-wrap'),
				w = Math.min(this.model.get('width'),$container.width()),
				h = Math.min(this.model.get('height'),$container.height());
			
			return Math.min( w / this.model.get('width'), h / this.model.get('height') );
		},
		_setCropSizes : function( cropdata ) {
			var modelSizes = this.model.get('sizes');
			_.each(this.current_ratio.sizes, function( sizename ) {
				! modelSizes[ sizename ] && ( modelSizes[ sizename ] = {} );
				modelSizes[ sizename ].cropdata = cropdata;
			});
			this.model.set( 'sizes', modelSizes );
		},
		_getRelativeCoords: function( coords ) {
			var w = this.model.get('width'),
				h = this.model.get('height');
			for ( var s in coords ) {
				if ( 'number'===typeof(coords[s]) ) {
					switch (s) {
						case 'x':
						case 'x1':
						case 'x2':
						case 'width':
						case 'minX':
						case 'maxX':
							coords[s] /= w;
							break;
						default:
							coords[s] /= h;
							break;
					}
				}
			}
		},
		_getAbsoluteCoords: function( coords ) {
			var w = this.model.get('width'),
				h = this.model.get('height');
			for ( var s in coords ) {
				if ( 'number'===typeof(coords[s]) ) {
					switch (s) {
						case 'x':
						case 'x1':
						case 'x2':
						case 'width':
						case 'minX':
						case 'maxX':
							coords[s] *= w;
							break;
						default:
							coords[s] *= h;
							break;
					}
					
				}
			}
		},
// 		_scaleCoords: function( coords, scale ) {
// 			for ( var s in coords ) {
// 				if ( 'number'===typeof(coords[s]) ) {
// 					coords[s] *= scale;
// 				}
// 			}
// 			return coords;
// 		},
		_pointToRectCoords:function( points ) {
			return {
				x: points.x1,
				y: points.y1,
				width:  points.x2 - points.x1,
				height: points.y2 - points.y1
			}
		},
		_rectToPointCoords:function( rect ) {
			return {
				x1: rect.x,
				y1: rect.y,
				x2: (rect.maxX ? rect.maxX : rect.x+rect.width),
				y2: (rect.maxY ? rect.maxY : rect.y+rect.height),
			};
		}
	});
	
	
	// controller state
	wp.media.controller.SmartcropImage = wp.media.controller.State.extend({
		defaults: {
			id:      'smartcrop-image',
			title:   l10n.smartcropImage,
			menu:    false,
			toolbar: 'smartcrop-image',
			content: 'smartcrop-image',
			url:     ''
		},

		/**
		 * @since 3.9.0
		 */
		activate: function() {
			this.listenTo( this.frame, 'toolbar:render:smartcrop-image', this.toolbar );
		},

		/**
		 * @since 3.9.0
		 */
		deactivate: function() {
			this.stopListening( this.frame );
		},

		/**
		 * @since 3.9.0
		 */
// 		toolbar: function() {
// 			console.log("yep, it's me");
// 			var frame = this.frame,
// 				lastState = frame.lastState(),
// 				previous = lastState && lastState.id;
// 
// 			frame.toolbar.set( new wp.media.view.Toolbar({
// 				controller: frame,
// 				items: {
// 					back: {
// 						style: 'primary',
// 						text:     l10n.back,
// 						priority: 20,
// 						click:    function() {
// 							if ( previous ) {
// 								frame.setState( previous );
// 							} else {
// 								frame.close();
// 							}
// 						}
// 					}
// 				}
// 			}) );
// 		}
	});



})(wp,jQuery,SmarterCrop,tracking);
