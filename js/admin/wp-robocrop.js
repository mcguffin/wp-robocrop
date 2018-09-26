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
			'click [name="robocrop-select-ratio"]': 'selectRatio',
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
					ratio: 		key,
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
			if ( this.options.ratios[ this.getSelected() ] ) {
				this.trigger('select-ratio');
			} else if ( this.options.tools[ this.getSelected() ] ) {
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
			wp.Backbone.View.prototype.render.apply(this,arguments);
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

			this.options.label = this.options.ratio.name + ' : 1';

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
					text: l10n.CancelUpload,
					className: 'cancel-upload'
				}),
				new wp.media.view.Button({
					text: l10n.Reset,
					className: 'reset'
				}),
				new wp.media.view.Button({
					text: l10n.Okay,
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJvYm9jcm9wLWJhc2UuanMiLCJyb2JvY3JvcC1tZWRpYS12aWV3LmpzIiwicm9ib2Nyb3AtZm9jdXNwb2ludC1tZWRpYS12aWV3LmpzIiwicm9ib2Nyb3Atd3AtbWVkaWEtdmlldy5qcyIsInJvYm9jcm9wLWZvY3VzcG9pbnQtd3AtdXBsb2FkZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xpQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbFZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFkbWluL3dwLXJvYm9jcm9wLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAcHJlc2VydmUgKGMpIDIwMTYgYnkgSm9lcm4gTHVuZFxuICogQGxpY2Vuc2UgR1BMM1xuICovXG4oZnVuY3Rpb24oIGV4cG9ydHMgKXtcblx0dmFyIHJvYm9jcm9wO1xuXG5cdHJvYm9jcm9wID0gXy5leHRlbmQoIHdpbmRvdy5yb2JvY3JvcCwge1xuXHRcdGNyb3BGcm9tRm9jdXNQb2ludDogZnVuY3Rpb24oIGltYWdlaW5mbywgY3JvcGluZm8gKSB7XG5cdFx0XHQvLyBub3JtYWxpemUgXG5cdFx0XHR2YXIgZnBfeCA9ICAgKCAgaW1hZ2VpbmZvLmZvY3VzcG9pbnQueCArIDEpIC8gMiAqIGltYWdlaW5mby53aWR0aCxcblx0XHRcdFx0ZnBfeSA9ICAgKCAtaW1hZ2VpbmZvLmZvY3VzcG9pbnQueSArIDEpIC8gMiAqIGltYWdlaW5mby5oZWlnaHQsXG5cdFx0XHRcdHNjYWxlID0gTWF0aC5taW4oIGltYWdlaW5mby53aWR0aCAvIGNyb3BpbmZvLm1pbl93aWR0aCwgaW1hZ2VpbmZvLmhlaWdodCAvIGNyb3BpbmZvLm1pbl9oZWlnaHQgKSxcblx0XHRcdFx0Y3JvcF93ID0gY3JvcGluZm8ubWluX3dpZHRoICogc2NhbGUsXG5cdFx0XHRcdGNyb3BfaCA9IGNyb3BpbmZvLm1pbl9oZWlnaHQgKiBzY2FsZSxcblx0XHRcdFx0Y3JvcF94ID0gTWF0aC5taW4oIE1hdGgubWF4KCBmcF94IC0gY3JvcF93IC8gMiwgMCApICwgaW1hZ2VpbmZvLndpZHRoIC0gY3JvcF93KSxcblx0XHRcdFx0Y3JvcF95ID0gTWF0aC5taW4oIE1hdGgubWF4KCBmcF95IC0gY3JvcF9oIC8gMiwgMCApICwgaW1hZ2VpbmZvLmhlaWdodCAtIGNyb3BfaCk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRuYW1lczogY3JvcGluZm8uc2l6ZXMsXG5cdFx0XHRcdHg6IGNyb3BfeCAvIGltYWdlaW5mby53aWR0aCxcblx0XHRcdFx0eTogY3JvcF95IC8gaW1hZ2VpbmZvLmhlaWdodCxcblx0XHRcdFx0d2lkdGg6IGNyb3BfdyAvIGltYWdlaW5mby53aWR0aCxcblx0XHRcdFx0aGVpZ2h0OiBjcm9wX2ggLyBpbWFnZWluZm8uaGVpZ2h0XG5cdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRyZWxUb0Fic0Nvb3JkczogZnVuY3Rpb24oIGNyb3BkYXRhLCBpbWFnZWluZm8gKSB7XG5cdFx0XHR2YXIgcywgcmV0ID0ge307XG5cdFx0XHRmb3IgKCBzIGluIGNyb3BkYXRhICkge1xuXHRcdFx0XHRzd2l0Y2ggKCBzICkge1xuXHRcdFx0XHRcdGNhc2UgJ3gnOlxuXHRcdFx0XHRcdGNhc2UgJ3gxJzpcblx0XHRcdFx0XHRjYXNlICd4Mic6XG5cdFx0XHRcdFx0Y2FzZSAnd2lkdGgnOlxuXHRcdFx0XHRcdFx0cmV0W3NdID0gY3JvcGRhdGFbc10gKiBpbWFnZWluZm8ud2lkdGhcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ3knOlxuXHRcdFx0XHRcdGNhc2UgJ3kxJzpcblx0XHRcdFx0XHRjYXNlICd5Mic6XG5cdFx0XHRcdFx0Y2FzZSAnaGVpZ2h0Jzpcblx0XHRcdFx0XHRcdHJldFtzXSA9IGNyb3BkYXRhW3NdICogaW1hZ2VpbmZvLmhlaWdodFxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdHJldFtzXSA9IGNyb3BkYXRhW3NdO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiByZXQ7XG5cdFx0fSxcblx0XHRhYnNUb1JlbENvb3JkczogZnVuY3Rpb24oIGNyb3BkYXRhLCBpbWFnZWluZm8gKSB7XG5cdFx0XHR2YXIgcywgcmV0ID0ge307XG5cdFx0XHRmb3IgKCBzIGluIGNyb3BkYXRhICkge1xuXHRcdFx0XHRzd2l0Y2ggKCBzICkge1xuXHRcdFx0XHRcdGNhc2UgJ3gnOlxuXHRcdFx0XHRcdGNhc2UgJ3gxJzpcblx0XHRcdFx0XHRjYXNlICd4Mic6XG5cdFx0XHRcdFx0Y2FzZSAnd2lkdGgnOlxuXHRcdFx0XHRcdFx0cmV0W3NdID0gY3JvcGRhdGFbc10gLyBpbWFnZWluZm8ud2lkdGhcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ3knOlxuXHRcdFx0XHRcdGNhc2UgJ3kxJzpcblx0XHRcdFx0XHRjYXNlICd5Mic6XG5cdFx0XHRcdFx0Y2FzZSAnaGVpZ2h0Jzpcblx0XHRcdFx0XHRcdHJldFtzXSA9IGNyb3BkYXRhW3NdIC8gaW1hZ2VpbmZvLmhlaWdodFxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdHJldFtzXSA9IGNyb3BkYXRhW3NdO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiByZXQ7XG5cdFx0fSxcblxuXHRcdHBvaW50VG9SZWN0Q29vcmRzOmZ1bmN0aW9uKCBwb2ludHMgKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR4OiBwb2ludHMueDEsXG5cdFx0XHRcdHk6IHBvaW50cy55MSxcblx0XHRcdFx0d2lkdGg6ICBwb2ludHMueDIgLSBwb2ludHMueDEsXG5cdFx0XHRcdGhlaWdodDogcG9pbnRzLnkyIC0gcG9pbnRzLnkxXG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHJlY3RUb1BvaW50Q29vcmRzOmZ1bmN0aW9uKCByZWN0ICkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0eDE6IHJlY3QueCxcblx0XHRcdFx0eTE6IHJlY3QueSxcblx0XHRcdFx0eDI6IChyZWN0Lm1heFggPyByZWN0Lm1heFggOiByZWN0LngrcmVjdC53aWR0aCksXG5cdFx0XHRcdHkyOiAocmVjdC5tYXhZID8gcmVjdC5tYXhZIDogcmVjdC55K3JlY3QuaGVpZ2h0KSxcblx0XHRcdH07XG5cdFx0fSxcblxuXHRcdHZpZXcgOiB7fSxcblx0XHRjb250cm9sbGVyIDoge31cblx0fSk7XG5cblx0ZXhwb3J0cy5tZWRpYS5yb2JvY3JvcCA9IHJvYm9jcm9wO1xuXG59KSggd3AgKTsiLCIoZnVuY3Rpb24od3AsJCkge1xuXG5cdHZhciByb2JvY3JvcCBcdFx0PSB3cC5tZWRpYS5yb2JvY3JvcCxcblx0XHRpbWFnZV9yYXRpb3NcdD0gcm9ib2Nyb3AuaW1hZ2VfcmF0aW9zLFxuXHRcdGltYWdlX3NpemVzXHRcdD0gcm9ib2Nyb3AuaW1hZ2Vfc2l6ZXMsXG5cdFx0bDEwblx0XHRcdD0gcm9ib2Nyb3AubDEwbixcblx0XHRvcHRpb25zXHRcdFx0PSByb2JvY3JvcC5vcHRpb25zO1xuXG5cblx0LyoqXG5cdCAqXHRBbiBJbWFnZVxuXHQgKi9cblx0cm9ib2Nyb3Audmlldy5JbWcgPSB3cC5tZWRpYS5WaWV3LmV4dGVuZCh7XG5cdFx0Y2xhc3NOYW1lOidhdHRhY2htZW50LWltYWdlJyxcblx0XHR0YWdOYW1lOidpbWcnLFxuXHRcdGlkOidyb2JvY3JvcC1pbWFnZScsXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHRfLmRlZmF1bHRzKCB0aGlzLm9wdGlvbnMsIHtzcmM6Jyd9ICk7XG5cdFx0XHR0aGlzLiRlbC5vbignbG9hZCcsZnVuY3Rpb24oKXtcblx0XHRcdFx0c2VsZi53aWR0aCA9IHNlbGYuJGVsLmdldCgwKS5uYXR1cmFsV2lkdGg7XG5cdFx0XHRcdHNlbGYuaGVpZ2h0ID0gc2VsZi4kZWwuZ2V0KDApLm5hdHVyYWxIZWlnaHQ7XG5cdFx0XHRcdHNlbGYucmF0aW8gPSBzZWxmLndpZHRoIC8gc2VsZi5oZWlnaHQ7XG5cdFx0XHRcdHNlbGYudHJpZ2dlcignbG9hZCcsc2VsZik7XG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ3NyYycsIHRoaXMub3B0aW9ucy5zcmMgKTtcblx0XHR9LFxuXHRcdGdldFNyYzogZnVuY3Rpb24oc3JjKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kZWwuYXR0ciggJ3NyYycgKTtcblx0XHR9LFxuXHRcdHNldFNyYzogZnVuY3Rpb24oc3JjKSB7XG5cdFx0XHQhIXNyYyAmJiB0aGlzLiRlbC5hdHRyKCAnc3JjJywgc3JjICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdH0pO1xuXG5cblx0LyoqXG5cdCAqXHRSYXRpbyBzZWxlY3QgbGlzdFxuXHQgKi9cblx0cm9ib2Nyb3Audmlldy5Sb2JvY3JvcFJhdGlvU2VsZWN0ID0gd3AubWVkaWEuVmlldy5leHRlbmQoe1xuXHRcdGNsYXNzTmFtZTogJ3JvYm9jcm9wLXNlbGVjdCcsXG5cdFx0dGVtcGxhdGU6IHdwLnRlbXBsYXRlKCdyb2JvY3JvcC1zZWxlY3QnKSxcblx0XHRldmVudHM6IHtcblx0XHRcdCdjbGljayBbbmFtZT1cInJvYm9jcm9wLXNlbGVjdC1yYXRpb1wiXSc6ICdzZWxlY3RSYXRpbycsXG5cdFx0fSxcblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHRcdHdwLkJhY2tib25lLlZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0Xy5kZWZhdWx0cyh7XG5cdFx0XHRcdHJhdGlvczp7fSxcblx0XHRcdFx0dG9vbHM6e31cblx0XHRcdH0sdGhpcy5vcHRpb25zKTtcblx0XHRcdHRoaXMub3B0aW9ucy5sMTBuID0gbDEwbjtcblxuXHRcdH0sXG5cdFx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHdwLkJhY2tib25lLlZpZXcucHJvdG90eXBlLnJlbmRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdF8uZWFjaCggdGhpcy5vcHRpb25zLnRvb2xzLCBmdW5jdGlvbiggdG9vbCwga2V5ICkge1xuXHRcdFx0XHRzZWxmLnZpZXdzLmFkZChuZXcgcm9ib2Nyb3Audmlldy5Sb2JvY3JvcFJhdGlvU2VsZWN0SXRlbSh7XG5cdFx0XHRcdFx0cmF0aW9rZXk6XHRrZXksXG5cdFx0XHRcdFx0c2l6ZW5hbWVzOlx0ZmFsc2UsXG5cdFx0XHRcdFx0cmF0aW86IFx0XHRrZXksXG5cdFx0XHRcdFx0dGl0bGU6XHRcdHRvb2wudGl0bGUsXG5cdFx0XHRcdFx0ZW5hYmxlZDogXHR0cnVlXG5cdFx0XHRcdH0pKVxuXG5cdFx0XHR9KTtcblx0XHRcdF8uZWFjaCggdGhpcy5vcHRpb25zLnJhdGlvcywgZnVuY3Rpb24oIHJhdGlvLCBrZXkgKSB7XG5cdFx0XHRcdHZhciBuYW1lcyA9IFtdLFxuXHRcdFx0XHRcdHRwbF9zdHIgPSAnPHNwYW4gY2xhc3M9XCJzaXplbmFtZTwlPSBjYW5jcm9wID8gXCJcIiA6IFwiIGRpc2FibGVkXCIgJT5cIj48JT0gbmFtZSAlPiAoPCU9IHdpZHRoICU+w5c8JT0gaGVpZ2h0ICU+KTwvc3Bhbj4nLFxuXHRcdFx0XHRcdG5hbWVfdHBsID0gXy50ZW1wbGF0ZSh0cGxfc3RyKTtcblx0XHRcdFx0Xy5lYWNoKCByYXRpby5zaXplcywgZnVuY3Rpb24oc2l6ZW5hbWUsa2V5KSB7XG5cdFx0XHRcdFx0dmFyIHNpemUgPSAkLmV4dGVuZCggdHJ1ZSwge1xuXHRcdFx0XHRcdFx0Y2FuY3JvcCA6XHQoc2VsZi5tb2RlbC5nZXQoJ3dpZHRoJykgPj0gaW1hZ2Vfc2l6ZXNbc2l6ZW5hbWVdLndpZHRoKSAmJlxuXHRcdFx0XHRcdFx0XHRcdFx0KHNlbGYubW9kZWwuZ2V0KCdoZWlnaHQnKSA+PSBpbWFnZV9zaXplc1tzaXplbmFtZV0uaGVpZ2h0KVxuXHRcdFx0XHRcdH0sIGltYWdlX3NpemVzW3NpemVuYW1lXSk7XG5cdFx0XHRcdFx0aWYgKCBzaXplLmNyb3AgKSB7XG5cdFx0XHRcdFx0XHRuYW1lcy5wdXNoKCBuYW1lX3RwbCggc2l6ZSApICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0c2VsZi52aWV3cy5hZGQobmV3IHJvYm9jcm9wLnZpZXcuUm9ib2Nyb3BSYXRpb1NlbGVjdEl0ZW0oe1xuXHRcdFx0XHRcdHJhdGlva2V5Olx0a2V5LFxuXHRcdFx0XHRcdHNpemVuYW1lczpcdG5hbWVzLmpvaW4oJycpLFxuXHRcdFx0XHRcdHJhdGlvOiBcdFx0a2V5LFxuXHRcdFx0XHRcdHRpdGxlOlx0XHRyYXRpby5uYW1lLFxuXHRcdFx0XHRcdGVuYWJsZWQ6IFx0KHNlbGYubW9kZWwuZ2V0KCd3aWR0aCcpICA+PSByYXRpby5taW5fd2lkdGgpICYmXG5cdFx0XHRcdFx0XHRcdFx0KHNlbGYubW9kZWwuZ2V0KCdoZWlnaHQnKSA+PSByYXRpby5taW5faGVpZ2h0KVxuXHRcdFx0XHR9KSlcblx0XHRcdH0gKTtcblxuXG5cdFx0fSxcblx0XHRzZXRTZWxlY3RlZDogZnVuY3Rpb24oIHJhdGlva2V5ICkge1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnW25hbWU9XCJyb2JvY3JvcC1zZWxlY3QtcmF0aW9cIl1bdmFsdWU9XCInK3JhdGlva2V5KydcIl0nKS5wcm9wKCdjaGVja2VkJyx0cnVlKTtcblx0XHRcdHRoaXMuc2VsZWN0UmF0aW8oKTtcblx0XHR9LFxuXHRcdGdldFNlbGVjdGVkOiBmdW5jdGlvbiggKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kZWwuZmluZCgnW25hbWU9XCJyb2JvY3JvcC1zZWxlY3QtcmF0aW9cIl06Y2hlY2tlZCcpLnZhbCgpO1xuXHRcdH0sXG5cdFx0c2VsZWN0UmF0aW86IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdGlmICggdGhpcy5vcHRpb25zLnJhdGlvc1sgdGhpcy5nZXRTZWxlY3RlZCgpIF0gKSB7XG5cdFx0XHRcdHRoaXMudHJpZ2dlcignc2VsZWN0LXJhdGlvJyk7XG5cdFx0XHR9IGVsc2UgaWYgKCB0aGlzLm9wdGlvbnMudG9vbHNbIHRoaXMuZ2V0U2VsZWN0ZWQoKSBdICkge1xuXHRcdFx0XHR0aGlzLnRyaWdnZXIoJ3NlbGVjdC10b29sJyk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnRyaWdnZXIoJ3NlbGVjdCcpO1xuXHRcdH1cblx0fSk7XG5cblx0LyoqXG5cdCAqXHRSYXRpbyBzZWxlY3QgbGlzdCBJdGVtXG5cdCAqL1xuXHRyb2JvY3JvcC52aWV3LlJvYm9jcm9wUmF0aW9TZWxlY3RJdGVtID0gd3AubWVkaWEuVmlldy5leHRlbmQoe1xuXHRcdGNsYXNzTmFtZTogJ3JvYm9jcm9wLXNlbGVjdC1pdGVtJyxcblx0XHR0ZW1wbGF0ZTogd3AudGVtcGxhdGUoJ3JvYm9jcm9wLXNlbGVjdC1pdGVtJyksXG5cdFx0c2l6ZWtleTonJyxcblx0XHRzaXplbmFtZXM6JycsXG5cdFx0cmF0aW86MCxcblx0XHRlbmFibGVkOm51bGwsXG5cdFx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHdwLkJhY2tib25lLlZpZXcucHJvdG90eXBlLnJlbmRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHR0aGlzLiRlbC5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKS5wcm9wKCdkaXNhYmxlZCcsICEgdGhpcy5vcHRpb25zLmVuYWJsZWQgKVxuXHRcdH1cblx0fSk7XG5cblx0cm9ib2Nyb3Audmlldy5Sb2JvY3JvcEltYWdlID0gd3AubWVkaWEuVmlldy5leHRlbmQoe1xuXHRcdGNsYXNzTmFtZTpcdFx0J2ltYWdlLXJvYm9jcm9wJyxcblx0XHR0ZW1wbGF0ZTpcdFx0d3AudGVtcGxhdGUoJ3JvYm9jcm9wJyksXG5cdFx0aW1hZ2VfcmF0aW9zOlx0aW1hZ2VfcmF0aW9zLFxuXHRcdGltYWdlX3NpemVzOlx0aW1hZ2Vfc2l6ZXMsXG5cdFx0X2Nyb3BwZXJzOlx0XHRudWxsLFxuXHRcdGV2ZW50czoge1xuXHRcdFx0J2NsaWNrIC5yb2JvY3JvcC1hdXRvY3JvcC1jdXJyZW50J1x0OiAnYXV0b2Nyb3AnLFxuXHRcdFx0J2NsaWNrIC5yb2JvY3JvcC1hdXRvY3JvcC1hbGwnXHRcdDogJ2F1dG9jcm9wQWxsJyxcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKCBvcHRpb25zICkge1xuXHRcdC8vXHR3cC5tZWRpYS52aWV3LkVkaXRJbWFnZS5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cdFx0XHR0aGlzLl9jcm9wcGVycyBcdFx0PSB7fTtcblx0XHRcdHRoaXMuaW1hZ2UgXHRcdFx0PSBuZXcgcm9ib2Nyb3Audmlldy5JbWcoIHtzcmM6IHRoaXMubW9kZWwuZ2V0KCd1cmwnKSB9ICk7XG5cblx0XHRcdHRoaXMuY29udHJvbGxlciBcdD0gb3B0aW9ucy5jb250cm9sbGVyO1xuXHRcdFx0dGhpcy5mb2N1c3BvaW50dG9vbFx0PSBuZXcgcm9ib2Nyb3Audmlldy5mb2N1c3BvaW50LkltYWdlRm9jdXNQb2ludFNlbGVjdCh7IGltYWdlOiB0aGlzLmltYWdlLCBmb2N1c3BvaW50OiB7eDowLHk6MH0sIHNyYzogdGhpcy5tb2RlbC5nZXQoJ3VybCcpIH0pO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5mb2N1c3BvaW50dG9vbCwgJ2NoYW5nZWQnLCB0aGlzLnVwZGF0ZUZvY3VzUG9pbnQgKTtcblxuXHRcdFx0d3AubWVkaWEuVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cdFx0fSxcblx0XHRkaXNtaXNzOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGFyZWFTZWxlY3QgPSB0aGlzLiRhcmVhU2VsZWN0KClcblx0XHRcdGFyZWFTZWxlY3QgJiYgYXJlYVNlbGVjdC5yZW1vdmUoKTtcblx0XHRcdHRoaXMuJGVsLnJlbW92ZSgpO1xuXHRcdH0sXG5cdFx0Y3JlYXRlU2VsZWN0OiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuc2VsZWN0ID0gbmV3IHJvYm9jcm9wLnZpZXcuUm9ib2Nyb3BSYXRpb1NlbGVjdCh7XG5cdFx0XHRcdGNob2ljZXM6IGNob2ljZXNcblx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0aGFzQ2hhbmdlZDogZnVuY3Rpb24oKXtcblx0XHRcdHRoaXMudHJpZ2dlciggJ2NoYW5nZWQnICk7XG5cdFx0fSxcblx0XHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHR3cC5tZWRpYS5WaWV3LnByb3RvdHlwZS5yZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG5cdFx0XHR0aGlzLnZpZXdzLnNldCgnLnJvYm9jcm9wLWNvbnRlbnQnLCB0aGlzLmZvY3VzcG9pbnR0b29sICk7XG5cblx0XHRcdHRoaXMuZm9jdXNwb2ludHRvb2wuc2V0Rm9jdXNwb2ludCggdGhpcy5tb2RlbC5nZXQoICdmb2N1c3BvaW50JyApICk7XG5cblx0XHRcdHRoaXMuaW1hZ2UuJGVsLmltZ0FyZWFTZWxlY3Qoe1xuXHRcdFx0XHRwYXJlbnQ6IFx0XHR0aGlzLmltYWdlLiRlbC5jbG9zZXN0KCcucm9ib2Nyb3AtaW1hZ2UtYm94JyksXG5cdFx0XHRcdGluc3RhbmNlOlx0IFx0dHJ1ZSxcblx0XHRcdFx0aGFuZGxlczogXHRcdHRydWUsXG5cdFx0XHRcdGtleXM6IFx0XHRcdHRydWUsXG5cdFx0XHRcdHBlcnNpc3RlbnQ6XHRcdHRydWUsXG5cdFx0XHRcdGVuYWJsZWQ6XHRcdHRydWUsXG5cdFx0XHRcdG1vdmFibGU6XHRcdHRydWUsXG5cdFx0XHRcdHJlc2l6YWJsZTpcdFx0dHJ1ZSxcblx0XHRcdFx0aW1hZ2VIZWlnaHQ6XHR0aGlzLm1vZGVsLmdldCgnaGVpZ2h0JyksXG5cdFx0XHRcdGltYWdlV2lkdGg6XHRcdHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLFxuXHRcdFx0XHRvblNlbGVjdEVuZDogZnVuY3Rpb24oIGltYWdlLCBjb29yZHMgKSB7XG5cdFx0XHRcdFx0dmFyIGNyb3BkYXRhID0gcm9ib2Nyb3AucG9pbnRUb1JlY3RDb29yZHMoIGNvb3JkcyApXG5cdFx0XHRcdFx0c2VsZi5fc2V0Q3JvcFNpemVzKGNyb3BkYXRhKTtcblx0XHRcdFx0XHRzZWxmLmhhc0NoYW5nZWQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdC8vIHNldCByYXRpbyBzZWVsY3Rcblx0XHRcdHRoaXMuc2VsZWN0UmF0aW8gPSBuZXcgcm9ib2Nyb3Audmlldy5Sb2JvY3JvcFJhdGlvU2VsZWN0KHtcblx0XHRcdFx0dG9vbHM6IHtcblx0XHRcdFx0XHRmb2N1c3BvaW50IDoge1xuXHRcdFx0XHRcdFx0dGl0bGU6IGwxMG4uU2V0Rm9jdXNQb2ludCxcblx0XHRcdFx0XHRcdHRyaWdnZXI6ICdmb2N1c3BvaW50J1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0cmF0aW9zOnRoaXMuaW1hZ2VfcmF0aW9zLFxuXHRcdFx0XHRtb2RlbDp0aGlzLm1vZGVsXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuc2VsZWN0UmF0aW9cblx0XHRcdFx0Lm9uKCdzZWxlY3QtcmF0aW8nLCB0aGlzLm9uc2VsZWN0cmF0aW8sIHRoaXMgKVxuXHRcdFx0XHQub24oJ3NlbGVjdC10b29sJywgdGhpcy5vbnNlbGVjdHRvb2wsIHRoaXMgKVxuXHRcdFx0XHQub24oJ3NlbGVjdCcsIHRoaXMudXBkYXRlQnV0dG9ucywgdGhpcyApO1xuXG5cdFx0XHR0aGlzLnZpZXdzLnNldCgnLnNlbGVjdC1yYXRpbycsIHRoaXMuc2VsZWN0UmF0aW8gKTtcblx0XHRcdC8vIHNldFRpbWVvdXQoIGZ1bmN0aW9uKCl7IH0sMjApO1xuXG5cdFx0XHQvLyBidXR0b25zXG5cdFx0XHR0aGlzLiRhdXRvQnV0dG9uXHQ9IHRoaXMuJGVsLmZpbmQoJy5yb2JvY3JvcC1hdXRvY3JvcC1jdXJyZW50Jyk7XG5cdFx0XHR0aGlzLiRhdXRvQWxsQnV0dG9uXHQ9IHRoaXMuJGVsLmZpbmQoJy5yb2JvY3JvcC1hdXRvY3JvcC1hbGwnKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0cmVhZHk6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGN1cnJlbnRSYXRpbywgZm91bmQ7XG5cdFx0XHR3cC5tZWRpYS52aWV3LkVkaXRJbWFnZS5wcm90b3R5cGUucmVhZHkuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG5cdFx0XHRpZiAoICEgXy5pc1VuZGVmaW5lZCggdGhpcy5vcHRpb25zLnNpemVUb1NlbGVjdCApICkge1xuXHRcdFx0XHRmb3VuZCA9IF8uZmluZCggdGhpcy5pbWFnZV9yYXRpb3MsIGZ1bmN0aW9uKCByYXRpbyApe1xuXHRcdFx0XHRcdHJldHVybiByYXRpby5zaXplcy5pbmRleE9mKCB0aGlzLm9wdGlvbnMuc2l6ZVRvU2VsZWN0ICkgPiAtMTtcblx0XHRcdFx0fSwgdGhpcyApO1xuXHRcdFx0XHRpZiAoIGZvdW5kICkge1xuXHRcdFx0XHRcdGN1cnJlbnRSYXRpbyA9IGZvdW5kLm5hbWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKCBfLmlzVW5kZWZpbmVkKCBjdXJyZW50UmF0aW8gKSApIHtcblx0XHRcdFx0Y3VycmVudFJhdGlvID0gJ2ZvY3VzcG9pbnQnOy8vXy5maXJzdChfLmtleXMoIHRoaXMuaW1hZ2VfcmF0aW9zICkpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5zZWxlY3RSYXRpby5zZXRTZWxlY3RlZCggY3VycmVudFJhdGlvICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHNhdmU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdFx0YXR0YWNobWVudHM6e31cblx0XHRcdFx0fSwgaWQgPSB0aGlzLm1vZGVsLmdldCgnaWQnKSxcblx0XHRcdFx0JGJ0bnMgPSB0aGlzLiRhdXRvQWxsQnV0dG9uLmFkZCggdGhpcy4kYXV0b0J1dHRvbiApLnByb3AoICdkaXNhYmxlZCcsIHRydWUgKSxcblx0XHRcdFx0c2VsZiA9IHRoaXM7XG5cdFx0XHRkYXRhLmF0dGFjaG1lbnRzW2lkXSA9IHtcblx0XHRcdFx0c2l6ZXM6XHRcdHRoaXMubW9kZWwuZ2V0KCdzaXplcycpLFxuXHRcdFx0XHRmb2N1c3BvaW50OiB0aGlzLm1vZGVsLmdldCgnZm9jdXNwb2ludCcpXG5cdFx0XHR9O1xuXHRcdFx0dGhpcy5tb2RlbC5zYXZlQ29tcGF0KCBkYXRhLCB7fSApLmRvbmUoIGZ1bmN0aW9uKCByZXNwICkge1xuXHRcdFx0XHR2YXIgZCA9IG5ldyBEYXRlKCk7XG5cblx0XHRcdFx0Ly8gZm9yY2UgcmVsb2FkIGltYWdlIC4uLlxuXHRcdFx0XHRfLmVhY2goIHNlbGYubW9kZWwuYXR0cmlidXRlcy5zaXplcywgZnVuY3Rpb24oIHNpemUsIHNpemVuYW1lICkge1xuXHRcdFx0XHRcdHZhciBzZWxlY3RvciA9ICAnaW1nW3NyY149XCInK3NpemUudXJsKydcIl0nLFxuXHRcdFx0XHRcdFx0cmVmcmVzaCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdCQodGhpcykucmVtb3ZlQXR0cignc3JjJykuYXR0ciggJ3NyYycsIHNpemUudXJsKyc/JytkLmdldFRpbWUoKSApO1xuXHRcdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0cmVmcmVzaF9tY2UgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHQkKHRoaXMpLnJlbW92ZUF0dHIoJ2RhdGEtbWNlLXNyYycpLmF0dHIoICdkYXRhLW1jZS1zcmMnLCBzaXplLnVybCsnPycrZC5nZXRUaW1lKCkgKTtcblx0XHRcdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdC8vIC4uLiB1bmxlc3MgaXQncyBmdWxsc2l6ZSAuLi5cblx0XHRcdFx0XHRpZiAoIHNpemVuYW1lICE9PSAnZnVsbCcgKSB7XG5cblx0XHRcdFx0XHRcdCQoZG9jdW1lbnQpLmFkZCggJCgnaWZyYW1lJykuY29udGVudHMoKSApXG5cdFx0XHRcdFx0XHRcdC5maW5kKCBzZWxlY3RvciApXG5cdFx0XHRcdFx0XHRcdC5lYWNoKCByZWZyZXNoICk7XG5cblx0XHRcdFx0XHRcdC8vIC4uLiBpbnNpZGUgdGlueW1jZSBpZnJhbWVzXG5cdFx0XHRcdFx0XHQkKCcubWNlLWVkaXQtYXJlYSBpZnJhbWUnKS5lYWNoKGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdCQodGhpcykuY29udGVudHMoKVxuXHRcdFx0XHRcdFx0XHRcdC5maW5kKCBzZWxlY3RvciApXG5cdFx0XHRcdFx0XHRcdFx0LmVhY2goIHJlZnJlc2ggKVxuXHRcdFx0XHRcdFx0XHRcdC5lYWNoKCByZWZyZXNoX21jZSApO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LCBzZWxmICk7XG5cdFx0XHRcdCRidG5zLnByb3AoICdkaXNhYmxlZCcsIGZhbHNlICk7XG5cdFx0XHRcdHNlbGYudHJpZ2dlciggJ3NhdmVkJyApO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHVwZGF0ZUJ1dHRvbnM6IGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgdG9vbGtleSA9IHRoaXMuc2VsZWN0UmF0aW8uZ2V0U2VsZWN0ZWQoKTtcblx0XHRcdHRoaXMuJGF1dG9CdXR0b24udG9nZ2xlQ2xhc3MoICdoaWRkZW4nLCB0b29sa2V5ID09PSAnZm9jdXNwb2ludCcgKTtcblx0XHRcdHRoaXMuJGF1dG9BbGxCdXR0b24udG9nZ2xlQ2xhc3MoICdoaWRkZW4nLCB0b29sa2V5ICE9PSAnZm9jdXNwb2ludCcgKTtcblx0XHR9LFxuXHRcdG9uc2VsZWN0dG9vbDogZnVuY3Rpb24oKXtcblx0XHRcdHZhciB0b29sa2V5ID0gdGhpcy5zZWxlY3RSYXRpby5nZXRTZWxlY3RlZCgpO1xuXHRcdFx0dGhpcy4kYXJlYVNlbGVjdCgpLmNhbmNlbFNlbGVjdGlvbigpO1xuXG5cdFx0XHRzd2l0Y2ggKCB0b29sa2V5ICkge1xuXHRcdFx0XHRjYXNlICdmb2N1c3BvaW50Jzpcblx0XHRcdFx0XHQvLyB3cmFwIGFyb3VuZFxuXHRcdFx0XHRcdHRoaXMuZm9jdXNwb2ludHRvb2wuc2V0RW5hYmxlZCggdHJ1ZSApO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0b25zZWxlY3RyYXRpbzogZnVuY3Rpb24oICkge1xuXHRcdFx0dGhpcy5mb2N1c3BvaW50dG9vbC5zZXRFbmFibGVkKCBmYWxzZSApO1xuXG5cdFx0XHQvKipcblx0XHRcdCAqXHRPbiBzd2l0Y2ggcmF0aW9cblx0XHRcdCAqL1xuXHRcdFx0dmFyIHJhdGlva2V5ID0gdGhpcy5zZWxlY3RSYXRpby5nZXRTZWxlY3RlZCgpLFxuXHRcdFx0XHRzaXplcyA9IHRoaXMubW9kZWwuZ2V0KCdzaXplcycpLFxuXHRcdFx0XHRmYWN0b3IsIHJlY3QsIGNyb3BkYXRhLCBzZWxmID0gdGhpcyxcblx0XHRcdFx0cywgYXJlYVNlbGVjdE9wdGlvbnMsXG5cdFx0XHRcdGltZ1dpZHRoICA9IHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLFxuXHRcdFx0XHRpbWdIZWlnaHQgPSB0aGlzLm1vZGVsLmdldCgnaGVpZ2h0Jyk7XG5cblx0XHRcdHRoaXMuY3VycmVudF9yYXRpbyA9IHRoaXMuaW1hZ2VfcmF0aW9zW3JhdGlva2V5XTtcblxuXHRcdFx0YXJlYVNlbGVjdE9wdGlvbnMgPSB7XG5cdFx0XHRcdGFzcGVjdFJhdGlvOlx0dGhpcy5jdXJyZW50X3JhdGlvLnJhdGlvICsgJzoxJyxcblx0XHRcdFx0bWluV2lkdGg6XHRcdHRoaXMuY3VycmVudF9yYXRpby5taW5fd2lkdGgsXG5cdFx0XHRcdG1pbkhlaWdodDpcdFx0dGhpcy5jdXJyZW50X3JhdGlvLm1pbl9oZWlnaHRcblx0XHRcdH07XG5cblx0XHRcdF8uZWFjaCh0aGlzLmN1cnJlbnRfcmF0aW8uc2l6ZXMsIGZ1bmN0aW9uKHNpemUpe1xuXHRcdFx0XHRpZiAoICEgY3JvcGRhdGEgJiYgISEgc2l6ZXNbc2l6ZV0gJiYgISEgc2l6ZXNbc2l6ZV0uY3JvcGRhdGEgKSB7XG5cdFx0XHRcdFx0Y3JvcGRhdGEgPSBzaXplc1tzaXplXS5jcm9wZGF0YTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIGltYWdlX3NpemVzW3NpemVdLndpZHRoIDw9IGltZ1dpZHRoICYmIGltYWdlX3NpemVzW3NpemVdLmhlaWdodCA8PSBpbWdIZWlnaHQgKSB7XG5cdFx0XHRcdFx0YXJlYVNlbGVjdE9wdGlvbnMubWluV2lkdGggID0gTWF0aC5tYXgoIGFyZWFTZWxlY3RPcHRpb25zLm1pbldpZHRoLCAgaW1hZ2Vfc2l6ZXNbc2l6ZV0ud2lkdGggKTtcblx0XHRcdFx0XHRhcmVhU2VsZWN0T3B0aW9ucy5taW5IZWlnaHQgPSBNYXRoLm1heCggYXJlYVNlbGVjdE9wdGlvbnMubWluSGVpZ2h0LCBpbWFnZV9zaXplc1tzaXplXS5oZWlnaHQgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdGlmICggIWNyb3BkYXRhICkge1xuXHRcdFx0XHQvLyB3cCBkZWZhdWx0IGNyb3BkYXRhXG5cdFx0XHRcdHZhciBzY2FsZSA9IE1hdGgubWluKCB0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSAvIHRoaXMuY3VycmVudF9yYXRpby5yYXRpbywgdGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpKTtcblxuXHRcdFx0XHRyZWN0ID0ge1xuXHRcdFx0XHRcdHg6MCxcblx0XHRcdFx0XHR5OjAsXG5cdFx0XHRcdFx0d2lkdGg6ICBzY2FsZSAqIHRoaXMuY3VycmVudF9yYXRpby5yYXRpbyxcblx0XHRcdFx0XHRoZWlnaHQ6IHNjYWxlXG5cdFx0XHRcdH07XG5cdFx0XHRcdHJlY3QueCA9ICh0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSAtIHJlY3Qud2lkdGgpLzI7XG5cdFx0XHRcdHJlY3QueSA9ICh0aGlzLm1vZGVsLmdldCgnaGVpZ2h0JykgLSByZWN0LmhlaWdodCkvMjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJlY3QgPSB7fTtcblxuXHRcdFx0XHRfLmV4dGVuZChyZWN0LGNyb3BkYXRhKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy4kYXJlYVNlbGVjdCgpLnNldE9wdGlvbnMoIGFyZWFTZWxlY3RPcHRpb25zICk7XG5cdFx0XHRpZiAoICEgdGhpcy5pbWFnZS4kZWwuZ2V0KDApLmNvbXBsZXRlICkge1xuXHRcdFx0XHR0aGlzLmltYWdlLiRlbC5vbignbG9hZCcsZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0c2VsZi5zZWxlY3RDcm9wKHJlY3QpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuc2VsZWN0Q3JvcChyZWN0KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0YXV0b2Nyb3A6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdC8vIGNyb3AgYnkgZm9jdXMgcG9pbnRcblxuXHRcdFx0dmFyIGNyb3BkYXRhLCBpbWFnZWluZm8gPSB7XG5cdFx0XHRcdFx0d2lkdGg6XHRcdHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLFxuXHRcdFx0XHRcdGhlaWdodDpcdFx0dGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpLFxuXHRcdFx0XHRcdGZvY3VzcG9pbnQ6XHR0aGlzLm1vZGVsLmdldCgnZm9jdXNwb2ludCcpXG5cdFx0XHRcdH07XG5cdFx0XHRjcm9wZGF0YSA9IHJvYm9jcm9wLmNyb3BGcm9tRm9jdXNQb2ludCggaW1hZ2VpbmZvLCB0aGlzLmN1cnJlbnRfcmF0aW8gKTtcblx0XHRcdGNyb3BkYXRhID0gcm9ib2Nyb3AucmVsVG9BYnNDb29yZHMoIGNyb3BkYXRhLCBpbWFnZWluZm8gKTtcblxuXHRcdFx0dGhpcy5fc2V0Q3JvcFNpemVzKCBjcm9wZGF0YSApO1xuXHRcdFx0dGhpcy5zZWxlY3RDcm9wKCBjcm9wZGF0YSApO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGF1dG9jcm9wQWxsOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGltYWdlaW5mbyA9IHtcblx0XHRcdFx0XHR3aWR0aDpcdFx0dGhpcy5tb2RlbC5nZXQoJ3dpZHRoJyksXG5cdFx0XHRcdFx0aGVpZ2h0Olx0XHR0aGlzLm1vZGVsLmdldCgnaGVpZ2h0JyksXG5cdFx0XHRcdFx0Zm9jdXNwb2ludDpcdHRoaXMubW9kZWwuZ2V0KCdmb2N1c3BvaW50Jylcblx0XHRcdFx0fTtcblxuXHRcdFx0Xy5lYWNoKCB0aGlzLmltYWdlX3JhdGlvcywgZnVuY3Rpb24oIHJhdGlvICkge1xuXHRcdFx0XHR2YXIgY3JvcGRhdGE7XG5cdFx0XHRcdGNyb3BkYXRhID0gcm9ib2Nyb3AuY3JvcEZyb21Gb2N1c1BvaW50KCBpbWFnZWluZm8sIHJhdGlvICk7XG5cdFx0XHRcdGNyb3BkYXRhID0gcm9ib2Nyb3AucmVsVG9BYnNDb29yZHMoIGNyb3BkYXRhLCBpbWFnZWluZm8gKTtcblx0XHRcdFx0c2VsZi5fc2V0Q3JvcFNpemVzKCBjcm9wZGF0YSwgcmF0aW8gKTtcblx0XHRcdH0gKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRzZWxlY3RDcm9wOmZ1bmN0aW9uKCByZWN0ICkge1xuXHRcdFx0Ly8gZHJhdyBjcm9wIFVJIGVsZW1lbnQuXG5cdFx0XHR2YXIgZmFjdG9yID0gdGhpcy5faW1hZ2Vfc2NhbGVfZmFjdG9yKCksXG5cdFx0XHRcdHBvaW50cyA9IHJvYm9jcm9wLnJlY3RUb1BvaW50Q29vcmRzKCByZWN0ICksXG5cdFx0XHRcdCRhcmVhU2VsZWN0ID0gdGhpcy4kYXJlYVNlbGVjdCgpO1xuXG5cdFx0XHQkYXJlYVNlbGVjdC5zZXRTZWxlY3Rpb24oIHBvaW50cy54MSwgcG9pbnRzLnkxLCBwb2ludHMueDIsIHBvaW50cy55MiwgZmFsc2UgKTtcblx0XHRcdCRhcmVhU2VsZWN0LnNldE9wdGlvbnMoIHtzaG93OnRydWV9ICk7XG5cdFx0XHQkYXJlYVNlbGVjdC51cGRhdGUoKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0JGFyZWFTZWxlY3QgOiBmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHRoaXMuaW1hZ2UuJGVsLmRhdGEoJ2ltZ0FyZWFTZWxlY3QnKTtcblx0XHR9LFxuXHRcdF9pbWFnZV9zY2FsZV9mYWN0b3IgOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciAkY29udGFpbmVyID0gdGhpcy5pbWFnZS4kZWwuY2xvc2VzdCgnLnJvYm9jcm9wLWltYWdlLWJveCcpLFxuXHRcdFx0XHR3ID0gTWF0aC5taW4odGhpcy5tb2RlbC5nZXQoJ3dpZHRoJyksJGNvbnRhaW5lci53aWR0aCgpKSxcblx0XHRcdFx0aCA9IE1hdGgubWluKHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKSwkY29udGFpbmVyLmhlaWdodCgpKTtcblxuXHRcdFx0cmV0dXJuIE1hdGgubWluKCB3IC8gdGhpcy5tb2RlbC5nZXQoJ3dpZHRoJyksIGggLyB0aGlzLm1vZGVsLmdldCgnaGVpZ2h0JykgKTtcblx0XHR9LFxuXHRcdHVwZGF0ZUZvY3VzUG9pbnQ6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHRoaXMubW9kZWwuc2V0KCAnZm9jdXNwb2ludCcsIHRoaXMuZm9jdXNwb2ludHRvb2wuZ2V0Rm9jdXNwb2ludCgpICk7XG5cdFx0fSxcblx0XHRfc2V0Q3JvcFNpemVzIDogZnVuY3Rpb24oIGNyb3BkYXRhLCByYXRpbyApIHtcblx0XHRcdHZhciB3ID0gdGhpcy5tb2RlbC5nZXQoJ3dpZHRoJyksXG5cdFx0XHRcdGggPSB0aGlzLm1vZGVsLmdldCgnaGVpZ2h0JyksXG5cdFx0XHRcdG1vZGVsU2l6ZXMgPSB0aGlzLm1vZGVsLmdldCgnc2l6ZXMnKSxcblx0XHRcdFx0cmF0aW8gPSByYXRpbyB8fCB0aGlzLmN1cnJlbnRfcmF0aW87XG5cblx0XHRcdF8uZWFjaChyYXRpby5zaXplcywgZnVuY3Rpb24oIHNpemVuYW1lICkge1xuXHRcdFx0XHQvLypcblx0XHRcdFx0Ly8gdmFyIGNhbmNyb3AgPVx0KHcgPj0gaW1hZ2Vfc2l6ZXNbc2l6ZW5hbWVdLndpZHRoKSAmJlxuXHRcdFx0XHQvLyBcdFx0XHRcdChoID49IGltYWdlX3NpemVzW3NpemVuYW1lXS5oZWlnaHQpO1xuXG5cdFx0XHRcdCEgbW9kZWxTaXplc1sgc2l6ZW5hbWUgXSAmJiAoIG1vZGVsU2l6ZXNbIHNpemVuYW1lIF0gPSB7fSApO1xuXHRcdFx0XHRtb2RlbFNpemVzWyBzaXplbmFtZSBdLmNyb3BkYXRhID0gY3JvcGRhdGE7XG5cblx0XHRcdFx0aWYgKCAvKmNhbmNyb3AgJiYgKi8gaW1hZ2Vfc2l6ZXNbc2l6ZW5hbWVdLmNyb3AgKSB7XG5cdFx0XHRcdFx0bW9kZWxTaXplc1sgc2l6ZW5hbWUgXS5jcm9wZGF0YSA9IGNyb3BkYXRhO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIG1vZGVsU2l6ZXNbIHNpemVuYW1lIF0gKSB7XG5cdFx0XHRcdFx0ZGVsZXRlKCBtb2RlbFNpemVzWyBzaXplbmFtZSBdICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0LyovXG5cdFx0XHRcdCEgbW9kZWxTaXplc1sgc2l6ZW5hbWUgXSAmJiAoIG1vZGVsU2l6ZXNbIHNpemVuYW1lIF0gPSB7fSApO1xuXHRcdFx0XHRtb2RlbFNpemVzWyBzaXplbmFtZSBdLmNyb3BkYXRhID0gY3JvcGRhdGE7XG5cdFx0XHRcdC8vKi9cblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdzaXplcycsIG1vZGVsU2l6ZXMgKTtcblx0XHR9LFxuXHRcdF9nZXRSZWxhdGl2ZUNvb3JkczogZnVuY3Rpb24oIGNvb3JkcyApIHtcblx0XHRcdHZhciB3ID0gdGhpcy5tb2RlbC5nZXQoJ3dpZHRoJyksXG5cdFx0XHRcdGggPSB0aGlzLm1vZGVsLmdldCgnaGVpZ2h0Jyk7XG5cdFx0XHRmb3IgKCB2YXIgcyBpbiBjb29yZHMgKSB7XG5cdFx0XHRcdGlmICggJ251bWJlcic9PT10eXBlb2YoY29vcmRzW3NdKSApIHtcblx0XHRcdFx0XHRzd2l0Y2ggKHMpIHtcblx0XHRcdFx0XHRcdGNhc2UgJ3gnOlxuXHRcdFx0XHRcdFx0Y2FzZSAneDEnOlxuXHRcdFx0XHRcdFx0Y2FzZSAneDInOlxuXHRcdFx0XHRcdFx0Y2FzZSAnd2lkdGgnOlxuXHRcdFx0XHRcdFx0Y2FzZSAnbWluWCc6XG5cdFx0XHRcdFx0XHRjYXNlICdtYXhYJzpcblx0XHRcdFx0XHRcdFx0Y29vcmRzW3NdIC89IHc7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0Y29vcmRzW3NdIC89IGg7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0X2dldEFic29sdXRlQ29vcmRzOiBmdW5jdGlvbiggY29vcmRzICkge1xuXHRcdFx0dmFyIHcgPSB0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSxcblx0XHRcdFx0aCA9IHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKTtcblx0XHRcdGZvciAoIHZhciBzIGluIGNvb3JkcyApIHtcblx0XHRcdFx0aWYgKCAnbnVtYmVyJz09PXR5cGVvZihjb29yZHNbc10pICkge1xuXHRcdFx0XHRcdHN3aXRjaCAocykge1xuXHRcdFx0XHRcdFx0Y2FzZSAneCc6XG5cdFx0XHRcdFx0XHRjYXNlICd4MSc6XG5cdFx0XHRcdFx0XHRjYXNlICd4Mic6XG5cdFx0XHRcdFx0XHRjYXNlICd3aWR0aCc6XG5cdFx0XHRcdFx0XHRjYXNlICdtaW5YJzpcblx0XHRcdFx0XHRcdGNhc2UgJ21heFgnOlxuXHRcdFx0XHRcdFx0XHRjb29yZHNbc10gKj0gdztcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHRjb29yZHNbc10gKj0gaDtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0pO1xuXG5cblxuXG5cdHJvYm9jcm9wLnZpZXcuRnJhbWUgPSB3cC5tZWRpYS52aWV3Lk1lZGlhRnJhbWUuZXh0ZW5kKHtcblx0XHR0ZW1wbGF0ZTogIHdwLnRlbXBsYXRlKCdyb2JvY3JvcC1tb2RhbCcpLFxuXHRcdHJlZ2lvbnM6ICAgWyd0aXRsZScsJ2NvbnRlbnQnLCdpbnN0cnVjdGlvbnMnLCdidXR0b25zJywncmF0aW9zJ11cblx0fSk7XG5cblx0cm9ib2Nyb3Audmlldy5GcmFtZS5Dcm9wID0gcm9ib2Nyb3Audmlldy5GcmFtZS5leHRlbmQoe1xuXHRcdGV2ZW50czoge1xuXHRcdFx0J2NsaWNrIC5yb2JvY3JvcC1zYXZlJ1x0XHQ6ICdzYXZlJyxcblx0XHRcdCdjbGljayAucm9ib2Nyb3AtY2FuY2VsJ1x0OiAnY2xvc2UnLFxuXHRcdH0sXG5cdFx0c2F2ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLiQoJy5yb2JvY3JvcC1zYXZlLCAucm9ib2Nyb3AtY2FuY2VsJykucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0dGhpcy5fY29udGVudC5zYXZlKCk7XG5cdFx0fSxcblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbiggb3B0aW9ucyApIHtcblx0XHRcdHJvYm9jcm9wLnZpZXcuRnJhbWUucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXG5cdFx0XHR0aGlzLmNyZWF0ZVRpdGxlKCk7XG5cdFx0XHR0aGlzLmNyZWF0ZUNvbnRlbnQoKTtcblx0XHRcdHRoaXMuY3JlYXRlQnV0dG9ucygpO1xuXG5cdFx0XHR0aGlzLm9uKCdjbG9zZScsIHRoaXMuZGlzbWlzcywgdGhpcyApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5fY29udGVudCwgJ3NhdmVkJywgdGhpcy5tb2RlbFN5bmMgKTtcblx0XHR9LFxuXHRcdG1vZGVsU3luYzogZnVuY3Rpb24oKXtcblx0XHRcdHRoaXMuJCgnLnJvYm9jcm9wLXNhdmUsIC5yb2JvY3JvcC1jYW5jZWwnKS5wcm9wKCAnZGlzYWJsZWQnLCBmYWxzZSApO1xuXHRcdH0sXG5cdFx0ZGlzbWlzczpmdW5jdGlvbigpe1xuXHRcdFx0dGhpcy5fY29udGVudC5kaXNtaXNzKCk7XG5cdFx0fSxcblx0XHRjcmVhdGVUaXRsZTogZnVuY3Rpb24oICkge1xuXHRcdFx0dGhpcy5fdGl0bGUgPSBuZXcgd3AubWVkaWEuVmlldyh7XG5cdFx0XHRcdHRhZ05hbWU6ICdoMSdcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5fdGl0bGUuJGVsLnRleHQoIGwxMG4uQXR0YWNobWVudERldGFpbHMgKTsgLy8gXCJDcm9wIGltYWdlIHNpemVzXCJcblx0XHRcdHRoaXMudGl0bGUuc2V0KCBbIHRoaXMuX3RpdGxlIF0gKTtcblx0XHR9LFxuXHRcdGNyZWF0ZUNvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG9wdHMgPSBfLmV4dGVuZCh7XG5cdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMuY29udHJvbGxlcixcblx0XHRcdFx0bW9kZWw6IHRoaXMubW9kZWxcblx0XHRcdH0sIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5fY29udGVudCA9IG5ldyByb2JvY3JvcC52aWV3LlJvYm9jcm9wSW1hZ2UoIG9wdHMgKTtcblx0XHRcdHRoaXMuY29udGVudC5zZXQoIFsgdGhpcy5fY29udGVudCBdICk7XG5cdFx0fSxcblx0XHRjcmVhdGVCdXR0b25zOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpbmZvLCBidG47XG5cblx0XHRcdHRoaXMuYnV0dG9ucy5zZXQoIFtcblx0XHRcdFx0bmV3IHdwLm1lZGlhLnZpZXcuQnV0dG9uKHtcblx0XHRcdFx0XHR0ZXh0OiBsMTBuLkNsb3NlLFxuXHRcdFx0XHRcdGNsYXNzTmFtZTogJ2J1dHRvbi1zZWNvbmRhcnkgcm9ib2Nyb3AtY2FuY2VsJ1xuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IHdwLm1lZGlhLnZpZXcuQnV0dG9uKHtcblx0XHRcdFx0XHR0ZXh0OiBsMTBuLlNhdmVDaGFuZ2VzLFxuXHRcdFx0XHRcdGNsYXNzTmFtZTogJ2J1dHRvbi1wcmltYXJ5IHJvYm9jcm9wLXNhdmUnXG5cdFx0XHRcdH0pXG5cdFx0XHRdICk7XG5cdFx0fVxuXHR9KTtcblxuXG5cblxufSkod3AsalF1ZXJ5KTtcbiIsIihmdW5jdGlvbih3cCwkKSB7XG5cblx0dmFyIHJvYm9jcm9wID0gd3AubWVkaWEucm9ib2Nyb3AsXG5cdFx0aW1hZ2VfcmF0aW9zID0gcm9ib2Nyb3AuaW1hZ2VfcmF0aW9zLFxuXHRcdGltYWdlX3NpemVzICA9IHJvYm9jcm9wLmltYWdlX3NpemVzLFxuXHRcdGwxMG4gPSByb2JvY3JvcC5sMTBuO1xuXG5cdHZhciBWaWV3XHRcdD0gd3AubWVkaWEuVmlldyxcblx0XHRNZWRpYUZyYW1lXHQ9IHdwLm1lZGlhLnZpZXcuTWVkaWFGcmFtZSxcblx0XHRGb2N1c1BvaW50LFxuXHRcdENyb3BSZWN0O1xuXG5cdHJvYm9jcm9wLnZpZXcuZm9jdXNwb2ludCA9IHt9O1xuXG5cdENyb3BSZWN0ID0gcm9ib2Nyb3Audmlldy5mb2N1c3BvaW50LkNyb3BSZWN0ID0gVmlldy5leHRlbmQoe1xuXHRcdHRlbXBsYXRlOiB3cC50ZW1wbGF0ZSgnY3JvcHJlY3QnKSxcblx0XHRjbGFzc05hbWU6XHQndG9vbC1jcm9wcmVjdCcsXG5cdFx0Y29udHJvbGxlcjpudWxsLFxuXHRcdGV2ZW50czoge1xuXHRcdFx0J21vdXNlZW50ZXIgLmxhYmVsJyA6ICdzaG93SGlsaXRlJyxcblx0XHRcdCdtb3VzZWxlYXZlIC5sYWJlbCcgOiAnaGlkZUhpbGl0ZScsXG5cdFx0fSxcblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdFZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG5cdFx0XHRfLmRlZmF1bHRzKCB0aGlzLm9wdGlvbnMsIHtcblx0XHRcdFx0Zm9jdXNwb2ludDogbnVsbCwgLy8gZm9jdXNwb2ludCBjb29yZHNcblx0XHRcdFx0cmF0aW86IG51bGxcblx0XHRcdH0gKTtcblxuXHRcdFx0dGhpcy5vcHRpb25zLmxhYmVsID0gdGhpcy5vcHRpb25zLnJhdGlvLm5hbWUgKyAnIDogMSc7XG5cblx0XHRcdHRoaXMuY29udHJvbGxlciA9IHRoaXMub3B0aW9ucy5jb250cm9sbGVyO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5jb250cm9sbGVyLmltYWdlLCAnbG9hZCcsIHRoaXMuaW1hZ2VMb2FkZWQgKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRpbWFnZUxvYWRlZDpmdW5jdGlvbiggaW1hZ2UgKSB7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCAnZGF0YS1kaXInLCB0aGlzLm9wdGlvbnMucmF0aW8ucmF0aW8gPiBpbWFnZS5yYXRpbyA/ICd3JyA6ICdoJyApO1xuXHRcdFx0dGhpcy4kZWwuY3NzKCAnd2lkdGgnLCBNYXRoLm1pbiggMSwgdGhpcy5vcHRpb25zLnJhdGlvLnJhdGlvIC8gaW1hZ2UucmF0aW8gKSAqIDEwMCArJyUnICk7XG5cdFx0XHR0aGlzLnNldEZvY3VzcG9pbnQoICk7XG5cdFx0XHQvLyBzZXQgcG9zaXRpb24gZnJvbSBmb3N1c3BvaW50XG5cdFx0fSxcblx0XHRzZXRGb2N1c3BvaW50OmZ1bmN0aW9uKCBmb2N1c3BvaW50ICkge1xuXHRcdFx0aWYgKCAhIWZvY3VzcG9pbnQgKSB7XG5cdFx0XHRcdHRoaXMub3B0aW9ucy5mb2N1c3BvaW50ID0gZm9jdXNwb2ludDtcblx0XHRcdH1cblx0XHRcdHZhciBpbWFnZWluZm8gPSB7XG5cdFx0XHRcdFx0d2lkdGhcdFx0OiB0aGlzLmNvbnRyb2xsZXIuaW1hZ2UuJGVsLndpZHRoKCksXG5cdFx0XHRcdFx0aGVpZ2h0XHRcdDogdGhpcy5jb250cm9sbGVyLmltYWdlLiRlbC5oZWlnaHQoKSxcblx0XHRcdFx0XHRmb2N1c3BvaW50XHQ6IHRoaXMub3B0aW9ucy5mb2N1c3BvaW50LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRyZXMgPSByb2JvY3JvcC5jcm9wRnJvbUZvY3VzUG9pbnQoIGltYWdlaW5mbywgdGhpcy5vcHRpb25zLnJhdGlvICksXG5cdFx0XHRcdGNvb3JkID0gcm9ib2Nyb3AucmVsVG9BYnNDb29yZHMoIHJlcywgaW1hZ2VpbmZvICk7XG4gXHRcdFx0dGhpcy4kZWwuY3NzKCdsZWZ0Jyxjb29yZC54ICsgJ3B4JyApO1xuIFx0XHRcdHRoaXMuJGVsLmNzcygndG9wJyxjb29yZC55ICsgJ3B4JyApO1xuIFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0c2hvd0hpbGl0ZTogZnVuY3Rpb24oZSl7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWhpbGl0ZScsJ3RydWUnKTtcblx0XHRcdHRoaXMudHJpZ2dlcignaGlsaXRlOnNob3cnKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0aGlkZUhpbGl0ZTogZnVuY3Rpb24oZSl7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWhpbGl0ZScsJ2ZhbHNlJyk7XG5cdFx0XHR0aGlzLnRyaWdnZXIoJ2hpbGl0ZTpoaWRlJyk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdH0pO1xuXG5cdEZvY3VzUG9pbnQgPSByb2JvY3JvcC52aWV3LmZvY3VzcG9pbnQuRm9jdXNQb2ludCA9IFZpZXcuZXh0ZW5kKHtcblx0XHRjbGFzc05hbWU6XHQndG9vbC1mb2N1c3BvaW50Jyxcblx0XHR0ZW1wbGF0ZTpcdHdwLnRlbXBsYXRlKCdmb2N1c3BvaW50JyksXG5cdFx0bGFiZWxWaWV3Olx0XHRudWxsLFxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHRfLmRlZmF1bHRzKCB0aGlzLm9wdGlvbnMsIHtcblx0XHRcdFx0Zm9jdXNwb2ludDp7eDowLHk6MH0sXG5cdFx0XHRcdGVuYWJsZWQ6IGZhbHNlICxcblx0XHRcdFx0Y3JvcFJlY3RzOltdXG5cdFx0XHR9ICk7XG5cdFx0XHR0aGlzLm9wdGlvbnMuY3JvcFJlY3RzLnNvcnQoZnVuY3Rpb24oYSxiKXtcblx0XHRcdFx0cmV0dXJuIGIub3B0aW9ucy5yYXRpby5yYXRpbyAtIGEub3B0aW9ucy5yYXRpby5yYXRpbztcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLiRlbC5vbignY2xpY2snLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdHNlbGYuY2xpY2tGb2N1c3BvaW50KCBldmVudCApO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHJlbmRlcjpmdW5jdGlvbigpe1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0Vmlldy5wcm90b3R5cGUucmVuZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdF8uZWFjaCggdGhpcy5vcHRpb25zLmNyb3BSZWN0cywgZnVuY3Rpb24oIHJlY3QgKXtcblx0XHRcdFx0cmVjdC5yZW5kZXIoKTtcblx0XHRcdFx0c2VsZi4kZWwuYXBwZW5kKCByZWN0LiRlbCApO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHNldEVuYWJsZWQ6IGZ1bmN0aW9uKCBlbmFibGVkICkge1xuXHRcdFx0dmFyIHByZXYgPSB0aGlzLm9wdGlvbnMuZW5hYmxlZDtcblx0XHRcdHRoaXMub3B0aW9ucy5lbmFibGVkID0gZW5hYmxlZDtcblx0XHRcdHRoaXMuJGVsLmF0dHIoICdkYXRhLWVuYWJsZWQnLCBlbmFibGVkLnRvU3RyaW5nKCkgKTtcblx0XHRcdHJldHVybiBwcmV2O1xuXHRcdH0sXG5cdFx0Y2xpY2tGb2N1c3BvaW50OiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgb2Zmcztcblx0XHRcdGlmICggdGhpcy5vcHRpb25zLmVuYWJsZWQgKSB7XG5cdFx0XHRcdG9mZnMgPSB0aGlzLiRlbC5vZmZzZXQoKTtcblx0XHRcdFx0dGhpcy5zZXRGb2N1c3BvaW50KCB7XG5cdFx0XHRcdFx0eDogIDIgKiAoZXZlbnQucGFnZVggLSBvZmZzLmxlZnQgKSAvIHRoaXMuJGVsLndpZHRoKCkgIC0gMSxcblx0XHRcdFx0XHR5OiAtMiAqIChldmVudC5wYWdlWSAtIG9mZnMudG9wICkgLyB0aGlzLiRlbC5oZWlnaHQoKSArIDEsXG5cdFx0XHRcdH0gKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGdldEZvY3VzcG9pbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZm9jdXNwb2ludDtcblx0XHR9LFxuXHRcdHNldEZvY3VzcG9pbnQ6IGZ1bmN0aW9uKCBmb2N1c3BvaW50ICkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHR0aGlzLmZvY3VzcG9pbnQgPSBmb2N1c3BvaW50O1xuXG5cdFx0XHR0aGlzLiRlbC5maW5kKCcuZm9jdXNwb2ludCcpLmNzcyh7XG5cdFx0XHRcdGxlZnQ6IFx0KChmb2N1c3BvaW50LnggKyAxKSAqIDUwKSsnJScsXG5cdFx0XHRcdGJvdHRvbTpcdCgoZm9jdXNwb2ludC55ICsgMSkgKiA1MCkrJyUnXG5cdFx0XHR9KTtcblxuXHRcdFx0Xy5lYWNoKCB0aGlzLm9wdGlvbnMuY3JvcFJlY3RzLCBmdW5jdGlvbihyZWN0KXtcblx0XHRcdFx0cmVjdC5zZXRGb2N1c3BvaW50KCBzZWxmLmZvY3VzcG9pbnQgKTtcblx0XHRcdH0pO1xuXHRcdFx0aWYgKCB0aGlzLm9wdGlvbnMuZW5hYmxlZCApIHtcblx0XHRcdFx0dGhpcy50cmlnZ2VyKCdjaGFuZ2U6Zm9jdXNwb2ludCcsIHRoaXMuZm9jdXNwb2ludCApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0fSk7XG5cblx0cm9ib2Nyb3Audmlldy5mb2N1c3BvaW50LkltYWdlRm9jdXNQb2ludFNlbGVjdCA9IFZpZXcuZXh0ZW5kKHtcblx0XHRjbGFzc05hbWU6XHQncm9ib2Nyb3AtaW1hZ2UtYm94Jyxcblx0XHRjcm9wUmVjdHM6IFtdLFxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKCApe1xuXG5cdFx0XHRfLmRlZmF1bHRzKCB0aGlzLm9wdGlvbnMsIHtcblx0XHRcdFx0Y29udHJvbGxlcjogdGhpcyxcblx0XHRcdFx0Zm9jdXNwb2ludDoge3g6MCx5OjB9LFxuXHRcdFx0XHRzcmM6IGZhbHNlLFxuXHRcdFx0XHRpbWFnZTogZmFsc2UsXG5cdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxuXHRcdFx0fSApO1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdGlmICggdGhpcy5vcHRpb25zLmltYWdlICE9PSBmYWxzZSAmJiAodGhpcy5vcHRpb25zLmltYWdlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PSByb2JvY3JvcC52aWV3LkltZy5wcm90b3R5cGUgKSApIHtcblx0XHRcdFx0dGhpcy5pbWFnZSA9IHRoaXMub3B0aW9ucy5pbWFnZTtcblx0XHRcdH0gZWxzZSBpZiAoIHRoaXMub3B0aW9ucy5zcmMgIT09IGZhbHNlICkge1xuXHRcdFx0XHR0aGlzLmltYWdlXHQ9IG5ldyByb2JvY3JvcC52aWV3LkltZyggeyBzcmM6IHRoaXMub3B0aW9ucy5zcmMgfSk7XG5cdFx0XHR9IGVsc2UgIHtcblx0XHRcdFx0dGhpcy5pbWFnZSA9IG5ldyByb2JvY3JvcC52aWV3LkltZyggeyBzcmM6ICcnIH0sIHRoaXMub3B0aW9ucy5pbWFnZSk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuY3JvcFJlY3RzID0gW107XG5cdFx0XHRfLmVhY2goIGltYWdlX3JhdGlvcywgZnVuY3Rpb24oIHJhdGlvLCBrZXkgKSB7XG5cdFx0XHRcdHZhciByZWN0ID0gbmV3IENyb3BSZWN0KCB7XG5cdFx0XHRcdFx0Y29udHJvbGxlcjogc2VsZixcblx0XHRcdFx0XHRmb2N1c3BvaW50OiBzZWxmLm9wdGlvbnMuZm9jdXNwb2ludCxcblx0XHRcdFx0XHRyYXRpbzogcmF0aW9cblx0XHRcdFx0fSApO1xuXHRcdFx0XHRzZWxmLmxpc3RlblRvKHJlY3QsJ2hpbGl0ZTpzaG93JyxzZWxmLnNob3dIaWxpdGUgKTtcblx0XHRcdFx0c2VsZi5saXN0ZW5UbyhyZWN0LCdoaWxpdGU6aGlkZScsc2VsZi5oaWRlSGlsaXRlICk7XG5cdFx0XHRcdHNlbGYuY3JvcFJlY3RzLnB1c2goIHJlY3QgKTtcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLmZvY3VzcG9pbnRcdD0gbmV3IEZvY3VzUG9pbnQoe1xuXHRcdFx0XHRjb250cm9sbGVyOiB0aGlzLmNvbnRyb2xsZXIsXG5cdFx0XHRcdGZvY3VzcG9pbnQ6IHRoaXMub3B0aW9ucy5mb2N1c3BvaW50LFxuXHRcdFx0XHRlbmFibGVkOiBcdHRoaXMub3B0aW9ucy5lbmFibGVkLFxuXHRcdFx0XHRjcm9wUmVjdHM6XHR0aGlzLmNyb3BSZWN0cyxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLmZvY3VzcG9pbnQsICdjaGFuZ2U6Zm9jdXNwb2ludCcsIHRoaXMudmFsdWVDaGFuZ2VkICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLmltYWdlLCAnbG9hZCcsIHRoaXMuc2V0SGVpZ2h0ICk7XG5cblx0XHRcdHRoaXMudmlld3Muc2V0KCBbIHRoaXMuaW1hZ2UsIHRoaXMuZm9jdXNwb2ludCBdICk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0c2V0SGVpZ2h0OmZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgbmV3SGVpZ2h0ID0gTWF0aC5taW4oIHRoaXMuJGVsLnBhcmVudCgpLmhlaWdodCgpLCB0aGlzLmltYWdlLiRlbC5oZWlnaHQoKSApO1xuXHRcdFx0dGhpcy4kZWwuaGVpZ2h0KCBuZXdIZWlnaHQgKVxuXHRcdH0sXG5cdFx0c2V0RW5hYmxlZDogZnVuY3Rpb24oIGVuYWJsZWQgKSB7XG5cblx0XHRcdHJldHVybiB0aGlzLmZvY3VzcG9pbnQuc2V0RW5hYmxlZCggZW5hYmxlZCApXG5cdFx0fSxcblx0XHRnZXRGb2N1c3BvaW50OiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLmZvY3VzcG9pbnQuZ2V0Rm9jdXNwb2ludCgpO1xuXHRcdH0sXG5cdFx0c2V0Rm9jdXNwb2ludDogZnVuY3Rpb24oIGZvY3VzcG9pbnQgKSB7XG5cdFx0XHR0aGlzLmZvY3VzcG9pbnQgJiYgdGhpcy5mb2N1c3BvaW50LnNldEZvY3VzcG9pbnQoIGZvY3VzcG9pbnQgKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0Z2V0SW1hZ2VXaWR0aDogZnVuY3Rpb24oICkge1xuXHRcdFx0cmV0dXJuIHRoaXMuaW1hZ2UuJGVsLmdldCgwKS5uYXR1cmFsV2lkdGg7XG5cdFx0fSxcblx0XHRnZXRJbWFnZUhlaWdodDogZnVuY3Rpb24oICkge1xuXHRcdFx0cmV0dXJuIHRoaXMuaW1hZ2UuJGVsLmdldCgwKS5uYXR1cmFsSGVpZ2h0O1xuXHRcdH0sXG5cdFx0c2V0U3JjOiBmdW5jdGlvbiggc3JjICkge1xuXHRcdFx0dGhpcy5pbWFnZS4kZWwuYXR0ciggJ3NyYycsIHNyYyApO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHR2YWx1ZUNoYW5nZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG5cdFx0fSxcblx0XHRzaG93SGlsaXRlOiBmdW5jdGlvbihlKXtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtaGlsaXRlJywndHJ1ZScpO1xuXHRcdH0sXG5cdFx0aGlkZUhpbGl0ZTogZnVuY3Rpb24oZSl7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWhpbGl0ZScsJ2ZhbHNlJyk7XG5cdFx0fVxuXHR9KTtcblxuXHRyb2JvY3JvcC52aWV3LkZyYW1lLkZvY3VzcG9pbnQgPSByb2JvY3JvcC52aWV3LkZyYW1lLmV4dGVuZCh7XG5cdFx0Y2xhc3NOYW1lOiAnYXNrLWZvY3VzcG9pbnQgbWVkaWEtZnJhbWUnLFxuXHRcdGV2ZW50czoge1xuXHRcdFx0J2NsaWNrIC5yZXNldCc6ICdyZXNldCcsXG5cdFx0XHQnY2xpY2sgLnByb2NlZWQnOiAncHJvY2VlZCcsXG5cdFx0XHQnY2xpY2sgLmNhbmNlbC11cGxvYWQnOiAnY2FuY2VsVXBsb2FkJyxcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKCApIHtcblxuXHRcdFx0Xy5kZWZhdWx0cyggdGhpcy5vcHRpb25zLCB7XG5cdFx0XHRcdHVwbG9hZGVyOlx0ZmFsc2UsXG5cdFx0XHRcdHRpdGxlOlx0XHRsMTBuLlNldEZvY3VzUG9pbnQsXG5cdFx0XHRcdG1vZGFsOiB0aGlzLm9wdGlvbnMgPyB0aGlzLm9wdGlvbnMubW9kYWwgOiBmYWxzZSxcblx0XHRcdFx0c3JjOiAnJyAvLyBleHBlY3RpbmcgYW4gaW1nIGVsZW1lbnRcblx0XHRcdH0pO1xuXG5cdFx0XHRyb2JvY3JvcC52aWV3LkZyYW1lLnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuXHRcdFx0aWYgKCB0aGlzLm1vZGFsICkge1xuXHRcdFx0XHR0aGlzLm1vZGFsLm9uKCdlc2NhcGUnLCB0aGlzLmNhbmNlbFVwbG9hZCwgdGhpcyApO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5jcmVhdGVUaXRsZSgpO1xuXHRcdFx0dGhpcy5jcmVhdGVDb250ZW50KCk7XG5cdFx0XHR0aGlzLmNyZWF0ZUluc3RydWN0aW9ucygpO1xuXHRcdFx0dGhpcy5jcmVhdGVCdXR0b25zKCk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuLy8gXHRcdHJlbmRlcjogZnVuY3Rpb24oKSB7XG4vLyBcdFx0XHQvLyBmcmFtZSBsYXlvdXRcbi8vXG4vLyBcdFx0XHRyb2JvY3JvcC52aWV3Lk1vZGFsLnByb3RvdHlwZS5yZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuLy8gXHRcdH0sXG5cdFx0Y3JlYXRlVGl0bGU6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHRoaXMuX3RpdGxlID0gbmV3IHdwLm1lZGlhLlZpZXcoe1xuXHRcdFx0XHR0YWdOYW1lOiAnaDEnXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuX3RpdGxlLiRlbC50ZXh0KCB0aGlzLm9wdGlvbnMudGl0bGUgKTtcblx0XHRcdHRoaXMudGl0bGUuc2V0KCBbIHRoaXMuX3RpdGxlIF0gKTtcblx0XHR9LFxuXHRcdGNyZWF0ZUNvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5fY29udGVudCA9IG5ldyByb2JvY3JvcC52aWV3LmZvY3VzcG9pbnQuSW1hZ2VGb2N1c1BvaW50U2VsZWN0KHtcblx0XHRcdFx0c3JjOiAnJyxcblx0XHRcdFx0Zm9jdXNwb2ludDp7IHg6MCwgeTowIH0sXG5cdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMsXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXG5cdFx0XHRcdHRvb2xiYXI6dGhpcy50b29sc1xuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLmNvbnRlbnQuc2V0KCBbIHRoaXMuX2NvbnRlbnQgXSApO1xuXHRcdH0sXG5cdFx0Y3JlYXRlSW5zdHJ1Y3Rpb25zOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpbmZvLCBidG47XG5cdFx0XHR0aGlzLmluc3RydWN0aW9ucy5zZXQoIFtcblx0XHRcdFx0bmV3IHdwLm1lZGlhLlZpZXcoe1xuXHRcdFx0XHRcdGVsOiAkKCAnPGRpdiBjbGFzcz1cImluc3RydWN0aW9uc1wiPicgKyBsMTBuLkZvY3VzUG9pbnRJbnN0cnVjdGlvbnMgKyAnPC9kaXY+JyApWzBdLFxuXHRcdFx0XHRcdHByaW9yaXR5OiAtNDBcblx0XHRcdFx0fSksXG5cdFx0XHRdICk7XG5cdFx0fSxcblx0XHRjcmVhdGVCdXR0b25zOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpbmZvLCBidG47XG5cblx0XHRcdHRoaXMuYnV0dG9ucy5zZXQoIFtcblx0XHRcdFx0bmV3IHdwLm1lZGlhLnZpZXcuQnV0dG9uKHtcblx0XHRcdFx0XHR0ZXh0OiBsMTBuLkNhbmNlbFVwbG9hZCxcblx0XHRcdFx0XHRjbGFzc05hbWU6ICdjYW5jZWwtdXBsb2FkJ1xuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IHdwLm1lZGlhLnZpZXcuQnV0dG9uKHtcblx0XHRcdFx0XHR0ZXh0OiBsMTBuLlJlc2V0LFxuXHRcdFx0XHRcdGNsYXNzTmFtZTogJ3Jlc2V0J1xuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IHdwLm1lZGlhLnZpZXcuQnV0dG9uKHtcblx0XHRcdFx0XHR0ZXh0OiBsMTBuLk9rYXksXG5cdFx0XHRcdFx0Y2xhc3NOYW1lOiAnYnV0dG9uLXByaW1hcnkgcHJvY2VlZCdcblx0XHRcdFx0fSlcblx0XHRcdF0gKTtcblx0XHR9LFxuXG5cdFx0c2V0U3JjOiBmdW5jdGlvbiggc3JjICkge1xuXHRcdFx0dGhpcy5fY29udGVudC5zZXRTcmMoIHNyYyApO1xuXHRcdH0sXG5cdFx0c2V0RmlsZTogZnVuY3Rpb24oIGZpbGUgKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsIGZyID0gbmV3IEZpbGVSZWFkZXIoKTtcblx0XHRcdGZyLm9ubG9hZCA9IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0c2VsZi5zZXRTcmMoIGZyLnJlc3VsdCApO1xuXHRcdFx0fVxuXHRcdFx0ZnIucmVhZEFzRGF0YVVSTCggZmlsZSApO1xuXHRcdH0sXG5cdFx0c2V0Rm9jdXNwb2ludDogZnVuY3Rpb24oIGZvY3VzcG9pbnQgKSB7XG5cdFx0XHR0aGlzLl9jb250ZW50LnNldEZvY3VzcG9pbnQoIGZvY3VzcG9pbnQgKTtcblx0XHRcdHRoaXMuX2NvbnRlbnQuc2V0RW5hYmxlZCh0cnVlKTtcblx0XHR9LFxuXHRcdGdldEZvY3VzcG9pbnQ6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHJldHVybiB0aGlzLl9jb250ZW50LmdldEZvY3VzcG9pbnQoKTtcblx0XHR9LFxuXHRcdGdldEltYWdlV2lkdGg6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHJldHVybiB0aGlzLl9jb250ZW50LmdldEltYWdlV2lkdGgoKTtcblx0XHR9LFxuXHRcdGdldEltYWdlSGVpZ2h0OiBmdW5jdGlvbiggKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY29udGVudC5nZXRJbWFnZUhlaWdodCgpO1xuXHRcdH0sXG5cdFx0cmVzZXQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMuc2V0Rm9jdXNwb2ludCggeyB4OjAsIHk6MCB9IClcblx0XHR9LFxuXHRcdHByb2NlZWQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMudHJpZ2dlcigncHJvY2VlZCcpO1xuXHRcdH0sXG5cdFx0Y2FuY2VsVXBsb2FkOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHQvLyByZW1vdmUgZnJvbSBxdWV1ZSFcblx0XHRcdHRoaXMudHJpZ2dlcignY2FuY2VsLXVwbG9hZCcpO1xuXHRcdFx0dGhpcy5jbG9zZSgpO1xuXHRcdH1cblx0fSk7XG5cbn0pKHdwLGpRdWVyeSk7XG4iLCIoZnVuY3Rpb24od3AsJCkge1xuXG5cdHZhciByb2JvY3JvcCBcdFx0PSB3cC5tZWRpYS5yb2JvY3JvcCxcblx0XHRpbWFnZV9yYXRpb3NcdD0gcm9ib2Nyb3AuaW1hZ2VfcmF0aW9zLFxuXHRcdGltYWdlX3NpemVzXHRcdD0gcm9ib2Nyb3AuaW1hZ2Vfc2l6ZXMsXG5cdFx0bDEwblx0XHRcdD0gcm9ib2Nyb3AubDEwbixcblx0XHRvcHRpb25zXHRcdFx0PSByb2JvY3JvcC5vcHRpb25zLFxuXHRcdGNyb3BCdG5IVE1MXHRcdD0gJzxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnV0dG9uIHJvYm9jcm9wLW9wZW5cIj4nK2wxMG4uRWRpdEltYWdlU2l6ZXMrJzwvYnV0dG9uPicsXG5cdFx0Y3JvcExpbmtIVE1MXHQ9ICc8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ1dHRvbi1saW5rIHJvYm9jcm9wLW9wZW5cIj4nK2wxMG4uRWRpdEltYWdlU2l6ZXMrJzwvYnV0dG9uPic7XG5cblx0dmFyIHJvYm9jcm9wU3RhdGVFeHRlbmQgPSB7XG5cdFx0Y3JlYXRlU3RhdGVzOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuX3BhcmVudENyZWF0ZVN0YXRlcy5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHR0aGlzLnN0YXRlcy5hZGQoXG5cdFx0XHRcdG5ldyByb2JvY3JvcC5jb250cm9sbGVyLlJvYm9jcm9wSW1hZ2UoIHtcblx0XHRcdFx0XHRtb2RlbDogdGhpcy5tb2RlbCxcblx0XHRcdFx0XHRzZWxlY3Rpb246IHRoaXMub3B0aW9ucy5zZWxlY3Rpb25cblx0XHRcdFx0fSApXG5cdFx0XHQpO1xuXHRcdH1cblx0fTtcblxuXHQvLyBwb3N0IGlubGluZSBpbWFnZSBlZGl0b3Jcblx0Xy5leHRlbmQoIHdwLm1lZGlhLnZpZXcuSW1hZ2VEZXRhaWxzLnByb3RvdHlwZSwge1xuXHRcdF9wYXJlbnRQb3N0UmVuZGVyOiB3cC5tZWRpYS52aWV3LkltYWdlRGV0YWlscy5wcm90b3R5cGUucG9zdFJlbmRlcixcblx0XHRwb3N0UmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuX3BhcmVudFBvc3RSZW5kZXIuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnLmFjdGlvbnMnKS5hcHBlbmQoY3JvcEJ0bkhUTUwpO1xuXHRcdH0sXG5cdFx0cm9ib2Nyb3BPcGVuOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgc2l6ZSA9IHRoaXMubW9kZWwuZ2V0KCdzaXplJyksXG5cdFx0XHRcdGNyb3B0b29sID0gbmV3IHJvYm9jcm9wLnZpZXcuRnJhbWUuQ3JvcCgge1xuXHRcdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMuY29udHJvbGxlcixcblx0XHRcdFx0XHRtb2RlbDogdGhpcy5jb250cm9sbGVyLmltYWdlLmF0dGFjaG1lbnQsXG5cdFx0XHRcdFx0c2l6ZVRvU2VsZWN0OiBzaXplXG5cdFx0XHRcdH0gKTtcblx0XHRcdGNyb3B0b29sLm9wZW4oKTtcblx0XHR9XG5cdH0pO1xuXHR3cC5tZWRpYS52aWV3LkltYWdlRGV0YWlscy5wcm90b3R5cGUuZXZlbnRzWydjbGljayAucm9ib2Nyb3Atb3BlbiddID0gJ3JvYm9jcm9wT3Blbic7XG5cblxuXHQvLyBJbmxpbmUgTWVkaWFMaWJyYXJ5LCBHcmlkIHZpZXcgTWVkaWFMaWJyYXJ5XG5cdF8uZXh0ZW5kKCB3cC5tZWRpYS52aWV3LkF0dGFjaG1lbnQuRGV0YWlscy5wcm90b3R5cGUsIHtcblx0XHRfcGFyZW50UmVuZGVyOiB3cC5tZWRpYS52aWV3LkF0dGFjaG1lbnQuRGV0YWlscy5wcm90b3R5cGUucmVuZGVyLFxuXHRcdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLl9wYXJlbnRSZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG5cdFx0XHQvLyBtZWRpYSBsaWJyYXJ5IHNjcmVlTlxuXHRcdFx0aWYgKCBbJ2ltYWdlL2pwZWcnLCdpbWFnZS9wbmcnLCdpbWFnZS9naWYnXS5pbmRleE9mKCB0aGlzLm1vZGVsLmdldCgnbWltZScpICkgPj0gMCApIHtcblx0XHRcdFx0dGhpcy4kKCcuYXR0YWNobWVudC1hY3Rpb25zJykuYXBwZW5kKGNyb3BCdG5IVE1MKTtcblx0XHRcdFx0JCggY3JvcExpbmtIVE1MICkuaW5zZXJ0QWZ0ZXIoIHRoaXMuJGVsLmZpbmQoICdhLmVkaXQtYXR0YWNobWVudCcgKSApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0cm9ib2Nyb3BPcGVuOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgY3JvcHRvb2wgPSBuZXcgcm9ib2Nyb3Audmlldy5GcmFtZS5Dcm9wKCB7XG5cdFx0XHRcdFx0Y29udHJvbGxlcjogdGhpcy5jb250cm9sbGVyLFxuXHRcdFx0XHRcdG1vZGVsOiB0aGlzLm1vZGVsXG5cdFx0XHRcdH0pO1xuXHRcdFx0Y3JvcHRvb2wub3BlbigpO1xuXHRcdH0sXG5cdFx0X3BhcmVudENyZWF0ZVN0YXRlczogd3AubWVkaWEudmlldy5BdHRhY2htZW50LkRldGFpbHMucHJvdG90eXBlLmNyZWF0ZVN0YXRlc1xuXHR9LCByb2JvY3JvcFN0YXRlRXh0ZW5kICk7XG5cblx0d3AubWVkaWEudmlldy5BdHRhY2htZW50LkRldGFpbHMucHJvdG90eXBlLmV2ZW50c1snY2xpY2sgLnJvYm9jcm9wLW9wZW4nXSA9ICdyb2JvY3JvcE9wZW4nO1xuXG5cbn0pKHdwLGpRdWVyeSk7XG4iLCIoZnVuY3Rpb24oICQgKSB7XG5cblx0dmFyIHJvYm9jcm9wID0gd3AubWVkaWEucm9ib2Nyb3AsXG5cdFx0aW1hZ2VfcmF0aW9zID0gcm9ib2Nyb3AuaW1hZ2VfcmF0aW9zLFxuXHRcdG9wdGlvbnMgPSByb2JvY3JvcC5vcHRpb25zLFxuXHRcdGltYWdlSW5mb3MgPSB7fTtcblxuXHQvKipcblx0ICpcdEVhcmx5IHJldHVybiBpZiBhdXRvY3JvcCBpcyBkaXNhYmxlZFxuXHQgKi9cblx0aWYgKCAhIG9wdGlvbnMuYXNrX2Zvcl9mb2N1c3BvaW50ICkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdF8uZXh0ZW5kKCB3cC5tZWRpYS52aWV3LlVwbG9hZGVyV2luZG93LnByb3RvdHlwZSwge1xuXHRcdF9wYXJlbnRSZWFkeTogd3AubWVkaWEudmlldy5VcGxvYWRlcldpbmRvdy5wcm90b3R5cGUucmVhZHksXG5cdFx0ZGlkUmVhZHk6ZmFsc2UsXG5cblx0XHRyZWFkeTpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhc2tGb2N1c0ltYWdlcyA9IFtdLFxuXHRcdFx0XHRhc2tNb2RhbCwgc2VsZiA9IHRoaXM7XG5cblx0XHRcdC8vIHByZXZlbnQgZG91YmxlIGluaXRcblx0XHRcdGlmICggdGhpcy5kaWRSZWFkeSApIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuX3BhcmVudFJlYWR5LmFwcGx5KCB0aGlzICwgYXJndW1lbnRzICk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmRpZFJlYWR5ID0gdHJ1ZTtcblxuXHRcdFx0cmV0ID0gdGhpcy5fcGFyZW50UmVhZHkuYXBwbHkoIHRoaXMgLCBhcmd1bWVudHMgKTtcblxuXHRcdFx0ZnVuY3Rpb24gYXNrRm9jdXMoIHVwbG9hZGVyICkge1xuXHRcdFx0XHR2YXIgZmlsZUl0ZW0sIHNyYztcblx0XHRcdFx0aWYgKCBhc2tNb2RhbCApIHtcblx0XHRcdFx0XHRhc2tNb2RhbC5jbG9zZSgpLmRpc3Bvc2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoICEhIGFza0ZvY3VzSW1hZ2VzLmxlbmd0aCApIHtcblx0XHRcdFx0XHRmaWxlSXRlbSA9IGFza0ZvY3VzSW1hZ2VzLnNoaWZ0KCk7XG5cdFx0XHRcdFx0YXNrTW9kYWwgPSBuZXcgcm9ib2Nyb3Audmlldy5GcmFtZS5Gb2N1c3BvaW50KHsgY29udHJvbGxlcjogJCh0aGlzKSB9KTtcblx0XHRcdFx0XHRhc2tNb2RhbC5vbigncHJvY2VlZCcsZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRpbWFnZUluZm9zW2ZpbGVJdGVtLmZpbGUubmFtZV0gPSB7XG5cdFx0XHRcdFx0XHRcdGZvY3VzcG9pbnQ6XHRhc2tNb2RhbC5nZXRGb2N1c3BvaW50KCksXG5cdFx0XHRcdFx0XHRcdHdpZHRoOlx0XHRhc2tNb2RhbC5nZXRJbWFnZVdpZHRoKCksXG5cdFx0XHRcdFx0XHRcdGhlaWdodDpcdFx0YXNrTW9kYWwuZ2V0SW1hZ2VIZWlnaHQoKVxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdGFza0ZvY3VzKCB1cGxvYWRlciApO1xuXHRcdFx0XHRcdH0pLm9uKCdjYW5jZWwtdXBsb2FkJyxmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGZpbGVJdGVtLmZpbGUuYXR0YWNobWVudC5kZXN0cm95KCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0YXNrTW9kYWwuc2V0Rm9jdXNwb2ludCh7eDowLHk6MH0pO1xuXHRcdFx0XHRcdGFza01vZGFsLnNldEZpbGUoIGZpbGVJdGVtLmJsb2IgKTtcblx0XHRcdFx0XHRhc2tNb2RhbC5vcGVuKCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dXBsb2FkZXIuc3RhcnQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRmdW5jdGlvbiBhZGRBc2tGb2N1cyggZmlsZURhdGEsIHVwbG9hZGVyICkge1xuXHRcdFx0XHRhc2tGb2N1c0ltYWdlcy5wdXNoKCBmaWxlRGF0YSApO1xuXHRcdFx0fVxuXG5cdFx0XHQvKipcblx0XHRcdCAqXHRAcmV0dXJuIG5hdGl2ZSBmaWxlIG9iamVjdCBvciBibG9iXG5cdFx0XHQgKi9cblx0XHRcdGZ1bmN0aW9uIHJlc29sdmVGaWxlKCBmaWxlICkge1xuXHRcdFx0XHR2YXIgX3JldCA9IHtcblx0XHRcdFx0XHRmaWxlOiBmaWxlLFxuXHRcdFx0XHRcdGJsb2I6ZmlsZS5nZXROYXRpdmUoKVxuXHRcdFx0XHR9LCBfcmV0MiwgYnl0ZXMsIGk7XG5cdFx0XHRcdGlmICggISBfcmV0LmJsb2IgKSB7XG5cdFx0XHRcdFx0X3JldC5ibG9iID0gZmlsZS5nZXRTb3VyY2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gX3JldDtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RvcCB1cGxvYWRlciBhbmQgZ2VuZXJhdGUgY3JvcGRhdGFcblx0XHRcdHRoaXMudXBsb2FkZXIudXBsb2FkZXIuYmluZCgnRmlsZXNBZGRlZCcsZnVuY3Rpb24oIHVwLCBmaWxlcyApIHtcblx0XHRcdFx0dmFyIGZpbGVEYXRhO1xuXG5cdFx0XHRcdC8vIHB1dCBtb2RhbFxuXHRcdFx0XHRmb3IgKHZhciBpPTA7aTxmaWxlcy5sZW5ndGg7aSsrKSB7XG5cdFx0XHRcdFx0aWYgKCBmaWxlc1tpXS50eXBlID09ICdpbWFnZS9wbmcnIHx8IGZpbGVzW2ldLnR5cGUgPT0gJ2ltYWdlL2pwZWcnICkge1xuXHRcdFx0XHRcdFx0ZmlsZURhdGEgPSByZXNvbHZlRmlsZSggZmlsZXNbaV0gKTtcblx0XHRcdFx0XHRcdGlmICggZmlsZURhdGEuYmxvYiBpbnN0YW5jZW9mIEJsb2IgKSB7XG5cdFx0XHRcdFx0XHRcdGFkZEFza0ZvY3VzKCBmaWxlRGF0YSwgdXAgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBhc2tGb2N1c0ltYWdlcy5sZW5ndGggKSB7XG5cdFx0XHRcdFx0dXAuc3RvcCgpO1xuXHRcdFx0XHRcdHVwLnJlZnJlc2goKTtcblx0XHRcdFx0XHRhc2tGb2N1cyggdXAgKTsgLy8gd2lsbCBhc2sgZm9yIGZvY3VzIG9yIHN0YXJ0IHVwbG9hZGVyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJhc2tmb2N1c1wiKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQvLyBzZW5kIGNyb3BkYXRhXG5cdFx0XHR0aGlzLnVwbG9hZGVyLnVwbG9hZGVyLmJpbmQoJ0JlZm9yZVVwbG9hZCcsZnVuY3Rpb24oIHVwLCBmaWxlICkge1xuXHRcdFx0XHR2YXIgcywgY3JvcGRhdGEsIGZvY3VzcG9pbnQ7XG5cblx0XHRcdFx0aWYgKCBpbWFnZUluZm9zW2ZpbGUubmFtZV0gKSB7XG5cblx0XHRcdFx0XHQvLyBhZGQgZm9jdXMgcG9pbnQgYW5kIGNyb3BkYXRhIHRvIGZpbGVcblx0XHRcdFx0XHRpbWFnZWluZm8gPSBpbWFnZUluZm9zW2ZpbGUubmFtZV07XG5cdFx0XHRcdFx0Y3JvcGRhdGEgPSB7fTtcblx0XHRcdFx0XHRmb3IgKHMgaW4gaW1hZ2VfcmF0aW9zKSB7XG5cdFx0XHRcdFx0XHRjcm9wZGF0YVsgaW1hZ2VfcmF0aW9zW3NdLm5hbWUgXSA9IHJvYm9jcm9wLmNyb3BGcm9tRm9jdXNQb2ludCggaW1hZ2VpbmZvLCBpbWFnZV9yYXRpb3Nbc10gKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR1cC5zZXR0aW5ncy5tdWx0aXBhcnRfcGFyYW1zLmZvY3VzcG9pbnRcdD0gSlNPTi5zdHJpbmdpZnkoIGltYWdlaW5mby5mb2N1c3BvaW50ICk7XG5cdFx0XHRcdFx0dXAuc2V0dGluZ3MubXVsdGlwYXJ0X3BhcmFtcy5jcm9wZGF0YVx0PSBKU09OLnN0cmluZ2lmeSggY3JvcGRhdGEgKTtcblxuXHRcdFx0XHRcdGRlbGV0ZShpbWFnZUluZm9zW2ZpbGUubmFtZV0pXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHJldDtcblx0XHR9XG5cdH0pO1xuXG59KSggalF1ZXJ5ICk7XG4iXX0=
