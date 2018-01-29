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
					title:		key + ' : 1',
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
				var cancrop =	(w >= image_sizes[sizename].width) &&
								(h >= image_sizes[sizename].height);

				! modelSizes[ sizename ] && ( modelSizes[ sizename ] = {} );
				modelSizes[ sizename ].cropdata = cropdata;

				if ( cancrop && image_sizes[sizename].crop ) {
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
			this._title.$el.text( l10n.AttachmentDetails );
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
			console.log();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJvYm9jcm9wLWJhc2UuanMiLCJyb2JvY3JvcC1tZWRpYS12aWV3LmpzIiwicm9ib2Nyb3AtZm9jdXNwb2ludC1tZWRpYS12aWV3LmpzIiwicm9ib2Nyb3Atd3AtbWVkaWEtdmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbGlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYWRtaW4vd3Atcm9ib2Nyb3AuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBwcmVzZXJ2ZSAoYykgMjAxNiBieSBKb2VybiBMdW5kXG4gKiBAbGljZW5zZSBHUEwzXG4gKi9cbihmdW5jdGlvbiggZXhwb3J0cyApe1xuXHR2YXIgcm9ib2Nyb3A7XG5cblx0cm9ib2Nyb3AgPSBfLmV4dGVuZCggd2luZG93LnJvYm9jcm9wLCB7XG5cdFx0Y3JvcEZyb21Gb2N1c1BvaW50OiBmdW5jdGlvbiggaW1hZ2VpbmZvLCBjcm9waW5mbyApIHtcblx0XHRcdC8vIG5vcm1hbGl6ZSBcblx0XHRcdHZhciBmcF94ID0gICAoICBpbWFnZWluZm8uZm9jdXNwb2ludC54ICsgMSkgLyAyICogaW1hZ2VpbmZvLndpZHRoLFxuXHRcdFx0XHRmcF95ID0gICAoIC1pbWFnZWluZm8uZm9jdXNwb2ludC55ICsgMSkgLyAyICogaW1hZ2VpbmZvLmhlaWdodCxcblx0XHRcdFx0c2NhbGUgPSBNYXRoLm1pbiggaW1hZ2VpbmZvLndpZHRoIC8gY3JvcGluZm8ubWluX3dpZHRoLCBpbWFnZWluZm8uaGVpZ2h0IC8gY3JvcGluZm8ubWluX2hlaWdodCApLFxuXHRcdFx0XHRjcm9wX3cgPSBjcm9waW5mby5taW5fd2lkdGggKiBzY2FsZSxcblx0XHRcdFx0Y3JvcF9oID0gY3JvcGluZm8ubWluX2hlaWdodCAqIHNjYWxlLFxuXHRcdFx0XHRjcm9wX3ggPSBNYXRoLm1pbiggTWF0aC5tYXgoIGZwX3ggLSBjcm9wX3cgLyAyLCAwICkgLCBpbWFnZWluZm8ud2lkdGggLSBjcm9wX3cpLFxuXHRcdFx0XHRjcm9wX3kgPSBNYXRoLm1pbiggTWF0aC5tYXgoIGZwX3kgLSBjcm9wX2ggLyAyLCAwICkgLCBpbWFnZWluZm8uaGVpZ2h0IC0gY3JvcF9oKTtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdG5hbWVzOiBjcm9waW5mby5zaXplcyxcblx0XHRcdFx0eDogY3JvcF94IC8gaW1hZ2VpbmZvLndpZHRoLFxuXHRcdFx0XHR5OiBjcm9wX3kgLyBpbWFnZWluZm8uaGVpZ2h0LFxuXHRcdFx0XHR3aWR0aDogY3JvcF93IC8gaW1hZ2VpbmZvLndpZHRoLFxuXHRcdFx0XHRoZWlnaHQ6IGNyb3BfaCAvIGltYWdlaW5mby5oZWlnaHRcblx0XHRcdH07XG5cdFx0fSxcblxuXHRcdHJlbFRvQWJzQ29vcmRzOiBmdW5jdGlvbiggY3JvcGRhdGEsIGltYWdlaW5mbyApIHtcblx0XHRcdHZhciBzLCByZXQgPSB7fTtcblx0XHRcdGZvciAoIHMgaW4gY3JvcGRhdGEgKSB7XG5cdFx0XHRcdHN3aXRjaCAoIHMgKSB7XG5cdFx0XHRcdFx0Y2FzZSAneCc6XG5cdFx0XHRcdFx0Y2FzZSAneDEnOlxuXHRcdFx0XHRcdGNhc2UgJ3gyJzpcblx0XHRcdFx0XHRjYXNlICd3aWR0aCc6XG5cdFx0XHRcdFx0XHRyZXRbc10gPSBjcm9wZGF0YVtzXSAqIGltYWdlaW5mby53aWR0aFxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAneSc6XG5cdFx0XHRcdFx0Y2FzZSAneTEnOlxuXHRcdFx0XHRcdGNhc2UgJ3kyJzpcblx0XHRcdFx0XHRjYXNlICdoZWlnaHQnOlxuXHRcdFx0XHRcdFx0cmV0W3NdID0gY3JvcGRhdGFbc10gKiBpbWFnZWluZm8uaGVpZ2h0XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0cmV0W3NdID0gY3JvcGRhdGFbc107XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHJldDtcblx0XHR9LFxuXHRcdGFic1RvUmVsQ29vcmRzOiBmdW5jdGlvbiggY3JvcGRhdGEsIGltYWdlaW5mbyApIHtcblx0XHRcdHZhciBzLCByZXQgPSB7fTtcblx0XHRcdGZvciAoIHMgaW4gY3JvcGRhdGEgKSB7XG5cdFx0XHRcdHN3aXRjaCAoIHMgKSB7XG5cdFx0XHRcdFx0Y2FzZSAneCc6XG5cdFx0XHRcdFx0Y2FzZSAneDEnOlxuXHRcdFx0XHRcdGNhc2UgJ3gyJzpcblx0XHRcdFx0XHRjYXNlICd3aWR0aCc6XG5cdFx0XHRcdFx0XHRyZXRbc10gPSBjcm9wZGF0YVtzXSAvIGltYWdlaW5mby53aWR0aFxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAneSc6XG5cdFx0XHRcdFx0Y2FzZSAneTEnOlxuXHRcdFx0XHRcdGNhc2UgJ3kyJzpcblx0XHRcdFx0XHRjYXNlICdoZWlnaHQnOlxuXHRcdFx0XHRcdFx0cmV0W3NdID0gY3JvcGRhdGFbc10gLyBpbWFnZWluZm8uaGVpZ2h0XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0cmV0W3NdID0gY3JvcGRhdGFbc107XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHJldDtcblx0XHR9LFxuXG5cdFx0cG9pbnRUb1JlY3RDb29yZHM6ZnVuY3Rpb24oIHBvaW50cyApIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHg6IHBvaW50cy54MSxcblx0XHRcdFx0eTogcG9pbnRzLnkxLFxuXHRcdFx0XHR3aWR0aDogIHBvaW50cy54MiAtIHBvaW50cy54MSxcblx0XHRcdFx0aGVpZ2h0OiBwb2ludHMueTIgLSBwb2ludHMueTFcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0cmVjdFRvUG9pbnRDb29yZHM6ZnVuY3Rpb24oIHJlY3QgKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR4MTogcmVjdC54LFxuXHRcdFx0XHR5MTogcmVjdC55LFxuXHRcdFx0XHR4MjogKHJlY3QubWF4WCA/IHJlY3QubWF4WCA6IHJlY3QueCtyZWN0LndpZHRoKSxcblx0XHRcdFx0eTI6IChyZWN0Lm1heFkgPyByZWN0Lm1heFkgOiByZWN0LnkrcmVjdC5oZWlnaHQpLFxuXHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0dmlldyA6IHt9LFxuXHRcdGNvbnRyb2xsZXIgOiB7fVxuXHR9KTtcblxuXHRleHBvcnRzLm1lZGlhLnJvYm9jcm9wID0gcm9ib2Nyb3A7XG5cbn0pKCB3cCApOyIsIihmdW5jdGlvbih3cCwkKSB7XG5cblx0dmFyIHJvYm9jcm9wIFx0XHQ9IHdwLm1lZGlhLnJvYm9jcm9wLFxuXHRcdGltYWdlX3JhdGlvc1x0PSByb2JvY3JvcC5pbWFnZV9yYXRpb3MsXG5cdFx0aW1hZ2Vfc2l6ZXNcdFx0PSByb2JvY3JvcC5pbWFnZV9zaXplcyxcblx0XHRsMTBuXHRcdFx0PSByb2JvY3JvcC5sMTBuLFxuXHRcdG9wdGlvbnNcdFx0XHQ9IHJvYm9jcm9wLm9wdGlvbnM7XG5cblxuXHQvKipcblx0ICpcdEFuIEltYWdlXG5cdCAqL1xuXHRyb2JvY3JvcC52aWV3LkltZyA9IHdwLm1lZGlhLlZpZXcuZXh0ZW5kKHtcblx0XHRjbGFzc05hbWU6J2F0dGFjaG1lbnQtaW1hZ2UnLFxuXHRcdHRhZ05hbWU6J2ltZycsXG5cdFx0aWQ6J3JvYm9jcm9wLWltYWdlJyxcblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdF8uZGVmYXVsdHMoIHRoaXMub3B0aW9ucywge3NyYzonJ30gKTtcblx0XHRcdHRoaXMuJGVsLm9uKCdsb2FkJyxmdW5jdGlvbigpe1xuXHRcdFx0XHRzZWxmLndpZHRoID0gc2VsZi4kZWwuZ2V0KDApLm5hdHVyYWxXaWR0aDtcblx0XHRcdFx0c2VsZi5oZWlnaHQgPSBzZWxmLiRlbC5nZXQoMCkubmF0dXJhbEhlaWdodDtcblx0XHRcdFx0c2VsZi5yYXRpbyA9IHNlbGYud2lkdGggLyBzZWxmLmhlaWdodDtcblx0XHRcdFx0c2VsZi50cmlnZ2VyKCdsb2FkJyxzZWxmKTtcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy4kZWwuYXR0cignc3JjJywgdGhpcy5vcHRpb25zLnNyYyApO1xuXHRcdH0sXG5cdFx0Z2V0U3JjOiBmdW5jdGlvbihzcmMpIHtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5hdHRyKCAnc3JjJyApO1xuXHRcdH0sXG5cdFx0c2V0U3JjOiBmdW5jdGlvbihzcmMpIHtcblx0XHRcdCEhc3JjICYmIHRoaXMuJGVsLmF0dHIoICdzcmMnLCBzcmMgKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0fSk7XG5cblxuXHQvKipcblx0ICpcdFJhdGlvIHNlbGVjdCBsaXN0XG5cdCAqL1xuXHRyb2JvY3JvcC52aWV3LlJvYm9jcm9wUmF0aW9TZWxlY3QgPSB3cC5tZWRpYS5WaWV3LmV4dGVuZCh7XG5cdFx0Y2xhc3NOYW1lOiAncm9ib2Nyb3Atc2VsZWN0Jyxcblx0XHR0ZW1wbGF0ZTogd3AudGVtcGxhdGUoJ3JvYm9jcm9wLXNlbGVjdCcpLFxuXHRcdGV2ZW50czoge1xuXHRcdFx0J2NsaWNrIFtuYW1lPVwicm9ib2Nyb3Atc2VsZWN0LXJhdGlvXCJdJzogJ3NlbGVjdFJhdGlvJyxcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0d3AuQmFja2JvbmUuVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHRfLmRlZmF1bHRzKHtcblx0XHRcdFx0cmF0aW9zOnt9LFxuXHRcdFx0XHR0b29sczp7fVxuXHRcdFx0fSx0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5vcHRpb25zLmwxMG4gPSBsMTBuO1xuXG5cdFx0fSxcblx0XHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0d3AuQmFja2JvbmUuVmlldy5wcm90b3R5cGUucmVuZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0Xy5lYWNoKCB0aGlzLm9wdGlvbnMudG9vbHMsIGZ1bmN0aW9uKCB0b29sLCBrZXkgKSB7XG5cdFx0XHRcdHNlbGYudmlld3MuYWRkKG5ldyByb2JvY3JvcC52aWV3LlJvYm9jcm9wUmF0aW9TZWxlY3RJdGVtKHtcblx0XHRcdFx0XHRyYXRpb2tleTpcdGtleSxcblx0XHRcdFx0XHRzaXplbmFtZXM6XHRmYWxzZSxcblx0XHRcdFx0XHRyYXRpbzogXHRcdGtleSxcblx0XHRcdFx0XHR0aXRsZTpcdFx0dG9vbC50aXRsZSxcblx0XHRcdFx0XHRlbmFibGVkOiBcdHRydWVcblx0XHRcdFx0fSkpXG5cblx0XHRcdH0pO1xuXHRcdFx0Xy5lYWNoKCB0aGlzLm9wdGlvbnMucmF0aW9zLCBmdW5jdGlvbiggcmF0aW8sIGtleSApIHtcblx0XHRcdFx0dmFyIG5hbWVzID0gW10sXG5cdFx0XHRcdFx0dHBsX3N0ciA9ICc8c3BhbiBjbGFzcz1cInNpemVuYW1lPCU9IGNhbmNyb3AgPyBcIlwiIDogXCIgZGlzYWJsZWRcIiAlPlwiPjwlPSBuYW1lICU+ICg8JT0gd2lkdGggJT7DlzwlPSBoZWlnaHQgJT4pPC9zcGFuPicsXG5cdFx0XHRcdFx0bmFtZV90cGwgPSBfLnRlbXBsYXRlKHRwbF9zdHIpO1xuXHRcdFx0XHRfLmVhY2goIHJhdGlvLnNpemVzLCBmdW5jdGlvbihzaXplbmFtZSxrZXkpIHtcblx0XHRcdFx0XHR2YXIgc2l6ZSA9ICQuZXh0ZW5kKCB0cnVlLCB7XG5cdFx0XHRcdFx0XHRjYW5jcm9wIDpcdChzZWxmLm1vZGVsLmdldCgnd2lkdGgnKSA+PSBpbWFnZV9zaXplc1tzaXplbmFtZV0ud2lkdGgpICYmXG5cdFx0XHRcdFx0XHRcdFx0XHQoc2VsZi5tb2RlbC5nZXQoJ2hlaWdodCcpID49IGltYWdlX3NpemVzW3NpemVuYW1lXS5oZWlnaHQpXG5cdFx0XHRcdFx0fSwgaW1hZ2Vfc2l6ZXNbc2l6ZW5hbWVdKTtcblx0XHRcdFx0XHRpZiAoIHNpemUuY3JvcCApIHtcblx0XHRcdFx0XHRcdG5hbWVzLnB1c2goIG5hbWVfdHBsKCBzaXplICkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRzZWxmLnZpZXdzLmFkZChuZXcgcm9ib2Nyb3Audmlldy5Sb2JvY3JvcFJhdGlvU2VsZWN0SXRlbSh7XG5cdFx0XHRcdFx0cmF0aW9rZXk6XHRrZXksXG5cdFx0XHRcdFx0c2l6ZW5hbWVzOlx0bmFtZXMuam9pbignJyksXG5cdFx0XHRcdFx0cmF0aW86IFx0XHRrZXksXG5cdFx0XHRcdFx0dGl0bGU6XHRcdGtleSArICcgOiAxJyxcblx0XHRcdFx0XHRlbmFibGVkOiBcdChzZWxmLm1vZGVsLmdldCgnd2lkdGgnKSAgPj0gcmF0aW8ubWluX3dpZHRoKSAmJlxuXHRcdFx0XHRcdFx0XHRcdChzZWxmLm1vZGVsLmdldCgnaGVpZ2h0JykgPj0gcmF0aW8ubWluX2hlaWdodClcblx0XHRcdFx0fSkpXG5cdFx0XHR9ICk7XG5cblxuXHRcdH0sXG5cdFx0c2V0U2VsZWN0ZWQ6IGZ1bmN0aW9uKCByYXRpb2tleSApIHtcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tuYW1lPVwicm9ib2Nyb3Atc2VsZWN0LXJhdGlvXCJdW3ZhbHVlPVwiJytyYXRpb2tleSsnXCJdJykucHJvcCgnY2hlY2tlZCcsdHJ1ZSk7XG5cdFx0XHR0aGlzLnNlbGVjdFJhdGlvKCk7XG5cdFx0fSxcblx0XHRnZXRTZWxlY3RlZDogZnVuY3Rpb24oICkge1xuXHRcdFx0cmV0dXJuIHRoaXMuJGVsLmZpbmQoJ1tuYW1lPVwicm9ib2Nyb3Atc2VsZWN0LXJhdGlvXCJdOmNoZWNrZWQnKS52YWwoKTtcblx0XHR9LFxuXHRcdHNlbGVjdFJhdGlvOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRpZiAoIHRoaXMub3B0aW9ucy5yYXRpb3NbIHRoaXMuZ2V0U2VsZWN0ZWQoKSBdICkge1xuXHRcdFx0XHR0aGlzLnRyaWdnZXIoJ3NlbGVjdC1yYXRpbycpO1xuXHRcdFx0fSBlbHNlIGlmICggdGhpcy5vcHRpb25zLnRvb2xzWyB0aGlzLmdldFNlbGVjdGVkKCkgXSApIHtcblx0XHRcdFx0dGhpcy50cmlnZ2VyKCdzZWxlY3QtdG9vbCcpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy50cmlnZ2VyKCdzZWxlY3QnKTtcblx0XHR9XG5cdH0pO1xuXG5cdC8qKlxuXHQgKlx0UmF0aW8gc2VsZWN0IGxpc3QgSXRlbVxuXHQgKi9cblx0cm9ib2Nyb3Audmlldy5Sb2JvY3JvcFJhdGlvU2VsZWN0SXRlbSA9IHdwLm1lZGlhLlZpZXcuZXh0ZW5kKHtcblx0XHRjbGFzc05hbWU6ICdyb2JvY3JvcC1zZWxlY3QtaXRlbScsXG5cdFx0dGVtcGxhdGU6IHdwLnRlbXBsYXRlKCdyb2JvY3JvcC1zZWxlY3QtaXRlbScpLFxuXHRcdHNpemVrZXk6JycsXG5cdFx0c2l6ZW5hbWVzOicnLFxuXHRcdHJhdGlvOjAsXG5cdFx0ZW5hYmxlZDpudWxsLFxuXHRcdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR3cC5CYWNrYm9uZS5WaWV3LnByb3RvdHlwZS5yZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJykucHJvcCgnZGlzYWJsZWQnLCAhIHRoaXMub3B0aW9ucy5lbmFibGVkIClcblx0XHR9XG5cdH0pO1xuXG5cdHJvYm9jcm9wLnZpZXcuUm9ib2Nyb3BJbWFnZSA9IHdwLm1lZGlhLlZpZXcuZXh0ZW5kKHtcblx0XHRjbGFzc05hbWU6XHRcdCdpbWFnZS1yb2JvY3JvcCcsXG5cdFx0dGVtcGxhdGU6XHRcdHdwLnRlbXBsYXRlKCdyb2JvY3JvcCcpLFxuXHRcdGltYWdlX3JhdGlvczpcdGltYWdlX3JhdGlvcyxcblx0XHRpbWFnZV9zaXplczpcdGltYWdlX3NpemVzLFxuXHRcdF9jcm9wcGVyczpcdFx0bnVsbCxcblx0XHRldmVudHM6IHtcblx0XHRcdCdjbGljayAucm9ib2Nyb3AtYXV0b2Nyb3AtY3VycmVudCdcdDogJ2F1dG9jcm9wJyxcblx0XHRcdCdjbGljayAucm9ib2Nyb3AtYXV0b2Nyb3AtYWxsJ1x0XHQ6ICdhdXRvY3JvcEFsbCcsXG5cdFx0fSxcblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbiggb3B0aW9ucyApIHtcblx0XHQvL1x0d3AubWVkaWEudmlldy5FZGl0SW1hZ2UucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0dGhpcy5fY3JvcHBlcnMgXHRcdD0ge307XG5cdFx0XHR0aGlzLmltYWdlIFx0XHRcdD0gbmV3IHJvYm9jcm9wLnZpZXcuSW1nKCB7c3JjOiB0aGlzLm1vZGVsLmdldCgndXJsJykgfSApO1xuXG5cdFx0XHR0aGlzLmNvbnRyb2xsZXIgXHQ9IG9wdGlvbnMuY29udHJvbGxlcjtcblx0XHRcdHRoaXMuZm9jdXNwb2ludHRvb2xcdD0gbmV3IHJvYm9jcm9wLnZpZXcuZm9jdXNwb2ludC5JbWFnZUZvY3VzUG9pbnRTZWxlY3QoeyBpbWFnZTogdGhpcy5pbWFnZSwgZm9jdXNwb2ludDoge3g6MCx5OjB9LCBzcmM6IHRoaXMubW9kZWwuZ2V0KCd1cmwnKSB9KTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMuZm9jdXNwb2ludHRvb2wsICdjaGFuZ2VkJywgdGhpcy51cGRhdGVGb2N1c1BvaW50ICk7XG5cblx0XHRcdHdwLm1lZGlhLlZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdH0sXG5cdFx0ZGlzbWlzczpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhcmVhU2VsZWN0ID0gdGhpcy4kYXJlYVNlbGVjdCgpXG5cdFx0XHRhcmVhU2VsZWN0ICYmIGFyZWFTZWxlY3QucmVtb3ZlKCk7XG5cdFx0XHR0aGlzLiRlbC5yZW1vdmUoKTtcblx0XHR9LFxuXHRcdGNyZWF0ZVNlbGVjdDogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLnNlbGVjdCA9IG5ldyByb2JvY3JvcC52aWV3LlJvYm9jcm9wUmF0aW9TZWxlY3Qoe1xuXHRcdFx0XHRjaG9pY2VzOiBjaG9pY2VzXG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdGhhc0NoYW5nZWQ6IGZ1bmN0aW9uKCl7XG5cdFx0XHR0aGlzLnRyaWdnZXIoICdjaGFuZ2VkJyApO1xuXHRcdH0sXG5cdFx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0d3AubWVkaWEuVmlldy5wcm90b3R5cGUucmVuZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuXHRcdFx0dGhpcy52aWV3cy5zZXQoJy5yb2JvY3JvcC1jb250ZW50JywgdGhpcy5mb2N1c3BvaW50dG9vbCApO1xuXG5cdFx0XHR0aGlzLmZvY3VzcG9pbnR0b29sLnNldEZvY3VzcG9pbnQoIHRoaXMubW9kZWwuZ2V0KCAnZm9jdXNwb2ludCcgKSApO1xuXG5cdFx0XHR0aGlzLmltYWdlLiRlbC5pbWdBcmVhU2VsZWN0KHtcblx0XHRcdFx0cGFyZW50OiBcdFx0dGhpcy5pbWFnZS4kZWwuY2xvc2VzdCgnLnJvYm9jcm9wLWltYWdlLWJveCcpLFxuXHRcdFx0XHRpbnN0YW5jZTpcdCBcdHRydWUsXG5cdFx0XHRcdGhhbmRsZXM6IFx0XHR0cnVlLFxuXHRcdFx0XHRrZXlzOiBcdFx0XHR0cnVlLFxuXHRcdFx0XHRwZXJzaXN0ZW50Olx0XHR0cnVlLFxuXHRcdFx0XHRlbmFibGVkOlx0XHR0cnVlLFxuXHRcdFx0XHRtb3ZhYmxlOlx0XHR0cnVlLFxuXHRcdFx0XHRyZXNpemFibGU6XHRcdHRydWUsXG5cdFx0XHRcdGltYWdlSGVpZ2h0Olx0dGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpLFxuXHRcdFx0XHRpbWFnZVdpZHRoOlx0XHR0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSxcblx0XHRcdFx0b25TZWxlY3RFbmQ6IGZ1bmN0aW9uKCBpbWFnZSwgY29vcmRzICkge1xuXHRcdFx0XHRcdHZhciBjcm9wZGF0YSA9IHJvYm9jcm9wLnBvaW50VG9SZWN0Q29vcmRzKCBjb29yZHMgKVxuXHRcdFx0XHRcdHNlbGYuX3NldENyb3BTaXplcyhjcm9wZGF0YSk7XG5cdFx0XHRcdFx0c2VsZi5oYXNDaGFuZ2VkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBzZXQgcmF0aW8gc2VlbGN0XG5cdFx0XHR0aGlzLnNlbGVjdFJhdGlvID0gbmV3IHJvYm9jcm9wLnZpZXcuUm9ib2Nyb3BSYXRpb1NlbGVjdCh7XG5cdFx0XHRcdHRvb2xzOiB7XG5cdFx0XHRcdFx0Zm9jdXNwb2ludCA6IHtcblx0XHRcdFx0XHRcdHRpdGxlOiBsMTBuLlNldEZvY3VzUG9pbnQsXG5cdFx0XHRcdFx0XHR0cmlnZ2VyOiAnZm9jdXNwb2ludCdcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJhdGlvczp0aGlzLmltYWdlX3JhdGlvcyxcblx0XHRcdFx0bW9kZWw6dGhpcy5tb2RlbFxuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLnNlbGVjdFJhdGlvXG5cdFx0XHRcdC5vbignc2VsZWN0LXJhdGlvJywgdGhpcy5vbnNlbGVjdHJhdGlvLCB0aGlzIClcblx0XHRcdFx0Lm9uKCdzZWxlY3QtdG9vbCcsIHRoaXMub25zZWxlY3R0b29sLCB0aGlzIClcblx0XHRcdFx0Lm9uKCdzZWxlY3QnLCB0aGlzLnVwZGF0ZUJ1dHRvbnMsIHRoaXMgKTtcblxuXHRcdFx0dGhpcy52aWV3cy5zZXQoJy5zZWxlY3QtcmF0aW8nLCB0aGlzLnNlbGVjdFJhdGlvICk7XG5cdFx0XHQvLyBzZXRUaW1lb3V0KCBmdW5jdGlvbigpeyB9LDIwKTtcblxuXHRcdFx0Ly8gYnV0dG9uc1xuXHRcdFx0dGhpcy4kYXV0b0J1dHRvblx0PSB0aGlzLiRlbC5maW5kKCcucm9ib2Nyb3AtYXV0b2Nyb3AtY3VycmVudCcpO1xuXHRcdFx0dGhpcy4kYXV0b0FsbEJ1dHRvblx0PSB0aGlzLiRlbC5maW5kKCcucm9ib2Nyb3AtYXV0b2Nyb3AtYWxsJyk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHJlYWR5OiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBjdXJyZW50UmF0aW8sIGZvdW5kO1xuXHRcdFx0d3AubWVkaWEudmlldy5FZGl0SW1hZ2UucHJvdG90eXBlLnJlYWR5LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuXHRcdFx0aWYgKCAhIF8uaXNVbmRlZmluZWQoIHRoaXMub3B0aW9ucy5zaXplVG9TZWxlY3QgKSApIHtcblx0XHRcdFx0Zm91bmQgPSBfLmZpbmQoIHRoaXMuaW1hZ2VfcmF0aW9zLCBmdW5jdGlvbiggcmF0aW8gKXtcblx0XHRcdFx0XHRyZXR1cm4gcmF0aW8uc2l6ZXMuaW5kZXhPZiggdGhpcy5vcHRpb25zLnNpemVUb1NlbGVjdCApID4gLTE7XG5cdFx0XHRcdH0sIHRoaXMgKTtcblx0XHRcdFx0aWYgKCBmb3VuZCApIHtcblx0XHRcdFx0XHRjdXJyZW50UmF0aW8gPSBmb3VuZC5uYW1lO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmICggXy5pc1VuZGVmaW5lZCggY3VycmVudFJhdGlvICkgKSB7XG5cdFx0XHRcdGN1cnJlbnRSYXRpbyA9ICdmb2N1c3BvaW50JzsvL18uZmlyc3QoXy5rZXlzKCB0aGlzLmltYWdlX3JhdGlvcyApKTtcblx0XHRcdH1cblx0XHRcdHRoaXMuc2VsZWN0UmF0aW8uc2V0U2VsZWN0ZWQoIGN1cnJlbnRSYXRpbyApO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRzYXZlOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHRcdGF0dGFjaG1lbnRzOnt9XG5cdFx0XHRcdH0sIGlkID0gdGhpcy5tb2RlbC5nZXQoJ2lkJyksXG5cdFx0XHRcdCRidG5zID0gdGhpcy4kYXV0b0FsbEJ1dHRvbi5hZGQoIHRoaXMuJGF1dG9CdXR0b24gKS5wcm9wKCAnZGlzYWJsZWQnLCB0cnVlICksXG5cdFx0XHRcdHNlbGYgPSB0aGlzO1xuXHRcdFx0ZGF0YS5hdHRhY2htZW50c1tpZF0gPSB7XG5cdFx0XHRcdHNpemVzOlx0XHR0aGlzLm1vZGVsLmdldCgnc2l6ZXMnKSxcblx0XHRcdFx0Zm9jdXNwb2ludDogdGhpcy5tb2RlbC5nZXQoJ2ZvY3VzcG9pbnQnKVxuXHRcdFx0fTtcblx0XHRcdHRoaXMubW9kZWwuc2F2ZUNvbXBhdCggZGF0YSwge30gKS5kb25lKCBmdW5jdGlvbiggcmVzcCApIHtcblx0XHRcdFx0dmFyIGQgPSBuZXcgRGF0ZSgpO1xuXG5cdFx0XHRcdC8vIGZvcmNlIHJlbG9hZCBpbWFnZSAuLi5cblx0XHRcdFx0Xy5lYWNoKCBzZWxmLm1vZGVsLmF0dHJpYnV0ZXMuc2l6ZXMsIGZ1bmN0aW9uKCBzaXplLCBzaXplbmFtZSApIHtcblx0XHRcdFx0XHR2YXIgc2VsZWN0b3IgPSAgJ2ltZ1tzcmNePVwiJytzaXplLnVybCsnXCJdJyxcblx0XHRcdFx0XHRcdHJlZnJlc2ggPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHQkKHRoaXMpLnJlbW92ZUF0dHIoJ3NyYycpLmF0dHIoICdzcmMnLCBzaXplLnVybCsnPycrZC5nZXRUaW1lKCkgKTtcblx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdHJlZnJlc2hfbWNlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0JCh0aGlzKS5yZW1vdmVBdHRyKCdkYXRhLW1jZS1zcmMnKS5hdHRyKCAnZGF0YS1tY2Utc3JjJywgc2l6ZS51cmwrJz8nK2QuZ2V0VGltZSgpICk7XG5cdFx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHQvLyAuLi4gdW5sZXNzIGl0J3MgZnVsbHNpemUgLi4uXG5cdFx0XHRcdFx0aWYgKCBzaXplbmFtZSAhPT0gJ2Z1bGwnICkge1xuXG5cdFx0XHRcdFx0XHQkKGRvY3VtZW50KS5hZGQoICQoJ2lmcmFtZScpLmNvbnRlbnRzKCkgKVxuXHRcdFx0XHRcdFx0XHQuZmluZCggc2VsZWN0b3IgKVxuXHRcdFx0XHRcdFx0XHQuZWFjaCggcmVmcmVzaCApO1xuXG5cdFx0XHRcdFx0XHQvLyAuLi4gaW5zaWRlIHRpbnltY2UgaWZyYW1lc1xuXHRcdFx0XHRcdFx0JCgnLm1jZS1lZGl0LWFyZWEgaWZyYW1lJykuZWFjaChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHQkKHRoaXMpLmNvbnRlbnRzKClcblx0XHRcdFx0XHRcdFx0XHQuZmluZCggc2VsZWN0b3IgKVxuXHRcdFx0XHRcdFx0XHRcdC5lYWNoKCByZWZyZXNoIClcblx0XHRcdFx0XHRcdFx0XHQuZWFjaCggcmVmcmVzaF9tY2UgKTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgc2VsZiApO1xuXHRcdFx0XHQkYnRucy5wcm9wKCAnZGlzYWJsZWQnLCBmYWxzZSApO1xuXHRcdFx0XHRzZWxmLnRyaWdnZXIoICdzYXZlZCcgKTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHR1cGRhdGVCdXR0b25zOiBmdW5jdGlvbigpe1xuXHRcdFx0dmFyIHRvb2xrZXkgPSB0aGlzLnNlbGVjdFJhdGlvLmdldFNlbGVjdGVkKCk7XG5cdFx0XHR0aGlzLiRhdXRvQnV0dG9uLnRvZ2dsZUNsYXNzKCAnaGlkZGVuJywgdG9vbGtleSA9PT0gJ2ZvY3VzcG9pbnQnICk7XG5cdFx0XHR0aGlzLiRhdXRvQWxsQnV0dG9uLnRvZ2dsZUNsYXNzKCAnaGlkZGVuJywgdG9vbGtleSAhPT0gJ2ZvY3VzcG9pbnQnICk7XG5cdFx0fSxcblx0XHRvbnNlbGVjdHRvb2w6IGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgdG9vbGtleSA9IHRoaXMuc2VsZWN0UmF0aW8uZ2V0U2VsZWN0ZWQoKTtcblx0XHRcdHRoaXMuJGFyZWFTZWxlY3QoKS5jYW5jZWxTZWxlY3Rpb24oKTtcblxuXHRcdFx0c3dpdGNoICggdG9vbGtleSApIHtcblx0XHRcdFx0Y2FzZSAnZm9jdXNwb2ludCc6XG5cdFx0XHRcdFx0Ly8gd3JhcCBhcm91bmRcblx0XHRcdFx0XHR0aGlzLmZvY3VzcG9pbnR0b29sLnNldEVuYWJsZWQoIHRydWUgKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9LFxuXHRcdG9uc2VsZWN0cmF0aW86IGZ1bmN0aW9uKCApIHtcblx0XHRcdHRoaXMuZm9jdXNwb2ludHRvb2wuc2V0RW5hYmxlZCggZmFsc2UgKTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKlx0T24gc3dpdGNoIHJhdGlvXG5cdFx0XHQgKi9cblx0XHRcdHZhciByYXRpb2tleSA9IHRoaXMuc2VsZWN0UmF0aW8uZ2V0U2VsZWN0ZWQoKSxcblx0XHRcdFx0c2l6ZXMgPSB0aGlzLm1vZGVsLmdldCgnc2l6ZXMnKSxcblx0XHRcdFx0ZmFjdG9yLCByZWN0LCBjcm9wZGF0YSwgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHMsIGFyZWFTZWxlY3RPcHRpb25zLFxuXHRcdFx0XHRpbWdXaWR0aCAgPSB0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSxcblx0XHRcdFx0aW1nSGVpZ2h0ID0gdGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpO1xuXG5cdFx0XHR0aGlzLmN1cnJlbnRfcmF0aW8gPSB0aGlzLmltYWdlX3JhdGlvc1tyYXRpb2tleV07XG5cblx0XHRcdGFyZWFTZWxlY3RPcHRpb25zID0ge1xuXHRcdFx0XHRhc3BlY3RSYXRpbzpcdHRoaXMuY3VycmVudF9yYXRpby5yYXRpbyArICc6MScsXG5cdFx0XHRcdG1pbldpZHRoOlx0XHR0aGlzLmN1cnJlbnRfcmF0aW8ubWluX3dpZHRoLFxuXHRcdFx0XHRtaW5IZWlnaHQ6XHRcdHRoaXMuY3VycmVudF9yYXRpby5taW5faGVpZ2h0XG5cdFx0XHR9O1xuXG5cdFx0XHRfLmVhY2godGhpcy5jdXJyZW50X3JhdGlvLnNpemVzLCBmdW5jdGlvbihzaXplKXtcblx0XHRcdFx0aWYgKCAhIGNyb3BkYXRhICYmICEhIHNpemVzW3NpemVdICYmICEhIHNpemVzW3NpemVdLmNyb3BkYXRhICkge1xuXHRcdFx0XHRcdGNyb3BkYXRhID0gc2l6ZXNbc2l6ZV0uY3JvcGRhdGE7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBpbWFnZV9zaXplc1tzaXplXS53aWR0aCA8PSBpbWdXaWR0aCAmJiBpbWFnZV9zaXplc1tzaXplXS5oZWlnaHQgPD0gaW1nSGVpZ2h0ICkge1xuXHRcdFx0XHRcdGFyZWFTZWxlY3RPcHRpb25zLm1pbldpZHRoICA9IE1hdGgubWF4KCBhcmVhU2VsZWN0T3B0aW9ucy5taW5XaWR0aCwgIGltYWdlX3NpemVzW3NpemVdLndpZHRoICk7XG5cdFx0XHRcdFx0YXJlYVNlbGVjdE9wdGlvbnMubWluSGVpZ2h0ID0gTWF0aC5tYXgoIGFyZWFTZWxlY3RPcHRpb25zLm1pbkhlaWdodCwgaW1hZ2Vfc2l6ZXNbc2l6ZV0uaGVpZ2h0ICk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoICFjcm9wZGF0YSApIHtcblx0XHRcdFx0Ly8gd3AgZGVmYXVsdCBjcm9wZGF0YVxuXHRcdFx0XHR2YXIgc2NhbGUgPSBNYXRoLm1pbiggdGhpcy5tb2RlbC5nZXQoJ3dpZHRoJykgLyB0aGlzLmN1cnJlbnRfcmF0aW8ucmF0aW8sIHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKSk7XG5cblx0XHRcdFx0cmVjdCA9IHtcblx0XHRcdFx0XHR4OjAsXG5cdFx0XHRcdFx0eTowLFxuXHRcdFx0XHRcdHdpZHRoOiAgc2NhbGUgKiB0aGlzLmN1cnJlbnRfcmF0aW8ucmF0aW8sXG5cdFx0XHRcdFx0aGVpZ2h0OiBzY2FsZVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRyZWN0LnggPSAodGhpcy5tb2RlbC5nZXQoJ3dpZHRoJykgLSByZWN0LndpZHRoKS8yO1xuXHRcdFx0XHRyZWN0LnkgPSAodGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpIC0gcmVjdC5oZWlnaHQpLzI7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZWN0ID0ge307XG5cblx0XHRcdFx0Xy5leHRlbmQocmVjdCxjcm9wZGF0YSk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuJGFyZWFTZWxlY3QoKS5zZXRPcHRpb25zKCBhcmVhU2VsZWN0T3B0aW9ucyApO1xuXHRcdFx0aWYgKCAhIHRoaXMuaW1hZ2UuJGVsLmdldCgwKS5jb21wbGV0ZSApIHtcblx0XHRcdFx0dGhpcy5pbWFnZS4kZWwub24oJ2xvYWQnLGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNlbGYuc2VsZWN0Q3JvcChyZWN0KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnNlbGVjdENyb3AocmVjdCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGF1dG9jcm9wOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHQvLyBjcm9wIGJ5IGZvY3VzIHBvaW50XG5cblx0XHRcdHZhciBjcm9wZGF0YSwgaW1hZ2VpbmZvID0ge1xuXHRcdFx0XHRcdHdpZHRoOlx0XHR0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSxcblx0XHRcdFx0XHRoZWlnaHQ6XHRcdHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKSxcblx0XHRcdFx0XHRmb2N1c3BvaW50Olx0dGhpcy5tb2RlbC5nZXQoJ2ZvY3VzcG9pbnQnKVxuXHRcdFx0XHR9O1xuXHRcdFx0Y3JvcGRhdGEgPSByb2JvY3JvcC5jcm9wRnJvbUZvY3VzUG9pbnQoIGltYWdlaW5mbywgdGhpcy5jdXJyZW50X3JhdGlvICk7XG5cdFx0XHRjcm9wZGF0YSA9IHJvYm9jcm9wLnJlbFRvQWJzQ29vcmRzKCBjcm9wZGF0YSwgaW1hZ2VpbmZvICk7XG5cblx0XHRcdHRoaXMuX3NldENyb3BTaXplcyggY3JvcGRhdGEgKTtcblx0XHRcdHRoaXMuc2VsZWN0Q3JvcCggY3JvcGRhdGEgKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRhdXRvY3JvcEFsbDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRpbWFnZWluZm8gPSB7XG5cdFx0XHRcdFx0d2lkdGg6XHRcdHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLFxuXHRcdFx0XHRcdGhlaWdodDpcdFx0dGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpLFxuXHRcdFx0XHRcdGZvY3VzcG9pbnQ6XHR0aGlzLm1vZGVsLmdldCgnZm9jdXNwb2ludCcpXG5cdFx0XHRcdH07XG5cblx0XHRcdF8uZWFjaCggdGhpcy5pbWFnZV9yYXRpb3MsIGZ1bmN0aW9uKCByYXRpbyApIHtcblx0XHRcdFx0dmFyIGNyb3BkYXRhO1xuXHRcdFx0XHRjcm9wZGF0YSA9IHJvYm9jcm9wLmNyb3BGcm9tRm9jdXNQb2ludCggaW1hZ2VpbmZvLCByYXRpbyApO1xuXHRcdFx0XHRjcm9wZGF0YSA9IHJvYm9jcm9wLnJlbFRvQWJzQ29vcmRzKCBjcm9wZGF0YSwgaW1hZ2VpbmZvICk7XG5cdFx0XHRcdHNlbGYuX3NldENyb3BTaXplcyggY3JvcGRhdGEsIHJhdGlvICk7XG5cdFx0XHR9ICk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0c2VsZWN0Q3JvcDpmdW5jdGlvbiggcmVjdCApIHtcblx0XHRcdC8vIGRyYXcgY3JvcCBVSSBlbGVtZW50LlxuXHRcdFx0dmFyIGZhY3RvciA9IHRoaXMuX2ltYWdlX3NjYWxlX2ZhY3RvcigpLFxuXHRcdFx0XHRwb2ludHMgPSByb2JvY3JvcC5yZWN0VG9Qb2ludENvb3JkcyggcmVjdCApLFxuXHRcdFx0XHQkYXJlYVNlbGVjdCA9IHRoaXMuJGFyZWFTZWxlY3QoKTtcblxuXHRcdFx0JGFyZWFTZWxlY3Quc2V0U2VsZWN0aW9uKCBwb2ludHMueDEsIHBvaW50cy55MSwgcG9pbnRzLngyLCBwb2ludHMueTIsIGZhbHNlICk7XG5cdFx0XHQkYXJlYVNlbGVjdC5zZXRPcHRpb25zKCB7c2hvdzp0cnVlfSApO1xuXHRcdFx0JGFyZWFTZWxlY3QudXBkYXRlKCk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdCRhcmVhU2VsZWN0IDogZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB0aGlzLmltYWdlLiRlbC5kYXRhKCdpbWdBcmVhU2VsZWN0Jyk7XG5cdFx0fSxcblx0XHRfaW1hZ2Vfc2NhbGVfZmFjdG9yIDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgJGNvbnRhaW5lciA9IHRoaXMuaW1hZ2UuJGVsLmNsb3Nlc3QoJy5yb2JvY3JvcC1pbWFnZS1ib3gnKSxcblx0XHRcdFx0dyA9IE1hdGgubWluKHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLCRjb250YWluZXIud2lkdGgoKSksXG5cdFx0XHRcdGggPSBNYXRoLm1pbih0aGlzLm1vZGVsLmdldCgnaGVpZ2h0JyksJGNvbnRhaW5lci5oZWlnaHQoKSk7XG5cblx0XHRcdHJldHVybiBNYXRoLm1pbiggdyAvIHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLCBoIC8gdGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpICk7XG5cdFx0fSxcblx0XHR1cGRhdGVGb2N1c1BvaW50OiBmdW5jdGlvbiggKSB7XG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2ZvY3VzcG9pbnQnLCB0aGlzLmZvY3VzcG9pbnR0b29sLmdldEZvY3VzcG9pbnQoKSApO1xuXHRcdH0sXG5cdFx0X3NldENyb3BTaXplcyA6IGZ1bmN0aW9uKCBjcm9wZGF0YSwgcmF0aW8gKSB7XG5cdFx0XHR2YXIgdyA9IHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLFxuXHRcdFx0XHRoID0gdGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpLFxuXHRcdFx0XHRtb2RlbFNpemVzID0gdGhpcy5tb2RlbC5nZXQoJ3NpemVzJyksXG5cdFx0XHRcdHJhdGlvID0gcmF0aW8gfHwgdGhpcy5jdXJyZW50X3JhdGlvO1xuXG5cdFx0XHRfLmVhY2gocmF0aW8uc2l6ZXMsIGZ1bmN0aW9uKCBzaXplbmFtZSApIHtcblx0XHRcdFx0Ly8qXG5cdFx0XHRcdHZhciBjYW5jcm9wID1cdCh3ID49IGltYWdlX3NpemVzW3NpemVuYW1lXS53aWR0aCkgJiZcblx0XHRcdFx0XHRcdFx0XHQoaCA+PSBpbWFnZV9zaXplc1tzaXplbmFtZV0uaGVpZ2h0KTtcblxuXHRcdFx0XHQhIG1vZGVsU2l6ZXNbIHNpemVuYW1lIF0gJiYgKCBtb2RlbFNpemVzWyBzaXplbmFtZSBdID0ge30gKTtcblx0XHRcdFx0bW9kZWxTaXplc1sgc2l6ZW5hbWUgXS5jcm9wZGF0YSA9IGNyb3BkYXRhO1xuXG5cdFx0XHRcdGlmICggY2FuY3JvcCAmJiBpbWFnZV9zaXplc1tzaXplbmFtZV0uY3JvcCApIHtcblx0XHRcdFx0XHRtb2RlbFNpemVzWyBzaXplbmFtZSBdLmNyb3BkYXRhID0gY3JvcGRhdGE7XG5cdFx0XHRcdH0gZWxzZSBpZiAoICd1bmRlZmluZWQnICE9PSB0eXBlb2YgbW9kZWxTaXplc1sgc2l6ZW5hbWUgXSApIHtcblx0XHRcdFx0XHRkZWxldGUoIG1vZGVsU2l6ZXNbIHNpemVuYW1lIF0gKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvKi9cblx0XHRcdFx0ISBtb2RlbFNpemVzWyBzaXplbmFtZSBdICYmICggbW9kZWxTaXplc1sgc2l6ZW5hbWUgXSA9IHt9ICk7XG5cdFx0XHRcdG1vZGVsU2l6ZXNbIHNpemVuYW1lIF0uY3JvcGRhdGEgPSBjcm9wZGF0YTtcblx0XHRcdFx0Ly8qL1xuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ3NpemVzJywgbW9kZWxTaXplcyApO1xuXHRcdH0sXG5cdFx0X2dldFJlbGF0aXZlQ29vcmRzOiBmdW5jdGlvbiggY29vcmRzICkge1xuXHRcdFx0dmFyIHcgPSB0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSxcblx0XHRcdFx0aCA9IHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKTtcblx0XHRcdGZvciAoIHZhciBzIGluIGNvb3JkcyApIHtcblx0XHRcdFx0aWYgKCAnbnVtYmVyJz09PXR5cGVvZihjb29yZHNbc10pICkge1xuXHRcdFx0XHRcdHN3aXRjaCAocykge1xuXHRcdFx0XHRcdFx0Y2FzZSAneCc6XG5cdFx0XHRcdFx0XHRjYXNlICd4MSc6XG5cdFx0XHRcdFx0XHRjYXNlICd4Mic6XG5cdFx0XHRcdFx0XHRjYXNlICd3aWR0aCc6XG5cdFx0XHRcdFx0XHRjYXNlICdtaW5YJzpcblx0XHRcdFx0XHRcdGNhc2UgJ21heFgnOlxuXHRcdFx0XHRcdFx0XHRjb29yZHNbc10gLz0gdztcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHRjb29yZHNbc10gLz0gaDtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRfZ2V0QWJzb2x1dGVDb29yZHM6IGZ1bmN0aW9uKCBjb29yZHMgKSB7XG5cdFx0XHR2YXIgdyA9IHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLFxuXHRcdFx0XHRoID0gdGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpO1xuXHRcdFx0Zm9yICggdmFyIHMgaW4gY29vcmRzICkge1xuXHRcdFx0XHRpZiAoICdudW1iZXInPT09dHlwZW9mKGNvb3Jkc1tzXSkgKSB7XG5cdFx0XHRcdFx0c3dpdGNoIChzKSB7XG5cdFx0XHRcdFx0XHRjYXNlICd4Jzpcblx0XHRcdFx0XHRcdGNhc2UgJ3gxJzpcblx0XHRcdFx0XHRcdGNhc2UgJ3gyJzpcblx0XHRcdFx0XHRcdGNhc2UgJ3dpZHRoJzpcblx0XHRcdFx0XHRcdGNhc2UgJ21pblgnOlxuXHRcdFx0XHRcdFx0Y2FzZSAnbWF4WCc6XG5cdFx0XHRcdFx0XHRcdGNvb3Jkc1tzXSAqPSB3O1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdGNvb3Jkc1tzXSAqPSBoO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblxuXG5cblx0cm9ib2Nyb3Audmlldy5GcmFtZSA9IHdwLm1lZGlhLnZpZXcuTWVkaWFGcmFtZS5leHRlbmQoe1xuXHRcdHRlbXBsYXRlOiAgd3AudGVtcGxhdGUoJ3JvYm9jcm9wLW1vZGFsJyksXG5cdFx0cmVnaW9uczogICBbJ3RpdGxlJywnY29udGVudCcsJ2luc3RydWN0aW9ucycsJ2J1dHRvbnMnLCdyYXRpb3MnXVxuXHR9KTtcblxuXHRyb2JvY3JvcC52aWV3LkZyYW1lLkNyb3AgPSByb2JvY3JvcC52aWV3LkZyYW1lLmV4dGVuZCh7XG5cdFx0ZXZlbnRzOiB7XG5cdFx0XHQnY2xpY2sgLnJvYm9jcm9wLXNhdmUnXHRcdDogJ3NhdmUnLFxuXHRcdFx0J2NsaWNrIC5yb2JvY3JvcC1jYW5jZWwnXHQ6ICdjbG9zZScsXG5cdFx0fSxcblx0XHRzYXZlOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuJCgnLnJvYm9jcm9wLXNhdmUsIC5yb2JvY3JvcC1jYW5jZWwnKS5wcm9wKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHR0aGlzLl9jb250ZW50LnNhdmUoKTtcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKCBvcHRpb25zICkge1xuXHRcdFx0cm9ib2Nyb3Audmlldy5GcmFtZS5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cblx0XHRcdHRoaXMuY3JlYXRlVGl0bGUoKTtcblx0XHRcdHRoaXMuY3JlYXRlQ29udGVudCgpO1xuXHRcdFx0dGhpcy5jcmVhdGVCdXR0b25zKCk7XG5cblx0XHRcdHRoaXMub24oJ2Nsb3NlJywgdGhpcy5kaXNtaXNzLCB0aGlzICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLl9jb250ZW50LCAnc2F2ZWQnLCB0aGlzLm1vZGVsU3luYyApO1xuXHRcdH0sXG5cdFx0bW9kZWxTeW5jOiBmdW5jdGlvbigpe1xuXHRcdFx0dGhpcy4kKCcucm9ib2Nyb3Atc2F2ZSwgLnJvYm9jcm9wLWNhbmNlbCcpLnByb3AoICdkaXNhYmxlZCcsIGZhbHNlICk7XG5cdFx0fSxcblx0XHRkaXNtaXNzOmZ1bmN0aW9uKCl7XG5cdFx0XHR0aGlzLl9jb250ZW50LmRpc21pc3MoKTtcblx0XHR9LFxuXHRcdGNyZWF0ZVRpdGxlOiBmdW5jdGlvbiggKSB7XG5cdFx0XHR0aGlzLl90aXRsZSA9IG5ldyB3cC5tZWRpYS5WaWV3KHtcblx0XHRcdFx0dGFnTmFtZTogJ2gxJ1xuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLl90aXRsZS4kZWwudGV4dCggbDEwbi5BdHRhY2htZW50RGV0YWlscyApO1xuXHRcdFx0dGhpcy50aXRsZS5zZXQoIFsgdGhpcy5fdGl0bGUgXSApO1xuXHRcdH0sXG5cdFx0Y3JlYXRlQ29udGVudDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgb3B0cyA9IF8uZXh0ZW5kKHtcblx0XHRcdFx0Y29udHJvbGxlcjogdGhpcy5jb250cm9sbGVyLFxuXHRcdFx0XHRtb2RlbDogdGhpcy5tb2RlbFxuXHRcdFx0fSwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLl9jb250ZW50ID0gbmV3IHJvYm9jcm9wLnZpZXcuUm9ib2Nyb3BJbWFnZSggb3B0cyApO1xuXHRcdFx0dGhpcy5jb250ZW50LnNldCggWyB0aGlzLl9jb250ZW50IF0gKTtcblx0XHR9LFxuXHRcdGNyZWF0ZUJ1dHRvbnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGluZm8sIGJ0bjtcblxuXHRcdFx0dGhpcy5idXR0b25zLnNldCggW1xuXHRcdFx0XHRuZXcgd3AubWVkaWEudmlldy5CdXR0b24oe1xuXHRcdFx0XHRcdHRleHQ6IGwxMG4uQ2xvc2UsXG5cdFx0XHRcdFx0Y2xhc3NOYW1lOiAnYnV0dG9uLXNlY29uZGFyeSByb2JvY3JvcC1jYW5jZWwnXG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgd3AubWVkaWEudmlldy5CdXR0b24oe1xuXHRcdFx0XHRcdHRleHQ6IGwxMG4uU2F2ZUNoYW5nZXMsXG5cdFx0XHRcdFx0Y2xhc3NOYW1lOiAnYnV0dG9uLXByaW1hcnkgcm9ib2Nyb3Atc2F2ZSdcblx0XHRcdFx0fSlcblx0XHRcdF0gKTtcblx0XHR9XG5cdH0pO1xuXG5cblxuXG59KSh3cCxqUXVlcnkpO1xuIiwiKGZ1bmN0aW9uKHdwLCQpIHtcblxuXHR2YXIgcm9ib2Nyb3AgPSB3cC5tZWRpYS5yb2JvY3JvcCxcblx0XHRpbWFnZV9yYXRpb3MgPSByb2JvY3JvcC5pbWFnZV9yYXRpb3MsXG5cdFx0aW1hZ2Vfc2l6ZXMgID0gcm9ib2Nyb3AuaW1hZ2Vfc2l6ZXMsXG5cdFx0bDEwbiA9IHJvYm9jcm9wLmwxMG47XG5cblx0dmFyIFZpZXdcdFx0PSB3cC5tZWRpYS5WaWV3LFxuXHRcdE1lZGlhRnJhbWVcdD0gd3AubWVkaWEudmlldy5NZWRpYUZyYW1lLFxuXHRcdEZvY3VzUG9pbnQsXG5cdFx0Q3JvcFJlY3Q7XG5cblx0cm9ib2Nyb3Audmlldy5mb2N1c3BvaW50ID0ge307XG5cblx0Q3JvcFJlY3QgPSByb2JvY3JvcC52aWV3LmZvY3VzcG9pbnQuQ3JvcFJlY3QgPSBWaWV3LmV4dGVuZCh7XG5cdFx0dGVtcGxhdGU6IHdwLnRlbXBsYXRlKCdjcm9wcmVjdCcpLFxuXHRcdGNsYXNzTmFtZTpcdCd0b29sLWNyb3ByZWN0Jyxcblx0XHRjb250cm9sbGVyOm51bGwsXG5cdFx0ZXZlbnRzOiB7XG5cdFx0XHQnbW91c2VlbnRlciAubGFiZWwnIDogJ3Nob3dIaWxpdGUnLFxuXHRcdFx0J21vdXNlbGVhdmUgLmxhYmVsJyA6ICdoaWRlSGlsaXRlJyxcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0Vmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cblx0XHRcdF8uZGVmYXVsdHMoIHRoaXMub3B0aW9ucywge1xuXHRcdFx0XHRmb2N1c3BvaW50OiBudWxsLCAvLyBmb2N1c3BvaW50IGNvb3Jkc1xuXHRcdFx0XHRyYXRpbzogbnVsbFxuXHRcdFx0fSApO1xuXG5cdFx0XHR0aGlzLm9wdGlvbnMubGFiZWwgPSB0aGlzLm9wdGlvbnMucmF0aW8ubmFtZSArICcgOiAxJztcblxuXHRcdFx0dGhpcy5jb250cm9sbGVyID0gdGhpcy5vcHRpb25zLmNvbnRyb2xsZXI7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLmNvbnRyb2xsZXIuaW1hZ2UsICdsb2FkJywgdGhpcy5pbWFnZUxvYWRlZCApO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGltYWdlTG9hZGVkOmZ1bmN0aW9uKCBpbWFnZSApIHtcblx0XHRcdHRoaXMuJGVsLmF0dHIoICdkYXRhLWRpcicsIHRoaXMub3B0aW9ucy5yYXRpby5yYXRpbyA+IGltYWdlLnJhdGlvID8gJ3cnIDogJ2gnICk7XG5cdFx0XHR0aGlzLiRlbC5jc3MoICd3aWR0aCcsIE1hdGgubWluKCAxLCB0aGlzLm9wdGlvbnMucmF0aW8ucmF0aW8gLyBpbWFnZS5yYXRpbyApICogMTAwICsnJScgKTtcblx0XHRcdHRoaXMuc2V0Rm9jdXNwb2ludCggKTtcblx0XHRcdC8vIHNldCBwb3NpdGlvbiBmcm9tIGZvc3VzcG9pbnRcblx0XHR9LFxuXHRcdHNldEZvY3VzcG9pbnQ6ZnVuY3Rpb24oIGZvY3VzcG9pbnQgKSB7XG5cdFx0XHRpZiAoICEhZm9jdXNwb2ludCApIHtcblx0XHRcdFx0dGhpcy5vcHRpb25zLmZvY3VzcG9pbnQgPSBmb2N1c3BvaW50O1xuXHRcdFx0fVxuXHRcdFx0dmFyIGltYWdlaW5mbyA9IHtcblx0XHRcdFx0XHR3aWR0aFx0XHQ6IHRoaXMuY29udHJvbGxlci5pbWFnZS4kZWwud2lkdGgoKSxcblx0XHRcdFx0XHRoZWlnaHRcdFx0OiB0aGlzLmNvbnRyb2xsZXIuaW1hZ2UuJGVsLmhlaWdodCgpLFxuXHRcdFx0XHRcdGZvY3VzcG9pbnRcdDogdGhpcy5vcHRpb25zLmZvY3VzcG9pbnQsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJlcyA9IHJvYm9jcm9wLmNyb3BGcm9tRm9jdXNQb2ludCggaW1hZ2VpbmZvLCB0aGlzLm9wdGlvbnMucmF0aW8gKSxcblx0XHRcdFx0Y29vcmQgPSByb2JvY3JvcC5yZWxUb0Fic0Nvb3JkcyggcmVzLCBpbWFnZWluZm8gKTtcbiBcdFx0XHR0aGlzLiRlbC5jc3MoJ2xlZnQnLGNvb3JkLnggKyAncHgnICk7XG4gXHRcdFx0dGhpcy4kZWwuY3NzKCd0b3AnLGNvb3JkLnkgKyAncHgnICk7XG4gXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRzaG93SGlsaXRlOiBmdW5jdGlvbihlKXtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtaGlsaXRlJywndHJ1ZScpO1xuXHRcdFx0dGhpcy50cmlnZ2VyKCdoaWxpdGU6c2hvdycpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRoaWRlSGlsaXRlOiBmdW5jdGlvbihlKXtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtaGlsaXRlJywnZmFsc2UnKTtcblx0XHRcdHRoaXMudHJpZ2dlcignaGlsaXRlOmhpZGUnKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0fSk7XG5cblx0Rm9jdXNQb2ludCA9IHJvYm9jcm9wLnZpZXcuZm9jdXNwb2ludC5Gb2N1c1BvaW50ID0gVmlldy5leHRlbmQoe1xuXHRcdGNsYXNzTmFtZTpcdCd0b29sLWZvY3VzcG9pbnQnLFxuXHRcdHRlbXBsYXRlOlx0d3AudGVtcGxhdGUoJ2ZvY3VzcG9pbnQnKSxcblx0XHRsYWJlbFZpZXc6XHRcdG51bGwsXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKXtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdF8uZGVmYXVsdHMoIHRoaXMub3B0aW9ucywge1xuXHRcdFx0XHRmb2N1c3BvaW50Ont4OjAseTowfSxcblx0XHRcdFx0ZW5hYmxlZDogZmFsc2UgLFxuXHRcdFx0XHRjcm9wUmVjdHM6W11cblx0XHRcdH0gKTtcblx0XHRcdHRoaXMub3B0aW9ucy5jcm9wUmVjdHMuc29ydChmdW5jdGlvbihhLGIpe1xuXHRcdFx0XHRyZXR1cm4gYi5vcHRpb25zLnJhdGlvLnJhdGlvIC0gYS5vcHRpb25zLnJhdGlvLnJhdGlvO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuJGVsLm9uKCdjbGljaycsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0c2VsZi5jbGlja0ZvY3VzcG9pbnQoIGV2ZW50ICk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0cmVuZGVyOmZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHRWaWV3LnByb3RvdHlwZS5yZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0Xy5lYWNoKCB0aGlzLm9wdGlvbnMuY3JvcFJlY3RzLCBmdW5jdGlvbiggcmVjdCApe1xuXHRcdFx0XHRyZWN0LnJlbmRlcigpO1xuXHRcdFx0XHRzZWxmLiRlbC5hcHBlbmQoIHJlY3QuJGVsICk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0c2V0RW5hYmxlZDogZnVuY3Rpb24oIGVuYWJsZWQgKSB7XG5cdFx0XHR2YXIgcHJldiA9IHRoaXMub3B0aW9ucy5lbmFibGVkO1xuXHRcdFx0dGhpcy5vcHRpb25zLmVuYWJsZWQgPSBlbmFibGVkO1xuXHRcdFx0dGhpcy4kZWwuYXR0ciggJ2RhdGEtZW5hYmxlZCcsIGVuYWJsZWQudG9TdHJpbmcoKSApO1xuXHRcdFx0cmV0dXJuIHByZXY7XG5cdFx0fSxcblx0XHRjbGlja0ZvY3VzcG9pbnQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciBvZmZzO1xuXHRcdFx0aWYgKCB0aGlzLm9wdGlvbnMuZW5hYmxlZCApIHtcblx0XHRcdFx0b2ZmcyA9IHRoaXMuJGVsLm9mZnNldCgpO1xuXHRcdFx0XHR0aGlzLnNldEZvY3VzcG9pbnQoIHtcblx0XHRcdFx0XHR4OiAgMiAqIChldmVudC5wYWdlWCAtIG9mZnMubGVmdCApIC8gdGhpcy4kZWwud2lkdGgoKSAgLSAxLFxuXHRcdFx0XHRcdHk6IC0yICogKGV2ZW50LnBhZ2VZIC0gb2Zmcy50b3AgKSAvIHRoaXMuJGVsLmhlaWdodCgpICsgMSxcblx0XHRcdFx0fSApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Z2V0Rm9jdXNwb2ludDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5mb2N1c3BvaW50O1xuXHRcdH0sXG5cdFx0c2V0Rm9jdXNwb2ludDogZnVuY3Rpb24oIGZvY3VzcG9pbnQgKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHRoaXMuZm9jdXNwb2ludCA9IGZvY3VzcG9pbnQ7XG5cblx0XHRcdHRoaXMuJGVsLmZpbmQoJy5mb2N1c3BvaW50JykuY3NzKHtcblx0XHRcdFx0bGVmdDogXHQoKGZvY3VzcG9pbnQueCArIDEpICogNTApKyclJyxcblx0XHRcdFx0Ym90dG9tOlx0KChmb2N1c3BvaW50LnkgKyAxKSAqIDUwKSsnJSdcblx0XHRcdH0pO1xuXG5cdFx0XHRfLmVhY2goIHRoaXMub3B0aW9ucy5jcm9wUmVjdHMsIGZ1bmN0aW9uKHJlY3Qpe1xuXHRcdFx0XHRyZWN0LnNldEZvY3VzcG9pbnQoIHNlbGYuZm9jdXNwb2ludCApO1xuXHRcdFx0fSk7XG5cdFx0XHRpZiAoIHRoaXMub3B0aW9ucy5lbmFibGVkICkge1xuXHRcdFx0XHR0aGlzLnRyaWdnZXIoJ2NoYW5nZTpmb2N1c3BvaW50JywgdGhpcy5mb2N1c3BvaW50ICk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHR9KTtcblxuXHRyb2JvY3JvcC52aWV3LmZvY3VzcG9pbnQuSW1hZ2VGb2N1c1BvaW50U2VsZWN0ID0gVmlldy5leHRlbmQoe1xuXHRcdGNsYXNzTmFtZTpcdCdyb2JvY3JvcC1pbWFnZS1ib3gnLFxuXHRcdGNyb3BSZWN0czogW10sXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oICl7XG5cblx0XHRcdF8uZGVmYXVsdHMoIHRoaXMub3B0aW9ucywge1xuXHRcdFx0XHRjb250cm9sbGVyOiB0aGlzLFxuXHRcdFx0XHRmb2N1c3BvaW50OiB7eDowLHk6MH0sXG5cdFx0XHRcdHNyYzogZmFsc2UsXG5cdFx0XHRcdGltYWdlOiBmYWxzZSxcblx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXG5cdFx0XHR9ICk7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0aWYgKCB0aGlzLm9wdGlvbnMuaW1hZ2UgIT09IGZhbHNlICYmICh0aGlzLm9wdGlvbnMuaW1hZ2UuY29uc3RydWN0b3IucHJvdG90eXBlID09IHJvYm9jcm9wLnZpZXcuSW1nLnByb3RvdHlwZSApICkge1xuXHRcdFx0XHR0aGlzLmltYWdlID0gdGhpcy5vcHRpb25zLmltYWdlO1xuXHRcdFx0fSBlbHNlIGlmICggdGhpcy5vcHRpb25zLnNyYyAhPT0gZmFsc2UgKSB7XG5cdFx0XHRcdHRoaXMuaW1hZ2VcdD0gbmV3IHJvYm9jcm9wLnZpZXcuSW1nKCB7IHNyYzogdGhpcy5vcHRpb25zLnNyYyB9KTtcblx0XHRcdH0gZWxzZSAge1xuXHRcdFx0XHR0aGlzLmltYWdlID0gbmV3IHJvYm9jcm9wLnZpZXcuSW1nKCB7IHNyYzogJycgfSwgdGhpcy5vcHRpb25zLmltYWdlKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5jcm9wUmVjdHMgPSBbXTtcblx0XHRcdF8uZWFjaCggaW1hZ2VfcmF0aW9zLCBmdW5jdGlvbiggcmF0aW8sIGtleSApIHtcblx0XHRcdFx0dmFyIHJlY3QgPSBuZXcgQ3JvcFJlY3QoIHtcblx0XHRcdFx0XHRjb250cm9sbGVyOiBzZWxmLFxuXHRcdFx0XHRcdGZvY3VzcG9pbnQ6IHNlbGYub3B0aW9ucy5mb2N1c3BvaW50LFxuXHRcdFx0XHRcdHJhdGlvOiByYXRpb1xuXHRcdFx0XHR9ICk7XG5cdFx0XHRcdHNlbGYubGlzdGVuVG8ocmVjdCwnaGlsaXRlOnNob3cnLHNlbGYuc2hvd0hpbGl0ZSApO1xuXHRcdFx0XHRzZWxmLmxpc3RlblRvKHJlY3QsJ2hpbGl0ZTpoaWRlJyxzZWxmLmhpZGVIaWxpdGUgKTtcblx0XHRcdFx0c2VsZi5jcm9wUmVjdHMucHVzaCggcmVjdCApO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuZm9jdXNwb2ludFx0PSBuZXcgRm9jdXNQb2ludCh7XG5cdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMuY29udHJvbGxlcixcblx0XHRcdFx0Zm9jdXNwb2ludDogdGhpcy5vcHRpb25zLmZvY3VzcG9pbnQsXG5cdFx0XHRcdGVuYWJsZWQ6IFx0dGhpcy5vcHRpb25zLmVuYWJsZWQsXG5cdFx0XHRcdGNyb3BSZWN0czpcdHRoaXMuY3JvcFJlY3RzLFxuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMuZm9jdXNwb2ludCwgJ2NoYW5nZTpmb2N1c3BvaW50JywgdGhpcy52YWx1ZUNoYW5nZWQgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMuaW1hZ2UsICdsb2FkJywgdGhpcy5zZXRIZWlnaHQgKTtcblxuXHRcdFx0dGhpcy52aWV3cy5zZXQoIFsgdGhpcy5pbWFnZSwgdGhpcy5mb2N1c3BvaW50IF0gKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRzZXRIZWlnaHQ6ZnVuY3Rpb24oKXtcblx0XHRcdHZhciBuZXdIZWlnaHQgPSBNYXRoLm1pbiggdGhpcy4kZWwucGFyZW50KCkuaGVpZ2h0KCksIHRoaXMuaW1hZ2UuJGVsLmhlaWdodCgpICk7XG5cdFx0XHR0aGlzLiRlbC5oZWlnaHQoIG5ld0hlaWdodCApXG5cdFx0fSxcblx0XHRzZXRFbmFibGVkOiBmdW5jdGlvbiggZW5hYmxlZCApIHtcblxuXHRcdFx0cmV0dXJuIHRoaXMuZm9jdXNwb2ludC5zZXRFbmFibGVkKCBlbmFibGVkIClcblx0XHR9LFxuXHRcdGdldEZvY3VzcG9pbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZm9jdXNwb2ludC5nZXRGb2N1c3BvaW50KCk7XG5cdFx0fSxcblx0XHRzZXRGb2N1c3BvaW50OiBmdW5jdGlvbiggZm9jdXNwb2ludCApIHtcblx0XHRcdHRoaXMuZm9jdXNwb2ludCAmJiB0aGlzLmZvY3VzcG9pbnQuc2V0Rm9jdXNwb2ludCggZm9jdXNwb2ludCApO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRnZXRJbWFnZVdpZHRoOiBmdW5jdGlvbiggKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5pbWFnZS4kZWwuZ2V0KDApLm5hdHVyYWxXaWR0aDtcblx0XHR9LFxuXHRcdGdldEltYWdlSGVpZ2h0OiBmdW5jdGlvbiggKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5pbWFnZS4kZWwuZ2V0KDApLm5hdHVyYWxIZWlnaHQ7XG5cdFx0fSxcblx0XHRzZXRTcmM6IGZ1bmN0aW9uKCBzcmMgKSB7XG5cdFx0XHR0aGlzLmltYWdlLiRlbC5hdHRyKCAnc3JjJywgc3JjICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHZhbHVlQ2hhbmdlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcblx0XHR9LFxuXHRcdHNob3dIaWxpdGU6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0dGhpcy4kZWwuYXR0cignZGF0YS1oaWxpdGUnLCd0cnVlJyk7XG5cdFx0fSxcblx0XHRoaWRlSGlsaXRlOiBmdW5jdGlvbihlKXtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtaGlsaXRlJywnZmFsc2UnKTtcblx0XHR9XG5cdH0pO1xuXG5cdHJvYm9jcm9wLnZpZXcuRnJhbWUuRm9jdXNwb2ludCA9IHJvYm9jcm9wLnZpZXcuRnJhbWUuZXh0ZW5kKHtcblx0XHRjbGFzc05hbWU6ICdhc2stZm9jdXNwb2ludCBtZWRpYS1mcmFtZScsXG5cdFx0ZXZlbnRzOiB7XG5cdFx0XHQnY2xpY2sgLnJlc2V0JzogJ3Jlc2V0Jyxcblx0XHRcdCdjbGljayAucHJvY2VlZCc6ICdwcm9jZWVkJyxcblx0XHRcdCdjbGljayAuY2FuY2VsLXVwbG9hZCc6ICdjYW5jZWxVcGxvYWQnLFxuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oICkge1xuXG5cdFx0XHRfLmRlZmF1bHRzKCB0aGlzLm9wdGlvbnMsIHtcblx0XHRcdFx0dXBsb2FkZXI6XHRmYWxzZSxcblx0XHRcdFx0dGl0bGU6XHRcdGwxMG4uU2V0Rm9jdXNQb2ludCxcblx0XHRcdFx0bW9kYWw6IHRoaXMub3B0aW9ucyA/IHRoaXMub3B0aW9ucy5tb2RhbCA6IGZhbHNlLFxuXHRcdFx0XHRzcmM6ICcnIC8vIGV4cGVjdGluZyBhbiBpbWcgZWxlbWVudFxuXHRcdFx0fSk7XG5cblx0XHRcdHJvYm9jcm9wLnZpZXcuRnJhbWUucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG5cdFx0XHRpZiAoIHRoaXMubW9kYWwgKSB7XG5cdFx0XHRcdHRoaXMubW9kYWwub24oJ2VzY2FwZScsIHRoaXMuY2FuY2VsVXBsb2FkLCB0aGlzICk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmNyZWF0ZVRpdGxlKCk7XG5cdFx0XHR0aGlzLmNyZWF0ZUNvbnRlbnQoKTtcblx0XHRcdHRoaXMuY3JlYXRlSW5zdHJ1Y3Rpb25zKCk7XG5cdFx0XHR0aGlzLmNyZWF0ZUJ1dHRvbnMoKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG4vLyBcdFx0cmVuZGVyOiBmdW5jdGlvbigpIHtcbi8vIFx0XHRcdC8vIGZyYW1lIGxheW91dFxuLy9cbi8vIFx0XHRcdHJvYm9jcm9wLnZpZXcuTW9kYWwucHJvdG90eXBlLnJlbmRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG4vLyBcdFx0fSxcblx0XHRjcmVhdGVUaXRsZTogZnVuY3Rpb24oICkge1xuXHRcdFx0dGhpcy5fdGl0bGUgPSBuZXcgd3AubWVkaWEuVmlldyh7XG5cdFx0XHRcdHRhZ05hbWU6ICdoMSdcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5fdGl0bGUuJGVsLnRleHQoIHRoaXMub3B0aW9ucy50aXRsZSApO1xuXHRcdFx0dGhpcy50aXRsZS5zZXQoIFsgdGhpcy5fdGl0bGUgXSApO1xuXHRcdH0sXG5cdFx0Y3JlYXRlQ29udGVudDogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLl9jb250ZW50ID0gbmV3IHJvYm9jcm9wLnZpZXcuZm9jdXNwb2ludC5JbWFnZUZvY3VzUG9pbnRTZWxlY3Qoe1xuXHRcdFx0XHRzcmM6ICcnLFxuXHRcdFx0XHRmb2N1c3BvaW50OnsgeDowLCB5OjAgfSxcblx0XHRcdFx0Y29udHJvbGxlcjogdGhpcyxcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcblx0XHRcdFx0dG9vbGJhcjp0aGlzLnRvb2xzXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuY29udGVudC5zZXQoIFsgdGhpcy5fY29udGVudCBdICk7XG5cdFx0fSxcblx0XHRjcmVhdGVJbnN0cnVjdGlvbnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGluZm8sIGJ0bjtcblx0XHRcdHRoaXMuaW5zdHJ1Y3Rpb25zLnNldCggW1xuXHRcdFx0XHRuZXcgd3AubWVkaWEuVmlldyh7XG5cdFx0XHRcdFx0ZWw6ICQoICc8ZGl2IGNsYXNzPVwiaW5zdHJ1Y3Rpb25zXCI+JyArIGwxMG4uRm9jdXNQb2ludEluc3RydWN0aW9ucyArICc8L2Rpdj4nIClbMF0sXG5cdFx0XHRcdFx0cHJpb3JpdHk6IC00MFxuXHRcdFx0XHR9KSxcblx0XHRcdF0gKTtcblx0XHR9LFxuXHRcdGNyZWF0ZUJ1dHRvbnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGluZm8sIGJ0bjtcblxuXHRcdFx0dGhpcy5idXR0b25zLnNldCggW1xuXHRcdFx0XHRuZXcgd3AubWVkaWEudmlldy5CdXR0b24oe1xuXHRcdFx0XHRcdHRleHQ6IGwxMG4uQ2FuY2VsVXBsb2FkLFxuXHRcdFx0XHRcdGNsYXNzTmFtZTogJ2NhbmNlbC11cGxvYWQnXG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgd3AubWVkaWEudmlldy5CdXR0b24oe1xuXHRcdFx0XHRcdHRleHQ6IGwxMG4uUmVzZXQsXG5cdFx0XHRcdFx0Y2xhc3NOYW1lOiAncmVzZXQnXG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgd3AubWVkaWEudmlldy5CdXR0b24oe1xuXHRcdFx0XHRcdHRleHQ6IGwxMG4uT2theSxcblx0XHRcdFx0XHRjbGFzc05hbWU6ICdidXR0b24tcHJpbWFyeSBwcm9jZWVkJ1xuXHRcdFx0XHR9KVxuXHRcdFx0XSApO1xuXHRcdH0sXG5cblx0XHRzZXRTcmM6IGZ1bmN0aW9uKCBzcmMgKSB7XG5cdFx0XHR0aGlzLl9jb250ZW50LnNldFNyYyggc3JjICk7XG5cdFx0fSxcblx0XHRzZXRGaWxlOiBmdW5jdGlvbiggZmlsZSApIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcywgZnIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXHRcdFx0ZnIub25sb2FkID0gZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRzZWxmLnNldFNyYyggZnIucmVzdWx0ICk7XG5cdFx0XHR9XG5cdFx0XHRmci5yZWFkQXNEYXRhVVJMKCBmaWxlICk7XG5cdFx0fSxcblx0XHRzZXRGb2N1c3BvaW50OiBmdW5jdGlvbiggZm9jdXNwb2ludCApIHtcblx0XHRcdHRoaXMuX2NvbnRlbnQuc2V0Rm9jdXNwb2ludCggZm9jdXNwb2ludCApO1xuXHRcdFx0dGhpcy5fY29udGVudC5zZXRFbmFibGVkKHRydWUpO1xuXHRcdH0sXG5cdFx0Z2V0Rm9jdXNwb2ludDogZnVuY3Rpb24oICkge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NvbnRlbnQuZ2V0Rm9jdXNwb2ludCgpO1xuXHRcdH0sXG5cdFx0Z2V0SW1hZ2VXaWR0aDogZnVuY3Rpb24oICkge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NvbnRlbnQuZ2V0SW1hZ2VXaWR0aCgpO1xuXHRcdH0sXG5cdFx0Z2V0SW1hZ2VIZWlnaHQ6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHJldHVybiB0aGlzLl9jb250ZW50LmdldEltYWdlSGVpZ2h0KCk7XG5cdFx0fSxcblx0XHRyZXNldDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dGhpcy5zZXRGb2N1c3BvaW50KCB7IHg6MCwgeTowIH0gKVxuXHRcdH0sXG5cdFx0cHJvY2VlZDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dGhpcy50cmlnZ2VyKCdwcm9jZWVkJyk7XG5cdFx0fSxcblx0XHRjYW5jZWxVcGxvYWQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdC8vIHJlbW92ZSBmcm9tIHF1ZXVlIVxuXHRcdFx0dGhpcy50cmlnZ2VyKCdjYW5jZWwtdXBsb2FkJyk7XG5cdFx0XHR0aGlzLmNsb3NlKCk7XG5cdFx0fVxuXHR9KTtcblxufSkod3AsalF1ZXJ5KTtcbiIsIihmdW5jdGlvbih3cCwkKSB7XG5cblx0dmFyIHJvYm9jcm9wIFx0XHQ9IHdwLm1lZGlhLnJvYm9jcm9wLFxuXHRcdGltYWdlX3JhdGlvc1x0PSByb2JvY3JvcC5pbWFnZV9yYXRpb3MsXG5cdFx0aW1hZ2Vfc2l6ZXNcdFx0PSByb2JvY3JvcC5pbWFnZV9zaXplcyxcblx0XHRsMTBuXHRcdFx0PSByb2JvY3JvcC5sMTBuLFxuXHRcdG9wdGlvbnNcdFx0XHQ9IHJvYm9jcm9wLm9wdGlvbnMsXG5cdFx0Y3JvcEJ0bkhUTUxcdFx0PSAnPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidXR0b24gcm9ib2Nyb3Atb3BlblwiPicrbDEwbi5FZGl0SW1hZ2VTaXplcysnPC9idXR0b24+Jyxcblx0XHRjcm9wTGlua0hUTUxcdD0gJzxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnV0dG9uLWxpbmsgcm9ib2Nyb3Atb3BlblwiPicrbDEwbi5FZGl0SW1hZ2VTaXplcysnPC9idXR0b24+JztcblxuXHR2YXIgcm9ib2Nyb3BTdGF0ZUV4dGVuZCA9IHtcblx0XHRjcmVhdGVTdGF0ZXM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5fcGFyZW50Q3JlYXRlU3RhdGVzLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdHRoaXMuc3RhdGVzLmFkZChcblx0XHRcdFx0bmV3IHJvYm9jcm9wLmNvbnRyb2xsZXIuUm9ib2Nyb3BJbWFnZSgge1xuXHRcdFx0XHRcdG1vZGVsOiB0aGlzLm1vZGVsLFxuXHRcdFx0XHRcdHNlbGVjdGlvbjogdGhpcy5vcHRpb25zLnNlbGVjdGlvblxuXHRcdFx0XHR9IClcblx0XHRcdCk7XG5cdFx0fVxuXHR9O1xuXG5cdC8vIHBvc3QgaW5saW5lIGltYWdlIGVkaXRvclxuXHRfLmV4dGVuZCggd3AubWVkaWEudmlldy5JbWFnZURldGFpbHMucHJvdG90eXBlLCB7XG5cdFx0X3BhcmVudFBvc3RSZW5kZXI6IHdwLm1lZGlhLnZpZXcuSW1hZ2VEZXRhaWxzLnByb3RvdHlwZS5wb3N0UmVuZGVyLFxuXHRcdHBvc3RSZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5fcGFyZW50UG9zdFJlbmRlci5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cdFx0XHR0aGlzLiRlbC5maW5kKCcuYWN0aW9ucycpLmFwcGVuZChjcm9wQnRuSFRNTCk7XG5cdFx0fSxcblx0XHRyb2JvY3JvcE9wZW46IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdGNvbnNvbGUubG9nKCk7XG5cdFx0XHR2YXIgc2l6ZSA9IHRoaXMubW9kZWwuZ2V0KCdzaXplJyksXG5cdFx0XHRcdGNyb3B0b29sID0gbmV3IHJvYm9jcm9wLnZpZXcuRnJhbWUuQ3JvcCgge1xuXHRcdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMuY29udHJvbGxlcixcblx0XHRcdFx0XHRtb2RlbDogdGhpcy5jb250cm9sbGVyLmltYWdlLmF0dGFjaG1lbnQsXG5cdFx0XHRcdFx0c2l6ZVRvU2VsZWN0OiBzaXplXG5cdFx0XHRcdH0gKTtcblx0XHRcdGNyb3B0b29sLm9wZW4oKTtcblx0XHR9XG5cdH0pO1xuXHR3cC5tZWRpYS52aWV3LkltYWdlRGV0YWlscy5wcm90b3R5cGUuZXZlbnRzWydjbGljayAucm9ib2Nyb3Atb3BlbiddID0gJ3JvYm9jcm9wT3Blbic7XG5cblxuXHQvLyBJbmxpbmUgTWVkaWFMaWJyYXJ5LCBHcmlkIHZpZXcgTWVkaWFMaWJyYXJ5XG5cdF8uZXh0ZW5kKCB3cC5tZWRpYS52aWV3LkF0dGFjaG1lbnQuRGV0YWlscy5wcm90b3R5cGUsIHtcblx0XHRfcGFyZW50UmVuZGVyOiB3cC5tZWRpYS52aWV3LkF0dGFjaG1lbnQuRGV0YWlscy5wcm90b3R5cGUucmVuZGVyLFxuXHRcdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLl9wYXJlbnRSZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG5cdFx0XHQvLyBtZWRpYSBsaWJyYXJ5IHNjcmVlTlxuXHRcdFx0aWYgKCBbJ2ltYWdlL2pwZWcnLCdpbWFnZS9wbmcnLCdpbWFnZS9naWYnXS5pbmRleE9mKCB0aGlzLm1vZGVsLmdldCgnbWltZScpICkgPj0gMCApIHtcblx0XHRcdFx0dGhpcy4kKCcuYXR0YWNobWVudC1hY3Rpb25zJykuYXBwZW5kKGNyb3BCdG5IVE1MKTtcblx0XHRcdFx0JCggY3JvcExpbmtIVE1MICkuaW5zZXJ0QWZ0ZXIoIHRoaXMuJGVsLmZpbmQoICdhLmVkaXQtYXR0YWNobWVudCcgKSApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0cm9ib2Nyb3BPcGVuOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgY3JvcHRvb2wgPSBuZXcgcm9ib2Nyb3Audmlldy5GcmFtZS5Dcm9wKCB7XG5cdFx0XHRcdFx0Y29udHJvbGxlcjogdGhpcy5jb250cm9sbGVyLFxuXHRcdFx0XHRcdG1vZGVsOiB0aGlzLm1vZGVsXG5cdFx0XHRcdH0pO1xuXHRcdFx0Y3JvcHRvb2wub3BlbigpO1xuXHRcdH0sXG5cdFx0X3BhcmVudENyZWF0ZVN0YXRlczogd3AubWVkaWEudmlldy5BdHRhY2htZW50LkRldGFpbHMucHJvdG90eXBlLmNyZWF0ZVN0YXRlc1xuXHR9LCByb2JvY3JvcFN0YXRlRXh0ZW5kICk7XG5cblx0d3AubWVkaWEudmlldy5BdHRhY2htZW50LkRldGFpbHMucHJvdG90eXBlLmV2ZW50c1snY2xpY2sgLnJvYm9jcm9wLW9wZW4nXSA9ICdyb2JvY3JvcE9wZW4nO1xuXG5cbn0pKHdwLGpRdWVyeSk7XG4iXX0=
