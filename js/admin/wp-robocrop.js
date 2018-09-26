/**
 * @preserve (c) 2016 by Joern Lund
 * @license GPL3
 */
(function( exports ){
	var robocrop;

	robocrop = _.extend( window.robocrop, {
		cropFromFocusPoint: function( imageinfo, cropinfo ) {
			// normalize 
			var fp_x =   (  imageinfo.focuspoint.x + 1) / 2 * imageinfo.width,
				fp_y =   ( -imageinfo.focuspoint.y + 1) / 2 * imageinfo.height,
				scale = Math.min( imageinfo.width / cropinfo.min_width, imageinfo.height / cropinfo.min_height ),
				crop_w = cropinfo.min_width * scale,
				crop_h = cropinfo.min_height * scale,
				crop_x = Math.min( Math.max( fp_x - crop_w / 2, 0 ) , imageinfo.width - crop_w),
				crop_y = Math.min( Math.max( fp_y - crop_h / 2, 0 ) , imageinfo.height - crop_h);
			return {
				names: cropinfo.sizes,
				x: crop_x / imageinfo.width,
				y: crop_y / imageinfo.height,
				width: crop_w / imageinfo.width,
				height: crop_h / imageinfo.height
			};
		},

		relToAbsCoords: function( cropdata, imageinfo ) {
			var s, ret = {};
			for ( s in cropdata ) {
				switch ( s ) {
					case 'x':
					case 'x1':
					case 'x2':
					case 'width':
						ret[s] = cropdata[s] * imageinfo.width
						break;
					case 'y':
					case 'y1':
					case 'y2':
					case 'height':
						ret[s] = cropdata[s] * imageinfo.height
						break;
					default:
						ret[s] = cropdata[s];
						break;
				}
			}
			return ret;
		},
		absToRelCoords: function( cropdata, imageinfo ) {
			var s, ret = {};
			for ( s in cropdata ) {
				switch ( s ) {
					case 'x':
					case 'x1':
					case 'x2':
					case 'width':
						ret[s] = cropdata[s] / imageinfo.width
						break;
					case 'y':
					case 'y1':
					case 'y2':
					case 'height':
						ret[s] = cropdata[s] / imageinfo.height
						break;
					default:
						ret[s] = cropdata[s];
						break;
				}
			}
			return ret;
		},

		pointToRectCoords:function( points ) {
			return {
				x: points.x1,
				y: points.y1,
				width:  points.x2 - points.x1,
				height: points.y2 - points.y1
			}
		},

		rectToPointCoords:function( rect ) {
			return {
				x1: rect.x,
				y1: rect.y,
				x2: (rect.maxX ? rect.maxX : rect.x+rect.width),
				y2: (rect.maxY ? rect.maxY : rect.y+rect.height),
			};
		},

		view : {},
		controller : {}
	});

	exports.media.robocrop = robocrop;

})( wp );
(function(wp,$) {

	var robocrop 		= wp.media.robocrop,
		image_ratios	= robocrop.image_ratios,
		image_sizes		= robocrop.image_sizes,
		l10n			= robocrop.l10n,
		options			= robocrop.options;


	/**
	 *	An Image
	 */
	robocrop.view.Img = wp.media.View.extend({
		className:'attachment-image',
		tagName:'img',
		id:'robocrop-image',
		initialize: function() {
			var self = this;
			_.defaults( this.options, {src:''} );
			this.$el.on('load',function(){
				self.width = self.$el.get(0).naturalWidth;
				self.height = self.$el.get(0).naturalHeight;
				self.ratio = self.width / self.height;
				self.trigger('load',self);
			});
			this.$el.attr('src', this.options.src );
		},
		getSrc: function(src) {
			return this.$el.attr( 'src' );
		},
		setSrc: function(src) {
			!!src && this.$el.attr( 'src', src );
			return this;
		}
	});


	/**
	 *	Ratio select list
	 */
	robocrop.view.RobocropRatioSelect = wp.media.View.extend({
		className: 'robocrop-select',
		template: wp.template('robocrop-select'),
		events: {
			'change [name="robocrop-select-ratio"]': 'selectRatio',
		},
		initialize: function() {
			wp.Backbone.View.prototype.initialize.apply(this,arguments);
			_.defaults({
				ratios:{},
				tools:{}
			},this.options);
			this.options.l10n = l10n;

		},
		render: function() {
			wp.Backbone.View.prototype.render.apply(this,arguments);
			var self = this;

			_.each( this.options.tools, function( tool, key ) {
				self.views.add(new robocrop.view.RobocropRatioSelectItem({
					ratiokey:	key,
					sizenames:	false,
					ratio: 		key,
					title:		tool.title,
					enabled: 	true
				}))

			});
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
				self.views.add(new robocrop.view.RobocropRatioSelectItem({
					ratiokey:	key,
					sizenames:	names.join(''),
					ratio: 		ratio.ratio,
					title:		ratio.name,
					enabled: 	(self.model.get('width')  >= ratio.min_width) &&
								(self.model.get('height') >= ratio.min_height)
				}))
			} );


		},
		setSelected: function( ratiokey ) {
			this.$el.find('[name="robocrop-select-ratio"][value="'+ratiokey+'"]').prop('checked',true);
			this.selectRatio();
		},
		getSelected: function( ) {
			return this.$el.find('[name="robocrop-select-ratio"]:checked').val();
		},
		selectRatio: function( event ) {

			if ( !! this.options.ratios[ this.getSelected() ] ) {
				this.trigger('select-ratio');
			} else if ( !! this.options.tools[ this.getSelected() ] ) {
				this.trigger('select-tool');
			}

			this.trigger('select');
		}
	});

	/**
	 *	Ratio select list Item
	 */
	robocrop.view.RobocropRatioSelectItem = wp.media.View.extend({
		className: 'robocrop-select-item',
		template: wp.template('robocrop-select-item'),
		sizekey:'',
		sizenames:'',
		ratio:0,
		enabled:null,
		render: function() {
			wp.Backbone.View.prototype.render.apply( this, arguments );
			// set indicator size
			if ( this.options.ratio > 1 ) {
				this.$el.find('.format-indicator').height( (1 / this.options.ratio) + 'em' )
			} else if ( this.options.ratio < 1 ) {
				this.$el.find('.format-indicator').width( this.options.ratio + 'em' )
			}
			// disable unavailable sizes
			this.$el.find('input[type="radio"]').prop('disabled', ! this.options.enabled )
		}
	});

	robocrop.view.RobocropImage = wp.media.View.extend({
		className:		'image-robocrop',
		template:		wp.template('robocrop'),
		image_ratios:	image_ratios,
		image_sizes:	image_sizes,
		_croppers:		null,
		events: {
			'click .robocrop-autocrop-current'	: 'autocrop',
			'click .robocrop-autocrop-all'		: 'autocropAll',
		},
		initialize: function( options ) {
		//	wp.media.view.EditImage.prototype.initialize.apply( this, arguments );
			this._croppers 		= {};
			this.image 			= new robocrop.view.Img( {src: this.model.get('url') } );

			this.controller 	= options.controller;
			this.focuspointtool	= new robocrop.view.focuspoint.ImageFocusPointSelect({ image: this.image, focuspoint: {x:0,y:0}, src: this.model.get('url') });
			this.listenTo( this.focuspointtool, 'changed', this.updateFocusPoint );

			wp.media.View.prototype.initialize.apply( this, arguments );
		},
		dismiss:function() {
			var areaSelect = this.$areaSelect()
			areaSelect && areaSelect.remove();
			this.$el.remove();
		},
		createSelect: function() {
			this.select = new robocrop.view.RobocropRatioSelect({
				choices: choices
			});
		},
		hasChanged: function(){
			this.trigger( 'changed' );
		},
		render: function() {
			var self = this;

			wp.media.View.prototype.render.apply(this,arguments);

			this.views.set('.robocrop-content', this.focuspointtool );

			this.focuspointtool.setFocuspoint( this.model.get( 'focuspoint' ) );

			this.image.$el.imgAreaSelect({
				parent: 		this.image.$el.closest('.robocrop-image-box'),
				instance:	 	true,
				handles: 		true,
				keys: 			true,
				persistent:		true,
				enabled:		true,
				movable:		true,
				resizable:		true,
				imageHeight:	this.model.get('height'),
				imageWidth:		this.model.get('width'),
				onSelectEnd: function( image, coords ) {
					var cropdata = robocrop.pointToRectCoords( coords )
					self._setCropSizes(cropdata);
					self.hasChanged();
				}
			});

			// set ratio seelct
			this.selectRatio = new robocrop.view.RobocropRatioSelect({
				tools: {
					focuspoint : {
						title: l10n.SetFocusPoint,
						trigger: 'focuspoint'
					}
				},
				ratios:this.image_ratios,
				model:this.model
			});
			this.selectRatio
				.on('select-ratio', this.onselectratio, this )
				.on('select-tool', this.onselecttool, this )
				.on('select', this.updateButtons, this );

			this.views.set('.select-ratio', this.selectRatio );
			// setTimeout( function(){ },20);

			// buttons
			this.$autoButton	= this.$el.find('.robocrop-autocrop-current');
			this.$autoAllButton	= this.$el.find('.robocrop-autocrop-all');
			return this;
		},
		ready: function() {
			var currentRatio, found;
			wp.media.view.EditImage.prototype.ready.apply(this,arguments);

			if ( ! _.isUndefined( this.options.sizeToSelect ) ) {
				found = _.find( this.image_ratios, function( ratio ){
					return ratio.sizes.indexOf( this.options.sizeToSelect ) > -1;
				}, this );
				if ( found ) {
					currentRatio = found.name;
				}
			}

			if ( _.isUndefined( currentRatio ) ) {
				currentRatio = 'focuspoint';//_.first(_.keys( this.image_ratios ));
			}
			this.selectRatio.setSelected( currentRatio );
			return this;
		},
		save: function() {
			var data = {
					attachments:{}
				}, id = this.model.get('id'),
				$btns = this.$autoAllButton.add( this.$autoButton ).prop( 'disabled', true ),
				self = this;
			data.attachments[id] = {
				sizes:		this.model.get('sizes'),
				focuspoint: this.model.get('focuspoint')
			};
			this.model.saveCompat( data, {} ).done( function( resp ) {
				var d = new Date();

				// force reload image ...
				_.each( self.model.attributes.sizes, function( size, sizename ) {
					var selector =  'img[src^="'+size.url+'"]',
						refresh = function() {
								$(this).removeAttr('src').attr( 'src', size.url+'?'+d.getTime() );
							};
						refresh_mce = function() {
								$(this).removeAttr('data-mce-src').attr( 'data-mce-src', size.url+'?'+d.getTime() );
							};

					// ... unless it's fullsize ...
					if ( sizename !== 'full' ) {

						$(document).add( $('iframe').contents() )
							.find( selector )
							.each( refresh );

						// ... inside tinymce iframes
						$('.mce-edit-area iframe').each(function(){
							$(this).contents()
								.find( selector )
								.each( refresh )
								.each( refresh_mce );
						});
					}
				}, self );
				$btns.prop( 'disabled', false );
				self.trigger( 'saved' );
			});
			return this;
		},
		updateButtons: function(){
			var toolkey = this.selectRatio.getSelected();
			this.$autoButton.toggleClass( 'hidden', toolkey === 'focuspoint' );
			this.$autoAllButton.toggleClass( 'hidden', toolkey !== 'focuspoint' );
		},
		onselecttool: function(){
			var toolkey = this.selectRatio.getSelected();
			this.$areaSelect().cancelSelection();

			switch ( toolkey ) {
				case 'focuspoint':
					// wrap around
					this.focuspointtool.setEnabled( true );
					break;
			}
		},
		onselectratio: function( ) {
			this.focuspointtool.setEnabled( false );

			/**
			 *	On switch ratio
			 */
			var ratiokey = this.selectRatio.getSelected(),
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
			if ( ! this.image.$el.get(0).complete ) {
				this.image.$el.on('load',function() {
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
			cropdata = robocrop.cropFromFocusPoint( imageinfo, this.current_ratio );
			cropdata = robocrop.relToAbsCoords( cropdata, imageinfo );

			this._setCropSizes( cropdata );
			this.selectCrop( cropdata );

			return this;
		},
		autocropAll: function( event ) {
			var self = this,
				imageinfo = {
					width:		this.model.get('width'),
					height:		this.model.get('height'),
					focuspoint:	this.model.get('focuspoint')
				};

			_.each( this.image_ratios, function( ratio ) {
				var cropdata;
				cropdata = robocrop.cropFromFocusPoint( imageinfo, ratio );
				cropdata = robocrop.relToAbsCoords( cropdata, imageinfo );
				self._setCropSizes( cropdata, ratio );
			} );

			return this;
		},
		selectCrop:function( rect ) {
			// draw crop UI element.
			var factor = this._image_scale_factor(),
				points = robocrop.rectToPointCoords( rect ),
				$areaSelect = this.$areaSelect();

			$areaSelect.setSelection( points.x1, points.y1, points.x2, points.y2, false );
			$areaSelect.setOptions( {show:true} );
			$areaSelect.update();
			return this;
		},
		$areaSelect : function(){
			return this.image.$el.data('imgAreaSelect');
		},
		_image_scale_factor : function() {
			var $container = this.image.$el.closest('.robocrop-image-box'),
				w = Math.min(this.model.get('width'),$container.width()),
				h = Math.min(this.model.get('height'),$container.height());

			return Math.min( w / this.model.get('width'), h / this.model.get('height') );
		},
		updateFocusPoint: function( ) {
			this.model.set( 'focuspoint', this.focuspointtool.getFocuspoint() );
		},
		_setCropSizes : function( cropdata, ratio ) {
			var w = this.model.get('width'),
				h = this.model.get('height'),
				modelSizes = this.model.get('sizes'),
				ratio = ratio || this.current_ratio;

			_.each(ratio.sizes, function( sizename ) {
				//*
				// var cancrop =	(w >= image_sizes[sizename].width) &&
				// 				(h >= image_sizes[sizename].height);

				! modelSizes[ sizename ] && ( modelSizes[ sizename ] = {} );
				modelSizes[ sizename ].cropdata = cropdata;

				if ( /*cancrop && */ image_sizes[sizename].crop ) {
					modelSizes[ sizename ].cropdata = cropdata;
				} else if ( 'undefined' !== typeof modelSizes[ sizename ] ) {
					delete( modelSizes[ sizename ] );
				}
				/*/
				! modelSizes[ sizename ] && ( modelSizes[ sizename ] = {} );
				modelSizes[ sizename ].cropdata = cropdata;
				//*/
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




	robocrop.view.Frame = wp.media.view.MediaFrame.extend({
		template:  wp.template('robocrop-modal'),
		regions:   ['title','content','instructions','buttons','ratios']
	});

	robocrop.view.Frame.Crop = robocrop.view.Frame.extend({
		events: {
			'click .robocrop-save'		: 'save',
			'click .robocrop-cancel'	: 'close',
		},
		save: function() {
			this.$('.robocrop-save, .robocrop-cancel').prop( 'disabled', true );
			this._content.save();
		},
		initialize: function( options ) {
			robocrop.view.Frame.prototype.initialize.apply( this, arguments );

			this.createTitle();
			this.createContent();
			this.createButtons();

			this.on('close', this.dismiss, this );
			this.listenTo( this._content, 'saved', this.modelSync );
		},
		modelSync: function(){
			this.$('.robocrop-save, .robocrop-cancel').prop( 'disabled', false );
		},
		dismiss:function(){
			this._content.dismiss();
		},
		createTitle: function( ) {
			this._title = new wp.media.View({
				tagName: 'h1'
			});
			this._title.$el.text( l10n.AttachmentDetails ); // "Crop image sizes"
			this.title.set( [ this._title ] );
		},
		createContent: function() {
			var opts = _.extend({
				controller: this.controller,
				model: this.model
			}, this.options );
			this._content = new robocrop.view.RobocropImage( opts );
			this.content.set( [ this._content ] );
		},
		createButtons: function() {
			var info, btn;

			this.buttons.set( [
				new wp.media.view.Button({
					text: l10n.Close,
					className: 'button-secondary robocrop-cancel'
				}),
				new wp.media.view.Button({
					text: l10n.SaveChanges,
					className: 'button-primary robocrop-save'
				})
			] );
		}
	});




})(wp,jQuery);

(function(wp,$) {

	var robocrop = wp.media.robocrop,
		image_ratios = robocrop.image_ratios,
		image_sizes  = robocrop.image_sizes,
		l10n = robocrop.l10n;

	var View		= wp.media.View,
		MediaFrame	= wp.media.view.MediaFrame,
		FocusPoint,
		CropRect;

	robocrop.view.focuspoint = {};

	CropRect = robocrop.view.focuspoint.CropRect = View.extend({
		template: wp.template('croprect'),
		className:	'tool-croprect',
		controller:null,
		events: {
			'mouseenter .label' : 'showHilite',
			'mouseleave .label' : 'hideHilite',
		},
		initialize: function() {
			var self = this;
			View.prototype.initialize.apply(this,arguments);

			_.defaults( this.options, {
				focuspoint: null, // focuspoint coords
				ratio: null
			} );

			this.options.label = this.options.ratio.name;

			this.controller = this.options.controller;
			this.listenTo( this.controller.image, 'load', this.imageLoaded );

			return this;
		},
		imageLoaded:function( image ) {
			this.$el.attr( 'data-dir', this.options.ratio.ratio > image.ratio ? 'w' : 'h' );
			this.$el.css( 'width', Math.min( 1, this.options.ratio.ratio / image.ratio ) * 100 +'%' );
			this.setFocuspoint( );
			// set position from fosuspoint
		},
		setFocuspoint:function( focuspoint ) {
			if ( !!focuspoint ) {
				this.options.focuspoint = focuspoint;
			}
			var imageinfo = {
					width		: this.controller.image.$el.width(),
					height		: this.controller.image.$el.height(),
					focuspoint	: this.options.focuspoint,
				},
				res = robocrop.cropFromFocusPoint( imageinfo, this.options.ratio ),
				coord = robocrop.relToAbsCoords( res, imageinfo );
 			this.$el.css('left',coord.x + 'px' );
 			this.$el.css('top',coord.y + 'px' );
 			return this;
		},
		showHilite: function(e){
			this.$el.attr('data-hilite','true');
			this.trigger('hilite:show');
			return this;
		},
		hideHilite: function(e){
			this.$el.attr('data-hilite','false');
			this.trigger('hilite:hide');
			return this;
		}
	});

	FocusPoint = robocrop.view.focuspoint.FocusPoint = View.extend({
		className:	'tool-focuspoint',
		template:	wp.template('focuspoint'),
		labelView:		null,
		initialize: function(){
			var self = this;
			_.defaults( this.options, {
				focuspoint:{x:0,y:0},
				enabled: false ,
				cropRects:[]
			} );
			this.options.cropRects.sort(function(a,b){
				return b.options.ratio.ratio - a.options.ratio.ratio;
			});

			this.$el.on('click', function( event ) {
				self.clickFocuspoint( event );
			});
			return this;
		},
		render:function(){
			var self = this;
			View.prototype.render.apply(this,arguments);
			_.each( this.options.cropRects, function( rect ){
				rect.render();
				self.$el.append( rect.$el );
			});
			return this;
		},
		setEnabled: function( enabled ) {
			var prev = this.options.enabled;
			this.options.enabled = enabled;
			this.$el.attr( 'data-enabled', enabled.toString() );
			return prev;
		},
		clickFocuspoint: function( event ) {
			var offs;
			if ( this.options.enabled ) {
				offs = this.$el.offset();
				this.setFocuspoint( {
					x:  2 * (event.pageX - offs.left ) / this.$el.width()  - 1,
					y: -2 * (event.pageY - offs.top ) / this.$el.height() + 1,
				} );
			}
		},
		getFocuspoint: function() {
			return this.focuspoint;
		},
		setFocuspoint: function( focuspoint ) {
			var self = this;

			this.focuspoint = focuspoint;

			this.$el.find('.focuspoint').css({
				left: 	((focuspoint.x + 1) * 50)+'%',
				bottom:	((focuspoint.y + 1) * 50)+'%'
			});

			_.each( this.options.cropRects, function(rect){
				rect.setFocuspoint( self.focuspoint );
			});
			if ( this.options.enabled ) {
				this.trigger('change:focuspoint', this.focuspoint );
			}
			return this;
		},
	});

	robocrop.view.focuspoint.ImageFocusPointSelect = View.extend({
		className:	'robocrop-image-box',
		cropRects: [],
		initialize: function( ){

			_.defaults( this.options, {
				controller: this,
				focuspoint: {x:0,y:0},
				src: false,
				image: false,
				enabled: false,
			} );

			var self = this;

			if ( this.options.image !== false && (this.options.image.constructor.prototype == robocrop.view.Img.prototype ) ) {
				this.image = this.options.image;
			} else if ( this.options.src !== false ) {
				this.image	= new robocrop.view.Img( { src: this.options.src });
			} else  {
				this.image = new robocrop.view.Img( { src: '' }, this.options.image);
			}

			this.cropRects = [];
			_.each( image_ratios, function( ratio, key ) {
				var rect = new CropRect( {
					controller: self,
					focuspoint: self.options.focuspoint,
					ratio: ratio
				} );
				self.listenTo(rect,'hilite:show',self.showHilite );
				self.listenTo(rect,'hilite:hide',self.hideHilite );
				self.cropRects.push( rect );
			});

			this.focuspoint	= new FocusPoint({
				controller: this.controller,
				focuspoint: this.options.focuspoint,
				enabled: 	this.options.enabled,
				cropRects:	this.cropRects,
			});

			this.listenTo( this.focuspoint, 'change:focuspoint', this.valueChanged );
			this.listenTo( this.image, 'load', this.setHeight );

			this.views.set( [ this.image, this.focuspoint ] );

			return this;
		},
		setHeight:function(){
			var newHeight = Math.min( this.$el.parent().height(), this.image.$el.height() );
			this.$el.height( newHeight )
		},
		setEnabled: function( enabled ) {

			return this.focuspoint.setEnabled( enabled )
		},
		getFocuspoint: function() {
			return this.focuspoint.getFocuspoint();
		},
		setFocuspoint: function( focuspoint ) {
			this.focuspoint && this.focuspoint.setFocuspoint( focuspoint );
			return this;
		},
		getImageWidth: function( ) {
			return this.image.$el.get(0).naturalWidth;
		},
		getImageHeight: function( ) {
			return this.image.$el.get(0).naturalHeight;
		},
		setSrc: function( src ) {
			this.image.$el.attr( 'src', src );
			return this;
		},
		valueChanged: function() {
			this.trigger('changed');
		},
		showHilite: function(e){
			this.$el.attr('data-hilite','true');
		},
		hideHilite: function(e){
			this.$el.attr('data-hilite','false');
		}
	});

	robocrop.view.Frame.Focuspoint = robocrop.view.Frame.extend({
		className: 'ask-focuspoint media-frame',
		events: {
			'click .reset': 'reset',
			'click .proceed': 'proceed',
			'click .cancel-upload': 'cancelUpload',
		},
		initialize: function( ) {

			_.defaults( this.options, {
				uploader:	false,
				title:		l10n.SetFocusPoint,
				modal: this.options ? this.options.modal : false,
				src: '' // expecting an img element
			});

			robocrop.view.Frame.prototype.initialize.apply(this,arguments);

			if ( this.modal ) {
				this.modal.on('escape', this.cancelUpload, this );
			}
			this.createTitle();
			this.createContent();
			this.createInstructions();
			this.createButtons();
			return this;
		},
// 		render: function() {
// 			// frame layout
//
// 			robocrop.view.Modal.prototype.render.apply(this,arguments);
// 		},
		createTitle: function( ) {
			this._title = new wp.media.View({
				tagName: 'h1'
			});
			this._title.$el.text( this.options.title );
			this.title.set( [ this._title ] );
		},
		createContent: function() {
			this._content = new robocrop.view.focuspoint.ImageFocusPointSelect({
				src: '',
				focuspoint:{ x:0, y:0 },
				controller: this,
				enabled: true,
				toolbar:this.tools
			});
			this.content.set( [ this._content ] );
		},
		createInstructions: function() {
			var info, btn;
			this.instructions.set( [
				new wp.media.View({
					el: $( '<div class="instructions">' + l10n.FocusPointInstructions + '</div>' )[0],
					priority: -40
				}),
			] );
		},
		createButtons: function() {
			var info, btn;

			this.buttons.set( [
				new wp.media.view.Button({
					text: l10n.Cancel,
					className: 'cancel-upload'
				}),
				new wp.media.view.Button({
					text: l10n.Reset,
					className: 'reset'
				}),
				new wp.media.view.Button({
					text: l10n.Upload,
					className: 'button-primary proceed'
				})
			] );
		},

		setSrc: function( src ) {
			this._content.setSrc( src );
		},
		setFile: function( file ) {
			var self = this, fr = new FileReader();
			fr.onload = function( event ) {
				self.setSrc( fr.result );
			}
			fr.readAsDataURL( file );
		},
		setFocuspoint: function( focuspoint ) {
			this._content.setFocuspoint( focuspoint );
			this._content.setEnabled(true);
		},
		getFocuspoint: function( ) {
			return this._content.getFocuspoint();
		},
		getImageWidth: function( ) {
			return this._content.getImageWidth();
		},
		getImageHeight: function( ) {
			return this._content.getImageHeight();
		},
		reset: function( event ) {
			this.setFocuspoint( { x:0, y:0 } )
		},
		proceed: function( event ) {
			this.trigger('proceed');
		},
		cancelUpload: function( event ) {
			// remove from queue!
			this.trigger('cancel-upload');
			this.close();
		}
	});

})(wp,jQuery);

(function(wp,$) {

	var robocrop 		= wp.media.robocrop,
		image_ratios	= robocrop.image_ratios,
		image_sizes		= robocrop.image_sizes,
		l10n			= robocrop.l10n,
		options			= robocrop.options,
		cropBtnHTML		= '<button type="button" class="button robocrop-open">'+l10n.EditImageSizes+'</button>',
		cropLinkHTML	= '<button type="button" class="button-link robocrop-open">'+l10n.EditImageSizes+'</button>';

	var robocropStateExtend = {
		createStates: function() {
			this._parentCreateStates.apply(this,arguments);
			this.states.add(
				new robocrop.controller.RobocropImage( {
					model: this.model,
					selection: this.options.selection
				} )
			);
		}
	};

	// post inline image editor
	_.extend( wp.media.view.ImageDetails.prototype, {
		_parentPostRender: wp.media.view.ImageDetails.prototype.postRender,
		postRender: function() {
			this._parentPostRender.apply( this, arguments );
			this.$el.find('.actions').append(cropBtnHTML);
		},
		robocropOpen: function( event ) {
			var size = this.model.get('size'),
				croptool = new robocrop.view.Frame.Crop( {
					controller: this.controller,
					model: this.controller.image.attachment,
					sizeToSelect: size
				} );
			croptool.open();
		}
	});
	wp.media.view.ImageDetails.prototype.events['click .robocrop-open'] = 'robocropOpen';


	// Inline MediaLibrary, Grid view MediaLibrary
	_.extend( wp.media.view.Attachment.Details.prototype, {
		_parentRender: wp.media.view.Attachment.Details.prototype.render,
		render: function() {
			this._parentRender.apply(this,arguments);

			// media library screeN
			if ( ['image/jpeg','image/png','image/gif'].indexOf( this.model.get('mime') ) >= 0 ) {
				this.$('.attachment-actions').append(cropBtnHTML);
				$( cropLinkHTML ).insertAfter( this.$el.find( 'a.edit-attachment' ) );
			}
		},
		robocropOpen: function( event ) {
			var croptool = new robocrop.view.Frame.Crop( {
					controller: this.controller,
					model: this.model
				});
			croptool.open();
		},
		_parentCreateStates: wp.media.view.Attachment.Details.prototype.createStates
	}, robocropStateExtend );

	wp.media.view.Attachment.Details.prototype.events['click .robocrop-open'] = 'robocropOpen';


})(wp,jQuery);

(function( $ ) {

	var robocrop = wp.media.robocrop,
		image_ratios = robocrop.image_ratios,
		options = robocrop.options,
		imageInfos = {};

	/**
	 *	Early return if autocrop is disabled
	 */
	if ( ! options.ask_for_focuspoint ) {
		return;
	}

	_.extend( wp.media.view.UploaderWindow.prototype, {
		_parentReady: wp.media.view.UploaderWindow.prototype.ready,
		didReady:false,

		ready:function() {
			var askFocusImages = [],
				askModal, self = this;

			// prevent double init
			if ( this.didReady ) {
				return this._parentReady.apply( this , arguments );
			}
			this.didReady = true;

			ret = this._parentReady.apply( this , arguments );

			function askFocus( uploader ) {
				var fileItem, src;
				if ( askModal ) {
					askModal.close().dispose();
				}
				if ( !! askFocusImages.length ) {
					fileItem = askFocusImages.shift();
					askModal = new robocrop.view.Frame.Focuspoint({ controller: $(this) });
					askModal.on('proceed',function() {
						imageInfos[fileItem.file.name] = {
							focuspoint:	askModal.getFocuspoint(),
							width:		askModal.getImageWidth(),
							height:		askModal.getImageHeight()
						};
						askFocus( uploader );
					}).on('cancel-upload',function() {
						fileItem.file.attachment.destroy();
					});
					askModal.setFocuspoint({x:0,y:0});
					askModal.setFile( fileItem.blob );
					askModal.open();
				} else {
					uploader.start();
				}
			}

			function addAskFocus( fileData, uploader ) {
				askFocusImages.push( fileData );
			}

			/**
			 *	@return native file object or blob
			 */
			function resolveFile( file ) {
				var _ret = {
					file: file,
					blob:file.getNative()
				}, _ret2, bytes, i;
				if ( ! _ret.blob ) {
					_ret.blob = file.getSource();
				}
				return _ret;
			}

			// stop uploader and generate cropdata
			this.uploader.uploader.bind('FilesAdded',function( up, files ) {
				var fileData;

				// put modal
				for (var i=0;i<files.length;i++) {
					if ( files[i].type == 'image/png' || files[i].type == 'image/jpeg' ) {
						fileData = resolveFile( files[i] );
						if ( fileData.blob instanceof Blob ) {
							addAskFocus( fileData, up );
						}
					}
				}
				if ( askFocusImages.length ) {
					up.stop();
					up.refresh();
					askFocus( up ); // will ask for focus or start uploader
					console.log("askfocus");
				}
			});
			// send cropdata
			this.uploader.uploader.bind('BeforeUpload',function( up, file ) {
				var s, cropdata, focuspoint;

				if ( imageInfos[file.name] ) {

					// add focus point and cropdata to file
					imageinfo = imageInfos[file.name];
					cropdata = {};
					for (s in image_ratios) {
						cropdata[ image_ratios[s].name ] = robocrop.cropFromFocusPoint( imageinfo, image_ratios[s] );
					}

					up.settings.multipart_params.focuspoint	= JSON.stringify( imageinfo.focuspoint );
					up.settings.multipart_params.cropdata	= JSON.stringify( cropdata );

					delete(imageInfos[file.name])
				}
			});
			return ret;
		}
	});

})( jQuery );

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJvYm9jcm9wLWJhc2UuanMiLCJyb2JvY3JvcC1tZWRpYS12aWV3LmpzIiwicm9ib2Nyb3AtZm9jdXNwb2ludC1tZWRpYS12aWV3LmpzIiwicm9ib2Nyb3Atd3AtbWVkaWEtdmlldy5qcyIsInJvYm9jcm9wLWZvY3VzcG9pbnQtd3AtdXBsb2FkZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNpQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbFZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFkbWluL3dwLXJvYm9jcm9wLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAcHJlc2VydmUgKGMpIDIwMTYgYnkgSm9lcm4gTHVuZFxuICogQGxpY2Vuc2UgR1BMM1xuICovXG4oZnVuY3Rpb24oIGV4cG9ydHMgKXtcblx0dmFyIHJvYm9jcm9wO1xuXG5cdHJvYm9jcm9wID0gXy5leHRlbmQoIHdpbmRvdy5yb2JvY3JvcCwge1xuXHRcdGNyb3BGcm9tRm9jdXNQb2ludDogZnVuY3Rpb24oIGltYWdlaW5mbywgY3JvcGluZm8gKSB7XG5cdFx0XHQvLyBub3JtYWxpemUgXG5cdFx0XHR2YXIgZnBfeCA9ICAgKCAgaW1hZ2VpbmZvLmZvY3VzcG9pbnQueCArIDEpIC8gMiAqIGltYWdlaW5mby53aWR0aCxcblx0XHRcdFx0ZnBfeSA9ICAgKCAtaW1hZ2VpbmZvLmZvY3VzcG9pbnQueSArIDEpIC8gMiAqIGltYWdlaW5mby5oZWlnaHQsXG5cdFx0XHRcdHNjYWxlID0gTWF0aC5taW4oIGltYWdlaW5mby53aWR0aCAvIGNyb3BpbmZvLm1pbl93aWR0aCwgaW1hZ2VpbmZvLmhlaWdodCAvIGNyb3BpbmZvLm1pbl9oZWlnaHQgKSxcblx0XHRcdFx0Y3JvcF93ID0gY3JvcGluZm8ubWluX3dpZHRoICogc2NhbGUsXG5cdFx0XHRcdGNyb3BfaCA9IGNyb3BpbmZvLm1pbl9oZWlnaHQgKiBzY2FsZSxcblx0XHRcdFx0Y3JvcF94ID0gTWF0aC5taW4oIE1hdGgubWF4KCBmcF94IC0gY3JvcF93IC8gMiwgMCApICwgaW1hZ2VpbmZvLndpZHRoIC0gY3JvcF93KSxcblx0XHRcdFx0Y3JvcF95ID0gTWF0aC5taW4oIE1hdGgubWF4KCBmcF95IC0gY3JvcF9oIC8gMiwgMCApICwgaW1hZ2VpbmZvLmhlaWdodCAtIGNyb3BfaCk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRuYW1lczogY3JvcGluZm8uc2l6ZXMsXG5cdFx0XHRcdHg6IGNyb3BfeCAvIGltYWdlaW5mby53aWR0aCxcblx0XHRcdFx0eTogY3JvcF95IC8gaW1hZ2VpbmZvLmhlaWdodCxcblx0XHRcdFx0d2lkdGg6IGNyb3BfdyAvIGltYWdlaW5mby53aWR0aCxcblx0XHRcdFx0aGVpZ2h0OiBjcm9wX2ggLyBpbWFnZWluZm8uaGVpZ2h0XG5cdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRyZWxUb0Fic0Nvb3JkczogZnVuY3Rpb24oIGNyb3BkYXRhLCBpbWFnZWluZm8gKSB7XG5cdFx0XHR2YXIgcywgcmV0ID0ge307XG5cdFx0XHRmb3IgKCBzIGluIGNyb3BkYXRhICkge1xuXHRcdFx0XHRzd2l0Y2ggKCBzICkge1xuXHRcdFx0XHRcdGNhc2UgJ3gnOlxuXHRcdFx0XHRcdGNhc2UgJ3gxJzpcblx0XHRcdFx0XHRjYXNlICd4Mic6XG5cdFx0XHRcdFx0Y2FzZSAnd2lkdGgnOlxuXHRcdFx0XHRcdFx0cmV0W3NdID0gY3JvcGRhdGFbc10gKiBpbWFnZWluZm8ud2lkdGhcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ3knOlxuXHRcdFx0XHRcdGNhc2UgJ3kxJzpcblx0XHRcdFx0XHRjYXNlICd5Mic6XG5cdFx0XHRcdFx0Y2FzZSAnaGVpZ2h0Jzpcblx0XHRcdFx0XHRcdHJldFtzXSA9IGNyb3BkYXRhW3NdICogaW1hZ2VpbmZvLmhlaWdodFxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdHJldFtzXSA9IGNyb3BkYXRhW3NdO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiByZXQ7XG5cdFx0fSxcblx0XHRhYnNUb1JlbENvb3JkczogZnVuY3Rpb24oIGNyb3BkYXRhLCBpbWFnZWluZm8gKSB7XG5cdFx0XHR2YXIgcywgcmV0ID0ge307XG5cdFx0XHRmb3IgKCBzIGluIGNyb3BkYXRhICkge1xuXHRcdFx0XHRzd2l0Y2ggKCBzICkge1xuXHRcdFx0XHRcdGNhc2UgJ3gnOlxuXHRcdFx0XHRcdGNhc2UgJ3gxJzpcblx0XHRcdFx0XHRjYXNlICd4Mic6XG5cdFx0XHRcdFx0Y2FzZSAnd2lkdGgnOlxuXHRcdFx0XHRcdFx0cmV0W3NdID0gY3JvcGRhdGFbc10gLyBpbWFnZWluZm8ud2lkdGhcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ3knOlxuXHRcdFx0XHRcdGNhc2UgJ3kxJzpcblx0XHRcdFx0XHRjYXNlICd5Mic6XG5cdFx0XHRcdFx0Y2FzZSAnaGVpZ2h0Jzpcblx0XHRcdFx0XHRcdHJldFtzXSA9IGNyb3BkYXRhW3NdIC8gaW1hZ2VpbmZvLmhlaWdodFxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdHJldFtzXSA9IGNyb3BkYXRhW3NdO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiByZXQ7XG5cdFx0fSxcblxuXHRcdHBvaW50VG9SZWN0Q29vcmRzOmZ1bmN0aW9uKCBwb2ludHMgKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR4OiBwb2ludHMueDEsXG5cdFx0XHRcdHk6IHBvaW50cy55MSxcblx0XHRcdFx0d2lkdGg6ICBwb2ludHMueDIgLSBwb2ludHMueDEsXG5cdFx0XHRcdGhlaWdodDogcG9pbnRzLnkyIC0gcG9pbnRzLnkxXG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHJlY3RUb1BvaW50Q29vcmRzOmZ1bmN0aW9uKCByZWN0ICkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0eDE6IHJlY3QueCxcblx0XHRcdFx0eTE6IHJlY3QueSxcblx0XHRcdFx0eDI6IChyZWN0Lm1heFggPyByZWN0Lm1heFggOiByZWN0LngrcmVjdC53aWR0aCksXG5cdFx0XHRcdHkyOiAocmVjdC5tYXhZID8gcmVjdC5tYXhZIDogcmVjdC55K3JlY3QuaGVpZ2h0KSxcblx0XHRcdH07XG5cdFx0fSxcblxuXHRcdHZpZXcgOiB7fSxcblx0XHRjb250cm9sbGVyIDoge31cblx0fSk7XG5cblx0ZXhwb3J0cy5tZWRpYS5yb2JvY3JvcCA9IHJvYm9jcm9wO1xuXG59KSggd3AgKTsiLCIoZnVuY3Rpb24od3AsJCkge1xuXG5cdHZhciByb2JvY3JvcCBcdFx0PSB3cC5tZWRpYS5yb2JvY3JvcCxcblx0XHRpbWFnZV9yYXRpb3NcdD0gcm9ib2Nyb3AuaW1hZ2VfcmF0aW9zLFxuXHRcdGltYWdlX3NpemVzXHRcdD0gcm9ib2Nyb3AuaW1hZ2Vfc2l6ZXMsXG5cdFx0bDEwblx0XHRcdD0gcm9ib2Nyb3AubDEwbixcblx0XHRvcHRpb25zXHRcdFx0PSByb2JvY3JvcC5vcHRpb25zO1xuXG5cblx0LyoqXG5cdCAqXHRBbiBJbWFnZVxuXHQgKi9cblx0cm9ib2Nyb3Audmlldy5JbWcgPSB3cC5tZWRpYS5WaWV3LmV4dGVuZCh7XG5cdFx0Y2xhc3NOYW1lOidhdHRhY2htZW50LWltYWdlJyxcblx0XHR0YWdOYW1lOidpbWcnLFxuXHRcdGlkOidyb2JvY3JvcC1pbWFnZScsXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHRfLmRlZmF1bHRzKCB0aGlzLm9wdGlvbnMsIHtzcmM6Jyd9ICk7XG5cdFx0XHR0aGlzLiRlbC5vbignbG9hZCcsZnVuY3Rpb24oKXtcblx0XHRcdFx0c2VsZi53aWR0aCA9IHNlbGYuJGVsLmdldCgwKS5uYXR1cmFsV2lkdGg7XG5cdFx0XHRcdHNlbGYuaGVpZ2h0ID0gc2VsZi4kZWwuZ2V0KDApLm5hdHVyYWxIZWlnaHQ7XG5cdFx0XHRcdHNlbGYucmF0aW8gPSBzZWxmLndpZHRoIC8gc2VsZi5oZWlnaHQ7XG5cdFx0XHRcdHNlbGYudHJpZ2dlcignbG9hZCcsc2VsZik7XG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ3NyYycsIHRoaXMub3B0aW9ucy5zcmMgKTtcblx0XHR9LFxuXHRcdGdldFNyYzogZnVuY3Rpb24oc3JjKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kZWwuYXR0ciggJ3NyYycgKTtcblx0XHR9LFxuXHRcdHNldFNyYzogZnVuY3Rpb24oc3JjKSB7XG5cdFx0XHQhIXNyYyAmJiB0aGlzLiRlbC5hdHRyKCAnc3JjJywgc3JjICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdH0pO1xuXG5cblx0LyoqXG5cdCAqXHRSYXRpbyBzZWxlY3QgbGlzdFxuXHQgKi9cblx0cm9ib2Nyb3Audmlldy5Sb2JvY3JvcFJhdGlvU2VsZWN0ID0gd3AubWVkaWEuVmlldy5leHRlbmQoe1xuXHRcdGNsYXNzTmFtZTogJ3JvYm9jcm9wLXNlbGVjdCcsXG5cdFx0dGVtcGxhdGU6IHdwLnRlbXBsYXRlKCdyb2JvY3JvcC1zZWxlY3QnKSxcblx0XHRldmVudHM6IHtcblx0XHRcdCdjaGFuZ2UgW25hbWU9XCJyb2JvY3JvcC1zZWxlY3QtcmF0aW9cIl0nOiAnc2VsZWN0UmF0aW8nLFxuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR3cC5CYWNrYm9uZS5WaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdF8uZGVmYXVsdHMoe1xuXHRcdFx0XHRyYXRpb3M6e30sXG5cdFx0XHRcdHRvb2xzOnt9XG5cdFx0XHR9LHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLm9wdGlvbnMubDEwbiA9IGwxMG47XG5cblx0XHR9LFxuXHRcdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR3cC5CYWNrYm9uZS5WaWV3LnByb3RvdHlwZS5yZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHRfLmVhY2goIHRoaXMub3B0aW9ucy50b29scywgZnVuY3Rpb24oIHRvb2wsIGtleSApIHtcblx0XHRcdFx0c2VsZi52aWV3cy5hZGQobmV3IHJvYm9jcm9wLnZpZXcuUm9ib2Nyb3BSYXRpb1NlbGVjdEl0ZW0oe1xuXHRcdFx0XHRcdHJhdGlva2V5Olx0a2V5LFxuXHRcdFx0XHRcdHNpemVuYW1lczpcdGZhbHNlLFxuXHRcdFx0XHRcdHJhdGlvOiBcdFx0a2V5LFxuXHRcdFx0XHRcdHRpdGxlOlx0XHR0b29sLnRpdGxlLFxuXHRcdFx0XHRcdGVuYWJsZWQ6IFx0dHJ1ZVxuXHRcdFx0XHR9KSlcblxuXHRcdFx0fSk7XG5cdFx0XHRfLmVhY2goIHRoaXMub3B0aW9ucy5yYXRpb3MsIGZ1bmN0aW9uKCByYXRpbywga2V5ICkge1xuXHRcdFx0XHR2YXIgbmFtZXMgPSBbXSxcblx0XHRcdFx0XHR0cGxfc3RyID0gJzxzcGFuIGNsYXNzPVwic2l6ZW5hbWU8JT0gY2FuY3JvcCA/IFwiXCIgOiBcIiBkaXNhYmxlZFwiICU+XCI+PCU9IG5hbWUgJT4gKDwlPSB3aWR0aCAlPsOXPCU9IGhlaWdodCAlPik8L3NwYW4+Jyxcblx0XHRcdFx0XHRuYW1lX3RwbCA9IF8udGVtcGxhdGUodHBsX3N0cik7XG5cdFx0XHRcdF8uZWFjaCggcmF0aW8uc2l6ZXMsIGZ1bmN0aW9uKHNpemVuYW1lLGtleSkge1xuXHRcdFx0XHRcdHZhciBzaXplID0gJC5leHRlbmQoIHRydWUsIHtcblx0XHRcdFx0XHRcdGNhbmNyb3AgOlx0KHNlbGYubW9kZWwuZ2V0KCd3aWR0aCcpID49IGltYWdlX3NpemVzW3NpemVuYW1lXS53aWR0aCkgJiZcblx0XHRcdFx0XHRcdFx0XHRcdChzZWxmLm1vZGVsLmdldCgnaGVpZ2h0JykgPj0gaW1hZ2Vfc2l6ZXNbc2l6ZW5hbWVdLmhlaWdodClcblx0XHRcdFx0XHR9LCBpbWFnZV9zaXplc1tzaXplbmFtZV0pO1xuXHRcdFx0XHRcdGlmICggc2l6ZS5jcm9wICkge1xuXHRcdFx0XHRcdFx0bmFtZXMucHVzaCggbmFtZV90cGwoIHNpemUgKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdHNlbGYudmlld3MuYWRkKG5ldyByb2JvY3JvcC52aWV3LlJvYm9jcm9wUmF0aW9TZWxlY3RJdGVtKHtcblx0XHRcdFx0XHRyYXRpb2tleTpcdGtleSxcblx0XHRcdFx0XHRzaXplbmFtZXM6XHRuYW1lcy5qb2luKCcnKSxcblx0XHRcdFx0XHRyYXRpbzogXHRcdHJhdGlvLnJhdGlvLFxuXHRcdFx0XHRcdHRpdGxlOlx0XHRyYXRpby5uYW1lLFxuXHRcdFx0XHRcdGVuYWJsZWQ6IFx0KHNlbGYubW9kZWwuZ2V0KCd3aWR0aCcpICA+PSByYXRpby5taW5fd2lkdGgpICYmXG5cdFx0XHRcdFx0XHRcdFx0KHNlbGYubW9kZWwuZ2V0KCdoZWlnaHQnKSA+PSByYXRpby5taW5faGVpZ2h0KVxuXHRcdFx0XHR9KSlcblx0XHRcdH0gKTtcblxuXG5cdFx0fSxcblx0XHRzZXRTZWxlY3RlZDogZnVuY3Rpb24oIHJhdGlva2V5ICkge1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnW25hbWU9XCJyb2JvY3JvcC1zZWxlY3QtcmF0aW9cIl1bdmFsdWU9XCInK3JhdGlva2V5KydcIl0nKS5wcm9wKCdjaGVja2VkJyx0cnVlKTtcblx0XHRcdHRoaXMuc2VsZWN0UmF0aW8oKTtcblx0XHR9LFxuXHRcdGdldFNlbGVjdGVkOiBmdW5jdGlvbiggKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kZWwuZmluZCgnW25hbWU9XCJyb2JvY3JvcC1zZWxlY3QtcmF0aW9cIl06Y2hlY2tlZCcpLnZhbCgpO1xuXHRcdH0sXG5cdFx0c2VsZWN0UmF0aW86IGZ1bmN0aW9uKCBldmVudCApIHtcblxuXHRcdFx0aWYgKCAhISB0aGlzLm9wdGlvbnMucmF0aW9zWyB0aGlzLmdldFNlbGVjdGVkKCkgXSApIHtcblx0XHRcdFx0dGhpcy50cmlnZ2VyKCdzZWxlY3QtcmF0aW8nKTtcblx0XHRcdH0gZWxzZSBpZiAoICEhIHRoaXMub3B0aW9ucy50b29sc1sgdGhpcy5nZXRTZWxlY3RlZCgpIF0gKSB7XG5cdFx0XHRcdHRoaXMudHJpZ2dlcignc2VsZWN0LXRvb2wnKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy50cmlnZ2VyKCdzZWxlY3QnKTtcblx0XHR9XG5cdH0pO1xuXG5cdC8qKlxuXHQgKlx0UmF0aW8gc2VsZWN0IGxpc3QgSXRlbVxuXHQgKi9cblx0cm9ib2Nyb3Audmlldy5Sb2JvY3JvcFJhdGlvU2VsZWN0SXRlbSA9IHdwLm1lZGlhLlZpZXcuZXh0ZW5kKHtcblx0XHRjbGFzc05hbWU6ICdyb2JvY3JvcC1zZWxlY3QtaXRlbScsXG5cdFx0dGVtcGxhdGU6IHdwLnRlbXBsYXRlKCdyb2JvY3JvcC1zZWxlY3QtaXRlbScpLFxuXHRcdHNpemVrZXk6JycsXG5cdFx0c2l6ZW5hbWVzOicnLFxuXHRcdHJhdGlvOjAsXG5cdFx0ZW5hYmxlZDpudWxsLFxuXHRcdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR3cC5CYWNrYm9uZS5WaWV3LnByb3RvdHlwZS5yZW5kZXIuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0Ly8gc2V0IGluZGljYXRvciBzaXplXG5cdFx0XHRpZiAoIHRoaXMub3B0aW9ucy5yYXRpbyA+IDEgKSB7XG5cdFx0XHRcdHRoaXMuJGVsLmZpbmQoJy5mb3JtYXQtaW5kaWNhdG9yJykuaGVpZ2h0KCAoMSAvIHRoaXMub3B0aW9ucy5yYXRpbykgKyAnZW0nIClcblx0XHRcdH0gZWxzZSBpZiAoIHRoaXMub3B0aW9ucy5yYXRpbyA8IDEgKSB7XG5cdFx0XHRcdHRoaXMuJGVsLmZpbmQoJy5mb3JtYXQtaW5kaWNhdG9yJykud2lkdGgoIHRoaXMub3B0aW9ucy5yYXRpbyArICdlbScgKVxuXHRcdFx0fVxuXHRcdFx0Ly8gZGlzYWJsZSB1bmF2YWlsYWJsZSBzaXplc1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJykucHJvcCgnZGlzYWJsZWQnLCAhIHRoaXMub3B0aW9ucy5lbmFibGVkIClcblx0XHR9XG5cdH0pO1xuXG5cdHJvYm9jcm9wLnZpZXcuUm9ib2Nyb3BJbWFnZSA9IHdwLm1lZGlhLlZpZXcuZXh0ZW5kKHtcblx0XHRjbGFzc05hbWU6XHRcdCdpbWFnZS1yb2JvY3JvcCcsXG5cdFx0dGVtcGxhdGU6XHRcdHdwLnRlbXBsYXRlKCdyb2JvY3JvcCcpLFxuXHRcdGltYWdlX3JhdGlvczpcdGltYWdlX3JhdGlvcyxcblx0XHRpbWFnZV9zaXplczpcdGltYWdlX3NpemVzLFxuXHRcdF9jcm9wcGVyczpcdFx0bnVsbCxcblx0XHRldmVudHM6IHtcblx0XHRcdCdjbGljayAucm9ib2Nyb3AtYXV0b2Nyb3AtY3VycmVudCdcdDogJ2F1dG9jcm9wJyxcblx0XHRcdCdjbGljayAucm9ib2Nyb3AtYXV0b2Nyb3AtYWxsJ1x0XHQ6ICdhdXRvY3JvcEFsbCcsXG5cdFx0fSxcblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbiggb3B0aW9ucyApIHtcblx0XHQvL1x0d3AubWVkaWEudmlldy5FZGl0SW1hZ2UucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0dGhpcy5fY3JvcHBlcnMgXHRcdD0ge307XG5cdFx0XHR0aGlzLmltYWdlIFx0XHRcdD0gbmV3IHJvYm9jcm9wLnZpZXcuSW1nKCB7c3JjOiB0aGlzLm1vZGVsLmdldCgndXJsJykgfSApO1xuXG5cdFx0XHR0aGlzLmNvbnRyb2xsZXIgXHQ9IG9wdGlvbnMuY29udHJvbGxlcjtcblx0XHRcdHRoaXMuZm9jdXNwb2ludHRvb2xcdD0gbmV3IHJvYm9jcm9wLnZpZXcuZm9jdXNwb2ludC5JbWFnZUZvY3VzUG9pbnRTZWxlY3QoeyBpbWFnZTogdGhpcy5pbWFnZSwgZm9jdXNwb2ludDoge3g6MCx5OjB9LCBzcmM6IHRoaXMubW9kZWwuZ2V0KCd1cmwnKSB9KTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMuZm9jdXNwb2ludHRvb2wsICdjaGFuZ2VkJywgdGhpcy51cGRhdGVGb2N1c1BvaW50ICk7XG5cblx0XHRcdHdwLm1lZGlhLlZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdH0sXG5cdFx0ZGlzbWlzczpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhcmVhU2VsZWN0ID0gdGhpcy4kYXJlYVNlbGVjdCgpXG5cdFx0XHRhcmVhU2VsZWN0ICYmIGFyZWFTZWxlY3QucmVtb3ZlKCk7XG5cdFx0XHR0aGlzLiRlbC5yZW1vdmUoKTtcblx0XHR9LFxuXHRcdGNyZWF0ZVNlbGVjdDogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLnNlbGVjdCA9IG5ldyByb2JvY3JvcC52aWV3LlJvYm9jcm9wUmF0aW9TZWxlY3Qoe1xuXHRcdFx0XHRjaG9pY2VzOiBjaG9pY2VzXG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdGhhc0NoYW5nZWQ6IGZ1bmN0aW9uKCl7XG5cdFx0XHR0aGlzLnRyaWdnZXIoICdjaGFuZ2VkJyApO1xuXHRcdH0sXG5cdFx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0d3AubWVkaWEuVmlldy5wcm90b3R5cGUucmVuZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuXHRcdFx0dGhpcy52aWV3cy5zZXQoJy5yb2JvY3JvcC1jb250ZW50JywgdGhpcy5mb2N1c3BvaW50dG9vbCApO1xuXG5cdFx0XHR0aGlzLmZvY3VzcG9pbnR0b29sLnNldEZvY3VzcG9pbnQoIHRoaXMubW9kZWwuZ2V0KCAnZm9jdXNwb2ludCcgKSApO1xuXG5cdFx0XHR0aGlzLmltYWdlLiRlbC5pbWdBcmVhU2VsZWN0KHtcblx0XHRcdFx0cGFyZW50OiBcdFx0dGhpcy5pbWFnZS4kZWwuY2xvc2VzdCgnLnJvYm9jcm9wLWltYWdlLWJveCcpLFxuXHRcdFx0XHRpbnN0YW5jZTpcdCBcdHRydWUsXG5cdFx0XHRcdGhhbmRsZXM6IFx0XHR0cnVlLFxuXHRcdFx0XHRrZXlzOiBcdFx0XHR0cnVlLFxuXHRcdFx0XHRwZXJzaXN0ZW50Olx0XHR0cnVlLFxuXHRcdFx0XHRlbmFibGVkOlx0XHR0cnVlLFxuXHRcdFx0XHRtb3ZhYmxlOlx0XHR0cnVlLFxuXHRcdFx0XHRyZXNpemFibGU6XHRcdHRydWUsXG5cdFx0XHRcdGltYWdlSGVpZ2h0Olx0dGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpLFxuXHRcdFx0XHRpbWFnZVdpZHRoOlx0XHR0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSxcblx0XHRcdFx0b25TZWxlY3RFbmQ6IGZ1bmN0aW9uKCBpbWFnZSwgY29vcmRzICkge1xuXHRcdFx0XHRcdHZhciBjcm9wZGF0YSA9IHJvYm9jcm9wLnBvaW50VG9SZWN0Q29vcmRzKCBjb29yZHMgKVxuXHRcdFx0XHRcdHNlbGYuX3NldENyb3BTaXplcyhjcm9wZGF0YSk7XG5cdFx0XHRcdFx0c2VsZi5oYXNDaGFuZ2VkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBzZXQgcmF0aW8gc2VlbGN0XG5cdFx0XHR0aGlzLnNlbGVjdFJhdGlvID0gbmV3IHJvYm9jcm9wLnZpZXcuUm9ib2Nyb3BSYXRpb1NlbGVjdCh7XG5cdFx0XHRcdHRvb2xzOiB7XG5cdFx0XHRcdFx0Zm9jdXNwb2ludCA6IHtcblx0XHRcdFx0XHRcdHRpdGxlOiBsMTBuLlNldEZvY3VzUG9pbnQsXG5cdFx0XHRcdFx0XHR0cmlnZ2VyOiAnZm9jdXNwb2ludCdcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJhdGlvczp0aGlzLmltYWdlX3JhdGlvcyxcblx0XHRcdFx0bW9kZWw6dGhpcy5tb2RlbFxuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLnNlbGVjdFJhdGlvXG5cdFx0XHRcdC5vbignc2VsZWN0LXJhdGlvJywgdGhpcy5vbnNlbGVjdHJhdGlvLCB0aGlzIClcblx0XHRcdFx0Lm9uKCdzZWxlY3QtdG9vbCcsIHRoaXMub25zZWxlY3R0b29sLCB0aGlzIClcblx0XHRcdFx0Lm9uKCdzZWxlY3QnLCB0aGlzLnVwZGF0ZUJ1dHRvbnMsIHRoaXMgKTtcblxuXHRcdFx0dGhpcy52aWV3cy5zZXQoJy5zZWxlY3QtcmF0aW8nLCB0aGlzLnNlbGVjdFJhdGlvICk7XG5cdFx0XHQvLyBzZXRUaW1lb3V0KCBmdW5jdGlvbigpeyB9LDIwKTtcblxuXHRcdFx0Ly8gYnV0dG9uc1xuXHRcdFx0dGhpcy4kYXV0b0J1dHRvblx0PSB0aGlzLiRlbC5maW5kKCcucm9ib2Nyb3AtYXV0b2Nyb3AtY3VycmVudCcpO1xuXHRcdFx0dGhpcy4kYXV0b0FsbEJ1dHRvblx0PSB0aGlzLiRlbC5maW5kKCcucm9ib2Nyb3AtYXV0b2Nyb3AtYWxsJyk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHJlYWR5OiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBjdXJyZW50UmF0aW8sIGZvdW5kO1xuXHRcdFx0d3AubWVkaWEudmlldy5FZGl0SW1hZ2UucHJvdG90eXBlLnJlYWR5LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuXHRcdFx0aWYgKCAhIF8uaXNVbmRlZmluZWQoIHRoaXMub3B0aW9ucy5zaXplVG9TZWxlY3QgKSApIHtcblx0XHRcdFx0Zm91bmQgPSBfLmZpbmQoIHRoaXMuaW1hZ2VfcmF0aW9zLCBmdW5jdGlvbiggcmF0aW8gKXtcblx0XHRcdFx0XHRyZXR1cm4gcmF0aW8uc2l6ZXMuaW5kZXhPZiggdGhpcy5vcHRpb25zLnNpemVUb1NlbGVjdCApID4gLTE7XG5cdFx0XHRcdH0sIHRoaXMgKTtcblx0XHRcdFx0aWYgKCBmb3VuZCApIHtcblx0XHRcdFx0XHRjdXJyZW50UmF0aW8gPSBmb3VuZC5uYW1lO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmICggXy5pc1VuZGVmaW5lZCggY3VycmVudFJhdGlvICkgKSB7XG5cdFx0XHRcdGN1cnJlbnRSYXRpbyA9ICdmb2N1c3BvaW50JzsvL18uZmlyc3QoXy5rZXlzKCB0aGlzLmltYWdlX3JhdGlvcyApKTtcblx0XHRcdH1cblx0XHRcdHRoaXMuc2VsZWN0UmF0aW8uc2V0U2VsZWN0ZWQoIGN1cnJlbnRSYXRpbyApO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRzYXZlOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHRcdGF0dGFjaG1lbnRzOnt9XG5cdFx0XHRcdH0sIGlkID0gdGhpcy5tb2RlbC5nZXQoJ2lkJyksXG5cdFx0XHRcdCRidG5zID0gdGhpcy4kYXV0b0FsbEJ1dHRvbi5hZGQoIHRoaXMuJGF1dG9CdXR0b24gKS5wcm9wKCAnZGlzYWJsZWQnLCB0cnVlICksXG5cdFx0XHRcdHNlbGYgPSB0aGlzO1xuXHRcdFx0ZGF0YS5hdHRhY2htZW50c1tpZF0gPSB7XG5cdFx0XHRcdHNpemVzOlx0XHR0aGlzLm1vZGVsLmdldCgnc2l6ZXMnKSxcblx0XHRcdFx0Zm9jdXNwb2ludDogdGhpcy5tb2RlbC5nZXQoJ2ZvY3VzcG9pbnQnKVxuXHRcdFx0fTtcblx0XHRcdHRoaXMubW9kZWwuc2F2ZUNvbXBhdCggZGF0YSwge30gKS5kb25lKCBmdW5jdGlvbiggcmVzcCApIHtcblx0XHRcdFx0dmFyIGQgPSBuZXcgRGF0ZSgpO1xuXG5cdFx0XHRcdC8vIGZvcmNlIHJlbG9hZCBpbWFnZSAuLi5cblx0XHRcdFx0Xy5lYWNoKCBzZWxmLm1vZGVsLmF0dHJpYnV0ZXMuc2l6ZXMsIGZ1bmN0aW9uKCBzaXplLCBzaXplbmFtZSApIHtcblx0XHRcdFx0XHR2YXIgc2VsZWN0b3IgPSAgJ2ltZ1tzcmNePVwiJytzaXplLnVybCsnXCJdJyxcblx0XHRcdFx0XHRcdHJlZnJlc2ggPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHQkKHRoaXMpLnJlbW92ZUF0dHIoJ3NyYycpLmF0dHIoICdzcmMnLCBzaXplLnVybCsnPycrZC5nZXRUaW1lKCkgKTtcblx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdHJlZnJlc2hfbWNlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0JCh0aGlzKS5yZW1vdmVBdHRyKCdkYXRhLW1jZS1zcmMnKS5hdHRyKCAnZGF0YS1tY2Utc3JjJywgc2l6ZS51cmwrJz8nK2QuZ2V0VGltZSgpICk7XG5cdFx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHQvLyAuLi4gdW5sZXNzIGl0J3MgZnVsbHNpemUgLi4uXG5cdFx0XHRcdFx0aWYgKCBzaXplbmFtZSAhPT0gJ2Z1bGwnICkge1xuXG5cdFx0XHRcdFx0XHQkKGRvY3VtZW50KS5hZGQoICQoJ2lmcmFtZScpLmNvbnRlbnRzKCkgKVxuXHRcdFx0XHRcdFx0XHQuZmluZCggc2VsZWN0b3IgKVxuXHRcdFx0XHRcdFx0XHQuZWFjaCggcmVmcmVzaCApO1xuXG5cdFx0XHRcdFx0XHQvLyAuLi4gaW5zaWRlIHRpbnltY2UgaWZyYW1lc1xuXHRcdFx0XHRcdFx0JCgnLm1jZS1lZGl0LWFyZWEgaWZyYW1lJykuZWFjaChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHQkKHRoaXMpLmNvbnRlbnRzKClcblx0XHRcdFx0XHRcdFx0XHQuZmluZCggc2VsZWN0b3IgKVxuXHRcdFx0XHRcdFx0XHRcdC5lYWNoKCByZWZyZXNoIClcblx0XHRcdFx0XHRcdFx0XHQuZWFjaCggcmVmcmVzaF9tY2UgKTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgc2VsZiApO1xuXHRcdFx0XHQkYnRucy5wcm9wKCAnZGlzYWJsZWQnLCBmYWxzZSApO1xuXHRcdFx0XHRzZWxmLnRyaWdnZXIoICdzYXZlZCcgKTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHR1cGRhdGVCdXR0b25zOiBmdW5jdGlvbigpe1xuXHRcdFx0dmFyIHRvb2xrZXkgPSB0aGlzLnNlbGVjdFJhdGlvLmdldFNlbGVjdGVkKCk7XG5cdFx0XHR0aGlzLiRhdXRvQnV0dG9uLnRvZ2dsZUNsYXNzKCAnaGlkZGVuJywgdG9vbGtleSA9PT0gJ2ZvY3VzcG9pbnQnICk7XG5cdFx0XHR0aGlzLiRhdXRvQWxsQnV0dG9uLnRvZ2dsZUNsYXNzKCAnaGlkZGVuJywgdG9vbGtleSAhPT0gJ2ZvY3VzcG9pbnQnICk7XG5cdFx0fSxcblx0XHRvbnNlbGVjdHRvb2w6IGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgdG9vbGtleSA9IHRoaXMuc2VsZWN0UmF0aW8uZ2V0U2VsZWN0ZWQoKTtcblx0XHRcdHRoaXMuJGFyZWFTZWxlY3QoKS5jYW5jZWxTZWxlY3Rpb24oKTtcblxuXHRcdFx0c3dpdGNoICggdG9vbGtleSApIHtcblx0XHRcdFx0Y2FzZSAnZm9jdXNwb2ludCc6XG5cdFx0XHRcdFx0Ly8gd3JhcCBhcm91bmRcblx0XHRcdFx0XHR0aGlzLmZvY3VzcG9pbnR0b29sLnNldEVuYWJsZWQoIHRydWUgKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9LFxuXHRcdG9uc2VsZWN0cmF0aW86IGZ1bmN0aW9uKCApIHtcblx0XHRcdHRoaXMuZm9jdXNwb2ludHRvb2wuc2V0RW5hYmxlZCggZmFsc2UgKTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKlx0T24gc3dpdGNoIHJhdGlvXG5cdFx0XHQgKi9cblx0XHRcdHZhciByYXRpb2tleSA9IHRoaXMuc2VsZWN0UmF0aW8uZ2V0U2VsZWN0ZWQoKSxcblx0XHRcdFx0c2l6ZXMgPSB0aGlzLm1vZGVsLmdldCgnc2l6ZXMnKSxcblx0XHRcdFx0ZmFjdG9yLCByZWN0LCBjcm9wZGF0YSwgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHMsIGFyZWFTZWxlY3RPcHRpb25zLFxuXHRcdFx0XHRpbWdXaWR0aCAgPSB0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSxcblx0XHRcdFx0aW1nSGVpZ2h0ID0gdGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpO1xuXG5cdFx0XHR0aGlzLmN1cnJlbnRfcmF0aW8gPSB0aGlzLmltYWdlX3JhdGlvc1tyYXRpb2tleV07XG5cblx0XHRcdGFyZWFTZWxlY3RPcHRpb25zID0ge1xuXHRcdFx0XHRhc3BlY3RSYXRpbzpcdHRoaXMuY3VycmVudF9yYXRpby5yYXRpbyArICc6MScsXG5cdFx0XHRcdG1pbldpZHRoOlx0XHR0aGlzLmN1cnJlbnRfcmF0aW8ubWluX3dpZHRoLFxuXHRcdFx0XHRtaW5IZWlnaHQ6XHRcdHRoaXMuY3VycmVudF9yYXRpby5taW5faGVpZ2h0XG5cdFx0XHR9O1xuXG5cdFx0XHRfLmVhY2godGhpcy5jdXJyZW50X3JhdGlvLnNpemVzLCBmdW5jdGlvbihzaXplKXtcblx0XHRcdFx0aWYgKCAhIGNyb3BkYXRhICYmICEhIHNpemVzW3NpemVdICYmICEhIHNpemVzW3NpemVdLmNyb3BkYXRhICkge1xuXHRcdFx0XHRcdGNyb3BkYXRhID0gc2l6ZXNbc2l6ZV0uY3JvcGRhdGE7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBpbWFnZV9zaXplc1tzaXplXS53aWR0aCA8PSBpbWdXaWR0aCAmJiBpbWFnZV9zaXplc1tzaXplXS5oZWlnaHQgPD0gaW1nSGVpZ2h0ICkge1xuXHRcdFx0XHRcdGFyZWFTZWxlY3RPcHRpb25zLm1pbldpZHRoICA9IE1hdGgubWF4KCBhcmVhU2VsZWN0T3B0aW9ucy5taW5XaWR0aCwgIGltYWdlX3NpemVzW3NpemVdLndpZHRoICk7XG5cdFx0XHRcdFx0YXJlYVNlbGVjdE9wdGlvbnMubWluSGVpZ2h0ID0gTWF0aC5tYXgoIGFyZWFTZWxlY3RPcHRpb25zLm1pbkhlaWdodCwgaW1hZ2Vfc2l6ZXNbc2l6ZV0uaGVpZ2h0ICk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoICFjcm9wZGF0YSApIHtcblx0XHRcdFx0Ly8gd3AgZGVmYXVsdCBjcm9wZGF0YVxuXHRcdFx0XHR2YXIgc2NhbGUgPSBNYXRoLm1pbiggdGhpcy5tb2RlbC5nZXQoJ3dpZHRoJykgLyB0aGlzLmN1cnJlbnRfcmF0aW8ucmF0aW8sIHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKSk7XG5cblx0XHRcdFx0cmVjdCA9IHtcblx0XHRcdFx0XHR4OjAsXG5cdFx0XHRcdFx0eTowLFxuXHRcdFx0XHRcdHdpZHRoOiAgc2NhbGUgKiB0aGlzLmN1cnJlbnRfcmF0aW8ucmF0aW8sXG5cdFx0XHRcdFx0aGVpZ2h0OiBzY2FsZVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRyZWN0LnggPSAodGhpcy5tb2RlbC5nZXQoJ3dpZHRoJykgLSByZWN0LndpZHRoKS8yO1xuXHRcdFx0XHRyZWN0LnkgPSAodGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpIC0gcmVjdC5oZWlnaHQpLzI7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZWN0ID0ge307XG5cblx0XHRcdFx0Xy5leHRlbmQocmVjdCxjcm9wZGF0YSk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuJGFyZWFTZWxlY3QoKS5zZXRPcHRpb25zKCBhcmVhU2VsZWN0T3B0aW9ucyApO1xuXHRcdFx0aWYgKCAhIHRoaXMuaW1hZ2UuJGVsLmdldCgwKS5jb21wbGV0ZSApIHtcblx0XHRcdFx0dGhpcy5pbWFnZS4kZWwub24oJ2xvYWQnLGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNlbGYuc2VsZWN0Q3JvcChyZWN0KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnNlbGVjdENyb3AocmVjdCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGF1dG9jcm9wOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHQvLyBjcm9wIGJ5IGZvY3VzIHBvaW50XG5cblx0XHRcdHZhciBjcm9wZGF0YSwgaW1hZ2VpbmZvID0ge1xuXHRcdFx0XHRcdHdpZHRoOlx0XHR0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSxcblx0XHRcdFx0XHRoZWlnaHQ6XHRcdHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKSxcblx0XHRcdFx0XHRmb2N1c3BvaW50Olx0dGhpcy5tb2RlbC5nZXQoJ2ZvY3VzcG9pbnQnKVxuXHRcdFx0XHR9O1xuXHRcdFx0Y3JvcGRhdGEgPSByb2JvY3JvcC5jcm9wRnJvbUZvY3VzUG9pbnQoIGltYWdlaW5mbywgdGhpcy5jdXJyZW50X3JhdGlvICk7XG5cdFx0XHRjcm9wZGF0YSA9IHJvYm9jcm9wLnJlbFRvQWJzQ29vcmRzKCBjcm9wZGF0YSwgaW1hZ2VpbmZvICk7XG5cblx0XHRcdHRoaXMuX3NldENyb3BTaXplcyggY3JvcGRhdGEgKTtcblx0XHRcdHRoaXMuc2VsZWN0Q3JvcCggY3JvcGRhdGEgKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRhdXRvY3JvcEFsbDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRpbWFnZWluZm8gPSB7XG5cdFx0XHRcdFx0d2lkdGg6XHRcdHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLFxuXHRcdFx0XHRcdGhlaWdodDpcdFx0dGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpLFxuXHRcdFx0XHRcdGZvY3VzcG9pbnQ6XHR0aGlzLm1vZGVsLmdldCgnZm9jdXNwb2ludCcpXG5cdFx0XHRcdH07XG5cblx0XHRcdF8uZWFjaCggdGhpcy5pbWFnZV9yYXRpb3MsIGZ1bmN0aW9uKCByYXRpbyApIHtcblx0XHRcdFx0dmFyIGNyb3BkYXRhO1xuXHRcdFx0XHRjcm9wZGF0YSA9IHJvYm9jcm9wLmNyb3BGcm9tRm9jdXNQb2ludCggaW1hZ2VpbmZvLCByYXRpbyApO1xuXHRcdFx0XHRjcm9wZGF0YSA9IHJvYm9jcm9wLnJlbFRvQWJzQ29vcmRzKCBjcm9wZGF0YSwgaW1hZ2VpbmZvICk7XG5cdFx0XHRcdHNlbGYuX3NldENyb3BTaXplcyggY3JvcGRhdGEsIHJhdGlvICk7XG5cdFx0XHR9ICk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0c2VsZWN0Q3JvcDpmdW5jdGlvbiggcmVjdCApIHtcblx0XHRcdC8vIGRyYXcgY3JvcCBVSSBlbGVtZW50LlxuXHRcdFx0dmFyIGZhY3RvciA9IHRoaXMuX2ltYWdlX3NjYWxlX2ZhY3RvcigpLFxuXHRcdFx0XHRwb2ludHMgPSByb2JvY3JvcC5yZWN0VG9Qb2ludENvb3JkcyggcmVjdCApLFxuXHRcdFx0XHQkYXJlYVNlbGVjdCA9IHRoaXMuJGFyZWFTZWxlY3QoKTtcblxuXHRcdFx0JGFyZWFTZWxlY3Quc2V0U2VsZWN0aW9uKCBwb2ludHMueDEsIHBvaW50cy55MSwgcG9pbnRzLngyLCBwb2ludHMueTIsIGZhbHNlICk7XG5cdFx0XHQkYXJlYVNlbGVjdC5zZXRPcHRpb25zKCB7c2hvdzp0cnVlfSApO1xuXHRcdFx0JGFyZWFTZWxlY3QudXBkYXRlKCk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdCRhcmVhU2VsZWN0IDogZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB0aGlzLmltYWdlLiRlbC5kYXRhKCdpbWdBcmVhU2VsZWN0Jyk7XG5cdFx0fSxcblx0XHRfaW1hZ2Vfc2NhbGVfZmFjdG9yIDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgJGNvbnRhaW5lciA9IHRoaXMuaW1hZ2UuJGVsLmNsb3Nlc3QoJy5yb2JvY3JvcC1pbWFnZS1ib3gnKSxcblx0XHRcdFx0dyA9IE1hdGgubWluKHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLCRjb250YWluZXIud2lkdGgoKSksXG5cdFx0XHRcdGggPSBNYXRoLm1pbih0aGlzLm1vZGVsLmdldCgnaGVpZ2h0JyksJGNvbnRhaW5lci5oZWlnaHQoKSk7XG5cblx0XHRcdHJldHVybiBNYXRoLm1pbiggdyAvIHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLCBoIC8gdGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpICk7XG5cdFx0fSxcblx0XHR1cGRhdGVGb2N1c1BvaW50OiBmdW5jdGlvbiggKSB7XG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2ZvY3VzcG9pbnQnLCB0aGlzLmZvY3VzcG9pbnR0b29sLmdldEZvY3VzcG9pbnQoKSApO1xuXHRcdH0sXG5cdFx0X3NldENyb3BTaXplcyA6IGZ1bmN0aW9uKCBjcm9wZGF0YSwgcmF0aW8gKSB7XG5cdFx0XHR2YXIgdyA9IHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLFxuXHRcdFx0XHRoID0gdGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpLFxuXHRcdFx0XHRtb2RlbFNpemVzID0gdGhpcy5tb2RlbC5nZXQoJ3NpemVzJyksXG5cdFx0XHRcdHJhdGlvID0gcmF0aW8gfHwgdGhpcy5jdXJyZW50X3JhdGlvO1xuXG5cdFx0XHRfLmVhY2gocmF0aW8uc2l6ZXMsIGZ1bmN0aW9uKCBzaXplbmFtZSApIHtcblx0XHRcdFx0Ly8qXG5cdFx0XHRcdC8vIHZhciBjYW5jcm9wID1cdCh3ID49IGltYWdlX3NpemVzW3NpemVuYW1lXS53aWR0aCkgJiZcblx0XHRcdFx0Ly8gXHRcdFx0XHQoaCA+PSBpbWFnZV9zaXplc1tzaXplbmFtZV0uaGVpZ2h0KTtcblxuXHRcdFx0XHQhIG1vZGVsU2l6ZXNbIHNpemVuYW1lIF0gJiYgKCBtb2RlbFNpemVzWyBzaXplbmFtZSBdID0ge30gKTtcblx0XHRcdFx0bW9kZWxTaXplc1sgc2l6ZW5hbWUgXS5jcm9wZGF0YSA9IGNyb3BkYXRhO1xuXG5cdFx0XHRcdGlmICggLypjYW5jcm9wICYmICovIGltYWdlX3NpemVzW3NpemVuYW1lXS5jcm9wICkge1xuXHRcdFx0XHRcdG1vZGVsU2l6ZXNbIHNpemVuYW1lIF0uY3JvcGRhdGEgPSBjcm9wZGF0YTtcblx0XHRcdFx0fSBlbHNlIGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBtb2RlbFNpemVzWyBzaXplbmFtZSBdICkge1xuXHRcdFx0XHRcdGRlbGV0ZSggbW9kZWxTaXplc1sgc2l6ZW5hbWUgXSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8qL1xuXHRcdFx0XHQhIG1vZGVsU2l6ZXNbIHNpemVuYW1lIF0gJiYgKCBtb2RlbFNpemVzWyBzaXplbmFtZSBdID0ge30gKTtcblx0XHRcdFx0bW9kZWxTaXplc1sgc2l6ZW5hbWUgXS5jcm9wZGF0YSA9IGNyb3BkYXRhO1xuXHRcdFx0XHQvLyovXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMubW9kZWwuc2V0KCAnc2l6ZXMnLCBtb2RlbFNpemVzICk7XG5cdFx0fSxcblx0XHRfZ2V0UmVsYXRpdmVDb29yZHM6IGZ1bmN0aW9uKCBjb29yZHMgKSB7XG5cdFx0XHR2YXIgdyA9IHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLFxuXHRcdFx0XHRoID0gdGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpO1xuXHRcdFx0Zm9yICggdmFyIHMgaW4gY29vcmRzICkge1xuXHRcdFx0XHRpZiAoICdudW1iZXInPT09dHlwZW9mKGNvb3Jkc1tzXSkgKSB7XG5cdFx0XHRcdFx0c3dpdGNoIChzKSB7XG5cdFx0XHRcdFx0XHRjYXNlICd4Jzpcblx0XHRcdFx0XHRcdGNhc2UgJ3gxJzpcblx0XHRcdFx0XHRcdGNhc2UgJ3gyJzpcblx0XHRcdFx0XHRcdGNhc2UgJ3dpZHRoJzpcblx0XHRcdFx0XHRcdGNhc2UgJ21pblgnOlxuXHRcdFx0XHRcdFx0Y2FzZSAnbWF4WCc6XG5cdFx0XHRcdFx0XHRcdGNvb3Jkc1tzXSAvPSB3O1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdGNvb3Jkc1tzXSAvPSBoO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdF9nZXRBYnNvbHV0ZUNvb3JkczogZnVuY3Rpb24oIGNvb3JkcyApIHtcblx0XHRcdHZhciB3ID0gdGhpcy5tb2RlbC5nZXQoJ3dpZHRoJyksXG5cdFx0XHRcdGggPSB0aGlzLm1vZGVsLmdldCgnaGVpZ2h0Jyk7XG5cdFx0XHRmb3IgKCB2YXIgcyBpbiBjb29yZHMgKSB7XG5cdFx0XHRcdGlmICggJ251bWJlcic9PT10eXBlb2YoY29vcmRzW3NdKSApIHtcblx0XHRcdFx0XHRzd2l0Y2ggKHMpIHtcblx0XHRcdFx0XHRcdGNhc2UgJ3gnOlxuXHRcdFx0XHRcdFx0Y2FzZSAneDEnOlxuXHRcdFx0XHRcdFx0Y2FzZSAneDInOlxuXHRcdFx0XHRcdFx0Y2FzZSAnd2lkdGgnOlxuXHRcdFx0XHRcdFx0Y2FzZSAnbWluWCc6XG5cdFx0XHRcdFx0XHRjYXNlICdtYXhYJzpcblx0XHRcdFx0XHRcdFx0Y29vcmRzW3NdICo9IHc7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0Y29vcmRzW3NdICo9IGg7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcblxuXG5cblxuXHRyb2JvY3JvcC52aWV3LkZyYW1lID0gd3AubWVkaWEudmlldy5NZWRpYUZyYW1lLmV4dGVuZCh7XG5cdFx0dGVtcGxhdGU6ICB3cC50ZW1wbGF0ZSgncm9ib2Nyb3AtbW9kYWwnKSxcblx0XHRyZWdpb25zOiAgIFsndGl0bGUnLCdjb250ZW50JywnaW5zdHJ1Y3Rpb25zJywnYnV0dG9ucycsJ3JhdGlvcyddXG5cdH0pO1xuXG5cdHJvYm9jcm9wLnZpZXcuRnJhbWUuQ3JvcCA9IHJvYm9jcm9wLnZpZXcuRnJhbWUuZXh0ZW5kKHtcblx0XHRldmVudHM6IHtcblx0XHRcdCdjbGljayAucm9ib2Nyb3Atc2F2ZSdcdFx0OiAnc2F2ZScsXG5cdFx0XHQnY2xpY2sgLnJvYm9jcm9wLWNhbmNlbCdcdDogJ2Nsb3NlJyxcblx0XHR9LFxuXHRcdHNhdmU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy4kKCcucm9ib2Nyb3Atc2F2ZSwgLnJvYm9jcm9wLWNhbmNlbCcpLnByb3AoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdHRoaXMuX2NvbnRlbnQuc2F2ZSgpO1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oIG9wdGlvbnMgKSB7XG5cdFx0XHRyb2JvY3JvcC52aWV3LkZyYW1lLnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KCB0aGlzLCBhcmd1bWVudHMgKTtcblxuXHRcdFx0dGhpcy5jcmVhdGVUaXRsZSgpO1xuXHRcdFx0dGhpcy5jcmVhdGVDb250ZW50KCk7XG5cdFx0XHR0aGlzLmNyZWF0ZUJ1dHRvbnMoKTtcblxuXHRcdFx0dGhpcy5vbignY2xvc2UnLCB0aGlzLmRpc21pc3MsIHRoaXMgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMuX2NvbnRlbnQsICdzYXZlZCcsIHRoaXMubW9kZWxTeW5jICk7XG5cdFx0fSxcblx0XHRtb2RlbFN5bmM6IGZ1bmN0aW9uKCl7XG5cdFx0XHR0aGlzLiQoJy5yb2JvY3JvcC1zYXZlLCAucm9ib2Nyb3AtY2FuY2VsJykucHJvcCggJ2Rpc2FibGVkJywgZmFsc2UgKTtcblx0XHR9LFxuXHRcdGRpc21pc3M6ZnVuY3Rpb24oKXtcblx0XHRcdHRoaXMuX2NvbnRlbnQuZGlzbWlzcygpO1xuXHRcdH0sXG5cdFx0Y3JlYXRlVGl0bGU6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHRoaXMuX3RpdGxlID0gbmV3IHdwLm1lZGlhLlZpZXcoe1xuXHRcdFx0XHR0YWdOYW1lOiAnaDEnXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuX3RpdGxlLiRlbC50ZXh0KCBsMTBuLkF0dGFjaG1lbnREZXRhaWxzICk7IC8vIFwiQ3JvcCBpbWFnZSBzaXplc1wiXG5cdFx0XHR0aGlzLnRpdGxlLnNldCggWyB0aGlzLl90aXRsZSBdICk7XG5cdFx0fSxcblx0XHRjcmVhdGVDb250ZW50OiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBvcHRzID0gXy5leHRlbmQoe1xuXHRcdFx0XHRjb250cm9sbGVyOiB0aGlzLmNvbnRyb2xsZXIsXG5cdFx0XHRcdG1vZGVsOiB0aGlzLm1vZGVsXG5cdFx0XHR9LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuX2NvbnRlbnQgPSBuZXcgcm9ib2Nyb3Audmlldy5Sb2JvY3JvcEltYWdlKCBvcHRzICk7XG5cdFx0XHR0aGlzLmNvbnRlbnQuc2V0KCBbIHRoaXMuX2NvbnRlbnQgXSApO1xuXHRcdH0sXG5cdFx0Y3JlYXRlQnV0dG9uczogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgaW5mbywgYnRuO1xuXG5cdFx0XHR0aGlzLmJ1dHRvbnMuc2V0KCBbXG5cdFx0XHRcdG5ldyB3cC5tZWRpYS52aWV3LkJ1dHRvbih7XG5cdFx0XHRcdFx0dGV4dDogbDEwbi5DbG9zZSxcblx0XHRcdFx0XHRjbGFzc05hbWU6ICdidXR0b24tc2Vjb25kYXJ5IHJvYm9jcm9wLWNhbmNlbCdcblx0XHRcdFx0fSksXG5cdFx0XHRcdG5ldyB3cC5tZWRpYS52aWV3LkJ1dHRvbih7XG5cdFx0XHRcdFx0dGV4dDogbDEwbi5TYXZlQ2hhbmdlcyxcblx0XHRcdFx0XHRjbGFzc05hbWU6ICdidXR0b24tcHJpbWFyeSByb2JvY3JvcC1zYXZlJ1xuXHRcdFx0XHR9KVxuXHRcdFx0XSApO1xuXHRcdH1cblx0fSk7XG5cblxuXG5cbn0pKHdwLGpRdWVyeSk7XG4iLCIoZnVuY3Rpb24od3AsJCkge1xuXG5cdHZhciByb2JvY3JvcCA9IHdwLm1lZGlhLnJvYm9jcm9wLFxuXHRcdGltYWdlX3JhdGlvcyA9IHJvYm9jcm9wLmltYWdlX3JhdGlvcyxcblx0XHRpbWFnZV9zaXplcyAgPSByb2JvY3JvcC5pbWFnZV9zaXplcyxcblx0XHRsMTBuID0gcm9ib2Nyb3AubDEwbjtcblxuXHR2YXIgVmlld1x0XHQ9IHdwLm1lZGlhLlZpZXcsXG5cdFx0TWVkaWFGcmFtZVx0PSB3cC5tZWRpYS52aWV3Lk1lZGlhRnJhbWUsXG5cdFx0Rm9jdXNQb2ludCxcblx0XHRDcm9wUmVjdDtcblxuXHRyb2JvY3JvcC52aWV3LmZvY3VzcG9pbnQgPSB7fTtcblxuXHRDcm9wUmVjdCA9IHJvYm9jcm9wLnZpZXcuZm9jdXNwb2ludC5Dcm9wUmVjdCA9IFZpZXcuZXh0ZW5kKHtcblx0XHR0ZW1wbGF0ZTogd3AudGVtcGxhdGUoJ2Nyb3ByZWN0JyksXG5cdFx0Y2xhc3NOYW1lOlx0J3Rvb2wtY3JvcHJlY3QnLFxuXHRcdGNvbnRyb2xsZXI6bnVsbCxcblx0XHRldmVudHM6IHtcblx0XHRcdCdtb3VzZWVudGVyIC5sYWJlbCcgOiAnc2hvd0hpbGl0ZScsXG5cdFx0XHQnbW91c2VsZWF2ZSAubGFiZWwnIDogJ2hpZGVIaWxpdGUnLFxuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHRWaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuXHRcdFx0Xy5kZWZhdWx0cyggdGhpcy5vcHRpb25zLCB7XG5cdFx0XHRcdGZvY3VzcG9pbnQ6IG51bGwsIC8vIGZvY3VzcG9pbnQgY29vcmRzXG5cdFx0XHRcdHJhdGlvOiBudWxsXG5cdFx0XHR9ICk7XG5cblx0XHRcdHRoaXMub3B0aW9ucy5sYWJlbCA9IHRoaXMub3B0aW9ucy5yYXRpby5uYW1lO1xuXG5cdFx0XHR0aGlzLmNvbnRyb2xsZXIgPSB0aGlzLm9wdGlvbnMuY29udHJvbGxlcjtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMuY29udHJvbGxlci5pbWFnZSwgJ2xvYWQnLCB0aGlzLmltYWdlTG9hZGVkICk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0aW1hZ2VMb2FkZWQ6ZnVuY3Rpb24oIGltYWdlICkge1xuXHRcdFx0dGhpcy4kZWwuYXR0ciggJ2RhdGEtZGlyJywgdGhpcy5vcHRpb25zLnJhdGlvLnJhdGlvID4gaW1hZ2UucmF0aW8gPyAndycgOiAnaCcgKTtcblx0XHRcdHRoaXMuJGVsLmNzcyggJ3dpZHRoJywgTWF0aC5taW4oIDEsIHRoaXMub3B0aW9ucy5yYXRpby5yYXRpbyAvIGltYWdlLnJhdGlvICkgKiAxMDAgKyclJyApO1xuXHRcdFx0dGhpcy5zZXRGb2N1c3BvaW50KCApO1xuXHRcdFx0Ly8gc2V0IHBvc2l0aW9uIGZyb20gZm9zdXNwb2ludFxuXHRcdH0sXG5cdFx0c2V0Rm9jdXNwb2ludDpmdW5jdGlvbiggZm9jdXNwb2ludCApIHtcblx0XHRcdGlmICggISFmb2N1c3BvaW50ICkge1xuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZm9jdXNwb2ludCA9IGZvY3VzcG9pbnQ7XG5cdFx0XHR9XG5cdFx0XHR2YXIgaW1hZ2VpbmZvID0ge1xuXHRcdFx0XHRcdHdpZHRoXHRcdDogdGhpcy5jb250cm9sbGVyLmltYWdlLiRlbC53aWR0aCgpLFxuXHRcdFx0XHRcdGhlaWdodFx0XHQ6IHRoaXMuY29udHJvbGxlci5pbWFnZS4kZWwuaGVpZ2h0KCksXG5cdFx0XHRcdFx0Zm9jdXNwb2ludFx0OiB0aGlzLm9wdGlvbnMuZm9jdXNwb2ludCxcblx0XHRcdFx0fSxcblx0XHRcdFx0cmVzID0gcm9ib2Nyb3AuY3JvcEZyb21Gb2N1c1BvaW50KCBpbWFnZWluZm8sIHRoaXMub3B0aW9ucy5yYXRpbyApLFxuXHRcdFx0XHRjb29yZCA9IHJvYm9jcm9wLnJlbFRvQWJzQ29vcmRzKCByZXMsIGltYWdlaW5mbyApO1xuIFx0XHRcdHRoaXMuJGVsLmNzcygnbGVmdCcsY29vcmQueCArICdweCcgKTtcbiBcdFx0XHR0aGlzLiRlbC5jc3MoJ3RvcCcsY29vcmQueSArICdweCcgKTtcbiBcdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHNob3dIaWxpdGU6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0dGhpcy4kZWwuYXR0cignZGF0YS1oaWxpdGUnLCd0cnVlJyk7XG5cdFx0XHR0aGlzLnRyaWdnZXIoJ2hpbGl0ZTpzaG93Jyk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGhpZGVIaWxpdGU6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0dGhpcy4kZWwuYXR0cignZGF0YS1oaWxpdGUnLCdmYWxzZScpO1xuXHRcdFx0dGhpcy50cmlnZ2VyKCdoaWxpdGU6aGlkZScpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHR9KTtcblxuXHRGb2N1c1BvaW50ID0gcm9ib2Nyb3Audmlldy5mb2N1c3BvaW50LkZvY3VzUG9pbnQgPSBWaWV3LmV4dGVuZCh7XG5cdFx0Y2xhc3NOYW1lOlx0J3Rvb2wtZm9jdXNwb2ludCcsXG5cdFx0dGVtcGxhdGU6XHR3cC50ZW1wbGF0ZSgnZm9jdXNwb2ludCcpLFxuXHRcdGxhYmVsVmlldzpcdFx0bnVsbCxcblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbigpe1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0Xy5kZWZhdWx0cyggdGhpcy5vcHRpb25zLCB7XG5cdFx0XHRcdGZvY3VzcG9pbnQ6e3g6MCx5OjB9LFxuXHRcdFx0XHRlbmFibGVkOiBmYWxzZSAsXG5cdFx0XHRcdGNyb3BSZWN0czpbXVxuXHRcdFx0fSApO1xuXHRcdFx0dGhpcy5vcHRpb25zLmNyb3BSZWN0cy5zb3J0KGZ1bmN0aW9uKGEsYil7XG5cdFx0XHRcdHJldHVybiBiLm9wdGlvbnMucmF0aW8ucmF0aW8gLSBhLm9wdGlvbnMucmF0aW8ucmF0aW87XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy4kZWwub24oJ2NsaWNrJywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRzZWxmLmNsaWNrRm9jdXNwb2ludCggZXZlbnQgKTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRyZW5kZXI6ZnVuY3Rpb24oKXtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdFZpZXcucHJvdG90eXBlLnJlbmRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHRfLmVhY2goIHRoaXMub3B0aW9ucy5jcm9wUmVjdHMsIGZ1bmN0aW9uKCByZWN0ICl7XG5cdFx0XHRcdHJlY3QucmVuZGVyKCk7XG5cdFx0XHRcdHNlbGYuJGVsLmFwcGVuZCggcmVjdC4kZWwgKTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRzZXRFbmFibGVkOiBmdW5jdGlvbiggZW5hYmxlZCApIHtcblx0XHRcdHZhciBwcmV2ID0gdGhpcy5vcHRpb25zLmVuYWJsZWQ7XG5cdFx0XHR0aGlzLm9wdGlvbnMuZW5hYmxlZCA9IGVuYWJsZWQ7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCAnZGF0YS1lbmFibGVkJywgZW5hYmxlZC50b1N0cmluZygpICk7XG5cdFx0XHRyZXR1cm4gcHJldjtcblx0XHR9LFxuXHRcdGNsaWNrRm9jdXNwb2ludDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIG9mZnM7XG5cdFx0XHRpZiAoIHRoaXMub3B0aW9ucy5lbmFibGVkICkge1xuXHRcdFx0XHRvZmZzID0gdGhpcy4kZWwub2Zmc2V0KCk7XG5cdFx0XHRcdHRoaXMuc2V0Rm9jdXNwb2ludCgge1xuXHRcdFx0XHRcdHg6ICAyICogKGV2ZW50LnBhZ2VYIC0gb2Zmcy5sZWZ0ICkgLyB0aGlzLiRlbC53aWR0aCgpICAtIDEsXG5cdFx0XHRcdFx0eTogLTIgKiAoZXZlbnQucGFnZVkgLSBvZmZzLnRvcCApIC8gdGhpcy4kZWwuaGVpZ2h0KCkgKyAxLFxuXHRcdFx0XHR9ICk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRnZXRGb2N1c3BvaW50OiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLmZvY3VzcG9pbnQ7XG5cdFx0fSxcblx0XHRzZXRGb2N1c3BvaW50OiBmdW5jdGlvbiggZm9jdXNwb2ludCApIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0dGhpcy5mb2N1c3BvaW50ID0gZm9jdXNwb2ludDtcblxuXHRcdFx0dGhpcy4kZWwuZmluZCgnLmZvY3VzcG9pbnQnKS5jc3Moe1xuXHRcdFx0XHRsZWZ0OiBcdCgoZm9jdXNwb2ludC54ICsgMSkgKiA1MCkrJyUnLFxuXHRcdFx0XHRib3R0b206XHQoKGZvY3VzcG9pbnQueSArIDEpICogNTApKyclJ1xuXHRcdFx0fSk7XG5cblx0XHRcdF8uZWFjaCggdGhpcy5vcHRpb25zLmNyb3BSZWN0cywgZnVuY3Rpb24ocmVjdCl7XG5cdFx0XHRcdHJlY3Quc2V0Rm9jdXNwb2ludCggc2VsZi5mb2N1c3BvaW50ICk7XG5cdFx0XHR9KTtcblx0XHRcdGlmICggdGhpcy5vcHRpb25zLmVuYWJsZWQgKSB7XG5cdFx0XHRcdHRoaXMudHJpZ2dlcignY2hhbmdlOmZvY3VzcG9pbnQnLCB0aGlzLmZvY3VzcG9pbnQgKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdH0pO1xuXG5cdHJvYm9jcm9wLnZpZXcuZm9jdXNwb2ludC5JbWFnZUZvY3VzUG9pbnRTZWxlY3QgPSBWaWV3LmV4dGVuZCh7XG5cdFx0Y2xhc3NOYW1lOlx0J3JvYm9jcm9wLWltYWdlLWJveCcsXG5cdFx0Y3JvcFJlY3RzOiBbXSxcblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbiggKXtcblxuXHRcdFx0Xy5kZWZhdWx0cyggdGhpcy5vcHRpb25zLCB7XG5cdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMsXG5cdFx0XHRcdGZvY3VzcG9pbnQ6IHt4OjAseTowfSxcblx0XHRcdFx0c3JjOiBmYWxzZSxcblx0XHRcdFx0aW1hZ2U6IGZhbHNlLFxuXHRcdFx0XHRlbmFibGVkOiBmYWxzZSxcblx0XHRcdH0gKTtcblxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHRpZiAoIHRoaXMub3B0aW9ucy5pbWFnZSAhPT0gZmFsc2UgJiYgKHRoaXMub3B0aW9ucy5pbWFnZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT0gcm9ib2Nyb3Audmlldy5JbWcucHJvdG90eXBlICkgKSB7XG5cdFx0XHRcdHRoaXMuaW1hZ2UgPSB0aGlzLm9wdGlvbnMuaW1hZ2U7XG5cdFx0XHR9IGVsc2UgaWYgKCB0aGlzLm9wdGlvbnMuc3JjICE9PSBmYWxzZSApIHtcblx0XHRcdFx0dGhpcy5pbWFnZVx0PSBuZXcgcm9ib2Nyb3Audmlldy5JbWcoIHsgc3JjOiB0aGlzLm9wdGlvbnMuc3JjIH0pO1xuXHRcdFx0fSBlbHNlICB7XG5cdFx0XHRcdHRoaXMuaW1hZ2UgPSBuZXcgcm9ib2Nyb3Audmlldy5JbWcoIHsgc3JjOiAnJyB9LCB0aGlzLm9wdGlvbnMuaW1hZ2UpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmNyb3BSZWN0cyA9IFtdO1xuXHRcdFx0Xy5lYWNoKCBpbWFnZV9yYXRpb3MsIGZ1bmN0aW9uKCByYXRpbywga2V5ICkge1xuXHRcdFx0XHR2YXIgcmVjdCA9IG5ldyBDcm9wUmVjdCgge1xuXHRcdFx0XHRcdGNvbnRyb2xsZXI6IHNlbGYsXG5cdFx0XHRcdFx0Zm9jdXNwb2ludDogc2VsZi5vcHRpb25zLmZvY3VzcG9pbnQsXG5cdFx0XHRcdFx0cmF0aW86IHJhdGlvXG5cdFx0XHRcdH0gKTtcblx0XHRcdFx0c2VsZi5saXN0ZW5UbyhyZWN0LCdoaWxpdGU6c2hvdycsc2VsZi5zaG93SGlsaXRlICk7XG5cdFx0XHRcdHNlbGYubGlzdGVuVG8ocmVjdCwnaGlsaXRlOmhpZGUnLHNlbGYuaGlkZUhpbGl0ZSApO1xuXHRcdFx0XHRzZWxmLmNyb3BSZWN0cy5wdXNoKCByZWN0ICk7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5mb2N1c3BvaW50XHQ9IG5ldyBGb2N1c1BvaW50KHtcblx0XHRcdFx0Y29udHJvbGxlcjogdGhpcy5jb250cm9sbGVyLFxuXHRcdFx0XHRmb2N1c3BvaW50OiB0aGlzLm9wdGlvbnMuZm9jdXNwb2ludCxcblx0XHRcdFx0ZW5hYmxlZDogXHR0aGlzLm9wdGlvbnMuZW5hYmxlZCxcblx0XHRcdFx0Y3JvcFJlY3RzOlx0dGhpcy5jcm9wUmVjdHMsXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5mb2N1c3BvaW50LCAnY2hhbmdlOmZvY3VzcG9pbnQnLCB0aGlzLnZhbHVlQ2hhbmdlZCApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5pbWFnZSwgJ2xvYWQnLCB0aGlzLnNldEhlaWdodCApO1xuXG5cdFx0XHR0aGlzLnZpZXdzLnNldCggWyB0aGlzLmltYWdlLCB0aGlzLmZvY3VzcG9pbnQgXSApO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHNldEhlaWdodDpmdW5jdGlvbigpe1xuXHRcdFx0dmFyIG5ld0hlaWdodCA9IE1hdGgubWluKCB0aGlzLiRlbC5wYXJlbnQoKS5oZWlnaHQoKSwgdGhpcy5pbWFnZS4kZWwuaGVpZ2h0KCkgKTtcblx0XHRcdHRoaXMuJGVsLmhlaWdodCggbmV3SGVpZ2h0IClcblx0XHR9LFxuXHRcdHNldEVuYWJsZWQ6IGZ1bmN0aW9uKCBlbmFibGVkICkge1xuXG5cdFx0XHRyZXR1cm4gdGhpcy5mb2N1c3BvaW50LnNldEVuYWJsZWQoIGVuYWJsZWQgKVxuXHRcdH0sXG5cdFx0Z2V0Rm9jdXNwb2ludDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5mb2N1c3BvaW50LmdldEZvY3VzcG9pbnQoKTtcblx0XHR9LFxuXHRcdHNldEZvY3VzcG9pbnQ6IGZ1bmN0aW9uKCBmb2N1c3BvaW50ICkge1xuXHRcdFx0dGhpcy5mb2N1c3BvaW50ICYmIHRoaXMuZm9jdXNwb2ludC5zZXRGb2N1c3BvaW50KCBmb2N1c3BvaW50ICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGdldEltYWdlV2lkdGg6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHJldHVybiB0aGlzLmltYWdlLiRlbC5nZXQoMCkubmF0dXJhbFdpZHRoO1xuXHRcdH0sXG5cdFx0Z2V0SW1hZ2VIZWlnaHQ6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHJldHVybiB0aGlzLmltYWdlLiRlbC5nZXQoMCkubmF0dXJhbEhlaWdodDtcblx0XHR9LFxuXHRcdHNldFNyYzogZnVuY3Rpb24oIHNyYyApIHtcblx0XHRcdHRoaXMuaW1hZ2UuJGVsLmF0dHIoICdzcmMnLCBzcmMgKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0dmFsdWVDaGFuZ2VkOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMudHJpZ2dlcignY2hhbmdlZCcpO1xuXHRcdH0sXG5cdFx0c2hvd0hpbGl0ZTogZnVuY3Rpb24oZSl7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWhpbGl0ZScsJ3RydWUnKTtcblx0XHR9LFxuXHRcdGhpZGVIaWxpdGU6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0dGhpcy4kZWwuYXR0cignZGF0YS1oaWxpdGUnLCdmYWxzZScpO1xuXHRcdH1cblx0fSk7XG5cblx0cm9ib2Nyb3Audmlldy5GcmFtZS5Gb2N1c3BvaW50ID0gcm9ib2Nyb3Audmlldy5GcmFtZS5leHRlbmQoe1xuXHRcdGNsYXNzTmFtZTogJ2Fzay1mb2N1c3BvaW50IG1lZGlhLWZyYW1lJyxcblx0XHRldmVudHM6IHtcblx0XHRcdCdjbGljayAucmVzZXQnOiAncmVzZXQnLFxuXHRcdFx0J2NsaWNrIC5wcm9jZWVkJzogJ3Byb2NlZWQnLFxuXHRcdFx0J2NsaWNrIC5jYW5jZWwtdXBsb2FkJzogJ2NhbmNlbFVwbG9hZCcsXG5cdFx0fSxcblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbiggKSB7XG5cblx0XHRcdF8uZGVmYXVsdHMoIHRoaXMub3B0aW9ucywge1xuXHRcdFx0XHR1cGxvYWRlcjpcdGZhbHNlLFxuXHRcdFx0XHR0aXRsZTpcdFx0bDEwbi5TZXRGb2N1c1BvaW50LFxuXHRcdFx0XHRtb2RhbDogdGhpcy5vcHRpb25zID8gdGhpcy5vcHRpb25zLm1vZGFsIDogZmFsc2UsXG5cdFx0XHRcdHNyYzogJycgLy8gZXhwZWN0aW5nIGFuIGltZyBlbGVtZW50XG5cdFx0XHR9KTtcblxuXHRcdFx0cm9ib2Nyb3Audmlldy5GcmFtZS5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cblx0XHRcdGlmICggdGhpcy5tb2RhbCApIHtcblx0XHRcdFx0dGhpcy5tb2RhbC5vbignZXNjYXBlJywgdGhpcy5jYW5jZWxVcGxvYWQsIHRoaXMgKTtcblx0XHRcdH1cblx0XHRcdHRoaXMuY3JlYXRlVGl0bGUoKTtcblx0XHRcdHRoaXMuY3JlYXRlQ29udGVudCgpO1xuXHRcdFx0dGhpcy5jcmVhdGVJbnN0cnVjdGlvbnMoKTtcblx0XHRcdHRoaXMuY3JlYXRlQnV0dG9ucygpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcbi8vIFx0XHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuLy8gXHRcdFx0Ly8gZnJhbWUgbGF5b3V0XG4vL1xuLy8gXHRcdFx0cm9ib2Nyb3Audmlldy5Nb2RhbC5wcm90b3R5cGUucmVuZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcbi8vIFx0XHR9LFxuXHRcdGNyZWF0ZVRpdGxlOiBmdW5jdGlvbiggKSB7XG5cdFx0XHR0aGlzLl90aXRsZSA9IG5ldyB3cC5tZWRpYS5WaWV3KHtcblx0XHRcdFx0dGFnTmFtZTogJ2gxJ1xuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLl90aXRsZS4kZWwudGV4dCggdGhpcy5vcHRpb25zLnRpdGxlICk7XG5cdFx0XHR0aGlzLnRpdGxlLnNldCggWyB0aGlzLl90aXRsZSBdICk7XG5cdFx0fSxcblx0XHRjcmVhdGVDb250ZW50OiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuX2NvbnRlbnQgPSBuZXcgcm9ib2Nyb3Audmlldy5mb2N1c3BvaW50LkltYWdlRm9jdXNQb2ludFNlbGVjdCh7XG5cdFx0XHRcdHNyYzogJycsXG5cdFx0XHRcdGZvY3VzcG9pbnQ6eyB4OjAsIHk6MCB9LFxuXHRcdFx0XHRjb250cm9sbGVyOiB0aGlzLFxuXHRcdFx0XHRlbmFibGVkOiB0cnVlLFxuXHRcdFx0XHR0b29sYmFyOnRoaXMudG9vbHNcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5jb250ZW50LnNldCggWyB0aGlzLl9jb250ZW50IF0gKTtcblx0XHR9LFxuXHRcdGNyZWF0ZUluc3RydWN0aW9uczogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgaW5mbywgYnRuO1xuXHRcdFx0dGhpcy5pbnN0cnVjdGlvbnMuc2V0KCBbXG5cdFx0XHRcdG5ldyB3cC5tZWRpYS5WaWV3KHtcblx0XHRcdFx0XHRlbDogJCggJzxkaXYgY2xhc3M9XCJpbnN0cnVjdGlvbnNcIj4nICsgbDEwbi5Gb2N1c1BvaW50SW5zdHJ1Y3Rpb25zICsgJzwvZGl2PicgKVswXSxcblx0XHRcdFx0XHRwcmlvcml0eTogLTQwXG5cdFx0XHRcdH0pLFxuXHRcdFx0XSApO1xuXHRcdH0sXG5cdFx0Y3JlYXRlQnV0dG9uczogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgaW5mbywgYnRuO1xuXG5cdFx0XHR0aGlzLmJ1dHRvbnMuc2V0KCBbXG5cdFx0XHRcdG5ldyB3cC5tZWRpYS52aWV3LkJ1dHRvbih7XG5cdFx0XHRcdFx0dGV4dDogbDEwbi5DYW5jZWwsXG5cdFx0XHRcdFx0Y2xhc3NOYW1lOiAnY2FuY2VsLXVwbG9hZCdcblx0XHRcdFx0fSksXG5cdFx0XHRcdG5ldyB3cC5tZWRpYS52aWV3LkJ1dHRvbih7XG5cdFx0XHRcdFx0dGV4dDogbDEwbi5SZXNldCxcblx0XHRcdFx0XHRjbGFzc05hbWU6ICdyZXNldCdcblx0XHRcdFx0fSksXG5cdFx0XHRcdG5ldyB3cC5tZWRpYS52aWV3LkJ1dHRvbih7XG5cdFx0XHRcdFx0dGV4dDogbDEwbi5VcGxvYWQsXG5cdFx0XHRcdFx0Y2xhc3NOYW1lOiAnYnV0dG9uLXByaW1hcnkgcHJvY2VlZCdcblx0XHRcdFx0fSlcblx0XHRcdF0gKTtcblx0XHR9LFxuXG5cdFx0c2V0U3JjOiBmdW5jdGlvbiggc3JjICkge1xuXHRcdFx0dGhpcy5fY29udGVudC5zZXRTcmMoIHNyYyApO1xuXHRcdH0sXG5cdFx0c2V0RmlsZTogZnVuY3Rpb24oIGZpbGUgKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsIGZyID0gbmV3IEZpbGVSZWFkZXIoKTtcblx0XHRcdGZyLm9ubG9hZCA9IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0c2VsZi5zZXRTcmMoIGZyLnJlc3VsdCApO1xuXHRcdFx0fVxuXHRcdFx0ZnIucmVhZEFzRGF0YVVSTCggZmlsZSApO1xuXHRcdH0sXG5cdFx0c2V0Rm9jdXNwb2ludDogZnVuY3Rpb24oIGZvY3VzcG9pbnQgKSB7XG5cdFx0XHR0aGlzLl9jb250ZW50LnNldEZvY3VzcG9pbnQoIGZvY3VzcG9pbnQgKTtcblx0XHRcdHRoaXMuX2NvbnRlbnQuc2V0RW5hYmxlZCh0cnVlKTtcblx0XHR9LFxuXHRcdGdldEZvY3VzcG9pbnQ6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHJldHVybiB0aGlzLl9jb250ZW50LmdldEZvY3VzcG9pbnQoKTtcblx0XHR9LFxuXHRcdGdldEltYWdlV2lkdGg6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHJldHVybiB0aGlzLl9jb250ZW50LmdldEltYWdlV2lkdGgoKTtcblx0XHR9LFxuXHRcdGdldEltYWdlSGVpZ2h0OiBmdW5jdGlvbiggKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY29udGVudC5nZXRJbWFnZUhlaWdodCgpO1xuXHRcdH0sXG5cdFx0cmVzZXQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMuc2V0Rm9jdXNwb2ludCggeyB4OjAsIHk6MCB9IClcblx0XHR9LFxuXHRcdHByb2NlZWQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMudHJpZ2dlcigncHJvY2VlZCcpO1xuXHRcdH0sXG5cdFx0Y2FuY2VsVXBsb2FkOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHQvLyByZW1vdmUgZnJvbSBxdWV1ZSFcblx0XHRcdHRoaXMudHJpZ2dlcignY2FuY2VsLXVwbG9hZCcpO1xuXHRcdFx0dGhpcy5jbG9zZSgpO1xuXHRcdH1cblx0fSk7XG5cbn0pKHdwLGpRdWVyeSk7XG4iLCIoZnVuY3Rpb24od3AsJCkge1xuXG5cdHZhciByb2JvY3JvcCBcdFx0PSB3cC5tZWRpYS5yb2JvY3JvcCxcblx0XHRpbWFnZV9yYXRpb3NcdD0gcm9ib2Nyb3AuaW1hZ2VfcmF0aW9zLFxuXHRcdGltYWdlX3NpemVzXHRcdD0gcm9ib2Nyb3AuaW1hZ2Vfc2l6ZXMsXG5cdFx0bDEwblx0XHRcdD0gcm9ib2Nyb3AubDEwbixcblx0XHRvcHRpb25zXHRcdFx0PSByb2JvY3JvcC5vcHRpb25zLFxuXHRcdGNyb3BCdG5IVE1MXHRcdD0gJzxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnV0dG9uIHJvYm9jcm9wLW9wZW5cIj4nK2wxMG4uRWRpdEltYWdlU2l6ZXMrJzwvYnV0dG9uPicsXG5cdFx0Y3JvcExpbmtIVE1MXHQ9ICc8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ1dHRvbi1saW5rIHJvYm9jcm9wLW9wZW5cIj4nK2wxMG4uRWRpdEltYWdlU2l6ZXMrJzwvYnV0dG9uPic7XG5cblx0dmFyIHJvYm9jcm9wU3RhdGVFeHRlbmQgPSB7XG5cdFx0Y3JlYXRlU3RhdGVzOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuX3BhcmVudENyZWF0ZVN0YXRlcy5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHR0aGlzLnN0YXRlcy5hZGQoXG5cdFx0XHRcdG5ldyByb2JvY3JvcC5jb250cm9sbGVyLlJvYm9jcm9wSW1hZ2UoIHtcblx0XHRcdFx0XHRtb2RlbDogdGhpcy5tb2RlbCxcblx0XHRcdFx0XHRzZWxlY3Rpb246IHRoaXMub3B0aW9ucy5zZWxlY3Rpb25cblx0XHRcdFx0fSApXG5cdFx0XHQpO1xuXHRcdH1cblx0fTtcblxuXHQvLyBwb3N0IGlubGluZSBpbWFnZSBlZGl0b3Jcblx0Xy5leHRlbmQoIHdwLm1lZGlhLnZpZXcuSW1hZ2VEZXRhaWxzLnByb3RvdHlwZSwge1xuXHRcdF9wYXJlbnRQb3N0UmVuZGVyOiB3cC5tZWRpYS52aWV3LkltYWdlRGV0YWlscy5wcm90b3R5cGUucG9zdFJlbmRlcixcblx0XHRwb3N0UmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuX3BhcmVudFBvc3RSZW5kZXIuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnLmFjdGlvbnMnKS5hcHBlbmQoY3JvcEJ0bkhUTUwpO1xuXHRcdH0sXG5cdFx0cm9ib2Nyb3BPcGVuOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgc2l6ZSA9IHRoaXMubW9kZWwuZ2V0KCdzaXplJyksXG5cdFx0XHRcdGNyb3B0b29sID0gbmV3IHJvYm9jcm9wLnZpZXcuRnJhbWUuQ3JvcCgge1xuXHRcdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMuY29udHJvbGxlcixcblx0XHRcdFx0XHRtb2RlbDogdGhpcy5jb250cm9sbGVyLmltYWdlLmF0dGFjaG1lbnQsXG5cdFx0XHRcdFx0c2l6ZVRvU2VsZWN0OiBzaXplXG5cdFx0XHRcdH0gKTtcblx0XHRcdGNyb3B0b29sLm9wZW4oKTtcblx0XHR9XG5cdH0pO1xuXHR3cC5tZWRpYS52aWV3LkltYWdlRGV0YWlscy5wcm90b3R5cGUuZXZlbnRzWydjbGljayAucm9ib2Nyb3Atb3BlbiddID0gJ3JvYm9jcm9wT3Blbic7XG5cblxuXHQvLyBJbmxpbmUgTWVkaWFMaWJyYXJ5LCBHcmlkIHZpZXcgTWVkaWFMaWJyYXJ5XG5cdF8uZXh0ZW5kKCB3cC5tZWRpYS52aWV3LkF0dGFjaG1lbnQuRGV0YWlscy5wcm90b3R5cGUsIHtcblx0XHRfcGFyZW50UmVuZGVyOiB3cC5tZWRpYS52aWV3LkF0dGFjaG1lbnQuRGV0YWlscy5wcm90b3R5cGUucmVuZGVyLFxuXHRcdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLl9wYXJlbnRSZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG5cdFx0XHQvLyBtZWRpYSBsaWJyYXJ5IHNjcmVlTlxuXHRcdFx0aWYgKCBbJ2ltYWdlL2pwZWcnLCdpbWFnZS9wbmcnLCdpbWFnZS9naWYnXS5pbmRleE9mKCB0aGlzLm1vZGVsLmdldCgnbWltZScpICkgPj0gMCApIHtcblx0XHRcdFx0dGhpcy4kKCcuYXR0YWNobWVudC1hY3Rpb25zJykuYXBwZW5kKGNyb3BCdG5IVE1MKTtcblx0XHRcdFx0JCggY3JvcExpbmtIVE1MICkuaW5zZXJ0QWZ0ZXIoIHRoaXMuJGVsLmZpbmQoICdhLmVkaXQtYXR0YWNobWVudCcgKSApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0cm9ib2Nyb3BPcGVuOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgY3JvcHRvb2wgPSBuZXcgcm9ib2Nyb3Audmlldy5GcmFtZS5Dcm9wKCB7XG5cdFx0XHRcdFx0Y29udHJvbGxlcjogdGhpcy5jb250cm9sbGVyLFxuXHRcdFx0XHRcdG1vZGVsOiB0aGlzLm1vZGVsXG5cdFx0XHRcdH0pO1xuXHRcdFx0Y3JvcHRvb2wub3BlbigpO1xuXHRcdH0sXG5cdFx0X3BhcmVudENyZWF0ZVN0YXRlczogd3AubWVkaWEudmlldy5BdHRhY2htZW50LkRldGFpbHMucHJvdG90eXBlLmNyZWF0ZVN0YXRlc1xuXHR9LCByb2JvY3JvcFN0YXRlRXh0ZW5kICk7XG5cblx0d3AubWVkaWEudmlldy5BdHRhY2htZW50LkRldGFpbHMucHJvdG90eXBlLmV2ZW50c1snY2xpY2sgLnJvYm9jcm9wLW9wZW4nXSA9ICdyb2JvY3JvcE9wZW4nO1xuXG5cbn0pKHdwLGpRdWVyeSk7XG4iLCIoZnVuY3Rpb24oICQgKSB7XG5cblx0dmFyIHJvYm9jcm9wID0gd3AubWVkaWEucm9ib2Nyb3AsXG5cdFx0aW1hZ2VfcmF0aW9zID0gcm9ib2Nyb3AuaW1hZ2VfcmF0aW9zLFxuXHRcdG9wdGlvbnMgPSByb2JvY3JvcC5vcHRpb25zLFxuXHRcdGltYWdlSW5mb3MgPSB7fTtcblxuXHQvKipcblx0ICpcdEVhcmx5IHJldHVybiBpZiBhdXRvY3JvcCBpcyBkaXNhYmxlZFxuXHQgKi9cblx0aWYgKCAhIG9wdGlvbnMuYXNrX2Zvcl9mb2N1c3BvaW50ICkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdF8uZXh0ZW5kKCB3cC5tZWRpYS52aWV3LlVwbG9hZGVyV2luZG93LnByb3RvdHlwZSwge1xuXHRcdF9wYXJlbnRSZWFkeTogd3AubWVkaWEudmlldy5VcGxvYWRlcldpbmRvdy5wcm90b3R5cGUucmVhZHksXG5cdFx0ZGlkUmVhZHk6ZmFsc2UsXG5cblx0XHRyZWFkeTpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhc2tGb2N1c0ltYWdlcyA9IFtdLFxuXHRcdFx0XHRhc2tNb2RhbCwgc2VsZiA9IHRoaXM7XG5cblx0XHRcdC8vIHByZXZlbnQgZG91YmxlIGluaXRcblx0XHRcdGlmICggdGhpcy5kaWRSZWFkeSApIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuX3BhcmVudFJlYWR5LmFwcGx5KCB0aGlzICwgYXJndW1lbnRzICk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmRpZFJlYWR5ID0gdHJ1ZTtcblxuXHRcdFx0cmV0ID0gdGhpcy5fcGFyZW50UmVhZHkuYXBwbHkoIHRoaXMgLCBhcmd1bWVudHMgKTtcblxuXHRcdFx0ZnVuY3Rpb24gYXNrRm9jdXMoIHVwbG9hZGVyICkge1xuXHRcdFx0XHR2YXIgZmlsZUl0ZW0sIHNyYztcblx0XHRcdFx0aWYgKCBhc2tNb2RhbCApIHtcblx0XHRcdFx0XHRhc2tNb2RhbC5jbG9zZSgpLmRpc3Bvc2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoICEhIGFza0ZvY3VzSW1hZ2VzLmxlbmd0aCApIHtcblx0XHRcdFx0XHRmaWxlSXRlbSA9IGFza0ZvY3VzSW1hZ2VzLnNoaWZ0KCk7XG5cdFx0XHRcdFx0YXNrTW9kYWwgPSBuZXcgcm9ib2Nyb3Audmlldy5GcmFtZS5Gb2N1c3BvaW50KHsgY29udHJvbGxlcjogJCh0aGlzKSB9KTtcblx0XHRcdFx0XHRhc2tNb2RhbC5vbigncHJvY2VlZCcsZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRpbWFnZUluZm9zW2ZpbGVJdGVtLmZpbGUubmFtZV0gPSB7XG5cdFx0XHRcdFx0XHRcdGZvY3VzcG9pbnQ6XHRhc2tNb2RhbC5nZXRGb2N1c3BvaW50KCksXG5cdFx0XHRcdFx0XHRcdHdpZHRoOlx0XHRhc2tNb2RhbC5nZXRJbWFnZVdpZHRoKCksXG5cdFx0XHRcdFx0XHRcdGhlaWdodDpcdFx0YXNrTW9kYWwuZ2V0SW1hZ2VIZWlnaHQoKVxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdGFza0ZvY3VzKCB1cGxvYWRlciApO1xuXHRcdFx0XHRcdH0pLm9uKCdjYW5jZWwtdXBsb2FkJyxmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGZpbGVJdGVtLmZpbGUuYXR0YWNobWVudC5kZXN0cm95KCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0YXNrTW9kYWwuc2V0Rm9jdXNwb2ludCh7eDowLHk6MH0pO1xuXHRcdFx0XHRcdGFza01vZGFsLnNldEZpbGUoIGZpbGVJdGVtLmJsb2IgKTtcblx0XHRcdFx0XHRhc2tNb2RhbC5vcGVuKCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dXBsb2FkZXIuc3RhcnQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBhZGRBc2tGb2N1cyggZmlsZURhdGEsIHVwbG9hZGVyICkge1xuXHRcdFx0XHRhc2tGb2N1c0ltYWdlcy5wdXNoKCBmaWxlRGF0YSApO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqXHRAcmV0dXJuIG5hdGl2ZSBmaWxlIG9iamVjdCBvciBibG9iXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIHJlc29sdmVGaWxlKCBmaWxlICkge1xuXHRcdFx0XHR2YXIgX3JldCA9IHtcblx0XHRcdFx0XHRmaWxlOiBmaWxlLFxuXHRcdFx0XHRcdGJsb2I6ZmlsZS5nZXROYXRpdmUoKVxuXHRcdFx0XHR9LCBfcmV0MiwgYnl0ZXMsIGk7XG5cdFx0XHRcdGlmICggISBfcmV0LmJsb2IgKSB7XG5cdFx0XHRcdFx0X3JldC5ibG9iID0gZmlsZS5nZXRTb3VyY2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gX3JldDtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RvcCB1cGxvYWRlciBhbmQgZ2VuZXJhdGUgY3JvcGRhdGFcblx0XHRcdHRoaXMudXBsb2FkZXIudXBsb2FkZXIuYmluZCgnRmlsZXNBZGRlZCcsZnVuY3Rpb24oIHVwLCBmaWxlcyApIHtcblx0XHRcdFx0dmFyIGZpbGVEYXRhO1xuXG5cdFx0XHRcdC8vIHB1dCBtb2RhbFxuXHRcdFx0XHRmb3IgKHZhciBpPTA7aTxmaWxlcy5sZW5ndGg7aSsrKSB7XG5cdFx0XHRcdFx0aWYgKCBmaWxlc1tpXS50eXBlID09ICdpbWFnZS9wbmcnIHx8IGZpbGVzW2ldLnR5cGUgPT0gJ2ltYWdlL2pwZWcnICkge1xuXHRcdFx0XHRcdFx0ZmlsZURhdGEgPSByZXNvbHZlRmlsZSggZmlsZXNbaV0gKTtcblx0XHRcdFx0XHRcdGlmICggZmlsZURhdGEuYmxvYiBpbnN0YW5jZW9mIEJsb2IgKSB7XG5cdFx0XHRcdFx0XHRcdGFkZEFza0ZvY3VzKCBmaWxlRGF0YSwgdXAgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBhc2tGb2N1c0ltYWdlcy5sZW5ndGggKSB7XG5cdFx0XHRcdFx0dXAuc3RvcCgpO1xuXHRcdFx0XHRcdHVwLnJlZnJlc2goKTtcblx0XHRcdFx0XHRhc2tGb2N1cyggdXAgKTsgLy8gd2lsbCBhc2sgZm9yIGZvY3VzIG9yIHN0YXJ0IHVwbG9hZGVyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJhc2tmb2N1c1wiKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQvLyBzZW5kIGNyb3BkYXRhXG5cdFx0XHR0aGlzLnVwbG9hZGVyLnVwbG9hZGVyLmJpbmQoJ0JlZm9yZVVwbG9hZCcsZnVuY3Rpb24oIHVwLCBmaWxlICkge1xuXHRcdFx0XHR2YXIgcywgY3JvcGRhdGEsIGZvY3VzcG9pbnQ7XG5cblx0XHRcdFx0aWYgKCBpbWFnZUluZm9zW2ZpbGUubmFtZV0gKSB7XG5cblx0XHRcdFx0XHQvLyBhZGQgZm9jdXMgcG9pbnQgYW5kIGNyb3BkYXRhIHRvIGZpbGVcblx0XHRcdFx0XHRpbWFnZWluZm8gPSBpbWFnZUluZm9zW2ZpbGUubmFtZV07XG5cdFx0XHRcdFx0Y3JvcGRhdGEgPSB7fTtcblx0XHRcdFx0XHRmb3IgKHMgaW4gaW1hZ2VfcmF0aW9zKSB7XG5cdFx0XHRcdFx0XHRjcm9wZGF0YVsgaW1hZ2VfcmF0aW9zW3NdLm5hbWUgXSA9IHJvYm9jcm9wLmNyb3BGcm9tRm9jdXNQb2ludCggaW1hZ2VpbmZvLCBpbWFnZV9yYXRpb3Nbc10gKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR1cC5zZXR0aW5ncy5tdWx0aXBhcnRfcGFyYW1zLmZvY3VzcG9pbnRcdD0gSlNPTi5zdHJpbmdpZnkoIGltYWdlaW5mby5mb2N1c3BvaW50ICk7XG5cdFx0XHRcdFx0dXAuc2V0dGluZ3MubXVsdGlwYXJ0X3BhcmFtcy5jcm9wZGF0YVx0PSBKU09OLnN0cmluZ2lmeSggY3JvcGRhdGEgKTtcblxuXHRcdFx0XHRcdGRlbGV0ZShpbWFnZUluZm9zW2ZpbGUubmFtZV0pXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHJldDtcblx0XHR9XG5cdH0pO1xuXG59KSggalF1ZXJ5ICk7XG4iXX0=
