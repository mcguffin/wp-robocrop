(function(wp,$) {

	var image_ratios		= window.wp_robocrop.image_ratios,
		image_sizes			= window.wp_robocrop.image_sizes,
		l10n				= window.wp_robocrop.l10n,
		options				= window.wp_robocrop.options,
		cropBtnHTML			= '<button type="button" class="button robocrop-attachment">'+l10n.cropImage+'</button>',
		cropLinkHTML		= '<button type="button" class="button-link robocrop-attachment">'+l10n.cropImage+'</button>',
		previous_mode		= null,
		robocrop_model		= null,
		previous_state		= null,
		robocrop_controller = null;
	// 

	var robocropStateExtend = {
		createStates: function() {
			this._parentCreateStates.apply(this,arguments);
			console.log("createStates",this.states);
			this.states.add(
				new wp.media.robocrop.controller.SmartcropImage( {
					model: this.model,
					selection: this.options.selection
				} )
			);
		}
	};

	var robocropHandlersExtend = {
		bindHandlers: function() {
			this._parentBindHandlers.apply( this, arguments );
			this.on( 'content:create:robocrop-image', this.robocropImageMode, this );
			this.on( 'content:render:robocrop-image', this.robocropImageModeRender, this );
			console.log('handlers');
		},
		robocropImageMode: function( contentRegion ) {
			console.log('dohandlers');
			var robocropImageController = new wp.media.robocrop.controller.SmartcropImage( {
				model: 			robocrop_model,
				frame: 			this,
				content:		this.content
			} );
			robocropImageController._toolbar = function() {};
			robocropImageController._router = function() {};
			robocropImageController._menu = function() {};
			
			contentRegion.view = new wp.media.robocrop.view.SmartcropImage( {
				model: 		robocrop_model,
				frame: 		this,
				controller:	this.controller
			});
		},
		robocropImageModeRenderer: function( view ) {
			view.on( 'ready', view.loadEditor );
		}
	};


	// grid view media library
	_.extend(	wp.media.view.MediaFrame.EditAttachments.prototype, { 
			_parentBindHandlers: wp.media.view.MediaFrame.EditAttachments.prototype.bindHandlers
		}, 
		robocropHandlersExtend
	);
	

	// Inline MediaLibrary
	_.extend(	wp.media.view.MediaFrame.Post.prototype, { 
			_parentBindHandlers: wp.media.view.MediaFrame.Post.prototype.bindHandlers,
			_parentCreateStates: wp.media.view.MediaFrame.Post.prototype.createStates
		}, 
		robocropHandlersExtend,
		robocropStateExtend 
	);


	// post inline image editor
	_.extend( wp.media.view.ImageDetails.prototype, {
		_parentPostRender: wp.media.view.ImageDetails.prototype.postRender,
		postRender: function() {
			this._parentPostRender.apply(this,arguments);
			this.$el.find('.actions').append(cropBtnHTML);
		},
		robocropAttachment: function( event ) {
			var cropState		= this.controller.states.get( 'robocrop-image' );
			console.log(this.controller);

			robocrop_model		= this.controller.image.attachment;
			previous_mode		= null;
			robocrop_controller	= this.controller; 
			previous_state		= this.controller.state();
			
			if ( cropState ) {
				event.preventDefault();
				this.controller.setState( 'robocrop-image' );
			} 
		}
	});
	wp.media.view.ImageDetails.prototype.events['click .robocrop-attachment'] = 'robocropAttachment';

	// post inline image editor
	_.extend( wp.media.view.MediaFrame.ImageDetails.prototype, {
			_parentBindHandlers: wp.media.view.MediaFrame.ImageDetails.prototype.bindHandlers,
			_parentCreateStates: wp.media.view.MediaFrame.ImageDetails.prototype.createStates
		}, 
		robocropHandlersExtend,
		robocropStateExtend 
	);


	// Inline MediaLibrary, Grid view MediaLibrary
	_.extend( wp.media.view.Attachment.Details.prototype, {
		_parentRender: wp.media.view.Attachment.Details.prototype.render,
		render: function(){
			this._parentRender.apply(this,arguments);
			// media library screen
			this.$('.attachment-actions').append(cropBtnHTML);
			// uploader modal
			$( cropLinkHTML ).insertAfter( this.$el.find( 'a.edit-attachment' ) );
		},
		robocropAttachment: function( event ) {
			var cropState	= this.controller.states.get( 'robocrop-image' );

			robocrop_model		= this.model;
			robocrop_controller	= this.controller; 
			
			if ( cropState ) {
				previous_mode	= null;
				previous_state	= this.controller.state();
				event.preventDefault();
				this.controller.setState( 'robocrop-image' );
			} else {
				previous_mode	= this.controller.content.mode();
				previous_state	= null;
				this.controller.content.mode( 'robocrop-image' );
			}
		},
		_parentCreateStates: wp.media.view.Attachment.Details.prototype.createStates
	}, robocropStateExtend );
	
	wp.media.view.Attachment.Details.prototype.events['click .robocrop-attachment'] = 'robocropAttachment';





	/**
	 *	Ratio select list
	 */
	wp.media.robocrop.view.SmartcropRatioSelect = wp.media.View.extend({
		className: 'robocrop-select',
		template: wp.template('robocrop-select'),
		ratios:{},
		model:null,
		events: {
			'click [name="robocrop-select-ratio"]': 'select'
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
				self.views.add(new wp.media.robocrop.view.SmartcropRatioSelectItem({
					ratiokey:key,
					sizenames:names.join(''),
					ratio: key,
					enabled: (self.model.get('width') >= ratio.min_width) &&
							(self.model.get('height') >= ratio.min_height)
				}))
			} );
			
			
		},
		setRatio: function( ratiokey ) {
			this.$el.find('[name="robocrop-select-ratio"][value="'+ratiokey+'"]').prop('checked',true);
			this.trigger('select');
		},
		getRatio: function( ) {
			return this.$el.find('[name="robocrop-select-ratio"]:checked').val();
		},
		select: function( event ) {
			this.trigger('select');
		}
	});

	/**
	 *	Ratio select list Item
	 */
	wp.media.robocrop.view.SmartcropRatioSelectItem = wp.media.View.extend({
		className: 'robocrop-select-item',
		template: wp.template('robocrop-select-item'),
		sizekey:'',
		sizenames:'',
		ratio:0,
		enabled:null,
		render: function() {
			wp.Backbone.View.prototype.render.apply(this,arguments);
			this.$el.find('input[type="radio"]').prop('disabled', ! this.options.enabled )
		}
	});

	wp.media.robocrop.view.SmartcropImage = wp.media.view.EditImage.extend({
		className:		'image-robocrop',
		template:		wp.template('robocrop'),
		image_ratios:	image_ratios,
		image_sizes:	image_sizes,
		_croppers:		null,
		events: {
			'click .robocrop-autocrop' : 'autocrop',
			'click .robocrop-cancel'   : 'cancel',
			'click .robocrop-save'     : 'save'
		},
		initialize: function( options ) {
			wp.media.view.EditImage.prototype.initialize.apply( this, arguments );
			this._croppers = {}
			this.sizeToSelect = ( !! options.frame && !! options.frame.image ) ? options.frame.image.attributes.size : false;
		},
		dispose:function() {
			var areaSelect = this.$areaSelect()
			areaSelect && areaSelect.remove();
			wp.media.view.EditImage.prototype.dispose.apply(this,arguments);
		},
		createSelect: function() {
			this.select = new wp.media.robocrop.view.SmartcropRatioSelect({
				choices: choices
			});
		},
		render: function() {
			var self = this;
			wp.media.view.EditImage.prototype.render.apply(this,arguments);
			this.$img = this.$el.find('img');

			this.$img.imgAreaSelect({
				parent: 		this.$img.closest('.robocrop-image-wrap'),
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
					var cropdata = wp.media.robocrop.pointToRectCoords( coords )
					self._setCropSizes(cropdata);
					self.$saveButton.prop('disabled',false);
				}
			});

			// set ratio seelct
			this.selectRatio = new wp.media.robocrop.view.SmartcropRatioSelect({
				ratios:this.image_ratios,
				model:this.model
			});
			this.selectRatio.on('select', this.onselect, this );
			this.views.set('.select-ratio', this.selectRatio );	
			// setTimeout( function(){ },20);
			
			this.$saveButton		= this.$el.find('.robocrop-save');
			this.$cancelButton		= this.$el.find('.robocrop-cancel');
			this.$autocropButton	= this.$el.find('.robocrop-autocrop');
			return this;
		},
		ready: function() {
			var currentRatio, found;
			wp.media.view.EditImage.prototype.ready.apply(this,arguments);
			if ( !! this.sizeToSelect ) {
				found = _.find( this.image_ratios, function( ratio ){
					return ratio.sizes.indexOf( this.sizeToSelect ) > -1;
				}, this );
				if ( found ) {
					currentRatio = found.name;
				}
			}
			if ( ! currentRatio ) {
				currentRatio = _.first(_.keys( this.image_ratios ));
			}
			this.selectRatio.setRatio( currentRatio ); 
			return this;
		},
		save: function() {
			var data = {
					attachments:{}
				}, id = this.model.get('id'),
				$btns = this.$saveButton.add(this.$cancelButton).add( this.$autocropButton ).prop('disabled',true),
				self = this;
			data.attachments[id] = { sizes:this.model.get('sizes') };
			this.model.saveCompat( data, {} ).done( function( resp ) {
				var d = new Date();
				
				// force reload image ...
				_.each( self.model.attributes.sizes, function( size, sizename ) {
					// ... unless it's fullsize ...
					if ( sizename !== 'full' ) {
						// ... even inside iframes!
						$(document).add($('iframe').contents())
							.find( 'img[src^="'+size.url+'"]' )
							.each( function(){
								$(this).attr( 'src', size.url+'?'+d.getTime() );
							} );
					}
				}, self );
				$btns.prop('disabled',false)
			});
			return this;
		},
		cancel:function() {
			if ( previous_mode ) {
				robocrop_controller.content.mode( previous_mode );
			} else if ( previous_state ) {
				robocrop_controller.setState( previous_state );
			}
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
			return this;
		},
		autocrop: function( event ) {
			// crop by focus point
			
			var cropdata, imageinfo = {
				width:		this.model.get('width'),
				height:		this.model.get('height'),
				focuspoint:	this.model.get('focuspoint')
			};
			cropdata = wp.media.robocrop.cropFromFocusPoint( imageinfo, this.current_ratio );
			cropdata = wp.media.robocrop.relToAbsCoords( cropdata, imageinfo );

			this._setCropSizes( cropdata );
			this.selectCrop( cropdata );

			return this;
		},
		selectCrop:function( rect ) {
			// draw crop UI element.
			var factor = this._image_scale_factor(),
				points = wp.media.robocrop.rectToPointCoords( rect ),
				$areaSelect = this.$areaSelect();
			
			$areaSelect.setSelection( points.x1, points.y1, points.x2, points.y2, false );
			$areaSelect.setOptions( {show:true} );
			$areaSelect.update();
			return this;
		},
		$areaSelect : function(){
			return $('#robocrop-image').data('imgAreaSelect');
		},
		_image_scale_factor : function() {
			var $container = this.$img.closest('.robocrop-image-wrap'),
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
		}
	});

	// controller state
	wp.media.robocrop.controller.SmartcropImage = wp.media.controller.State.extend({
		defaults: {
			id:      'robocrop-image',
			title:   l10n.robocropImage,
			menu:    false,
			toolbar: 'robocrop-image',
			content: 'robocrop-image',
			url:     ''
		},

		/**
		 * @since 3.9.0
		 */
		activate: function() {
			this.listenTo( this.frame, 'toolbar:render:robocrop-image', this.toolbar );
		},

		/**
		 * @since 3.9.0
		 */
		deactivate: function() {
			this.stopListening( this.frame );
		},
	});

	
	
	
	
	
	

})(wp,jQuery);
