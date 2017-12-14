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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJvYm9jcm9wLWJhc2UuanMiLCJyb2JvY3JvcC1tZWRpYS12aWV3LmpzIiwicm9ib2Nyb3AtZm9jdXNwb2ludC1tZWRpYS12aWV3LmpzIiwicm9ib2Nyb3Atd3AtbWVkaWEtdmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYWRtaW4vd3Atcm9ib2Nyb3AuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBwcmVzZXJ2ZSAoYykgMjAxNiBieSBKb2VybiBMdW5kXG4gKiBAbGljZW5zZSBHUEwzXG4gKi9cbihmdW5jdGlvbiggZXhwb3J0cyApe1xuXHR2YXIgcm9ib2Nyb3A7XG5cblx0cm9ib2Nyb3AgPSBfLmV4dGVuZCggd2luZG93LnJvYm9jcm9wLCB7XG5cdFx0Y3JvcEZyb21Gb2N1c1BvaW50OiBmdW5jdGlvbiggaW1hZ2VpbmZvLCBjcm9waW5mbyApIHtcblx0XHRcdC8vIG5vcm1hbGl6ZSBcblx0XHRcdHZhciBmcF94ID0gICAoICBpbWFnZWluZm8uZm9jdXNwb2ludC54ICsgMSkgLyAyICogaW1hZ2VpbmZvLndpZHRoLFxuXHRcdFx0XHRmcF95ID0gICAoIC1pbWFnZWluZm8uZm9jdXNwb2ludC55ICsgMSkgLyAyICogaW1hZ2VpbmZvLmhlaWdodCxcblx0XHRcdFx0c2NhbGUgPSBNYXRoLm1pbiggaW1hZ2VpbmZvLndpZHRoIC8gY3JvcGluZm8ubWluX3dpZHRoLCBpbWFnZWluZm8uaGVpZ2h0IC8gY3JvcGluZm8ubWluX2hlaWdodCApLFxuXHRcdFx0XHRjcm9wX3cgPSBjcm9waW5mby5taW5fd2lkdGggKiBzY2FsZSxcblx0XHRcdFx0Y3JvcF9oID0gY3JvcGluZm8ubWluX2hlaWdodCAqIHNjYWxlLFxuXHRcdFx0XHRjcm9wX3ggPSBNYXRoLm1pbiggTWF0aC5tYXgoIGZwX3ggLSBjcm9wX3cgLyAyLCAwICkgLCBpbWFnZWluZm8ud2lkdGggLSBjcm9wX3cpLFxuXHRcdFx0XHRjcm9wX3kgPSBNYXRoLm1pbiggTWF0aC5tYXgoIGZwX3kgLSBjcm9wX2ggLyAyLCAwICkgLCBpbWFnZWluZm8uaGVpZ2h0IC0gY3JvcF9oKTtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdG5hbWVzOiBjcm9waW5mby5zaXplcyxcblx0XHRcdFx0eDogY3JvcF94IC8gaW1hZ2VpbmZvLndpZHRoLFxuXHRcdFx0XHR5OiBjcm9wX3kgLyBpbWFnZWluZm8uaGVpZ2h0LFxuXHRcdFx0XHR3aWR0aDogY3JvcF93IC8gaW1hZ2VpbmZvLndpZHRoLFxuXHRcdFx0XHRoZWlnaHQ6IGNyb3BfaCAvIGltYWdlaW5mby5oZWlnaHRcblx0XHRcdH07XG5cdFx0fSxcblxuXHRcdHJlbFRvQWJzQ29vcmRzOiBmdW5jdGlvbiggY3JvcGRhdGEsIGltYWdlaW5mbyApIHtcblx0XHRcdHZhciBzLCByZXQgPSB7fTtcblx0XHRcdGZvciAoIHMgaW4gY3JvcGRhdGEgKSB7XG5cdFx0XHRcdHN3aXRjaCAoIHMgKSB7XG5cdFx0XHRcdFx0Y2FzZSAneCc6XG5cdFx0XHRcdFx0Y2FzZSAneDEnOlxuXHRcdFx0XHRcdGNhc2UgJ3gyJzpcblx0XHRcdFx0XHRjYXNlICd3aWR0aCc6XG5cdFx0XHRcdFx0XHRyZXRbc10gPSBjcm9wZGF0YVtzXSAqIGltYWdlaW5mby53aWR0aFxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAneSc6XG5cdFx0XHRcdFx0Y2FzZSAneTEnOlxuXHRcdFx0XHRcdGNhc2UgJ3kyJzpcblx0XHRcdFx0XHRjYXNlICdoZWlnaHQnOlxuXHRcdFx0XHRcdFx0cmV0W3NdID0gY3JvcGRhdGFbc10gKiBpbWFnZWluZm8uaGVpZ2h0XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0cmV0W3NdID0gY3JvcGRhdGFbc107XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHJldDtcblx0XHR9LFxuXHRcdGFic1RvUmVsQ29vcmRzOiBmdW5jdGlvbiggY3JvcGRhdGEsIGltYWdlaW5mbyApIHtcblx0XHRcdHZhciBzLCByZXQgPSB7fTtcblx0XHRcdGZvciAoIHMgaW4gY3JvcGRhdGEgKSB7XG5cdFx0XHRcdHN3aXRjaCAoIHMgKSB7XG5cdFx0XHRcdFx0Y2FzZSAneCc6XG5cdFx0XHRcdFx0Y2FzZSAneDEnOlxuXHRcdFx0XHRcdGNhc2UgJ3gyJzpcblx0XHRcdFx0XHRjYXNlICd3aWR0aCc6XG5cdFx0XHRcdFx0XHRyZXRbc10gPSBjcm9wZGF0YVtzXSAvIGltYWdlaW5mby53aWR0aFxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAneSc6XG5cdFx0XHRcdFx0Y2FzZSAneTEnOlxuXHRcdFx0XHRcdGNhc2UgJ3kyJzpcblx0XHRcdFx0XHRjYXNlICdoZWlnaHQnOlxuXHRcdFx0XHRcdFx0cmV0W3NdID0gY3JvcGRhdGFbc10gLyBpbWFnZWluZm8uaGVpZ2h0XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0cmV0W3NdID0gY3JvcGRhdGFbc107XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHJldDtcblx0XHR9LFxuXG5cdFx0cG9pbnRUb1JlY3RDb29yZHM6ZnVuY3Rpb24oIHBvaW50cyApIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHg6IHBvaW50cy54MSxcblx0XHRcdFx0eTogcG9pbnRzLnkxLFxuXHRcdFx0XHR3aWR0aDogIHBvaW50cy54MiAtIHBvaW50cy54MSxcblx0XHRcdFx0aGVpZ2h0OiBwb2ludHMueTIgLSBwb2ludHMueTFcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0cmVjdFRvUG9pbnRDb29yZHM6ZnVuY3Rpb24oIHJlY3QgKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR4MTogcmVjdC54LFxuXHRcdFx0XHR5MTogcmVjdC55LFxuXHRcdFx0XHR4MjogKHJlY3QubWF4WCA/IHJlY3QubWF4WCA6IHJlY3QueCtyZWN0LndpZHRoKSxcblx0XHRcdFx0eTI6IChyZWN0Lm1heFkgPyByZWN0Lm1heFkgOiByZWN0LnkrcmVjdC5oZWlnaHQpLFxuXHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0dmlldyA6IHt9LFxuXHRcdGNvbnRyb2xsZXIgOiB7fVxuXHR9KTtcblxuXHRleHBvcnRzLm1lZGlhLnJvYm9jcm9wID0gcm9ib2Nyb3A7XG5cbn0pKCB3cCApOyIsIihmdW5jdGlvbih3cCwkKSB7XG5cblx0dmFyIHJvYm9jcm9wIFx0XHQ9IHdwLm1lZGlhLnJvYm9jcm9wLFxuXHRcdGltYWdlX3JhdGlvc1x0PSByb2JvY3JvcC5pbWFnZV9yYXRpb3MsXG5cdFx0aW1hZ2Vfc2l6ZXNcdFx0PSByb2JvY3JvcC5pbWFnZV9zaXplcyxcblx0XHRsMTBuXHRcdFx0PSByb2JvY3JvcC5sMTBuLFxuXHRcdG9wdGlvbnNcdFx0XHQ9IHJvYm9jcm9wLm9wdGlvbnM7XG5cblxuXHQvKipcblx0ICpcdEFuIEltYWdlXG5cdCAqL1xuXHRyb2JvY3JvcC52aWV3LkltZyA9IHdwLm1lZGlhLlZpZXcuZXh0ZW5kKHtcblx0XHRjbGFzc05hbWU6J2F0dGFjaG1lbnQtaW1hZ2UnLFxuXHRcdHRhZ05hbWU6J2ltZycsXG5cdFx0aWQ6J3JvYm9jcm9wLWltYWdlJyxcblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdF8uZGVmYXVsdHMoIHRoaXMub3B0aW9ucywge3NyYzonJ30gKTtcblx0XHRcdHRoaXMuJGVsLm9uKCdsb2FkJyxmdW5jdGlvbigpe1xuXHRcdFx0XHRzZWxmLndpZHRoID0gc2VsZi4kZWwuZ2V0KDApLm5hdHVyYWxXaWR0aDtcblx0XHRcdFx0c2VsZi5oZWlnaHQgPSBzZWxmLiRlbC5nZXQoMCkubmF0dXJhbEhlaWdodDtcblx0XHRcdFx0c2VsZi5yYXRpbyA9IHNlbGYud2lkdGggLyBzZWxmLmhlaWdodDtcblx0XHRcdFx0c2VsZi50cmlnZ2VyKCdsb2FkJyxzZWxmKTtcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy4kZWwuYXR0cignc3JjJywgdGhpcy5vcHRpb25zLnNyYyApO1xuXHRcdH0sXG5cdFx0Z2V0U3JjOiBmdW5jdGlvbihzcmMpIHtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5hdHRyKCAnc3JjJyApO1xuXHRcdH0sXG5cdFx0c2V0U3JjOiBmdW5jdGlvbihzcmMpIHtcblx0XHRcdCEhc3JjICYmIHRoaXMuJGVsLmF0dHIoICdzcmMnLCBzcmMgKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0fSk7XG5cblxuXHQvKipcblx0ICpcdFJhdGlvIHNlbGVjdCBsaXN0XG5cdCAqL1xuXHRyb2JvY3JvcC52aWV3LlJvYm9jcm9wUmF0aW9TZWxlY3QgPSB3cC5tZWRpYS5WaWV3LmV4dGVuZCh7XG5cdFx0Y2xhc3NOYW1lOiAncm9ib2Nyb3Atc2VsZWN0Jyxcblx0XHR0ZW1wbGF0ZTogd3AudGVtcGxhdGUoJ3JvYm9jcm9wLXNlbGVjdCcpLFxuXHRcdGV2ZW50czoge1xuXHRcdFx0J2NsaWNrIFtuYW1lPVwicm9ib2Nyb3Atc2VsZWN0LXJhdGlvXCJdJzogJ3NlbGVjdFJhdGlvJyxcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0d3AuQmFja2JvbmUuVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHRfLmRlZmF1bHRzKHtcblx0XHRcdFx0cmF0aW9zOnt9LFxuXHRcdFx0XHR0b29sczp7fVxuXHRcdFx0fSx0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5vcHRpb25zLmwxMG4gPSBsMTBuO1xuXG5cdFx0fSxcblx0XHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0d3AuQmFja2JvbmUuVmlldy5wcm90b3R5cGUucmVuZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0Xy5lYWNoKCB0aGlzLm9wdGlvbnMudG9vbHMsIGZ1bmN0aW9uKCB0b29sLCBrZXkgKSB7XG5cdFx0XHRcdHNlbGYudmlld3MuYWRkKG5ldyByb2JvY3JvcC52aWV3LlJvYm9jcm9wUmF0aW9TZWxlY3RJdGVtKHtcblx0XHRcdFx0XHRyYXRpb2tleTpcdGtleSxcblx0XHRcdFx0XHRzaXplbmFtZXM6XHRmYWxzZSxcblx0XHRcdFx0XHRyYXRpbzogXHRcdGtleSxcblx0XHRcdFx0XHR0aXRsZTpcdFx0dG9vbC50aXRsZSxcblx0XHRcdFx0XHRlbmFibGVkOiBcdHRydWVcblx0XHRcdFx0fSkpXG5cblx0XHRcdH0pO1xuXHRcdFx0Xy5lYWNoKCB0aGlzLm9wdGlvbnMucmF0aW9zLCBmdW5jdGlvbiggcmF0aW8sIGtleSApIHtcblx0XHRcdFx0dmFyIG5hbWVzID0gW10sXG5cdFx0XHRcdFx0dHBsX3N0ciA9ICc8c3BhbiBjbGFzcz1cInNpemVuYW1lPCU9IGNhbmNyb3AgPyBcIlwiIDogXCIgZGlzYWJsZWRcIiAlPlwiPjwlPSBuYW1lICU+ICg8JT0gd2lkdGggJT7DlzwlPSBoZWlnaHQgJT4pPC9zcGFuPicsXG5cdFx0XHRcdFx0bmFtZV90cGwgPSBfLnRlbXBsYXRlKHRwbF9zdHIpO1xuXHRcdFx0XHRfLmVhY2goIHJhdGlvLnNpemVzLCBmdW5jdGlvbihzaXplbmFtZSxrZXkpIHtcblx0XHRcdFx0XHR2YXIgc2l6ZSA9ICQuZXh0ZW5kKCB0cnVlLCB7XG5cdFx0XHRcdFx0XHRjYW5jcm9wIDpcdChzZWxmLm1vZGVsLmdldCgnd2lkdGgnKSA+PSBpbWFnZV9zaXplc1tzaXplbmFtZV0ud2lkdGgpICYmXG5cdFx0XHRcdFx0XHRcdFx0XHQoc2VsZi5tb2RlbC5nZXQoJ2hlaWdodCcpID49IGltYWdlX3NpemVzW3NpemVuYW1lXS5oZWlnaHQpXG5cdFx0XHRcdFx0fSwgaW1hZ2Vfc2l6ZXNbc2l6ZW5hbWVdKTtcblx0XHRcdFx0XHRpZiAoIHNpemUuY3JvcCApIHtcblx0XHRcdFx0XHRcdG5hbWVzLnB1c2goIG5hbWVfdHBsKCBzaXplICkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRzZWxmLnZpZXdzLmFkZChuZXcgcm9ib2Nyb3Audmlldy5Sb2JvY3JvcFJhdGlvU2VsZWN0SXRlbSh7XG5cdFx0XHRcdFx0cmF0aW9rZXk6XHRrZXksXG5cdFx0XHRcdFx0c2l6ZW5hbWVzOlx0bmFtZXMuam9pbignJyksXG5cdFx0XHRcdFx0cmF0aW86IFx0XHRrZXksXG5cdFx0XHRcdFx0dGl0bGU6XHRcdGtleSArICcgOiAxJyxcblx0XHRcdFx0XHRlbmFibGVkOiBcdChzZWxmLm1vZGVsLmdldCgnd2lkdGgnKSAgPj0gcmF0aW8ubWluX3dpZHRoKSAmJlxuXHRcdFx0XHRcdFx0XHRcdChzZWxmLm1vZGVsLmdldCgnaGVpZ2h0JykgPj0gcmF0aW8ubWluX2hlaWdodClcblx0XHRcdFx0fSkpXG5cdFx0XHR9ICk7XG5cblxuXHRcdH0sXG5cdFx0c2V0U2VsZWN0ZWQ6IGZ1bmN0aW9uKCByYXRpb2tleSApIHtcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tuYW1lPVwicm9ib2Nyb3Atc2VsZWN0LXJhdGlvXCJdW3ZhbHVlPVwiJytyYXRpb2tleSsnXCJdJykucHJvcCgnY2hlY2tlZCcsdHJ1ZSk7XG5cdFx0XHR0aGlzLnNlbGVjdFJhdGlvKCk7XG5cdFx0fSxcblx0XHRnZXRTZWxlY3RlZDogZnVuY3Rpb24oICkge1xuXHRcdFx0cmV0dXJuIHRoaXMuJGVsLmZpbmQoJ1tuYW1lPVwicm9ib2Nyb3Atc2VsZWN0LXJhdGlvXCJdOmNoZWNrZWQnKS52YWwoKTtcblx0XHR9LFxuXHRcdHNlbGVjdFJhdGlvOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRpZiAoIHRoaXMub3B0aW9ucy5yYXRpb3NbIHRoaXMuZ2V0U2VsZWN0ZWQoKSBdICkge1xuXHRcdFx0XHR0aGlzLnRyaWdnZXIoJ3NlbGVjdC1yYXRpbycpO1xuXHRcdFx0fSBlbHNlIGlmICggdGhpcy5vcHRpb25zLnRvb2xzWyB0aGlzLmdldFNlbGVjdGVkKCkgXSApIHtcblx0XHRcdFx0dGhpcy50cmlnZ2VyKCdzZWxlY3QtdG9vbCcpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy50cmlnZ2VyKCdzZWxlY3QnKTtcblx0XHR9XG5cdH0pO1xuXG5cdC8qKlxuXHQgKlx0UmF0aW8gc2VsZWN0IGxpc3QgSXRlbVxuXHQgKi9cblx0cm9ib2Nyb3Audmlldy5Sb2JvY3JvcFJhdGlvU2VsZWN0SXRlbSA9IHdwLm1lZGlhLlZpZXcuZXh0ZW5kKHtcblx0XHRjbGFzc05hbWU6ICdyb2JvY3JvcC1zZWxlY3QtaXRlbScsXG5cdFx0dGVtcGxhdGU6IHdwLnRlbXBsYXRlKCdyb2JvY3JvcC1zZWxlY3QtaXRlbScpLFxuXHRcdHNpemVrZXk6JycsXG5cdFx0c2l6ZW5hbWVzOicnLFxuXHRcdHJhdGlvOjAsXG5cdFx0ZW5hYmxlZDpudWxsLFxuXHRcdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR3cC5CYWNrYm9uZS5WaWV3LnByb3RvdHlwZS5yZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJykucHJvcCgnZGlzYWJsZWQnLCAhIHRoaXMub3B0aW9ucy5lbmFibGVkIClcblx0XHR9XG5cdH0pO1xuXG5cdHJvYm9jcm9wLnZpZXcuUm9ib2Nyb3BJbWFnZSA9IHdwLm1lZGlhLlZpZXcuZXh0ZW5kKHtcblx0XHRjbGFzc05hbWU6XHRcdCdpbWFnZS1yb2JvY3JvcCcsXG5cdFx0dGVtcGxhdGU6XHRcdHdwLnRlbXBsYXRlKCdyb2JvY3JvcCcpLFxuXHRcdGltYWdlX3JhdGlvczpcdGltYWdlX3JhdGlvcyxcblx0XHRpbWFnZV9zaXplczpcdGltYWdlX3NpemVzLFxuXHRcdF9jcm9wcGVyczpcdFx0bnVsbCxcblx0XHRldmVudHM6IHtcblx0XHRcdCdjbGljayAucm9ib2Nyb3AtYXV0b2Nyb3AtY3VycmVudCdcdDogJ2F1dG9jcm9wJyxcblx0XHRcdCdjbGljayAucm9ib2Nyb3AtYXV0b2Nyb3AtYWxsJ1x0XHQ6ICdhdXRvY3JvcEFsbCcsXG5cdFx0fSxcblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbiggb3B0aW9ucyApIHtcblx0XHQvL1x0d3AubWVkaWEudmlldy5FZGl0SW1hZ2UucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0dGhpcy5fY3JvcHBlcnMgXHRcdD0ge307XG5cdFx0XHR0aGlzLmltYWdlIFx0XHRcdD0gbmV3IHJvYm9jcm9wLnZpZXcuSW1nKCB7c3JjOiB0aGlzLm1vZGVsLmdldCgndXJsJykgfSApO1xuXG5cdFx0XHR0aGlzLmNvbnRyb2xsZXIgXHQ9IG9wdGlvbnMuY29udHJvbGxlcjtcblx0XHRcdHRoaXMuZm9jdXNwb2ludHRvb2xcdD0gbmV3IHJvYm9jcm9wLnZpZXcuZm9jdXNwb2ludC5JbWFnZUZvY3VzUG9pbnRTZWxlY3QoeyBpbWFnZTogdGhpcy5pbWFnZSwgZm9jdXNwb2ludDoge3g6MCx5OjB9LCBzcmM6IHRoaXMubW9kZWwuZ2V0KCd1cmwnKSB9KTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMuZm9jdXNwb2ludHRvb2wsICdjaGFuZ2VkJywgdGhpcy51cGRhdGVGb2N1c1BvaW50ICk7XG5cblx0XHRcdHdwLm1lZGlhLlZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdH0sXG5cdFx0ZGlzbWlzczpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhcmVhU2VsZWN0ID0gdGhpcy4kYXJlYVNlbGVjdCgpXG5cdFx0XHRhcmVhU2VsZWN0ICYmIGFyZWFTZWxlY3QucmVtb3ZlKCk7XG5cdFx0XHR0aGlzLiRlbC5yZW1vdmUoKTtcblx0XHR9LFxuXHRcdGNyZWF0ZVNlbGVjdDogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLnNlbGVjdCA9IG5ldyByb2JvY3JvcC52aWV3LlJvYm9jcm9wUmF0aW9TZWxlY3Qoe1xuXHRcdFx0XHRjaG9pY2VzOiBjaG9pY2VzXG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdGhhc0NoYW5nZWQ6IGZ1bmN0aW9uKCl7XG5cdFx0XHR0aGlzLnRyaWdnZXIoICdjaGFuZ2VkJyApO1xuXHRcdH0sXG5cdFx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0d3AubWVkaWEuVmlldy5wcm90b3R5cGUucmVuZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuXHRcdFx0dGhpcy52aWV3cy5zZXQoJy5yb2JvY3JvcC1jb250ZW50JywgdGhpcy5mb2N1c3BvaW50dG9vbCApO1xuXG5cdFx0XHR0aGlzLmZvY3VzcG9pbnR0b29sLnNldEZvY3VzcG9pbnQoIHRoaXMubW9kZWwuZ2V0KCAnZm9jdXNwb2ludCcgKSApO1xuXG5cdFx0XHR0aGlzLmltYWdlLiRlbC5pbWdBcmVhU2VsZWN0KHtcblx0XHRcdFx0cGFyZW50OiBcdFx0dGhpcy5pbWFnZS4kZWwuY2xvc2VzdCgnLnJvYm9jcm9wLWltYWdlLWJveCcpLFxuXHRcdFx0XHRpbnN0YW5jZTpcdCBcdHRydWUsXG5cdFx0XHRcdGhhbmRsZXM6IFx0XHR0cnVlLFxuXHRcdFx0XHRrZXlzOiBcdFx0XHR0cnVlLFxuXHRcdFx0XHRwZXJzaXN0ZW50Olx0XHR0cnVlLFxuXHRcdFx0XHRlbmFibGVkOlx0XHR0cnVlLFxuXHRcdFx0XHRtb3ZhYmxlOlx0XHR0cnVlLFxuXHRcdFx0XHRyZXNpemFibGU6XHRcdHRydWUsXG5cdFx0XHRcdGltYWdlSGVpZ2h0Olx0dGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpLFxuXHRcdFx0XHRpbWFnZVdpZHRoOlx0XHR0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSxcblx0XHRcdFx0b25TZWxlY3RFbmQ6IGZ1bmN0aW9uKCBpbWFnZSwgY29vcmRzICkge1xuXHRcdFx0XHRcdHZhciBjcm9wZGF0YSA9IHJvYm9jcm9wLnBvaW50VG9SZWN0Q29vcmRzKCBjb29yZHMgKVxuXHRcdFx0XHRcdHNlbGYuX3NldENyb3BTaXplcyhjcm9wZGF0YSk7XG5cdFx0XHRcdFx0c2VsZi5oYXNDaGFuZ2VkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHQvLyBzZXQgcmF0aW8gc2VlbGN0XG5cdFx0XHR0aGlzLnNlbGVjdFJhdGlvID0gbmV3IHJvYm9jcm9wLnZpZXcuUm9ib2Nyb3BSYXRpb1NlbGVjdCh7XG5cdFx0XHRcdHRvb2xzOiB7XG5cdFx0XHRcdFx0Zm9jdXNwb2ludCA6IHtcblx0XHRcdFx0XHRcdHRpdGxlOiBsMTBuLlNldEZvY3VzUG9pbnQsXG5cdFx0XHRcdFx0XHR0cmlnZ2VyOiAnZm9jdXNwb2ludCdcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJhdGlvczp0aGlzLmltYWdlX3JhdGlvcyxcblx0XHRcdFx0bW9kZWw6dGhpcy5tb2RlbFxuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLnNlbGVjdFJhdGlvXG5cdFx0XHRcdC5vbignc2VsZWN0LXJhdGlvJywgdGhpcy5vbnNlbGVjdHJhdGlvLCB0aGlzIClcblx0XHRcdFx0Lm9uKCdzZWxlY3QtdG9vbCcsIHRoaXMub25zZWxlY3R0b29sLCB0aGlzIClcblx0XHRcdFx0Lm9uKCdzZWxlY3QnLCB0aGlzLnVwZGF0ZUJ1dHRvbnMsIHRoaXMgKTtcblxuXHRcdFx0dGhpcy52aWV3cy5zZXQoJy5zZWxlY3QtcmF0aW8nLCB0aGlzLnNlbGVjdFJhdGlvICk7XG5cdFx0XHQvLyBzZXRUaW1lb3V0KCBmdW5jdGlvbigpeyB9LDIwKTtcblxuXHRcdFx0Ly8gYnV0dG9uc1xuXHRcdFx0dGhpcy4kYXV0b0J1dHRvblx0PSB0aGlzLiRlbC5maW5kKCcucm9ib2Nyb3AtYXV0b2Nyb3AtY3VycmVudCcpO1xuXHRcdFx0dGhpcy4kYXV0b0FsbEJ1dHRvblx0PSB0aGlzLiRlbC5maW5kKCcucm9ib2Nyb3AtYXV0b2Nyb3AtYWxsJyk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHJlYWR5OiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBjdXJyZW50UmF0aW8sIGZvdW5kO1xuXHRcdFx0d3AubWVkaWEudmlldy5FZGl0SW1hZ2UucHJvdG90eXBlLnJlYWR5LmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuXHRcdFx0aWYgKCAhIF8uaXNVbmRlZmluZWQoIHRoaXMub3B0aW9ucy5zaXplVG9TZWxlY3QgKSApIHtcblx0XHRcdFx0Zm91bmQgPSBfLmZpbmQoIHRoaXMuaW1hZ2VfcmF0aW9zLCBmdW5jdGlvbiggcmF0aW8gKXtcblx0XHRcdFx0XHRyZXR1cm4gcmF0aW8uc2l6ZXMuaW5kZXhPZiggdGhpcy5vcHRpb25zLnNpemVUb1NlbGVjdCApID4gLTE7XG5cdFx0XHRcdH0sIHRoaXMgKTtcblx0XHRcdFx0aWYgKCBmb3VuZCApIHtcblx0XHRcdFx0XHRjdXJyZW50UmF0aW8gPSBmb3VuZC5uYW1lO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmICggXy5pc1VuZGVmaW5lZCggY3VycmVudFJhdGlvICkgKSB7XG5cdFx0XHRcdGN1cnJlbnRSYXRpbyA9ICdmb2N1c3BvaW50JzsvL18uZmlyc3QoXy5rZXlzKCB0aGlzLmltYWdlX3JhdGlvcyApKTtcblx0XHRcdH1cblx0XHRcdHRoaXMuc2VsZWN0UmF0aW8uc2V0U2VsZWN0ZWQoIGN1cnJlbnRSYXRpbyApO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRzYXZlOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHRcdGF0dGFjaG1lbnRzOnt9XG5cdFx0XHRcdH0sIGlkID0gdGhpcy5tb2RlbC5nZXQoJ2lkJyksXG5cdFx0XHRcdCRidG5zID0gdGhpcy4kYXV0b0FsbEJ1dHRvbi5hZGQoIHRoaXMuJGF1dG9CdXR0b24gKS5wcm9wKCAnZGlzYWJsZWQnLCB0cnVlICksXG5cdFx0XHRcdHNlbGYgPSB0aGlzO1xuXHRcdFx0ZGF0YS5hdHRhY2htZW50c1tpZF0gPSB7XG5cdFx0XHRcdHNpemVzOlx0XHR0aGlzLm1vZGVsLmdldCgnc2l6ZXMnKSxcblx0XHRcdFx0Zm9jdXNwb2ludDogdGhpcy5tb2RlbC5nZXQoJ2ZvY3VzcG9pbnQnKVxuXHRcdFx0fTtcblx0XHRcdHRoaXMubW9kZWwuc2F2ZUNvbXBhdCggZGF0YSwge30gKS5kb25lKCBmdW5jdGlvbiggcmVzcCApIHtcblx0XHRcdFx0dmFyIGQgPSBuZXcgRGF0ZSgpO1xuXG5cdFx0XHRcdC8vIGZvcmNlIHJlbG9hZCBpbWFnZSAuLi5cblx0XHRcdFx0Xy5lYWNoKCBzZWxmLm1vZGVsLmF0dHJpYnV0ZXMuc2l6ZXMsIGZ1bmN0aW9uKCBzaXplLCBzaXplbmFtZSApIHtcblx0XHRcdFx0XHR2YXIgc2VsZWN0b3IgPSAgJ2ltZ1tzcmNePVwiJytzaXplLnVybCsnXCJdJyxcblx0XHRcdFx0XHRcdHJlZnJlc2ggPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHQkKHRoaXMpLnJlbW92ZUF0dHIoJ3NyYycpLmF0dHIoICdzcmMnLCBzaXplLnVybCsnPycrZC5nZXRUaW1lKCkgKTtcblx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdHJlZnJlc2hfbWNlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0JCh0aGlzKS5yZW1vdmVBdHRyKCdkYXRhLW1jZS1zcmMnKS5hdHRyKCAnZGF0YS1tY2Utc3JjJywgc2l6ZS51cmwrJz8nK2QuZ2V0VGltZSgpICk7XG5cdFx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHQvLyAuLi4gdW5sZXNzIGl0J3MgZnVsbHNpemUgLi4uXG5cdFx0XHRcdFx0aWYgKCBzaXplbmFtZSAhPT0gJ2Z1bGwnICkge1xuXG5cdFx0XHRcdFx0XHQkKGRvY3VtZW50KS5hZGQoICQoJ2lmcmFtZScpLmNvbnRlbnRzKCkgKVxuXHRcdFx0XHRcdFx0XHQuZmluZCggc2VsZWN0b3IgKVxuXHRcdFx0XHRcdFx0XHQuZWFjaCggcmVmcmVzaCApO1xuXG5cdFx0XHRcdFx0XHQvLyAuLi4gaW5zaWRlIHRpbnltY2UgaWZyYW1lc1xuXHRcdFx0XHRcdFx0JCgnLm1jZS1lZGl0LWFyZWEgaWZyYW1lJykuZWFjaChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHQkKHRoaXMpLmNvbnRlbnRzKClcblx0XHRcdFx0XHRcdFx0XHQuZmluZCggc2VsZWN0b3IgKVxuXHRcdFx0XHRcdFx0XHRcdC5lYWNoKCByZWZyZXNoIClcblx0XHRcdFx0XHRcdFx0XHQuZWFjaCggcmVmcmVzaF9tY2UgKTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSwgc2VsZiApO1xuXHRcdFx0XHQkYnRucy5wcm9wKCAnZGlzYWJsZWQnLCBmYWxzZSApO1xuXHRcdFx0XHRzZWxmLnRyaWdnZXIoICdzYXZlZCcgKTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHR1cGRhdGVCdXR0b25zOiBmdW5jdGlvbigpe1xuXHRcdFx0dmFyIHRvb2xrZXkgPSB0aGlzLnNlbGVjdFJhdGlvLmdldFNlbGVjdGVkKCk7XG5cdFx0XHR0aGlzLiRhdXRvQnV0dG9uLnRvZ2dsZUNsYXNzKCAnaGlkZGVuJywgdG9vbGtleSA9PT0gJ2ZvY3VzcG9pbnQnICk7XG5cdFx0XHR0aGlzLiRhdXRvQWxsQnV0dG9uLnRvZ2dsZUNsYXNzKCAnaGlkZGVuJywgdG9vbGtleSAhPT0gJ2ZvY3VzcG9pbnQnICk7XG5cdFx0fSxcblx0XHRvbnNlbGVjdHRvb2w6IGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgdG9vbGtleSA9IHRoaXMuc2VsZWN0UmF0aW8uZ2V0U2VsZWN0ZWQoKTtcblx0XHRcdHRoaXMuJGFyZWFTZWxlY3QoKS5jYW5jZWxTZWxlY3Rpb24oKTtcblxuXHRcdFx0c3dpdGNoICggdG9vbGtleSApIHtcblx0XHRcdFx0Y2FzZSAnZm9jdXNwb2ludCc6XG5cdFx0XHRcdFx0Ly8gd3JhcCBhcm91bmRcblx0XHRcdFx0XHR0aGlzLmZvY3VzcG9pbnR0b29sLnNldEVuYWJsZWQoIHRydWUgKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9LFxuXHRcdG9uc2VsZWN0cmF0aW86IGZ1bmN0aW9uKCApIHtcblx0XHRcdHRoaXMuZm9jdXNwb2ludHRvb2wuc2V0RW5hYmxlZCggZmFsc2UgKTtcblxuXHRcdFx0LyoqXG5cdFx0XHQgKlx0T24gc3dpdGNoIHJhdGlvXG5cdFx0XHQgKi9cblx0XHRcdHZhciByYXRpb2tleSA9IHRoaXMuc2VsZWN0UmF0aW8uZ2V0U2VsZWN0ZWQoKSxcblx0XHRcdFx0c2l6ZXMgPSB0aGlzLm1vZGVsLmdldCgnc2l6ZXMnKSxcblx0XHRcdFx0ZmFjdG9yLCByZWN0LCBjcm9wZGF0YSwgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHMsIGFyZWFTZWxlY3RPcHRpb25zLFxuXHRcdFx0XHRpbWdXaWR0aCAgPSB0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSxcblx0XHRcdFx0aW1nSGVpZ2h0ID0gdGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpO1xuXG5cdFx0XHR0aGlzLmN1cnJlbnRfcmF0aW8gPSB0aGlzLmltYWdlX3JhdGlvc1tyYXRpb2tleV07XG5cblx0XHRcdGFyZWFTZWxlY3RPcHRpb25zID0ge1xuXHRcdFx0XHRhc3BlY3RSYXRpbzpcdHRoaXMuY3VycmVudF9yYXRpby5yYXRpbyArICc6MScsXG5cdFx0XHRcdG1pbldpZHRoOlx0XHR0aGlzLmN1cnJlbnRfcmF0aW8ubWluX3dpZHRoLFxuXHRcdFx0XHRtaW5IZWlnaHQ6XHRcdHRoaXMuY3VycmVudF9yYXRpby5taW5faGVpZ2h0XG5cdFx0XHR9O1xuXG5cdFx0XHRfLmVhY2godGhpcy5jdXJyZW50X3JhdGlvLnNpemVzLCBmdW5jdGlvbihzaXplKXtcblx0XHRcdFx0aWYgKCAhIGNyb3BkYXRhICYmICEhIHNpemVzW3NpemVdICYmICEhIHNpemVzW3NpemVdLmNyb3BkYXRhICkge1xuXHRcdFx0XHRcdGNyb3BkYXRhID0gc2l6ZXNbc2l6ZV0uY3JvcGRhdGE7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBpbWFnZV9zaXplc1tzaXplXS53aWR0aCA8PSBpbWdXaWR0aCAmJiBpbWFnZV9zaXplc1tzaXplXS5oZWlnaHQgPD0gaW1nSGVpZ2h0ICkge1xuXHRcdFx0XHRcdGFyZWFTZWxlY3RPcHRpb25zLm1pbldpZHRoICA9IE1hdGgubWF4KCBhcmVhU2VsZWN0T3B0aW9ucy5taW5XaWR0aCwgIGltYWdlX3NpemVzW3NpemVdLndpZHRoICk7XG5cdFx0XHRcdFx0YXJlYVNlbGVjdE9wdGlvbnMubWluSGVpZ2h0ID0gTWF0aC5tYXgoIGFyZWFTZWxlY3RPcHRpb25zLm1pbkhlaWdodCwgaW1hZ2Vfc2l6ZXNbc2l6ZV0uaGVpZ2h0ICk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoICFjcm9wZGF0YSApIHtcblx0XHRcdFx0Ly8gd3AgZGVmYXVsdCBjcm9wZGF0YVxuXHRcdFx0XHR2YXIgc2NhbGUgPSBNYXRoLm1pbiggdGhpcy5tb2RlbC5nZXQoJ3dpZHRoJykgLyB0aGlzLmN1cnJlbnRfcmF0aW8ucmF0aW8sIHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKSk7XG5cblx0XHRcdFx0cmVjdCA9IHtcblx0XHRcdFx0XHR4OjAsXG5cdFx0XHRcdFx0eTowLFxuXHRcdFx0XHRcdHdpZHRoOiAgc2NhbGUgKiB0aGlzLmN1cnJlbnRfcmF0aW8ucmF0aW8sXG5cdFx0XHRcdFx0aGVpZ2h0OiBzY2FsZVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRyZWN0LnggPSAodGhpcy5tb2RlbC5nZXQoJ3dpZHRoJykgLSByZWN0LndpZHRoKS8yO1xuXHRcdFx0XHRyZWN0LnkgPSAodGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpIC0gcmVjdC5oZWlnaHQpLzI7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZWN0ID0ge307XG5cblx0XHRcdFx0Xy5leHRlbmQocmVjdCxjcm9wZGF0YSk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuJGFyZWFTZWxlY3QoKS5zZXRPcHRpb25zKCBhcmVhU2VsZWN0T3B0aW9ucyApO1xuXHRcdFx0aWYgKCAhIHRoaXMuaW1hZ2UuJGVsLmdldCgwKS5jb21wbGV0ZSApIHtcblx0XHRcdFx0dGhpcy5pbWFnZS4kZWwub24oJ2xvYWQnLGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNlbGYuc2VsZWN0Q3JvcChyZWN0KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLnNlbGVjdENyb3AocmVjdCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGF1dG9jcm9wOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHQvLyBjcm9wIGJ5IGZvY3VzIHBvaW50XG5cblx0XHRcdHZhciBjcm9wZGF0YSwgaW1hZ2VpbmZvID0ge1xuXHRcdFx0XHRcdHdpZHRoOlx0XHR0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSxcblx0XHRcdFx0XHRoZWlnaHQ6XHRcdHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKSxcblx0XHRcdFx0XHRmb2N1c3BvaW50Olx0dGhpcy5tb2RlbC5nZXQoJ2ZvY3VzcG9pbnQnKVxuXHRcdFx0XHR9O1xuXHRcdFx0Y3JvcGRhdGEgPSByb2JvY3JvcC5jcm9wRnJvbUZvY3VzUG9pbnQoIGltYWdlaW5mbywgdGhpcy5jdXJyZW50X3JhdGlvICk7XG5cdFx0XHRjcm9wZGF0YSA9IHJvYm9jcm9wLnJlbFRvQWJzQ29vcmRzKCBjcm9wZGF0YSwgaW1hZ2VpbmZvICk7XG5cblx0XHRcdHRoaXMuX3NldENyb3BTaXplcyggY3JvcGRhdGEgKTtcblx0XHRcdHRoaXMuc2VsZWN0Q3JvcCggY3JvcGRhdGEgKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRhdXRvY3JvcEFsbDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRpbWFnZWluZm8gPSB7XG5cdFx0XHRcdFx0d2lkdGg6XHRcdHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLFxuXHRcdFx0XHRcdGhlaWdodDpcdFx0dGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpLFxuXHRcdFx0XHRcdGZvY3VzcG9pbnQ6XHR0aGlzLm1vZGVsLmdldCgnZm9jdXNwb2ludCcpXG5cdFx0XHRcdH07XG5cblx0XHRcdF8uZWFjaCggdGhpcy5pbWFnZV9yYXRpb3MsIGZ1bmN0aW9uKCByYXRpbyApIHtcblx0XHRcdFx0dmFyIGNyb3BkYXRhO1xuXHRcdFx0XHRjcm9wZGF0YSA9IHJvYm9jcm9wLmNyb3BGcm9tRm9jdXNQb2ludCggaW1hZ2VpbmZvLCByYXRpbyApO1xuXHRcdFx0XHRjcm9wZGF0YSA9IHJvYm9jcm9wLnJlbFRvQWJzQ29vcmRzKCBjcm9wZGF0YSwgaW1hZ2VpbmZvICk7XG5cdFx0XHRcdHNlbGYuX3NldENyb3BTaXplcyggY3JvcGRhdGEsIHJhdGlvICk7XG5cdFx0XHR9ICk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0c2VsZWN0Q3JvcDpmdW5jdGlvbiggcmVjdCApIHtcblx0XHRcdC8vIGRyYXcgY3JvcCBVSSBlbGVtZW50LlxuXHRcdFx0dmFyIGZhY3RvciA9IHRoaXMuX2ltYWdlX3NjYWxlX2ZhY3RvcigpLFxuXHRcdFx0XHRwb2ludHMgPSByb2JvY3JvcC5yZWN0VG9Qb2ludENvb3JkcyggcmVjdCApLFxuXHRcdFx0XHQkYXJlYVNlbGVjdCA9IHRoaXMuJGFyZWFTZWxlY3QoKTtcblxuXHRcdFx0JGFyZWFTZWxlY3Quc2V0U2VsZWN0aW9uKCBwb2ludHMueDEsIHBvaW50cy55MSwgcG9pbnRzLngyLCBwb2ludHMueTIsIGZhbHNlICk7XG5cdFx0XHQkYXJlYVNlbGVjdC5zZXRPcHRpb25zKCB7c2hvdzp0cnVlfSApO1xuXHRcdFx0JGFyZWFTZWxlY3QudXBkYXRlKCk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdCRhcmVhU2VsZWN0IDogZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB0aGlzLmltYWdlLiRlbC5kYXRhKCdpbWdBcmVhU2VsZWN0Jyk7XG5cdFx0fSxcblx0XHRfaW1hZ2Vfc2NhbGVfZmFjdG9yIDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgJGNvbnRhaW5lciA9IHRoaXMuaW1hZ2UuJGVsLmNsb3Nlc3QoJy5yb2JvY3JvcC1pbWFnZS1ib3gnKSxcblx0XHRcdFx0dyA9IE1hdGgubWluKHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLCRjb250YWluZXIud2lkdGgoKSksXG5cdFx0XHRcdGggPSBNYXRoLm1pbih0aGlzLm1vZGVsLmdldCgnaGVpZ2h0JyksJGNvbnRhaW5lci5oZWlnaHQoKSk7XG5cblx0XHRcdHJldHVybiBNYXRoLm1pbiggdyAvIHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLCBoIC8gdGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpICk7XG5cdFx0fSxcblx0XHR1cGRhdGVGb2N1c1BvaW50OiBmdW5jdGlvbiggKSB7XG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2ZvY3VzcG9pbnQnLCB0aGlzLmZvY3VzcG9pbnR0b29sLmdldEZvY3VzcG9pbnQoKSApO1xuXHRcdH0sXG5cdFx0X3NldENyb3BTaXplcyA6IGZ1bmN0aW9uKCBjcm9wZGF0YSwgcmF0aW8gKSB7XG5cdFx0XHR2YXIgdyA9IHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLFxuXHRcdFx0XHRoID0gdGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpLFxuXHRcdFx0XHRtb2RlbFNpemVzID0gdGhpcy5tb2RlbC5nZXQoJ3NpemVzJyksXG5cdFx0XHRcdHJhdGlvID0gcmF0aW8gfHwgdGhpcy5jdXJyZW50X3JhdGlvO1xuXG5cdFx0XHRfLmVhY2gocmF0aW8uc2l6ZXMsIGZ1bmN0aW9uKCBzaXplbmFtZSApIHtcblx0XHRcdFx0Ly8qXG5cdFx0XHRcdHZhciBjYW5jcm9wID1cdCh3ID49IGltYWdlX3NpemVzW3NpemVuYW1lXS53aWR0aCkgJiZcblx0XHRcdFx0XHRcdFx0XHQoaCA+PSBpbWFnZV9zaXplc1tzaXplbmFtZV0uaGVpZ2h0KTtcblxuXHRcdFx0XHRpZiAoIGNhbmNyb3AgJiYgaW1hZ2Vfc2l6ZXNbc2l6ZW5hbWVdLmNyb3AgKSB7XG5cdFx0XHRcdFx0bW9kZWxTaXplc1sgc2l6ZW5hbWUgXS5jcm9wZGF0YSA9IGNyb3BkYXRhO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIG1vZGVsU2l6ZXNbIHNpemVuYW1lIF0gKSB7XG5cdFx0XHRcdFx0ZGVsZXRlKCBtb2RlbFNpemVzWyBzaXplbmFtZSBdICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0LyovXG5cdFx0XHRcdCEgbW9kZWxTaXplc1sgc2l6ZW5hbWUgXSAmJiAoIG1vZGVsU2l6ZXNbIHNpemVuYW1lIF0gPSB7fSApO1xuXHRcdFx0XHRtb2RlbFNpemVzWyBzaXplbmFtZSBdLmNyb3BkYXRhID0gY3JvcGRhdGE7XG5cdFx0XHRcdC8vKi9cblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdzaXplcycsIG1vZGVsU2l6ZXMgKTtcblx0XHR9LFxuXHRcdF9nZXRSZWxhdGl2ZUNvb3JkczogZnVuY3Rpb24oIGNvb3JkcyApIHtcblx0XHRcdHZhciB3ID0gdGhpcy5tb2RlbC5nZXQoJ3dpZHRoJyksXG5cdFx0XHRcdGggPSB0aGlzLm1vZGVsLmdldCgnaGVpZ2h0Jyk7XG5cdFx0XHRmb3IgKCB2YXIgcyBpbiBjb29yZHMgKSB7XG5cdFx0XHRcdGlmICggJ251bWJlcic9PT10eXBlb2YoY29vcmRzW3NdKSApIHtcblx0XHRcdFx0XHRzd2l0Y2ggKHMpIHtcblx0XHRcdFx0XHRcdGNhc2UgJ3gnOlxuXHRcdFx0XHRcdFx0Y2FzZSAneDEnOlxuXHRcdFx0XHRcdFx0Y2FzZSAneDInOlxuXHRcdFx0XHRcdFx0Y2FzZSAnd2lkdGgnOlxuXHRcdFx0XHRcdFx0Y2FzZSAnbWluWCc6XG5cdFx0XHRcdFx0XHRjYXNlICdtYXhYJzpcblx0XHRcdFx0XHRcdFx0Y29vcmRzW3NdIC89IHc7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0Y29vcmRzW3NdIC89IGg7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cdFx0X2dldEFic29sdXRlQ29vcmRzOiBmdW5jdGlvbiggY29vcmRzICkge1xuXHRcdFx0dmFyIHcgPSB0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSxcblx0XHRcdFx0aCA9IHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKTtcblx0XHRcdGZvciAoIHZhciBzIGluIGNvb3JkcyApIHtcblx0XHRcdFx0aWYgKCAnbnVtYmVyJz09PXR5cGVvZihjb29yZHNbc10pICkge1xuXHRcdFx0XHRcdHN3aXRjaCAocykge1xuXHRcdFx0XHRcdFx0Y2FzZSAneCc6XG5cdFx0XHRcdFx0XHRjYXNlICd4MSc6XG5cdFx0XHRcdFx0XHRjYXNlICd4Mic6XG5cdFx0XHRcdFx0XHRjYXNlICd3aWR0aCc6XG5cdFx0XHRcdFx0XHRjYXNlICdtaW5YJzpcblx0XHRcdFx0XHRcdGNhc2UgJ21heFgnOlxuXHRcdFx0XHRcdFx0XHRjb29yZHNbc10gKj0gdztcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHRjb29yZHNbc10gKj0gaDtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0pO1xuXG5cblxuXG5cdHJvYm9jcm9wLnZpZXcuRnJhbWUgPSB3cC5tZWRpYS52aWV3Lk1lZGlhRnJhbWUuZXh0ZW5kKHtcblx0XHR0ZW1wbGF0ZTogIHdwLnRlbXBsYXRlKCdyb2JvY3JvcC1tb2RhbCcpLFxuXHRcdHJlZ2lvbnM6ICAgWyd0aXRsZScsJ2NvbnRlbnQnLCdpbnN0cnVjdGlvbnMnLCdidXR0b25zJywncmF0aW9zJ11cblx0fSk7XG5cblx0cm9ib2Nyb3Audmlldy5GcmFtZS5Dcm9wID0gcm9ib2Nyb3Audmlldy5GcmFtZS5leHRlbmQoe1xuXHRcdGV2ZW50czoge1xuXHRcdFx0J2NsaWNrIC5yb2JvY3JvcC1zYXZlJ1x0XHQ6ICdzYXZlJyxcblx0XHRcdCdjbGljayAucm9ib2Nyb3AtY2FuY2VsJ1x0OiAnY2xvc2UnLFxuXHRcdH0sXG5cdFx0c2F2ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLiQoJy5yb2JvY3JvcC1zYXZlLCAucm9ib2Nyb3AtY2FuY2VsJykucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0dGhpcy5fY29udGVudC5zYXZlKCk7XG5cdFx0fSxcblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbiggb3B0aW9ucyApIHtcblx0XHRcdHJvYm9jcm9wLnZpZXcuRnJhbWUucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXG5cdFx0XHR0aGlzLmNyZWF0ZVRpdGxlKCk7XG5cdFx0XHR0aGlzLmNyZWF0ZUNvbnRlbnQoKTtcblx0XHRcdHRoaXMuY3JlYXRlQnV0dG9ucygpO1xuXG5cdFx0XHR0aGlzLm9uKCdjbG9zZScsIHRoaXMuZGlzbWlzcywgdGhpcyApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5fY29udGVudCwgJ3NhdmVkJywgdGhpcy5tb2RlbFN5bmMgKTtcblx0XHR9LFxuXHRcdG1vZGVsU3luYzogZnVuY3Rpb24oKXtcblx0XHRcdHRoaXMuJCgnLnJvYm9jcm9wLXNhdmUsIC5yb2JvY3JvcC1jYW5jZWwnKS5wcm9wKCAnZGlzYWJsZWQnLCBmYWxzZSApO1xuXHRcdH0sXG5cdFx0ZGlzbWlzczpmdW5jdGlvbigpe1xuXHRcdFx0dGhpcy5fY29udGVudC5kaXNtaXNzKCk7XG5cdFx0fSxcblx0XHRjcmVhdGVUaXRsZTogZnVuY3Rpb24oICkge1xuXHRcdFx0dGhpcy5fdGl0bGUgPSBuZXcgd3AubWVkaWEuVmlldyh7XG5cdFx0XHRcdHRhZ05hbWU6ICdoMSdcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5fdGl0bGUuJGVsLnRleHQoIGwxMG4uQXR0YWNobWVudERldGFpbHMgKTtcblx0XHRcdHRoaXMudGl0bGUuc2V0KCBbIHRoaXMuX3RpdGxlIF0gKTtcblx0XHR9LFxuXHRcdGNyZWF0ZUNvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG9wdHMgPSBfLmV4dGVuZCh7XG5cdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMuY29udHJvbGxlcixcblx0XHRcdFx0bW9kZWw6IHRoaXMubW9kZWxcblx0XHRcdH0sIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5fY29udGVudCA9IG5ldyByb2JvY3JvcC52aWV3LlJvYm9jcm9wSW1hZ2UoIG9wdHMgKTtcblx0XHRcdHRoaXMuY29udGVudC5zZXQoIFsgdGhpcy5fY29udGVudCBdICk7XG5cdFx0fSxcblx0XHRjcmVhdGVCdXR0b25zOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpbmZvLCBidG47XG5cblx0XHRcdHRoaXMuYnV0dG9ucy5zZXQoIFtcblx0XHRcdFx0bmV3IHdwLm1lZGlhLnZpZXcuQnV0dG9uKHtcblx0XHRcdFx0XHR0ZXh0OiBsMTBuLkNsb3NlLFxuXHRcdFx0XHRcdGNsYXNzTmFtZTogJ2J1dHRvbi1zZWNvbmRhcnkgcm9ib2Nyb3AtY2FuY2VsJ1xuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IHdwLm1lZGlhLnZpZXcuQnV0dG9uKHtcblx0XHRcdFx0XHR0ZXh0OiBsMTBuLlNhdmVDaGFuZ2VzLFxuXHRcdFx0XHRcdGNsYXNzTmFtZTogJ2J1dHRvbi1wcmltYXJ5IHJvYm9jcm9wLXNhdmUnXG5cdFx0XHRcdH0pXG5cdFx0XHRdICk7XG5cdFx0fVxuXHR9KTtcblxuXG5cblxufSkod3AsalF1ZXJ5KTtcbiIsIihmdW5jdGlvbih3cCwkKSB7XG5cblx0dmFyIHJvYm9jcm9wID0gd3AubWVkaWEucm9ib2Nyb3AsXG5cdFx0aW1hZ2VfcmF0aW9zID0gcm9ib2Nyb3AuaW1hZ2VfcmF0aW9zLFxuXHRcdGltYWdlX3NpemVzICA9IHJvYm9jcm9wLmltYWdlX3NpemVzLFxuXHRcdGwxMG4gPSByb2JvY3JvcC5sMTBuO1xuXG5cdHZhciBWaWV3XHRcdD0gd3AubWVkaWEuVmlldyxcblx0XHRNZWRpYUZyYW1lXHQ9IHdwLm1lZGlhLnZpZXcuTWVkaWFGcmFtZSxcblx0XHRGb2N1c1BvaW50LFxuXHRcdENyb3BSZWN0O1xuXG5cdHJvYm9jcm9wLnZpZXcuZm9jdXNwb2ludCA9IHt9O1xuXG5cdENyb3BSZWN0ID0gcm9ib2Nyb3Audmlldy5mb2N1c3BvaW50LkNyb3BSZWN0ID0gVmlldy5leHRlbmQoe1xuXHRcdHRlbXBsYXRlOiB3cC50ZW1wbGF0ZSgnY3JvcHJlY3QnKSxcblx0XHRjbGFzc05hbWU6XHQndG9vbC1jcm9wcmVjdCcsXG5cdFx0Y29udHJvbGxlcjpudWxsLFxuXHRcdGV2ZW50czoge1xuXHRcdFx0J21vdXNlZW50ZXIgLmxhYmVsJyA6ICdzaG93SGlsaXRlJyxcblx0XHRcdCdtb3VzZWxlYXZlIC5sYWJlbCcgOiAnaGlkZUhpbGl0ZScsXG5cdFx0fSxcblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdFZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG5cdFx0XHRfLmRlZmF1bHRzKCB0aGlzLm9wdGlvbnMsIHtcblx0XHRcdFx0Zm9jdXNwb2ludDogbnVsbCwgLy8gZm9jdXNwb2ludCBjb29yZHNcblx0XHRcdFx0cmF0aW86IG51bGxcblx0XHRcdH0gKTtcblxuXHRcdFx0dGhpcy5vcHRpb25zLmxhYmVsID0gdGhpcy5vcHRpb25zLnJhdGlvLm5hbWUgKyAnIDogMSc7XG5cblx0XHRcdHRoaXMuY29udHJvbGxlciA9IHRoaXMub3B0aW9ucy5jb250cm9sbGVyO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5jb250cm9sbGVyLmltYWdlLCAnbG9hZCcsIHRoaXMuaW1hZ2VMb2FkZWQgKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRpbWFnZUxvYWRlZDpmdW5jdGlvbiggaW1hZ2UgKSB7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCAnZGF0YS1kaXInLCB0aGlzLm9wdGlvbnMucmF0aW8ucmF0aW8gPiBpbWFnZS5yYXRpbyA/ICd3JyA6ICdoJyApO1xuXHRcdFx0dGhpcy4kZWwuY3NzKCAnd2lkdGgnLCBNYXRoLm1pbiggMSwgdGhpcy5vcHRpb25zLnJhdGlvLnJhdGlvIC8gaW1hZ2UucmF0aW8gKSAqIDEwMCArJyUnICk7XG5cdFx0XHR0aGlzLnNldEZvY3VzcG9pbnQoICk7XG5cdFx0XHQvLyBzZXQgcG9zaXRpb24gZnJvbSBmb3N1c3BvaW50XG5cdFx0fSxcblx0XHRzZXRGb2N1c3BvaW50OmZ1bmN0aW9uKCBmb2N1c3BvaW50ICkge1xuXHRcdFx0aWYgKCAhIWZvY3VzcG9pbnQgKSB7XG5cdFx0XHRcdHRoaXMub3B0aW9ucy5mb2N1c3BvaW50ID0gZm9jdXNwb2ludDtcblx0XHRcdH1cblx0XHRcdHZhciBpbWFnZWluZm8gPSB7XG5cdFx0XHRcdFx0d2lkdGhcdFx0OiB0aGlzLmNvbnRyb2xsZXIuaW1hZ2UuJGVsLndpZHRoKCksXG5cdFx0XHRcdFx0aGVpZ2h0XHRcdDogdGhpcy5jb250cm9sbGVyLmltYWdlLiRlbC5oZWlnaHQoKSxcblx0XHRcdFx0XHRmb2N1c3BvaW50XHQ6IHRoaXMub3B0aW9ucy5mb2N1c3BvaW50LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRyZXMgPSByb2JvY3JvcC5jcm9wRnJvbUZvY3VzUG9pbnQoIGltYWdlaW5mbywgdGhpcy5vcHRpb25zLnJhdGlvICksXG5cdFx0XHRcdGNvb3JkID0gcm9ib2Nyb3AucmVsVG9BYnNDb29yZHMoIHJlcywgaW1hZ2VpbmZvICk7XG4gXHRcdFx0dGhpcy4kZWwuY3NzKCdsZWZ0Jyxjb29yZC54ICsgJ3B4JyApO1xuIFx0XHRcdHRoaXMuJGVsLmNzcygndG9wJyxjb29yZC55ICsgJ3B4JyApO1xuIFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0c2hvd0hpbGl0ZTogZnVuY3Rpb24oZSl7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWhpbGl0ZScsJ3RydWUnKTtcblx0XHRcdHRoaXMudHJpZ2dlcignaGlsaXRlOnNob3cnKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0aGlkZUhpbGl0ZTogZnVuY3Rpb24oZSl7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWhpbGl0ZScsJ2ZhbHNlJyk7XG5cdFx0XHR0aGlzLnRyaWdnZXIoJ2hpbGl0ZTpoaWRlJyk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdH0pO1xuXG5cdEZvY3VzUG9pbnQgPSByb2JvY3JvcC52aWV3LmZvY3VzcG9pbnQuRm9jdXNQb2ludCA9IFZpZXcuZXh0ZW5kKHtcblx0XHRjbGFzc05hbWU6XHQndG9vbC1mb2N1c3BvaW50Jyxcblx0XHR0ZW1wbGF0ZTpcdHdwLnRlbXBsYXRlKCdmb2N1c3BvaW50JyksXG5cdFx0bGFiZWxWaWV3Olx0XHRudWxsLFxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHRfLmRlZmF1bHRzKCB0aGlzLm9wdGlvbnMsIHtcblx0XHRcdFx0Zm9jdXNwb2ludDp7eDowLHk6MH0sXG5cdFx0XHRcdGVuYWJsZWQ6IGZhbHNlICxcblx0XHRcdFx0Y3JvcFJlY3RzOltdXG5cdFx0XHR9ICk7XG5cdFx0XHR0aGlzLm9wdGlvbnMuY3JvcFJlY3RzLnNvcnQoZnVuY3Rpb24oYSxiKXtcblx0XHRcdFx0cmV0dXJuIGIub3B0aW9ucy5yYXRpby5yYXRpbyAtIGEub3B0aW9ucy5yYXRpby5yYXRpbztcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLiRlbC5vbignY2xpY2snLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdHNlbGYuY2xpY2tGb2N1c3BvaW50KCBldmVudCApO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHJlbmRlcjpmdW5jdGlvbigpe1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0Vmlldy5wcm90b3R5cGUucmVuZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdF8uZWFjaCggdGhpcy5vcHRpb25zLmNyb3BSZWN0cywgZnVuY3Rpb24oIHJlY3QgKXtcblx0XHRcdFx0cmVjdC5yZW5kZXIoKTtcblx0XHRcdFx0c2VsZi4kZWwuYXBwZW5kKCByZWN0LiRlbCApO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHNldEVuYWJsZWQ6IGZ1bmN0aW9uKCBlbmFibGVkICkge1xuXHRcdFx0dmFyIHByZXYgPSB0aGlzLm9wdGlvbnMuZW5hYmxlZDtcblx0XHRcdHRoaXMub3B0aW9ucy5lbmFibGVkID0gZW5hYmxlZDtcblx0XHRcdHRoaXMuJGVsLmF0dHIoICdkYXRhLWVuYWJsZWQnLCBlbmFibGVkLnRvU3RyaW5nKCkgKTtcblx0XHRcdHJldHVybiBwcmV2O1xuXHRcdH0sXG5cdFx0Y2xpY2tGb2N1c3BvaW50OiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgb2Zmcztcblx0XHRcdGlmICggdGhpcy5vcHRpb25zLmVuYWJsZWQgKSB7XG5cdFx0XHRcdG9mZnMgPSB0aGlzLiRlbC5vZmZzZXQoKTtcblx0XHRcdFx0dGhpcy5zZXRGb2N1c3BvaW50KCB7XG5cdFx0XHRcdFx0eDogIDIgKiAoZXZlbnQucGFnZVggLSBvZmZzLmxlZnQgKSAvIHRoaXMuJGVsLndpZHRoKCkgIC0gMSxcblx0XHRcdFx0XHR5OiAtMiAqIChldmVudC5wYWdlWSAtIG9mZnMudG9wICkgLyB0aGlzLiRlbC5oZWlnaHQoKSArIDEsXG5cdFx0XHRcdH0gKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGdldEZvY3VzcG9pbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZm9jdXNwb2ludDtcblx0XHR9LFxuXHRcdHNldEZvY3VzcG9pbnQ6IGZ1bmN0aW9uKCBmb2N1c3BvaW50ICkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHR0aGlzLmZvY3VzcG9pbnQgPSBmb2N1c3BvaW50O1xuXG5cdFx0XHR0aGlzLiRlbC5maW5kKCcuZm9jdXNwb2ludCcpLmNzcyh7XG5cdFx0XHRcdGxlZnQ6IFx0KChmb2N1c3BvaW50LnggKyAxKSAqIDUwKSsnJScsXG5cdFx0XHRcdGJvdHRvbTpcdCgoZm9jdXNwb2ludC55ICsgMSkgKiA1MCkrJyUnXG5cdFx0XHR9KTtcblxuXHRcdFx0Xy5lYWNoKCB0aGlzLm9wdGlvbnMuY3JvcFJlY3RzLCBmdW5jdGlvbihyZWN0KXtcblx0XHRcdFx0cmVjdC5zZXRGb2N1c3BvaW50KCBzZWxmLmZvY3VzcG9pbnQgKTtcblx0XHRcdH0pO1xuXHRcdFx0aWYgKCB0aGlzLm9wdGlvbnMuZW5hYmxlZCApIHtcblx0XHRcdFx0dGhpcy50cmlnZ2VyKCdjaGFuZ2U6Zm9jdXNwb2ludCcsIHRoaXMuZm9jdXNwb2ludCApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0fSk7XG5cblx0cm9ib2Nyb3Audmlldy5mb2N1c3BvaW50LkltYWdlRm9jdXNQb2ludFNlbGVjdCA9IFZpZXcuZXh0ZW5kKHtcblx0XHRjbGFzc05hbWU6XHQncm9ib2Nyb3AtaW1hZ2UtYm94Jyxcblx0XHRjcm9wUmVjdHM6IFtdLFxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKCApe1xuXG5cdFx0XHRfLmRlZmF1bHRzKCB0aGlzLm9wdGlvbnMsIHtcblx0XHRcdFx0Y29udHJvbGxlcjogdGhpcyxcblx0XHRcdFx0Zm9jdXNwb2ludDoge3g6MCx5OjB9LFxuXHRcdFx0XHRzcmM6IGZhbHNlLFxuXHRcdFx0XHRpbWFnZTogZmFsc2UsXG5cdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxuXHRcdFx0fSApO1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdGlmICggdGhpcy5vcHRpb25zLmltYWdlICE9PSBmYWxzZSAmJiAodGhpcy5vcHRpb25zLmltYWdlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PSByb2JvY3JvcC52aWV3LkltZy5wcm90b3R5cGUgKSApIHtcblx0XHRcdFx0dGhpcy5pbWFnZSA9IHRoaXMub3B0aW9ucy5pbWFnZTtcblx0XHRcdH0gZWxzZSBpZiAoIHRoaXMub3B0aW9ucy5zcmMgIT09IGZhbHNlICkge1xuXHRcdFx0XHR0aGlzLmltYWdlXHQ9IG5ldyByb2JvY3JvcC52aWV3LkltZyggeyBzcmM6IHRoaXMub3B0aW9ucy5zcmMgfSk7XG5cdFx0XHR9IGVsc2UgIHtcblx0XHRcdFx0dGhpcy5pbWFnZSA9IG5ldyByb2JvY3JvcC52aWV3LkltZyggeyBzcmM6ICcnIH0sIHRoaXMub3B0aW9ucy5pbWFnZSk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuY3JvcFJlY3RzID0gW107XG5cdFx0XHRfLmVhY2goIGltYWdlX3JhdGlvcywgZnVuY3Rpb24oIHJhdGlvLCBrZXkgKSB7XG5cdFx0XHRcdHZhciByZWN0ID0gbmV3IENyb3BSZWN0KCB7XG5cdFx0XHRcdFx0Y29udHJvbGxlcjogc2VsZixcblx0XHRcdFx0XHRmb2N1c3BvaW50OiBzZWxmLm9wdGlvbnMuZm9jdXNwb2ludCxcblx0XHRcdFx0XHRyYXRpbzogcmF0aW9cblx0XHRcdFx0fSApO1xuXHRcdFx0XHRzZWxmLmxpc3RlblRvKHJlY3QsJ2hpbGl0ZTpzaG93JyxzZWxmLnNob3dIaWxpdGUgKTtcblx0XHRcdFx0c2VsZi5saXN0ZW5UbyhyZWN0LCdoaWxpdGU6aGlkZScsc2VsZi5oaWRlSGlsaXRlICk7XG5cdFx0XHRcdHNlbGYuY3JvcFJlY3RzLnB1c2goIHJlY3QgKTtcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLmZvY3VzcG9pbnRcdD0gbmV3IEZvY3VzUG9pbnQoe1xuXHRcdFx0XHRjb250cm9sbGVyOiB0aGlzLmNvbnRyb2xsZXIsXG5cdFx0XHRcdGZvY3VzcG9pbnQ6IHRoaXMub3B0aW9ucy5mb2N1c3BvaW50LFxuXHRcdFx0XHRlbmFibGVkOiBcdHRoaXMub3B0aW9ucy5lbmFibGVkLFxuXHRcdFx0XHRjcm9wUmVjdHM6XHR0aGlzLmNyb3BSZWN0cyxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLmZvY3VzcG9pbnQsICdjaGFuZ2U6Zm9jdXNwb2ludCcsIHRoaXMudmFsdWVDaGFuZ2VkICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLmltYWdlLCAnbG9hZCcsIHRoaXMuc2V0SGVpZ2h0ICk7XG5cblx0XHRcdHRoaXMudmlld3Muc2V0KCBbIHRoaXMuaW1hZ2UsIHRoaXMuZm9jdXNwb2ludCBdICk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0c2V0SGVpZ2h0OmZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgbmV3SGVpZ2h0ID0gTWF0aC5taW4oIHRoaXMuJGVsLnBhcmVudCgpLmhlaWdodCgpLCB0aGlzLmltYWdlLiRlbC5oZWlnaHQoKSApO1xuXHRcdFx0dGhpcy4kZWwuaGVpZ2h0KCBuZXdIZWlnaHQgKVxuXHRcdH0sXG5cdFx0c2V0RW5hYmxlZDogZnVuY3Rpb24oIGVuYWJsZWQgKSB7XG5cblx0XHRcdHJldHVybiB0aGlzLmZvY3VzcG9pbnQuc2V0RW5hYmxlZCggZW5hYmxlZCApXG5cdFx0fSxcblx0XHRnZXRGb2N1c3BvaW50OiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLmZvY3VzcG9pbnQuZ2V0Rm9jdXNwb2ludCgpO1xuXHRcdH0sXG5cdFx0c2V0Rm9jdXNwb2ludDogZnVuY3Rpb24oIGZvY3VzcG9pbnQgKSB7XG5cdFx0XHR0aGlzLmZvY3VzcG9pbnQgJiYgdGhpcy5mb2N1c3BvaW50LnNldEZvY3VzcG9pbnQoIGZvY3VzcG9pbnQgKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0Z2V0SW1hZ2VXaWR0aDogZnVuY3Rpb24oICkge1xuXHRcdFx0cmV0dXJuIHRoaXMuaW1hZ2UuJGVsLmdldCgwKS5uYXR1cmFsV2lkdGg7XG5cdFx0fSxcblx0XHRnZXRJbWFnZUhlaWdodDogZnVuY3Rpb24oICkge1xuXHRcdFx0cmV0dXJuIHRoaXMuaW1hZ2UuJGVsLmdldCgwKS5uYXR1cmFsSGVpZ2h0O1xuXHRcdH0sXG5cdFx0c2V0U3JjOiBmdW5jdGlvbiggc3JjICkge1xuXHRcdFx0dGhpcy5pbWFnZS4kZWwuYXR0ciggJ3NyYycsIHNyYyApO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHR2YWx1ZUNoYW5nZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy50cmlnZ2VyKCdjaGFuZ2VkJyk7XG5cdFx0fSxcblx0XHRzaG93SGlsaXRlOiBmdW5jdGlvbihlKXtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtaGlsaXRlJywndHJ1ZScpO1xuXHRcdH0sXG5cdFx0aGlkZUhpbGl0ZTogZnVuY3Rpb24oZSl7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWhpbGl0ZScsJ2ZhbHNlJyk7XG5cdFx0fVxuXHR9KTtcblxuXHRyb2JvY3JvcC52aWV3LkZyYW1lLkZvY3VzcG9pbnQgPSByb2JvY3JvcC52aWV3LkZyYW1lLmV4dGVuZCh7XG5cdFx0Y2xhc3NOYW1lOiAnYXNrLWZvY3VzcG9pbnQgbWVkaWEtZnJhbWUnLFxuXHRcdGV2ZW50czoge1xuXHRcdFx0J2NsaWNrIC5yZXNldCc6ICdyZXNldCcsXG5cdFx0XHQnY2xpY2sgLnByb2NlZWQnOiAncHJvY2VlZCcsXG5cdFx0XHQnY2xpY2sgLmNhbmNlbC11cGxvYWQnOiAnY2FuY2VsVXBsb2FkJyxcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKCApIHtcblxuXHRcdFx0Xy5kZWZhdWx0cyggdGhpcy5vcHRpb25zLCB7XG5cdFx0XHRcdHVwbG9hZGVyOlx0ZmFsc2UsXG5cdFx0XHRcdHRpdGxlOlx0XHRsMTBuLlNldEZvY3VzUG9pbnQsXG5cdFx0XHRcdG1vZGFsOiB0aGlzLm9wdGlvbnMgPyB0aGlzLm9wdGlvbnMubW9kYWwgOiBmYWxzZSxcblx0XHRcdFx0c3JjOiAnJyAvLyBleHBlY3RpbmcgYW4gaW1nIGVsZW1lbnRcblx0XHRcdH0pO1xuXG5cdFx0XHRyb2JvY3JvcC52aWV3LkZyYW1lLnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuXHRcdFx0aWYgKCB0aGlzLm1vZGFsICkge1xuXHRcdFx0XHR0aGlzLm1vZGFsLm9uKCdlc2NhcGUnLCB0aGlzLmNhbmNlbFVwbG9hZCwgdGhpcyApO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5jcmVhdGVUaXRsZSgpO1xuXHRcdFx0dGhpcy5jcmVhdGVDb250ZW50KCk7XG5cdFx0XHR0aGlzLmNyZWF0ZUluc3RydWN0aW9ucygpO1xuXHRcdFx0dGhpcy5jcmVhdGVCdXR0b25zKCk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuLy8gXHRcdHJlbmRlcjogZnVuY3Rpb24oKSB7XG4vLyBcdFx0XHQvLyBmcmFtZSBsYXlvdXRcbi8vXG4vLyBcdFx0XHRyb2JvY3JvcC52aWV3Lk1vZGFsLnByb3RvdHlwZS5yZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuLy8gXHRcdH0sXG5cdFx0Y3JlYXRlVGl0bGU6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHRoaXMuX3RpdGxlID0gbmV3IHdwLm1lZGlhLlZpZXcoe1xuXHRcdFx0XHR0YWdOYW1lOiAnaDEnXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuX3RpdGxlLiRlbC50ZXh0KCB0aGlzLm9wdGlvbnMudGl0bGUgKTtcblx0XHRcdHRoaXMudGl0bGUuc2V0KCBbIHRoaXMuX3RpdGxlIF0gKTtcblx0XHR9LFxuXHRcdGNyZWF0ZUNvbnRlbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5fY29udGVudCA9IG5ldyByb2JvY3JvcC52aWV3LmZvY3VzcG9pbnQuSW1hZ2VGb2N1c1BvaW50U2VsZWN0KHtcblx0XHRcdFx0c3JjOiAnJyxcblx0XHRcdFx0Zm9jdXNwb2ludDp7IHg6MCwgeTowIH0sXG5cdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMsXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXG5cdFx0XHRcdHRvb2xiYXI6dGhpcy50b29sc1xuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLmNvbnRlbnQuc2V0KCBbIHRoaXMuX2NvbnRlbnQgXSApO1xuXHRcdH0sXG5cdFx0Y3JlYXRlSW5zdHJ1Y3Rpb25zOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpbmZvLCBidG47XG5cdFx0XHR0aGlzLmluc3RydWN0aW9ucy5zZXQoIFtcblx0XHRcdFx0bmV3IHdwLm1lZGlhLlZpZXcoe1xuXHRcdFx0XHRcdGVsOiAkKCAnPGRpdiBjbGFzcz1cImluc3RydWN0aW9uc1wiPicgKyBsMTBuLkZvY3VzUG9pbnRJbnN0cnVjdGlvbnMgKyAnPC9kaXY+JyApWzBdLFxuXHRcdFx0XHRcdHByaW9yaXR5OiAtNDBcblx0XHRcdFx0fSksXG5cdFx0XHRdICk7XG5cdFx0fSxcblx0XHRjcmVhdGVCdXR0b25zOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpbmZvLCBidG47XG5cblx0XHRcdHRoaXMuYnV0dG9ucy5zZXQoIFtcblx0XHRcdFx0bmV3IHdwLm1lZGlhLnZpZXcuQnV0dG9uKHtcblx0XHRcdFx0XHR0ZXh0OiBsMTBuLkNhbmNlbFVwbG9hZCxcblx0XHRcdFx0XHRjbGFzc05hbWU6ICdjYW5jZWwtdXBsb2FkJ1xuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IHdwLm1lZGlhLnZpZXcuQnV0dG9uKHtcblx0XHRcdFx0XHR0ZXh0OiBsMTBuLlJlc2V0LFxuXHRcdFx0XHRcdGNsYXNzTmFtZTogJ3Jlc2V0J1xuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IHdwLm1lZGlhLnZpZXcuQnV0dG9uKHtcblx0XHRcdFx0XHR0ZXh0OiBsMTBuLk9rYXksXG5cdFx0XHRcdFx0Y2xhc3NOYW1lOiAnYnV0dG9uLXByaW1hcnkgcHJvY2VlZCdcblx0XHRcdFx0fSlcblx0XHRcdF0gKTtcblx0XHR9LFxuXG5cdFx0c2V0U3JjOiBmdW5jdGlvbiggc3JjICkge1xuXHRcdFx0dGhpcy5fY29udGVudC5zZXRTcmMoIHNyYyApO1xuXHRcdH0sXG5cdFx0c2V0RmlsZTogZnVuY3Rpb24oIGZpbGUgKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsIGZyID0gbmV3IEZpbGVSZWFkZXIoKTtcblx0XHRcdGZyLm9ubG9hZCA9IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0c2VsZi5zZXRTcmMoIGZyLnJlc3VsdCApO1xuXHRcdFx0fVxuXHRcdFx0ZnIucmVhZEFzRGF0YVVSTCggZmlsZSApO1xuXHRcdH0sXG5cdFx0c2V0Rm9jdXNwb2ludDogZnVuY3Rpb24oIGZvY3VzcG9pbnQgKSB7XG5cdFx0XHR0aGlzLl9jb250ZW50LnNldEZvY3VzcG9pbnQoIGZvY3VzcG9pbnQgKTtcblx0XHRcdHRoaXMuX2NvbnRlbnQuc2V0RW5hYmxlZCh0cnVlKTtcblx0XHR9LFxuXHRcdGdldEZvY3VzcG9pbnQ6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHJldHVybiB0aGlzLl9jb250ZW50LmdldEZvY3VzcG9pbnQoKTtcblx0XHR9LFxuXHRcdGdldEltYWdlV2lkdGg6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHJldHVybiB0aGlzLl9jb250ZW50LmdldEltYWdlV2lkdGgoKTtcblx0XHR9LFxuXHRcdGdldEltYWdlSGVpZ2h0OiBmdW5jdGlvbiggKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY29udGVudC5nZXRJbWFnZUhlaWdodCgpO1xuXHRcdH0sXG5cdFx0cmVzZXQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMuc2V0Rm9jdXNwb2ludCggeyB4OjAsIHk6MCB9IClcblx0XHR9LFxuXHRcdHByb2NlZWQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMudHJpZ2dlcigncHJvY2VlZCcpO1xuXHRcdH0sXG5cdFx0Y2FuY2VsVXBsb2FkOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHQvLyByZW1vdmUgZnJvbSBxdWV1ZSFcblx0XHRcdHRoaXMudHJpZ2dlcignY2FuY2VsLXVwbG9hZCcpO1xuXHRcdFx0dGhpcy5jbG9zZSgpO1xuXHRcdH1cblx0fSk7XG5cbn0pKHdwLGpRdWVyeSk7XG4iLCIoZnVuY3Rpb24od3AsJCkge1xuXG5cdHZhciByb2JvY3JvcCBcdFx0PSB3cC5tZWRpYS5yb2JvY3JvcCxcblx0XHRpbWFnZV9yYXRpb3NcdD0gcm9ib2Nyb3AuaW1hZ2VfcmF0aW9zLFxuXHRcdGltYWdlX3NpemVzXHRcdD0gcm9ib2Nyb3AuaW1hZ2Vfc2l6ZXMsXG5cdFx0bDEwblx0XHRcdD0gcm9ib2Nyb3AubDEwbixcblx0XHRvcHRpb25zXHRcdFx0PSByb2JvY3JvcC5vcHRpb25zLFxuXHRcdGNyb3BCdG5IVE1MXHRcdD0gJzxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnV0dG9uIHJvYm9jcm9wLW9wZW5cIj4nK2wxMG4uRWRpdEltYWdlU2l6ZXMrJzwvYnV0dG9uPicsXG5cdFx0Y3JvcExpbmtIVE1MXHQ9ICc8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImJ1dHRvbi1saW5rIHJvYm9jcm9wLW9wZW5cIj4nK2wxMG4uRWRpdEltYWdlU2l6ZXMrJzwvYnV0dG9uPic7XG5cblx0dmFyIHJvYm9jcm9wU3RhdGVFeHRlbmQgPSB7XG5cdFx0Y3JlYXRlU3RhdGVzOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuX3BhcmVudENyZWF0ZVN0YXRlcy5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHR0aGlzLnN0YXRlcy5hZGQoXG5cdFx0XHRcdG5ldyByb2JvY3JvcC5jb250cm9sbGVyLlJvYm9jcm9wSW1hZ2UoIHtcblx0XHRcdFx0XHRtb2RlbDogdGhpcy5tb2RlbCxcblx0XHRcdFx0XHRzZWxlY3Rpb246IHRoaXMub3B0aW9ucy5zZWxlY3Rpb25cblx0XHRcdFx0fSApXG5cdFx0XHQpO1xuXHRcdH1cblx0fTtcblxuXHQvLyBwb3N0IGlubGluZSBpbWFnZSBlZGl0b3Jcblx0Xy5leHRlbmQoIHdwLm1lZGlhLnZpZXcuSW1hZ2VEZXRhaWxzLnByb3RvdHlwZSwge1xuXHRcdF9wYXJlbnRQb3N0UmVuZGVyOiB3cC5tZWRpYS52aWV3LkltYWdlRGV0YWlscy5wcm90b3R5cGUucG9zdFJlbmRlcixcblx0XHRwb3N0UmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuX3BhcmVudFBvc3RSZW5kZXIuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnLmFjdGlvbnMnKS5hcHBlbmQoY3JvcEJ0bkhUTUwpO1xuXHRcdH0sXG5cdFx0cm9ib2Nyb3BPcGVuOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRjb25zb2xlLmxvZygpO1xuXHRcdFx0dmFyIHNpemUgPSB0aGlzLm1vZGVsLmdldCgnc2l6ZScpLFxuXHRcdFx0XHRjcm9wdG9vbCA9IG5ldyByb2JvY3JvcC52aWV3LkZyYW1lLkNyb3AoIHtcblx0XHRcdFx0XHRjb250cm9sbGVyOiB0aGlzLmNvbnRyb2xsZXIsXG5cdFx0XHRcdFx0bW9kZWw6IHRoaXMuY29udHJvbGxlci5pbWFnZS5hdHRhY2htZW50LFxuXHRcdFx0XHRcdHNpemVUb1NlbGVjdDogc2l6ZVxuXHRcdFx0XHR9ICk7XG5cdFx0XHRjcm9wdG9vbC5vcGVuKCk7XG5cdFx0fVxuXHR9KTtcblx0d3AubWVkaWEudmlldy5JbWFnZURldGFpbHMucHJvdG90eXBlLmV2ZW50c1snY2xpY2sgLnJvYm9jcm9wLW9wZW4nXSA9ICdyb2JvY3JvcE9wZW4nO1xuXG5cblx0Ly8gSW5saW5lIE1lZGlhTGlicmFyeSwgR3JpZCB2aWV3IE1lZGlhTGlicmFyeVxuXHRfLmV4dGVuZCggd3AubWVkaWEudmlldy5BdHRhY2htZW50LkRldGFpbHMucHJvdG90eXBlLCB7XG5cdFx0X3BhcmVudFJlbmRlcjogd3AubWVkaWEudmlldy5BdHRhY2htZW50LkRldGFpbHMucHJvdG90eXBlLnJlbmRlcixcblx0XHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5fcGFyZW50UmVuZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuXHRcdFx0Ly8gbWVkaWEgbGlicmFyeSBzY3JlZU5cblx0XHRcdGlmICggWydpbWFnZS9qcGVnJywnaW1hZ2UvcG5nJywnaW1hZ2UvZ2lmJ10uaW5kZXhPZiggdGhpcy5tb2RlbC5nZXQoJ21pbWUnKSApID49IDAgKSB7XG5cdFx0XHRcdHRoaXMuJCgnLmF0dGFjaG1lbnQtYWN0aW9ucycpLmFwcGVuZChjcm9wQnRuSFRNTCk7XG5cdFx0XHRcdCQoIGNyb3BMaW5rSFRNTCApLmluc2VydEFmdGVyKCB0aGlzLiRlbC5maW5kKCAnYS5lZGl0LWF0dGFjaG1lbnQnICkgKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdHJvYm9jcm9wT3BlbjogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGNyb3B0b29sID0gbmV3IHJvYm9jcm9wLnZpZXcuRnJhbWUuQ3JvcCgge1xuXHRcdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMuY29udHJvbGxlcixcblx0XHRcdFx0XHRtb2RlbDogdGhpcy5tb2RlbFxuXHRcdFx0XHR9KTtcblx0XHRcdGNyb3B0b29sLm9wZW4oKTtcblx0XHR9LFxuXHRcdF9wYXJlbnRDcmVhdGVTdGF0ZXM6IHdwLm1lZGlhLnZpZXcuQXR0YWNobWVudC5EZXRhaWxzLnByb3RvdHlwZS5jcmVhdGVTdGF0ZXNcblx0fSwgcm9ib2Nyb3BTdGF0ZUV4dGVuZCApO1xuXG5cdHdwLm1lZGlhLnZpZXcuQXR0YWNobWVudC5EZXRhaWxzLnByb3RvdHlwZS5ldmVudHNbJ2NsaWNrIC5yb2JvY3JvcC1vcGVuJ10gPSAncm9ib2Nyb3BPcGVuJztcblxuXG59KSh3cCxqUXVlcnkpO1xuIl19
