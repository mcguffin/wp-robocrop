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
			console.log(modelSizes)
			_.each(ratio.sizes, function( sizename ) {
				//*
				var cancrop =	(w >= image_sizes[sizename].width) &&
								(h >= image_sizes[sizename].height);

				// set model size if not exists
				! modelSizes[ sizename ] && ( modelSizes[ sizename ] = {} );
				modelSizes[ sizename ].cropdata = cropdata;

				if ( cancrop && image_sizes[sizename].crop ) {
					modelSizes[ sizename ].cropdata = cropdata;
				} else if ( 'undefined' !== typeof modelSizes[ sizename ] ) {
					delete( modelSizes[ sizename ] );
				}
				//*/
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJvYm9jcm9wLWJhc2UuanMiLCJyb2JvY3JvcC1tZWRpYS12aWV3LmpzIiwicm9ib2Nyb3AtZm9jdXNwb2ludC1tZWRpYS12aWV3LmpzIiwicm9ib2Nyb3Atd3AtbWVkaWEtdmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2ppQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbFZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFkbWluL3dwLXJvYm9jcm9wLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAcHJlc2VydmUgKGMpIDIwMTYgYnkgSm9lcm4gTHVuZFxuICogQGxpY2Vuc2UgR1BMM1xuICovXG4oZnVuY3Rpb24oIGV4cG9ydHMgKXtcblx0dmFyIHJvYm9jcm9wO1xuXG5cdHJvYm9jcm9wID0gXy5leHRlbmQoIHdpbmRvdy5yb2JvY3JvcCwge1xuXHRcdGNyb3BGcm9tRm9jdXNQb2ludDogZnVuY3Rpb24oIGltYWdlaW5mbywgY3JvcGluZm8gKSB7XG5cdFx0XHQvLyBub3JtYWxpemUgXG5cdFx0XHR2YXIgZnBfeCA9ICAgKCAgaW1hZ2VpbmZvLmZvY3VzcG9pbnQueCArIDEpIC8gMiAqIGltYWdlaW5mby53aWR0aCxcblx0XHRcdFx0ZnBfeSA9ICAgKCAtaW1hZ2VpbmZvLmZvY3VzcG9pbnQueSArIDEpIC8gMiAqIGltYWdlaW5mby5oZWlnaHQsXG5cdFx0XHRcdHNjYWxlID0gTWF0aC5taW4oIGltYWdlaW5mby53aWR0aCAvIGNyb3BpbmZvLm1pbl93aWR0aCwgaW1hZ2VpbmZvLmhlaWdodCAvIGNyb3BpbmZvLm1pbl9oZWlnaHQgKSxcblx0XHRcdFx0Y3JvcF93ID0gY3JvcGluZm8ubWluX3dpZHRoICogc2NhbGUsXG5cdFx0XHRcdGNyb3BfaCA9IGNyb3BpbmZvLm1pbl9oZWlnaHQgKiBzY2FsZSxcblx0XHRcdFx0Y3JvcF94ID0gTWF0aC5taW4oIE1hdGgubWF4KCBmcF94IC0gY3JvcF93IC8gMiwgMCApICwgaW1hZ2VpbmZvLndpZHRoIC0gY3JvcF93KSxcblx0XHRcdFx0Y3JvcF95ID0gTWF0aC5taW4oIE1hdGgubWF4KCBmcF95IC0gY3JvcF9oIC8gMiwgMCApICwgaW1hZ2VpbmZvLmhlaWdodCAtIGNyb3BfaCk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRuYW1lczogY3JvcGluZm8uc2l6ZXMsXG5cdFx0XHRcdHg6IGNyb3BfeCAvIGltYWdlaW5mby53aWR0aCxcblx0XHRcdFx0eTogY3JvcF95IC8gaW1hZ2VpbmZvLmhlaWdodCxcblx0XHRcdFx0d2lkdGg6IGNyb3BfdyAvIGltYWdlaW5mby53aWR0aCxcblx0XHRcdFx0aGVpZ2h0OiBjcm9wX2ggLyBpbWFnZWluZm8uaGVpZ2h0XG5cdFx0XHR9O1xuXHRcdH0sXG5cblx0XHRyZWxUb0Fic0Nvb3JkczogZnVuY3Rpb24oIGNyb3BkYXRhLCBpbWFnZWluZm8gKSB7XG5cdFx0XHR2YXIgcywgcmV0ID0ge307XG5cdFx0XHRmb3IgKCBzIGluIGNyb3BkYXRhICkge1xuXHRcdFx0XHRzd2l0Y2ggKCBzICkge1xuXHRcdFx0XHRcdGNhc2UgJ3gnOlxuXHRcdFx0XHRcdGNhc2UgJ3gxJzpcblx0XHRcdFx0XHRjYXNlICd4Mic6XG5cdFx0XHRcdFx0Y2FzZSAnd2lkdGgnOlxuXHRcdFx0XHRcdFx0cmV0W3NdID0gY3JvcGRhdGFbc10gKiBpbWFnZWluZm8ud2lkdGhcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ3knOlxuXHRcdFx0XHRcdGNhc2UgJ3kxJzpcblx0XHRcdFx0XHRjYXNlICd5Mic6XG5cdFx0XHRcdFx0Y2FzZSAnaGVpZ2h0Jzpcblx0XHRcdFx0XHRcdHJldFtzXSA9IGNyb3BkYXRhW3NdICogaW1hZ2VpbmZvLmhlaWdodFxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdHJldFtzXSA9IGNyb3BkYXRhW3NdO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiByZXQ7XG5cdFx0fSxcblx0XHRhYnNUb1JlbENvb3JkczogZnVuY3Rpb24oIGNyb3BkYXRhLCBpbWFnZWluZm8gKSB7XG5cdFx0XHR2YXIgcywgcmV0ID0ge307XG5cdFx0XHRmb3IgKCBzIGluIGNyb3BkYXRhICkge1xuXHRcdFx0XHRzd2l0Y2ggKCBzICkge1xuXHRcdFx0XHRcdGNhc2UgJ3gnOlxuXHRcdFx0XHRcdGNhc2UgJ3gxJzpcblx0XHRcdFx0XHRjYXNlICd4Mic6XG5cdFx0XHRcdFx0Y2FzZSAnd2lkdGgnOlxuXHRcdFx0XHRcdFx0cmV0W3NdID0gY3JvcGRhdGFbc10gLyBpbWFnZWluZm8ud2lkdGhcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ3knOlxuXHRcdFx0XHRcdGNhc2UgJ3kxJzpcblx0XHRcdFx0XHRjYXNlICd5Mic6XG5cdFx0XHRcdFx0Y2FzZSAnaGVpZ2h0Jzpcblx0XHRcdFx0XHRcdHJldFtzXSA9IGNyb3BkYXRhW3NdIC8gaW1hZ2VpbmZvLmhlaWdodFxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdHJldFtzXSA9IGNyb3BkYXRhW3NdO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiByZXQ7XG5cdFx0fSxcblxuXHRcdHBvaW50VG9SZWN0Q29vcmRzOmZ1bmN0aW9uKCBwb2ludHMgKSB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHR4OiBwb2ludHMueDEsXG5cdFx0XHRcdHk6IHBvaW50cy55MSxcblx0XHRcdFx0d2lkdGg6ICBwb2ludHMueDIgLSBwb2ludHMueDEsXG5cdFx0XHRcdGhlaWdodDogcG9pbnRzLnkyIC0gcG9pbnRzLnkxXG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHJlY3RUb1BvaW50Q29vcmRzOmZ1bmN0aW9uKCByZWN0ICkge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0eDE6IHJlY3QueCxcblx0XHRcdFx0eTE6IHJlY3QueSxcblx0XHRcdFx0eDI6IChyZWN0Lm1heFggPyByZWN0Lm1heFggOiByZWN0LngrcmVjdC53aWR0aCksXG5cdFx0XHRcdHkyOiAocmVjdC5tYXhZID8gcmVjdC5tYXhZIDogcmVjdC55K3JlY3QuaGVpZ2h0KSxcblx0XHRcdH07XG5cdFx0fSxcblxuXHRcdHZpZXcgOiB7fSxcblx0XHRjb250cm9sbGVyIDoge31cblx0fSk7XG5cblx0ZXhwb3J0cy5tZWRpYS5yb2JvY3JvcCA9IHJvYm9jcm9wO1xuXG59KSggd3AgKTsiLCIoZnVuY3Rpb24od3AsJCkge1xuXG5cdHZhciByb2JvY3JvcCBcdFx0PSB3cC5tZWRpYS5yb2JvY3JvcCxcblx0XHRpbWFnZV9yYXRpb3NcdD0gcm9ib2Nyb3AuaW1hZ2VfcmF0aW9zLFxuXHRcdGltYWdlX3NpemVzXHRcdD0gcm9ib2Nyb3AuaW1hZ2Vfc2l6ZXMsXG5cdFx0bDEwblx0XHRcdD0gcm9ib2Nyb3AubDEwbixcblx0XHRvcHRpb25zXHRcdFx0PSByb2JvY3JvcC5vcHRpb25zO1xuXG5cblx0LyoqXG5cdCAqXHRBbiBJbWFnZVxuXHQgKi9cblx0cm9ib2Nyb3Audmlldy5JbWcgPSB3cC5tZWRpYS5WaWV3LmV4dGVuZCh7XG5cdFx0Y2xhc3NOYW1lOidhdHRhY2htZW50LWltYWdlJyxcblx0XHR0YWdOYW1lOidpbWcnLFxuXHRcdGlkOidyb2JvY3JvcC1pbWFnZScsXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHRfLmRlZmF1bHRzKCB0aGlzLm9wdGlvbnMsIHtzcmM6Jyd9ICk7XG5cdFx0XHR0aGlzLiRlbC5vbignbG9hZCcsZnVuY3Rpb24oKXtcblx0XHRcdFx0c2VsZi53aWR0aCA9IHNlbGYuJGVsLmdldCgwKS5uYXR1cmFsV2lkdGg7XG5cdFx0XHRcdHNlbGYuaGVpZ2h0ID0gc2VsZi4kZWwuZ2V0KDApLm5hdHVyYWxIZWlnaHQ7XG5cdFx0XHRcdHNlbGYucmF0aW8gPSBzZWxmLndpZHRoIC8gc2VsZi5oZWlnaHQ7XG5cdFx0XHRcdHNlbGYudHJpZ2dlcignbG9hZCcsc2VsZik7XG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ3NyYycsIHRoaXMub3B0aW9ucy5zcmMgKTtcblx0XHR9LFxuXHRcdGdldFNyYzogZnVuY3Rpb24oc3JjKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kZWwuYXR0ciggJ3NyYycgKTtcblx0XHR9LFxuXHRcdHNldFNyYzogZnVuY3Rpb24oc3JjKSB7XG5cdFx0XHQhIXNyYyAmJiB0aGlzLiRlbC5hdHRyKCAnc3JjJywgc3JjICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdH0pO1xuXG5cblx0LyoqXG5cdCAqXHRSYXRpbyBzZWxlY3QgbGlzdFxuXHQgKi9cblx0cm9ib2Nyb3Audmlldy5Sb2JvY3JvcFJhdGlvU2VsZWN0ID0gd3AubWVkaWEuVmlldy5leHRlbmQoe1xuXHRcdGNsYXNzTmFtZTogJ3JvYm9jcm9wLXNlbGVjdCcsXG5cdFx0dGVtcGxhdGU6IHdwLnRlbXBsYXRlKCdyb2JvY3JvcC1zZWxlY3QnKSxcblx0XHRldmVudHM6IHtcblx0XHRcdCdjbGljayBbbmFtZT1cInJvYm9jcm9wLXNlbGVjdC1yYXRpb1wiXSc6ICdzZWxlY3RSYXRpbycsXG5cdFx0fSxcblx0XHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHRcdHdwLkJhY2tib25lLlZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0Xy5kZWZhdWx0cyh7XG5cdFx0XHRcdHJhdGlvczp7fSxcblx0XHRcdFx0dG9vbHM6e31cblx0XHRcdH0sdGhpcy5vcHRpb25zKTtcblx0XHRcdHRoaXMub3B0aW9ucy5sMTBuID0gbDEwbjtcblxuXHRcdH0sXG5cdFx0cmVuZGVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHdwLkJhY2tib25lLlZpZXcucHJvdG90eXBlLnJlbmRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdF8uZWFjaCggdGhpcy5vcHRpb25zLnRvb2xzLCBmdW5jdGlvbiggdG9vbCwga2V5ICkge1xuXHRcdFx0XHRzZWxmLnZpZXdzLmFkZChuZXcgcm9ib2Nyb3Audmlldy5Sb2JvY3JvcFJhdGlvU2VsZWN0SXRlbSh7XG5cdFx0XHRcdFx0cmF0aW9rZXk6XHRrZXksXG5cdFx0XHRcdFx0c2l6ZW5hbWVzOlx0ZmFsc2UsXG5cdFx0XHRcdFx0cmF0aW86IFx0XHRrZXksXG5cdFx0XHRcdFx0dGl0bGU6XHRcdHRvb2wudGl0bGUsXG5cdFx0XHRcdFx0ZW5hYmxlZDogXHR0cnVlXG5cdFx0XHRcdH0pKVxuXG5cdFx0XHR9KTtcblx0XHRcdF8uZWFjaCggdGhpcy5vcHRpb25zLnJhdGlvcywgZnVuY3Rpb24oIHJhdGlvLCBrZXkgKSB7XG5cdFx0XHRcdHZhciBuYW1lcyA9IFtdLFxuXHRcdFx0XHRcdHRwbF9zdHIgPSAnPHNwYW4gY2xhc3M9XCJzaXplbmFtZTwlPSBjYW5jcm9wID8gXCJcIiA6IFwiIGRpc2FibGVkXCIgJT5cIj48JT0gbmFtZSAlPiAoPCU9IHdpZHRoICU+w5c8JT0gaGVpZ2h0ICU+KTwvc3Bhbj4nLFxuXHRcdFx0XHRcdG5hbWVfdHBsID0gXy50ZW1wbGF0ZSh0cGxfc3RyKTtcblx0XHRcdFx0Xy5lYWNoKCByYXRpby5zaXplcywgZnVuY3Rpb24oc2l6ZW5hbWUsa2V5KSB7XG5cdFx0XHRcdFx0dmFyIHNpemUgPSAkLmV4dGVuZCggdHJ1ZSwge1xuXHRcdFx0XHRcdFx0Y2FuY3JvcCA6XHQoc2VsZi5tb2RlbC5nZXQoJ3dpZHRoJykgPj0gaW1hZ2Vfc2l6ZXNbc2l6ZW5hbWVdLndpZHRoKSAmJlxuXHRcdFx0XHRcdFx0XHRcdFx0KHNlbGYubW9kZWwuZ2V0KCdoZWlnaHQnKSA+PSBpbWFnZV9zaXplc1tzaXplbmFtZV0uaGVpZ2h0KVxuXHRcdFx0XHRcdH0sIGltYWdlX3NpemVzW3NpemVuYW1lXSk7XG5cdFx0XHRcdFx0aWYgKCBzaXplLmNyb3AgKSB7XG5cdFx0XHRcdFx0XHRuYW1lcy5wdXNoKCBuYW1lX3RwbCggc2l6ZSApICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0c2VsZi52aWV3cy5hZGQobmV3IHJvYm9jcm9wLnZpZXcuUm9ib2Nyb3BSYXRpb1NlbGVjdEl0ZW0oe1xuXHRcdFx0XHRcdHJhdGlva2V5Olx0a2V5LFxuXHRcdFx0XHRcdHNpemVuYW1lczpcdG5hbWVzLmpvaW4oJycpLFxuXHRcdFx0XHRcdHJhdGlvOiBcdFx0a2V5LFxuXHRcdFx0XHRcdHRpdGxlOlx0XHRrZXkgKyAnIDogMScsXG5cdFx0XHRcdFx0ZW5hYmxlZDogXHQoc2VsZi5tb2RlbC5nZXQoJ3dpZHRoJykgID49IHJhdGlvLm1pbl93aWR0aCkgJiZcblx0XHRcdFx0XHRcdFx0XHQoc2VsZi5tb2RlbC5nZXQoJ2hlaWdodCcpID49IHJhdGlvLm1pbl9oZWlnaHQpXG5cdFx0XHRcdH0pKVxuXHRcdFx0fSApO1xuXG5cblx0XHR9LFxuXHRcdHNldFNlbGVjdGVkOiBmdW5jdGlvbiggcmF0aW9rZXkgKSB7XG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbbmFtZT1cInJvYm9jcm9wLXNlbGVjdC1yYXRpb1wiXVt2YWx1ZT1cIicrcmF0aW9rZXkrJ1wiXScpLnByb3AoJ2NoZWNrZWQnLHRydWUpO1xuXHRcdFx0dGhpcy5zZWxlY3RSYXRpbygpO1xuXHRcdH0sXG5cdFx0Z2V0U2VsZWN0ZWQ6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5maW5kKCdbbmFtZT1cInJvYm9jcm9wLXNlbGVjdC1yYXRpb1wiXTpjaGVja2VkJykudmFsKCk7XG5cdFx0fSxcblx0XHRzZWxlY3RSYXRpbzogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0aWYgKCB0aGlzLm9wdGlvbnMucmF0aW9zWyB0aGlzLmdldFNlbGVjdGVkKCkgXSApIHtcblx0XHRcdFx0dGhpcy50cmlnZ2VyKCdzZWxlY3QtcmF0aW8nKTtcblx0XHRcdH0gZWxzZSBpZiAoIHRoaXMub3B0aW9ucy50b29sc1sgdGhpcy5nZXRTZWxlY3RlZCgpIF0gKSB7XG5cdFx0XHRcdHRoaXMudHJpZ2dlcignc2VsZWN0LXRvb2wnKTtcblx0XHRcdH1cblx0XHRcdHRoaXMudHJpZ2dlcignc2VsZWN0Jyk7XG5cdFx0fVxuXHR9KTtcblxuXHQvKipcblx0ICpcdFJhdGlvIHNlbGVjdCBsaXN0IEl0ZW1cblx0ICovXG5cdHJvYm9jcm9wLnZpZXcuUm9ib2Nyb3BSYXRpb1NlbGVjdEl0ZW0gPSB3cC5tZWRpYS5WaWV3LmV4dGVuZCh7XG5cdFx0Y2xhc3NOYW1lOiAncm9ib2Nyb3Atc2VsZWN0LWl0ZW0nLFxuXHRcdHRlbXBsYXRlOiB3cC50ZW1wbGF0ZSgncm9ib2Nyb3Atc2VsZWN0LWl0ZW0nKSxcblx0XHRzaXpla2V5OicnLFxuXHRcdHNpemVuYW1lczonJyxcblx0XHRyYXRpbzowLFxuXHRcdGVuYWJsZWQ6bnVsbCxcblx0XHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0d3AuQmFja2JvbmUuVmlldy5wcm90b3R5cGUucmVuZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXScpLnByb3AoJ2Rpc2FibGVkJywgISB0aGlzLm9wdGlvbnMuZW5hYmxlZCApXG5cdFx0fVxuXHR9KTtcblxuXHRyb2JvY3JvcC52aWV3LlJvYm9jcm9wSW1hZ2UgPSB3cC5tZWRpYS5WaWV3LmV4dGVuZCh7XG5cdFx0Y2xhc3NOYW1lOlx0XHQnaW1hZ2Utcm9ib2Nyb3AnLFxuXHRcdHRlbXBsYXRlOlx0XHR3cC50ZW1wbGF0ZSgncm9ib2Nyb3AnKSxcblx0XHRpbWFnZV9yYXRpb3M6XHRpbWFnZV9yYXRpb3MsXG5cdFx0aW1hZ2Vfc2l6ZXM6XHRpbWFnZV9zaXplcyxcblx0XHRfY3JvcHBlcnM6XHRcdG51bGwsXG5cdFx0ZXZlbnRzOiB7XG5cdFx0XHQnY2xpY2sgLnJvYm9jcm9wLWF1dG9jcm9wLWN1cnJlbnQnXHQ6ICdhdXRvY3JvcCcsXG5cdFx0XHQnY2xpY2sgLnJvYm9jcm9wLWF1dG9jcm9wLWFsbCdcdFx0OiAnYXV0b2Nyb3BBbGwnLFxuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oIG9wdGlvbnMgKSB7XG5cdFx0Ly9cdHdwLm1lZGlhLnZpZXcuRWRpdEltYWdlLnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KCB0aGlzLCBhcmd1bWVudHMgKTtcblx0XHRcdHRoaXMuX2Nyb3BwZXJzIFx0XHQ9IHt9O1xuXHRcdFx0dGhpcy5pbWFnZSBcdFx0XHQ9IG5ldyByb2JvY3JvcC52aWV3LkltZygge3NyYzogdGhpcy5tb2RlbC5nZXQoJ3VybCcpIH0gKTtcblxuXHRcdFx0dGhpcy5jb250cm9sbGVyIFx0PSBvcHRpb25zLmNvbnRyb2xsZXI7XG5cdFx0XHR0aGlzLmZvY3VzcG9pbnR0b29sXHQ9IG5ldyByb2JvY3JvcC52aWV3LmZvY3VzcG9pbnQuSW1hZ2VGb2N1c1BvaW50U2VsZWN0KHsgaW1hZ2U6IHRoaXMuaW1hZ2UsIGZvY3VzcG9pbnQ6IHt4OjAseTowfSwgc3JjOiB0aGlzLm1vZGVsLmdldCgndXJsJykgfSk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLmZvY3VzcG9pbnR0b29sLCAnY2hhbmdlZCcsIHRoaXMudXBkYXRlRm9jdXNQb2ludCApO1xuXG5cdFx0XHR3cC5tZWRpYS5WaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KCB0aGlzLCBhcmd1bWVudHMgKTtcblx0XHR9LFxuXHRcdGRpc21pc3M6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgYXJlYVNlbGVjdCA9IHRoaXMuJGFyZWFTZWxlY3QoKVxuXHRcdFx0YXJlYVNlbGVjdCAmJiBhcmVhU2VsZWN0LnJlbW92ZSgpO1xuXHRcdFx0dGhpcy4kZWwucmVtb3ZlKCk7XG5cdFx0fSxcblx0XHRjcmVhdGVTZWxlY3Q6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5zZWxlY3QgPSBuZXcgcm9ib2Nyb3Audmlldy5Sb2JvY3JvcFJhdGlvU2VsZWN0KHtcblx0XHRcdFx0Y2hvaWNlczogY2hvaWNlc1xuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHRoYXNDaGFuZ2VkOiBmdW5jdGlvbigpe1xuXHRcdFx0dGhpcy50cmlnZ2VyKCAnY2hhbmdlZCcgKTtcblx0XHR9LFxuXHRcdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHdwLm1lZGlhLlZpZXcucHJvdG90eXBlLnJlbmRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cblx0XHRcdHRoaXMudmlld3Muc2V0KCcucm9ib2Nyb3AtY29udGVudCcsIHRoaXMuZm9jdXNwb2ludHRvb2wgKTtcblxuXHRcdFx0dGhpcy5mb2N1c3BvaW50dG9vbC5zZXRGb2N1c3BvaW50KCB0aGlzLm1vZGVsLmdldCggJ2ZvY3VzcG9pbnQnICkgKTtcblxuXHRcdFx0dGhpcy5pbWFnZS4kZWwuaW1nQXJlYVNlbGVjdCh7XG5cdFx0XHRcdHBhcmVudDogXHRcdHRoaXMuaW1hZ2UuJGVsLmNsb3Nlc3QoJy5yb2JvY3JvcC1pbWFnZS1ib3gnKSxcblx0XHRcdFx0aW5zdGFuY2U6XHQgXHR0cnVlLFxuXHRcdFx0XHRoYW5kbGVzOiBcdFx0dHJ1ZSxcblx0XHRcdFx0a2V5czogXHRcdFx0dHJ1ZSxcblx0XHRcdFx0cGVyc2lzdGVudDpcdFx0dHJ1ZSxcblx0XHRcdFx0ZW5hYmxlZDpcdFx0dHJ1ZSxcblx0XHRcdFx0bW92YWJsZTpcdFx0dHJ1ZSxcblx0XHRcdFx0cmVzaXphYmxlOlx0XHR0cnVlLFxuXHRcdFx0XHRpbWFnZUhlaWdodDpcdHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKSxcblx0XHRcdFx0aW1hZ2VXaWR0aDpcdFx0dGhpcy5tb2RlbC5nZXQoJ3dpZHRoJyksXG5cdFx0XHRcdG9uU2VsZWN0RW5kOiBmdW5jdGlvbiggaW1hZ2UsIGNvb3JkcyApIHtcblx0XHRcdFx0XHR2YXIgY3JvcGRhdGEgPSByb2JvY3JvcC5wb2ludFRvUmVjdENvb3JkcyggY29vcmRzIClcblx0XHRcdFx0XHRzZWxmLl9zZXRDcm9wU2l6ZXMoY3JvcGRhdGEpO1xuXHRcdFx0XHRcdHNlbGYuaGFzQ2hhbmdlZCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gc2V0IHJhdGlvIHNlZWxjdFxuXHRcdFx0dGhpcy5zZWxlY3RSYXRpbyA9IG5ldyByb2JvY3JvcC52aWV3LlJvYm9jcm9wUmF0aW9TZWxlY3Qoe1xuXHRcdFx0XHR0b29sczoge1xuXHRcdFx0XHRcdGZvY3VzcG9pbnQgOiB7XG5cdFx0XHRcdFx0XHR0aXRsZTogbDEwbi5TZXRGb2N1c1BvaW50LFxuXHRcdFx0XHRcdFx0dHJpZ2dlcjogJ2ZvY3VzcG9pbnQnXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRyYXRpb3M6dGhpcy5pbWFnZV9yYXRpb3MsXG5cdFx0XHRcdG1vZGVsOnRoaXMubW9kZWxcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5zZWxlY3RSYXRpb1xuXHRcdFx0XHQub24oJ3NlbGVjdC1yYXRpbycsIHRoaXMub25zZWxlY3RyYXRpbywgdGhpcyApXG5cdFx0XHRcdC5vbignc2VsZWN0LXRvb2wnLCB0aGlzLm9uc2VsZWN0dG9vbCwgdGhpcyApXG5cdFx0XHRcdC5vbignc2VsZWN0JywgdGhpcy51cGRhdGVCdXR0b25zLCB0aGlzICk7XG5cblx0XHRcdHRoaXMudmlld3Muc2V0KCcuc2VsZWN0LXJhdGlvJywgdGhpcy5zZWxlY3RSYXRpbyApO1xuXHRcdFx0Ly8gc2V0VGltZW91dCggZnVuY3Rpb24oKXsgfSwyMCk7XG5cblx0XHRcdC8vIGJ1dHRvbnNcblx0XHRcdHRoaXMuJGF1dG9CdXR0b25cdD0gdGhpcy4kZWwuZmluZCgnLnJvYm9jcm9wLWF1dG9jcm9wLWN1cnJlbnQnKTtcblx0XHRcdHRoaXMuJGF1dG9BbGxCdXR0b25cdD0gdGhpcy4kZWwuZmluZCgnLnJvYm9jcm9wLWF1dG9jcm9wLWFsbCcpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRyZWFkeTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgY3VycmVudFJhdGlvLCBmb3VuZDtcblx0XHRcdHdwLm1lZGlhLnZpZXcuRWRpdEltYWdlLnByb3RvdHlwZS5yZWFkeS5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cblx0XHRcdGlmICggISBfLmlzVW5kZWZpbmVkKCB0aGlzLm9wdGlvbnMuc2l6ZVRvU2VsZWN0ICkgKSB7XG5cdFx0XHRcdGZvdW5kID0gXy5maW5kKCB0aGlzLmltYWdlX3JhdGlvcywgZnVuY3Rpb24oIHJhdGlvICl7XG5cdFx0XHRcdFx0cmV0dXJuIHJhdGlvLnNpemVzLmluZGV4T2YoIHRoaXMub3B0aW9ucy5zaXplVG9TZWxlY3QgKSA+IC0xO1xuXHRcdFx0XHR9LCB0aGlzICk7XG5cdFx0XHRcdGlmICggZm91bmQgKSB7XG5cdFx0XHRcdFx0Y3VycmVudFJhdGlvID0gZm91bmQubmFtZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIF8uaXNVbmRlZmluZWQoIGN1cnJlbnRSYXRpbyApICkge1xuXHRcdFx0XHRjdXJyZW50UmF0aW8gPSAnZm9jdXNwb2ludCc7Ly9fLmZpcnN0KF8ua2V5cyggdGhpcy5pbWFnZV9yYXRpb3MgKSk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnNlbGVjdFJhdGlvLnNldFNlbGVjdGVkKCBjdXJyZW50UmF0aW8gKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0c2F2ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0XHRhdHRhY2htZW50czp7fVxuXHRcdFx0XHR9LCBpZCA9IHRoaXMubW9kZWwuZ2V0KCdpZCcpLFxuXHRcdFx0XHQkYnRucyA9IHRoaXMuJGF1dG9BbGxCdXR0b24uYWRkKCB0aGlzLiRhdXRvQnV0dG9uICkucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApLFxuXHRcdFx0XHRzZWxmID0gdGhpcztcblx0XHRcdGRhdGEuYXR0YWNobWVudHNbaWRdID0ge1xuXHRcdFx0XHRzaXplczpcdFx0dGhpcy5tb2RlbC5nZXQoJ3NpemVzJyksXG5cdFx0XHRcdGZvY3VzcG9pbnQ6IHRoaXMubW9kZWwuZ2V0KCdmb2N1c3BvaW50Jylcblx0XHRcdH07XG5cdFx0XHR0aGlzLm1vZGVsLnNhdmVDb21wYXQoIGRhdGEsIHt9ICkuZG9uZSggZnVuY3Rpb24oIHJlc3AgKSB7XG5cdFx0XHRcdHZhciBkID0gbmV3IERhdGUoKTtcblxuXHRcdFx0XHQvLyBmb3JjZSByZWxvYWQgaW1hZ2UgLi4uXG5cdFx0XHRcdF8uZWFjaCggc2VsZi5tb2RlbC5hdHRyaWJ1dGVzLnNpemVzLCBmdW5jdGlvbiggc2l6ZSwgc2l6ZW5hbWUgKSB7XG5cdFx0XHRcdFx0dmFyIHNlbGVjdG9yID0gICdpbWdbc3JjXj1cIicrc2l6ZS51cmwrJ1wiXScsXG5cdFx0XHRcdFx0XHRyZWZyZXNoID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdFx0JCh0aGlzKS5yZW1vdmVBdHRyKCdzcmMnKS5hdHRyKCAnc3JjJywgc2l6ZS51cmwrJz8nK2QuZ2V0VGltZSgpICk7XG5cdFx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRyZWZyZXNoX21jZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdCQodGhpcykucmVtb3ZlQXR0cignZGF0YS1tY2Utc3JjJykuYXR0ciggJ2RhdGEtbWNlLXNyYycsIHNpemUudXJsKyc/JytkLmdldFRpbWUoKSApO1xuXHRcdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0Ly8gLi4uIHVubGVzcyBpdCdzIGZ1bGxzaXplIC4uLlxuXHRcdFx0XHRcdGlmICggc2l6ZW5hbWUgIT09ICdmdWxsJyApIHtcblxuXHRcdFx0XHRcdFx0JChkb2N1bWVudCkuYWRkKCAkKCdpZnJhbWUnKS5jb250ZW50cygpIClcblx0XHRcdFx0XHRcdFx0LmZpbmQoIHNlbGVjdG9yIClcblx0XHRcdFx0XHRcdFx0LmVhY2goIHJlZnJlc2ggKTtcblxuXHRcdFx0XHRcdFx0Ly8gLi4uIGluc2lkZSB0aW55bWNlIGlmcmFtZXNcblx0XHRcdFx0XHRcdCQoJy5tY2UtZWRpdC1hcmVhIGlmcmFtZScpLmVhY2goZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0JCh0aGlzKS5jb250ZW50cygpXG5cdFx0XHRcdFx0XHRcdFx0LmZpbmQoIHNlbGVjdG9yIClcblx0XHRcdFx0XHRcdFx0XHQuZWFjaCggcmVmcmVzaCApXG5cdFx0XHRcdFx0XHRcdFx0LmVhY2goIHJlZnJlc2hfbWNlICk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIHNlbGYgKTtcblx0XHRcdFx0JGJ0bnMucHJvcCggJ2Rpc2FibGVkJywgZmFsc2UgKTtcblx0XHRcdFx0c2VsZi50cmlnZ2VyKCAnc2F2ZWQnICk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0dXBkYXRlQnV0dG9uczogZnVuY3Rpb24oKXtcblx0XHRcdHZhciB0b29sa2V5ID0gdGhpcy5zZWxlY3RSYXRpby5nZXRTZWxlY3RlZCgpO1xuXHRcdFx0dGhpcy4kYXV0b0J1dHRvbi50b2dnbGVDbGFzcyggJ2hpZGRlbicsIHRvb2xrZXkgPT09ICdmb2N1c3BvaW50JyApO1xuXHRcdFx0dGhpcy4kYXV0b0FsbEJ1dHRvbi50b2dnbGVDbGFzcyggJ2hpZGRlbicsIHRvb2xrZXkgIT09ICdmb2N1c3BvaW50JyApO1xuXHRcdH0sXG5cdFx0b25zZWxlY3R0b29sOiBmdW5jdGlvbigpe1xuXHRcdFx0dmFyIHRvb2xrZXkgPSB0aGlzLnNlbGVjdFJhdGlvLmdldFNlbGVjdGVkKCk7XG5cdFx0XHR0aGlzLiRhcmVhU2VsZWN0KCkuY2FuY2VsU2VsZWN0aW9uKCk7XG5cblx0XHRcdHN3aXRjaCAoIHRvb2xrZXkgKSB7XG5cdFx0XHRcdGNhc2UgJ2ZvY3VzcG9pbnQnOlxuXHRcdFx0XHRcdC8vIHdyYXAgYXJvdW5kXG5cdFx0XHRcdFx0dGhpcy5mb2N1c3BvaW50dG9vbC5zZXRFbmFibGVkKCB0cnVlICk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRvbnNlbGVjdHJhdGlvOiBmdW5jdGlvbiggKSB7XG5cdFx0XHR0aGlzLmZvY3VzcG9pbnR0b29sLnNldEVuYWJsZWQoIGZhbHNlICk7XG5cblx0XHRcdC8qKlxuXHRcdFx0ICpcdE9uIHN3aXRjaCByYXRpb1xuXHRcdFx0ICovXG5cdFx0XHR2YXIgcmF0aW9rZXkgPSB0aGlzLnNlbGVjdFJhdGlvLmdldFNlbGVjdGVkKCksXG5cdFx0XHRcdHNpemVzID0gdGhpcy5tb2RlbC5nZXQoJ3NpemVzJyksXG5cdFx0XHRcdGZhY3RvciwgcmVjdCwgY3JvcGRhdGEsIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRzLCBhcmVhU2VsZWN0T3B0aW9ucyxcblx0XHRcdFx0aW1nV2lkdGggID0gdGhpcy5tb2RlbC5nZXQoJ3dpZHRoJyksXG5cdFx0XHRcdGltZ0hlaWdodCA9IHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKTtcblxuXHRcdFx0dGhpcy5jdXJyZW50X3JhdGlvID0gdGhpcy5pbWFnZV9yYXRpb3NbcmF0aW9rZXldO1xuXG5cdFx0XHRhcmVhU2VsZWN0T3B0aW9ucyA9IHtcblx0XHRcdFx0YXNwZWN0UmF0aW86XHR0aGlzLmN1cnJlbnRfcmF0aW8ucmF0aW8gKyAnOjEnLFxuXHRcdFx0XHRtaW5XaWR0aDpcdFx0dGhpcy5jdXJyZW50X3JhdGlvLm1pbl93aWR0aCxcblx0XHRcdFx0bWluSGVpZ2h0Olx0XHR0aGlzLmN1cnJlbnRfcmF0aW8ubWluX2hlaWdodFxuXHRcdFx0fTtcblxuXHRcdFx0Xy5lYWNoKHRoaXMuY3VycmVudF9yYXRpby5zaXplcywgZnVuY3Rpb24oc2l6ZSl7XG5cdFx0XHRcdGlmICggISBjcm9wZGF0YSAmJiAhISBzaXplc1tzaXplXSAmJiAhISBzaXplc1tzaXplXS5jcm9wZGF0YSApIHtcblx0XHRcdFx0XHRjcm9wZGF0YSA9IHNpemVzW3NpemVdLmNyb3BkYXRhO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggaW1hZ2Vfc2l6ZXNbc2l6ZV0ud2lkdGggPD0gaW1nV2lkdGggJiYgaW1hZ2Vfc2l6ZXNbc2l6ZV0uaGVpZ2h0IDw9IGltZ0hlaWdodCApIHtcblx0XHRcdFx0XHRhcmVhU2VsZWN0T3B0aW9ucy5taW5XaWR0aCAgPSBNYXRoLm1heCggYXJlYVNlbGVjdE9wdGlvbnMubWluV2lkdGgsICBpbWFnZV9zaXplc1tzaXplXS53aWR0aCApO1xuXHRcdFx0XHRcdGFyZWFTZWxlY3RPcHRpb25zLm1pbkhlaWdodCA9IE1hdGgubWF4KCBhcmVhU2VsZWN0T3B0aW9ucy5taW5IZWlnaHQsIGltYWdlX3NpemVzW3NpemVdLmhlaWdodCApO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0aWYgKCAhY3JvcGRhdGEgKSB7XG5cdFx0XHRcdC8vIHdwIGRlZmF1bHQgY3JvcGRhdGFcblx0XHRcdFx0dmFyIHNjYWxlID0gTWF0aC5taW4oIHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpIC8gdGhpcy5jdXJyZW50X3JhdGlvLnJhdGlvLCB0aGlzLm1vZGVsLmdldCgnaGVpZ2h0JykpO1xuXG5cdFx0XHRcdHJlY3QgPSB7XG5cdFx0XHRcdFx0eDowLFxuXHRcdFx0XHRcdHk6MCxcblx0XHRcdFx0XHR3aWR0aDogIHNjYWxlICogdGhpcy5jdXJyZW50X3JhdGlvLnJhdGlvLFxuXHRcdFx0XHRcdGhlaWdodDogc2NhbGVcblx0XHRcdFx0fTtcblx0XHRcdFx0cmVjdC54ID0gKHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpIC0gcmVjdC53aWR0aCkvMjtcblx0XHRcdFx0cmVjdC55ID0gKHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKSAtIHJlY3QuaGVpZ2h0KS8yO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmVjdCA9IHt9O1xuXG5cdFx0XHRcdF8uZXh0ZW5kKHJlY3QsY3JvcGRhdGEpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLiRhcmVhU2VsZWN0KCkuc2V0T3B0aW9ucyggYXJlYVNlbGVjdE9wdGlvbnMgKTtcblx0XHRcdGlmICggISB0aGlzLmltYWdlLiRlbC5nZXQoMCkuY29tcGxldGUgKSB7XG5cdFx0XHRcdHRoaXMuaW1hZ2UuJGVsLm9uKCdsb2FkJyxmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLnNlbGVjdENyb3AocmVjdCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5zZWxlY3RDcm9wKHJlY3QpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRhdXRvY3JvcDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0Ly8gY3JvcCBieSBmb2N1cyBwb2ludFxuXG5cdFx0XHR2YXIgY3JvcGRhdGEsIGltYWdlaW5mbyA9IHtcblx0XHRcdFx0XHR3aWR0aDpcdFx0dGhpcy5tb2RlbC5nZXQoJ3dpZHRoJyksXG5cdFx0XHRcdFx0aGVpZ2h0Olx0XHR0aGlzLm1vZGVsLmdldCgnaGVpZ2h0JyksXG5cdFx0XHRcdFx0Zm9jdXNwb2ludDpcdHRoaXMubW9kZWwuZ2V0KCdmb2N1c3BvaW50Jylcblx0XHRcdFx0fTtcblx0XHRcdGNyb3BkYXRhID0gcm9ib2Nyb3AuY3JvcEZyb21Gb2N1c1BvaW50KCBpbWFnZWluZm8sIHRoaXMuY3VycmVudF9yYXRpbyApO1xuXHRcdFx0Y3JvcGRhdGEgPSByb2JvY3JvcC5yZWxUb0Fic0Nvb3JkcyggY3JvcGRhdGEsIGltYWdlaW5mbyApO1xuXG5cdFx0XHR0aGlzLl9zZXRDcm9wU2l6ZXMoIGNyb3BkYXRhICk7XG5cdFx0XHR0aGlzLnNlbGVjdENyb3AoIGNyb3BkYXRhICk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0YXV0b2Nyb3BBbGw6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0aW1hZ2VpbmZvID0ge1xuXHRcdFx0XHRcdHdpZHRoOlx0XHR0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSxcblx0XHRcdFx0XHRoZWlnaHQ6XHRcdHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKSxcblx0XHRcdFx0XHRmb2N1c3BvaW50Olx0dGhpcy5tb2RlbC5nZXQoJ2ZvY3VzcG9pbnQnKVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRfLmVhY2goIHRoaXMuaW1hZ2VfcmF0aW9zLCBmdW5jdGlvbiggcmF0aW8gKSB7XG5cdFx0XHRcdHZhciBjcm9wZGF0YTtcblx0XHRcdFx0Y3JvcGRhdGEgPSByb2JvY3JvcC5jcm9wRnJvbUZvY3VzUG9pbnQoIGltYWdlaW5mbywgcmF0aW8gKTtcblx0XHRcdFx0Y3JvcGRhdGEgPSByb2JvY3JvcC5yZWxUb0Fic0Nvb3JkcyggY3JvcGRhdGEsIGltYWdlaW5mbyApO1xuXHRcdFx0XHRzZWxmLl9zZXRDcm9wU2l6ZXMoIGNyb3BkYXRhLCByYXRpbyApO1xuXHRcdFx0fSApO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHNlbGVjdENyb3A6ZnVuY3Rpb24oIHJlY3QgKSB7XG5cdFx0XHQvLyBkcmF3IGNyb3AgVUkgZWxlbWVudC5cblx0XHRcdHZhciBmYWN0b3IgPSB0aGlzLl9pbWFnZV9zY2FsZV9mYWN0b3IoKSxcblx0XHRcdFx0cG9pbnRzID0gcm9ib2Nyb3AucmVjdFRvUG9pbnRDb29yZHMoIHJlY3QgKSxcblx0XHRcdFx0JGFyZWFTZWxlY3QgPSB0aGlzLiRhcmVhU2VsZWN0KCk7XG5cblx0XHRcdCRhcmVhU2VsZWN0LnNldFNlbGVjdGlvbiggcG9pbnRzLngxLCBwb2ludHMueTEsIHBvaW50cy54MiwgcG9pbnRzLnkyLCBmYWxzZSApO1xuXHRcdFx0JGFyZWFTZWxlY3Quc2V0T3B0aW9ucygge3Nob3c6dHJ1ZX0gKTtcblx0XHRcdCRhcmVhU2VsZWN0LnVwZGF0ZSgpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHQkYXJlYVNlbGVjdCA6IGZ1bmN0aW9uKCl7XG5cdFx0XHRyZXR1cm4gdGhpcy5pbWFnZS4kZWwuZGF0YSgnaW1nQXJlYVNlbGVjdCcpO1xuXHRcdH0sXG5cdFx0X2ltYWdlX3NjYWxlX2ZhY3RvciA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyICRjb250YWluZXIgPSB0aGlzLmltYWdlLiRlbC5jbG9zZXN0KCcucm9ib2Nyb3AtaW1hZ2UtYm94JyksXG5cdFx0XHRcdHcgPSBNYXRoLm1pbih0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSwkY29udGFpbmVyLndpZHRoKCkpLFxuXHRcdFx0XHRoID0gTWF0aC5taW4odGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpLCRjb250YWluZXIuaGVpZ2h0KCkpO1xuXG5cdFx0XHRyZXR1cm4gTWF0aC5taW4oIHcgLyB0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSwgaCAvIHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKSApO1xuXHRcdH0sXG5cdFx0dXBkYXRlRm9jdXNQb2ludDogZnVuY3Rpb24oICkge1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdmb2N1c3BvaW50JywgdGhpcy5mb2N1c3BvaW50dG9vbC5nZXRGb2N1c3BvaW50KCkgKTtcblx0XHR9LFxuXHRcdF9zZXRDcm9wU2l6ZXMgOiBmdW5jdGlvbiggY3JvcGRhdGEsIHJhdGlvICkge1xuXHRcdFx0dmFyIHcgPSB0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSxcblx0XHRcdFx0aCA9IHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKSxcblx0XHRcdFx0bW9kZWxTaXplcyA9IHRoaXMubW9kZWwuZ2V0KCdzaXplcycpLFxuXHRcdFx0XHRyYXRpbyA9IHJhdGlvIHx8IHRoaXMuY3VycmVudF9yYXRpbztcblx0XHRcdGNvbnNvbGUubG9nKG1vZGVsU2l6ZXMpXG5cdFx0XHRfLmVhY2gocmF0aW8uc2l6ZXMsIGZ1bmN0aW9uKCBzaXplbmFtZSApIHtcblx0XHRcdFx0Ly8qXG5cdFx0XHRcdHZhciBjYW5jcm9wID1cdCh3ID49IGltYWdlX3NpemVzW3NpemVuYW1lXS53aWR0aCkgJiZcblx0XHRcdFx0XHRcdFx0XHQoaCA+PSBpbWFnZV9zaXplc1tzaXplbmFtZV0uaGVpZ2h0KTtcblxuXHRcdFx0XHQvLyBzZXQgbW9kZWwgc2l6ZSBpZiBub3QgZXhpc3RzXG5cdFx0XHRcdCEgbW9kZWxTaXplc1sgc2l6ZW5hbWUgXSAmJiAoIG1vZGVsU2l6ZXNbIHNpemVuYW1lIF0gPSB7fSApO1xuXHRcdFx0XHRtb2RlbFNpemVzWyBzaXplbmFtZSBdLmNyb3BkYXRhID0gY3JvcGRhdGE7XG5cblx0XHRcdFx0aWYgKCBjYW5jcm9wICYmIGltYWdlX3NpemVzW3NpemVuYW1lXS5jcm9wICkge1xuXHRcdFx0XHRcdG1vZGVsU2l6ZXNbIHNpemVuYW1lIF0uY3JvcGRhdGEgPSBjcm9wZGF0YTtcblx0XHRcdFx0fSBlbHNlIGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBtb2RlbFNpemVzWyBzaXplbmFtZSBdICkge1xuXHRcdFx0XHRcdGRlbGV0ZSggbW9kZWxTaXplc1sgc2l6ZW5hbWUgXSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vKi9cblx0XHRcdFx0Ly8qL1xuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ3NpemVzJywgbW9kZWxTaXplcyApO1xuXHRcdH0sXG5cdFx0X2dldFJlbGF0aXZlQ29vcmRzOiBmdW5jdGlvbiggY29vcmRzICkge1xuXHRcdFx0dmFyIHcgPSB0aGlzLm1vZGVsLmdldCgnd2lkdGgnKSxcblx0XHRcdFx0aCA9IHRoaXMubW9kZWwuZ2V0KCdoZWlnaHQnKTtcblx0XHRcdGZvciAoIHZhciBzIGluIGNvb3JkcyApIHtcblx0XHRcdFx0aWYgKCAnbnVtYmVyJz09PXR5cGVvZihjb29yZHNbc10pICkge1xuXHRcdFx0XHRcdHN3aXRjaCAocykge1xuXHRcdFx0XHRcdFx0Y2FzZSAneCc6XG5cdFx0XHRcdFx0XHRjYXNlICd4MSc6XG5cdFx0XHRcdFx0XHRjYXNlICd4Mic6XG5cdFx0XHRcdFx0XHRjYXNlICd3aWR0aCc6XG5cdFx0XHRcdFx0XHRjYXNlICdtaW5YJzpcblx0XHRcdFx0XHRcdGNhc2UgJ21heFgnOlxuXHRcdFx0XHRcdFx0XHRjb29yZHNbc10gLz0gdztcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHRjb29yZHNbc10gLz0gaDtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRfZ2V0QWJzb2x1dGVDb29yZHM6IGZ1bmN0aW9uKCBjb29yZHMgKSB7XG5cdFx0XHR2YXIgdyA9IHRoaXMubW9kZWwuZ2V0KCd3aWR0aCcpLFxuXHRcdFx0XHRoID0gdGhpcy5tb2RlbC5nZXQoJ2hlaWdodCcpO1xuXHRcdFx0Zm9yICggdmFyIHMgaW4gY29vcmRzICkge1xuXHRcdFx0XHRpZiAoICdudW1iZXInPT09dHlwZW9mKGNvb3Jkc1tzXSkgKSB7XG5cdFx0XHRcdFx0c3dpdGNoIChzKSB7XG5cdFx0XHRcdFx0XHRjYXNlICd4Jzpcblx0XHRcdFx0XHRcdGNhc2UgJ3gxJzpcblx0XHRcdFx0XHRcdGNhc2UgJ3gyJzpcblx0XHRcdFx0XHRcdGNhc2UgJ3dpZHRoJzpcblx0XHRcdFx0XHRcdGNhc2UgJ21pblgnOlxuXHRcdFx0XHRcdFx0Y2FzZSAnbWF4WCc6XG5cdFx0XHRcdFx0XHRcdGNvb3Jkc1tzXSAqPSB3O1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdGNvb3Jkc1tzXSAqPSBoO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblxuXG5cblx0cm9ib2Nyb3Audmlldy5GcmFtZSA9IHdwLm1lZGlhLnZpZXcuTWVkaWFGcmFtZS5leHRlbmQoe1xuXHRcdHRlbXBsYXRlOiAgd3AudGVtcGxhdGUoJ3JvYm9jcm9wLW1vZGFsJyksXG5cdFx0cmVnaW9uczogICBbJ3RpdGxlJywnY29udGVudCcsJ2luc3RydWN0aW9ucycsJ2J1dHRvbnMnLCdyYXRpb3MnXVxuXHR9KTtcblxuXHRyb2JvY3JvcC52aWV3LkZyYW1lLkNyb3AgPSByb2JvY3JvcC52aWV3LkZyYW1lLmV4dGVuZCh7XG5cdFx0ZXZlbnRzOiB7XG5cdFx0XHQnY2xpY2sgLnJvYm9jcm9wLXNhdmUnXHRcdDogJ3NhdmUnLFxuXHRcdFx0J2NsaWNrIC5yb2JvY3JvcC1jYW5jZWwnXHQ6ICdjbG9zZScsXG5cdFx0fSxcblx0XHRzYXZlOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuJCgnLnJvYm9jcm9wLXNhdmUsIC5yb2JvY3JvcC1jYW5jZWwnKS5wcm9wKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHR0aGlzLl9jb250ZW50LnNhdmUoKTtcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKCBvcHRpb25zICkge1xuXHRcdFx0cm9ib2Nyb3Audmlldy5GcmFtZS5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cblx0XHRcdHRoaXMuY3JlYXRlVGl0bGUoKTtcblx0XHRcdHRoaXMuY3JlYXRlQ29udGVudCgpO1xuXHRcdFx0dGhpcy5jcmVhdGVCdXR0b25zKCk7XG5cblx0XHRcdHRoaXMub24oJ2Nsb3NlJywgdGhpcy5kaXNtaXNzLCB0aGlzICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLl9jb250ZW50LCAnc2F2ZWQnLCB0aGlzLm1vZGVsU3luYyApO1xuXHRcdH0sXG5cdFx0bW9kZWxTeW5jOiBmdW5jdGlvbigpe1xuXHRcdFx0dGhpcy4kKCcucm9ib2Nyb3Atc2F2ZSwgLnJvYm9jcm9wLWNhbmNlbCcpLnByb3AoICdkaXNhYmxlZCcsIGZhbHNlICk7XG5cdFx0fSxcblx0XHRkaXNtaXNzOmZ1bmN0aW9uKCl7XG5cdFx0XHR0aGlzLl9jb250ZW50LmRpc21pc3MoKTtcblx0XHR9LFxuXHRcdGNyZWF0ZVRpdGxlOiBmdW5jdGlvbiggKSB7XG5cdFx0XHR0aGlzLl90aXRsZSA9IG5ldyB3cC5tZWRpYS5WaWV3KHtcblx0XHRcdFx0dGFnTmFtZTogJ2gxJ1xuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLl90aXRsZS4kZWwudGV4dCggbDEwbi5BdHRhY2htZW50RGV0YWlscyApO1xuXHRcdFx0dGhpcy50aXRsZS5zZXQoIFsgdGhpcy5fdGl0bGUgXSApO1xuXHRcdH0sXG5cdFx0Y3JlYXRlQ29udGVudDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgb3B0cyA9IF8uZXh0ZW5kKHtcblx0XHRcdFx0Y29udHJvbGxlcjogdGhpcy5jb250cm9sbGVyLFxuXHRcdFx0XHRtb2RlbDogdGhpcy5tb2RlbFxuXHRcdFx0fSwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLl9jb250ZW50ID0gbmV3IHJvYm9jcm9wLnZpZXcuUm9ib2Nyb3BJbWFnZSggb3B0cyApO1xuXHRcdFx0dGhpcy5jb250ZW50LnNldCggWyB0aGlzLl9jb250ZW50IF0gKTtcblx0XHR9LFxuXHRcdGNyZWF0ZUJ1dHRvbnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGluZm8sIGJ0bjtcblxuXHRcdFx0dGhpcy5idXR0b25zLnNldCggW1xuXHRcdFx0XHRuZXcgd3AubWVkaWEudmlldy5CdXR0b24oe1xuXHRcdFx0XHRcdHRleHQ6IGwxMG4uQ2xvc2UsXG5cdFx0XHRcdFx0Y2xhc3NOYW1lOiAnYnV0dG9uLXNlY29uZGFyeSByb2JvY3JvcC1jYW5jZWwnXG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgd3AubWVkaWEudmlldy5CdXR0b24oe1xuXHRcdFx0XHRcdHRleHQ6IGwxMG4uU2F2ZUNoYW5nZXMsXG5cdFx0XHRcdFx0Y2xhc3NOYW1lOiAnYnV0dG9uLXByaW1hcnkgcm9ib2Nyb3Atc2F2ZSdcblx0XHRcdFx0fSlcblx0XHRcdF0gKTtcblx0XHR9XG5cdH0pO1xuXG5cblxuXG59KSh3cCxqUXVlcnkpO1xuIiwiKGZ1bmN0aW9uKHdwLCQpIHtcblxuXHR2YXIgcm9ib2Nyb3AgPSB3cC5tZWRpYS5yb2JvY3JvcCxcblx0XHRpbWFnZV9yYXRpb3MgPSByb2JvY3JvcC5pbWFnZV9yYXRpb3MsXG5cdFx0aW1hZ2Vfc2l6ZXMgID0gcm9ib2Nyb3AuaW1hZ2Vfc2l6ZXMsXG5cdFx0bDEwbiA9IHJvYm9jcm9wLmwxMG47XG5cblx0dmFyIFZpZXdcdFx0PSB3cC5tZWRpYS5WaWV3LFxuXHRcdE1lZGlhRnJhbWVcdD0gd3AubWVkaWEudmlldy5NZWRpYUZyYW1lLFxuXHRcdEZvY3VzUG9pbnQsXG5cdFx0Q3JvcFJlY3Q7XG5cblx0cm9ib2Nyb3Audmlldy5mb2N1c3BvaW50ID0ge307XG5cblx0Q3JvcFJlY3QgPSByb2JvY3JvcC52aWV3LmZvY3VzcG9pbnQuQ3JvcFJlY3QgPSBWaWV3LmV4dGVuZCh7XG5cdFx0dGVtcGxhdGU6IHdwLnRlbXBsYXRlKCdjcm9wcmVjdCcpLFxuXHRcdGNsYXNzTmFtZTpcdCd0b29sLWNyb3ByZWN0Jyxcblx0XHRjb250cm9sbGVyOm51bGwsXG5cdFx0ZXZlbnRzOiB7XG5cdFx0XHQnbW91c2VlbnRlciAubGFiZWwnIDogJ3Nob3dIaWxpdGUnLFxuXHRcdFx0J21vdXNlbGVhdmUgLmxhYmVsJyA6ICdoaWRlSGlsaXRlJyxcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0Vmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cblx0XHRcdF8uZGVmYXVsdHMoIHRoaXMub3B0aW9ucywge1xuXHRcdFx0XHRmb2N1c3BvaW50OiBudWxsLCAvLyBmb2N1c3BvaW50IGNvb3Jkc1xuXHRcdFx0XHRyYXRpbzogbnVsbFxuXHRcdFx0fSApO1xuXG5cdFx0XHR0aGlzLm9wdGlvbnMubGFiZWwgPSB0aGlzLm9wdGlvbnMucmF0aW8ubmFtZSArICcgOiAxJztcblxuXHRcdFx0dGhpcy5jb250cm9sbGVyID0gdGhpcy5vcHRpb25zLmNvbnRyb2xsZXI7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLmNvbnRyb2xsZXIuaW1hZ2UsICdsb2FkJywgdGhpcy5pbWFnZUxvYWRlZCApO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGltYWdlTG9hZGVkOmZ1bmN0aW9uKCBpbWFnZSApIHtcblx0XHRcdHRoaXMuJGVsLmF0dHIoICdkYXRhLWRpcicsIHRoaXMub3B0aW9ucy5yYXRpby5yYXRpbyA+IGltYWdlLnJhdGlvID8gJ3cnIDogJ2gnICk7XG5cdFx0XHR0aGlzLiRlbC5jc3MoICd3aWR0aCcsIE1hdGgubWluKCAxLCB0aGlzLm9wdGlvbnMucmF0aW8ucmF0aW8gLyBpbWFnZS5yYXRpbyApICogMTAwICsnJScgKTtcblx0XHRcdHRoaXMuc2V0Rm9jdXNwb2ludCggKTtcblx0XHRcdC8vIHNldCBwb3NpdGlvbiBmcm9tIGZvc3VzcG9pbnRcblx0XHR9LFxuXHRcdHNldEZvY3VzcG9pbnQ6ZnVuY3Rpb24oIGZvY3VzcG9pbnQgKSB7XG5cdFx0XHRpZiAoICEhZm9jdXNwb2ludCApIHtcblx0XHRcdFx0dGhpcy5vcHRpb25zLmZvY3VzcG9pbnQgPSBmb2N1c3BvaW50O1xuXHRcdFx0fVxuXHRcdFx0dmFyIGltYWdlaW5mbyA9IHtcblx0XHRcdFx0XHR3aWR0aFx0XHQ6IHRoaXMuY29udHJvbGxlci5pbWFnZS4kZWwud2lkdGgoKSxcblx0XHRcdFx0XHRoZWlnaHRcdFx0OiB0aGlzLmNvbnRyb2xsZXIuaW1hZ2UuJGVsLmhlaWdodCgpLFxuXHRcdFx0XHRcdGZvY3VzcG9pbnRcdDogdGhpcy5vcHRpb25zLmZvY3VzcG9pbnQsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHJlcyA9IHJvYm9jcm9wLmNyb3BGcm9tRm9jdXNQb2ludCggaW1hZ2VpbmZvLCB0aGlzLm9wdGlvbnMucmF0aW8gKSxcblx0XHRcdFx0Y29vcmQgPSByb2JvY3JvcC5yZWxUb0Fic0Nvb3JkcyggcmVzLCBpbWFnZWluZm8gKTtcbiBcdFx0XHR0aGlzLiRlbC5jc3MoJ2xlZnQnLGNvb3JkLnggKyAncHgnICk7XG4gXHRcdFx0dGhpcy4kZWwuY3NzKCd0b3AnLGNvb3JkLnkgKyAncHgnICk7XG4gXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRzaG93SGlsaXRlOiBmdW5jdGlvbihlKXtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtaGlsaXRlJywndHJ1ZScpO1xuXHRcdFx0dGhpcy50cmlnZ2VyKCdoaWxpdGU6c2hvdycpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRoaWRlSGlsaXRlOiBmdW5jdGlvbihlKXtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtaGlsaXRlJywnZmFsc2UnKTtcblx0XHRcdHRoaXMudHJpZ2dlcignaGlsaXRlOmhpZGUnKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0fSk7XG5cblx0Rm9jdXNQb2ludCA9IHJvYm9jcm9wLnZpZXcuZm9jdXNwb2ludC5Gb2N1c1BvaW50ID0gVmlldy5leHRlbmQoe1xuXHRcdGNsYXNzTmFtZTpcdCd0b29sLWZvY3VzcG9pbnQnLFxuXHRcdHRlbXBsYXRlOlx0d3AudGVtcGxhdGUoJ2ZvY3VzcG9pbnQnKSxcblx0XHRsYWJlbFZpZXc6XHRcdG51bGwsXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKXtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdF8uZGVmYXVsdHMoIHRoaXMub3B0aW9ucywge1xuXHRcdFx0XHRmb2N1c3BvaW50Ont4OjAseTowfSxcblx0XHRcdFx0ZW5hYmxlZDogZmFsc2UgLFxuXHRcdFx0XHRjcm9wUmVjdHM6W11cblx0XHRcdH0gKTtcblx0XHRcdHRoaXMub3B0aW9ucy5jcm9wUmVjdHMuc29ydChmdW5jdGlvbihhLGIpe1xuXHRcdFx0XHRyZXR1cm4gYi5vcHRpb25zLnJhdGlvLnJhdGlvIC0gYS5vcHRpb25zLnJhdGlvLnJhdGlvO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuJGVsLm9uKCdjbGljaycsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0c2VsZi5jbGlja0ZvY3VzcG9pbnQoIGV2ZW50ICk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0cmVuZGVyOmZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHRWaWV3LnByb3RvdHlwZS5yZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0Xy5lYWNoKCB0aGlzLm9wdGlvbnMuY3JvcFJlY3RzLCBmdW5jdGlvbiggcmVjdCApe1xuXHRcdFx0XHRyZWN0LnJlbmRlcigpO1xuXHRcdFx0XHRzZWxmLiRlbC5hcHBlbmQoIHJlY3QuJGVsICk7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0c2V0RW5hYmxlZDogZnVuY3Rpb24oIGVuYWJsZWQgKSB7XG5cdFx0XHR2YXIgcHJldiA9IHRoaXMub3B0aW9ucy5lbmFibGVkO1xuXHRcdFx0dGhpcy5vcHRpb25zLmVuYWJsZWQgPSBlbmFibGVkO1xuXHRcdFx0dGhpcy4kZWwuYXR0ciggJ2RhdGEtZW5hYmxlZCcsIGVuYWJsZWQudG9TdHJpbmcoKSApO1xuXHRcdFx0cmV0dXJuIHByZXY7XG5cdFx0fSxcblx0XHRjbGlja0ZvY3VzcG9pbnQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciBvZmZzO1xuXHRcdFx0aWYgKCB0aGlzLm9wdGlvbnMuZW5hYmxlZCApIHtcblx0XHRcdFx0b2ZmcyA9IHRoaXMuJGVsLm9mZnNldCgpO1xuXHRcdFx0XHR0aGlzLnNldEZvY3VzcG9pbnQoIHtcblx0XHRcdFx0XHR4OiAgMiAqIChldmVudC5wYWdlWCAtIG9mZnMubGVmdCApIC8gdGhpcy4kZWwud2lkdGgoKSAgLSAxLFxuXHRcdFx0XHRcdHk6IC0yICogKGV2ZW50LnBhZ2VZIC0gb2Zmcy50b3AgKSAvIHRoaXMuJGVsLmhlaWdodCgpICsgMSxcblx0XHRcdFx0fSApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Z2V0Rm9jdXNwb2ludDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5mb2N1c3BvaW50O1xuXHRcdH0sXG5cdFx0c2V0Rm9jdXNwb2ludDogZnVuY3Rpb24oIGZvY3VzcG9pbnQgKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHRoaXMuZm9jdXNwb2ludCA9IGZvY3VzcG9pbnQ7XG5cblx0XHRcdHRoaXMuJGVsLmZpbmQoJy5mb2N1c3BvaW50JykuY3NzKHtcblx0XHRcdFx0bGVmdDogXHQoKGZvY3VzcG9pbnQueCArIDEpICogNTApKyclJyxcblx0XHRcdFx0Ym90dG9tOlx0KChmb2N1c3BvaW50LnkgKyAxKSAqIDUwKSsnJSdcblx0XHRcdH0pO1xuXG5cdFx0XHRfLmVhY2goIHRoaXMub3B0aW9ucy5jcm9wUmVjdHMsIGZ1bmN0aW9uKHJlY3Qpe1xuXHRcdFx0XHRyZWN0LnNldEZvY3VzcG9pbnQoIHNlbGYuZm9jdXNwb2ludCApO1xuXHRcdFx0fSk7XG5cdFx0XHRpZiAoIHRoaXMub3B0aW9ucy5lbmFibGVkICkge1xuXHRcdFx0XHR0aGlzLnRyaWdnZXIoJ2NoYW5nZTpmb2N1c3BvaW50JywgdGhpcy5mb2N1c3BvaW50ICk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHR9KTtcblxuXHRyb2JvY3JvcC52aWV3LmZvY3VzcG9pbnQuSW1hZ2VGb2N1c1BvaW50U2VsZWN0ID0gVmlldy5leHRlbmQoe1xuXHRcdGNsYXNzTmFtZTpcdCdyb2JvY3JvcC1pbWFnZS1ib3gnLFxuXHRcdGNyb3BSZWN0czogW10sXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oICl7XG5cblx0XHRcdF8uZGVmYXVsdHMoIHRoaXMub3B0aW9ucywge1xuXHRcdFx0XHRjb250cm9sbGVyOiB0aGlzLFxuXHRcdFx0XHRmb2N1c3BvaW50OiB7eDowLHk6MH0sXG5cdFx0XHRcdHNyYzogZmFsc2UsXG5cdFx0XHRcdGltYWdlOiBmYWxzZSxcblx0XHRcdFx0ZW5hYmxlZDogZmFsc2UsXG5cdFx0XHR9ICk7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0aWYgKCB0aGlzLm9wdGlvbnMuaW1hZ2UgIT09IGZhbHNlICYmICh0aGlzLm9wdGlvbnMuaW1hZ2UuY29uc3RydWN0b3IucHJvdG90eXBlID09IHJvYm9jcm9wLnZpZXcuSW1nLnByb3RvdHlwZSApICkge1xuXHRcdFx0XHR0aGlzLmltYWdlID0gdGhpcy5vcHRpb25zLmltYWdlO1xuXHRcdFx0fSBlbHNlIGlmICggdGhpcy5vcHRpb25zLnNyYyAhPT0gZmFsc2UgKSB7XG5cdFx0XHRcdHRoaXMuaW1hZ2VcdD0gbmV3IHJvYm9jcm9wLnZpZXcuSW1nKCB7IHNyYzogdGhpcy5vcHRpb25zLnNyYyB9KTtcblx0XHRcdH0gZWxzZSAge1xuXHRcdFx0XHR0aGlzLmltYWdlID0gbmV3IHJvYm9jcm9wLnZpZXcuSW1nKCB7IHNyYzogJycgfSwgdGhpcy5vcHRpb25zLmltYWdlKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5jcm9wUmVjdHMgPSBbXTtcblx0XHRcdF8uZWFjaCggaW1hZ2VfcmF0aW9zLCBmdW5jdGlvbiggcmF0aW8sIGtleSApIHtcblx0XHRcdFx0dmFyIHJlY3QgPSBuZXcgQ3JvcFJlY3QoIHtcblx0XHRcdFx0XHRjb250cm9sbGVyOiBzZWxmLFxuXHRcdFx0XHRcdGZvY3VzcG9pbnQ6IHNlbGYub3B0aW9ucy5mb2N1c3BvaW50LFxuXHRcdFx0XHRcdHJhdGlvOiByYXRpb1xuXHRcdFx0XHR9ICk7XG5cdFx0XHRcdHNlbGYubGlzdGVuVG8ocmVjdCwnaGlsaXRlOnNob3cnLHNlbGYuc2hvd0hpbGl0ZSApO1xuXHRcdFx0XHRzZWxmLmxpc3RlblRvKHJlY3QsJ2hpbGl0ZTpoaWRlJyxzZWxmLmhpZGVIaWxpdGUgKTtcblx0XHRcdFx0c2VsZi5jcm9wUmVjdHMucHVzaCggcmVjdCApO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuZm9jdXNwb2ludFx0PSBuZXcgRm9jdXNQb2ludCh7XG5cdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMuY29udHJvbGxlcixcblx0XHRcdFx0Zm9jdXNwb2ludDogdGhpcy5vcHRpb25zLmZvY3VzcG9pbnQsXG5cdFx0XHRcdGVuYWJsZWQ6IFx0dGhpcy5vcHRpb25zLmVuYWJsZWQsXG5cdFx0XHRcdGNyb3BSZWN0czpcdHRoaXMuY3JvcFJlY3RzLFxuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMuZm9jdXNwb2ludCwgJ2NoYW5nZTpmb2N1c3BvaW50JywgdGhpcy52YWx1ZUNoYW5nZWQgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMuaW1hZ2UsICdsb2FkJywgdGhpcy5zZXRIZWlnaHQgKTtcblxuXHRcdFx0dGhpcy52aWV3cy5zZXQoIFsgdGhpcy5pbWFnZSwgdGhpcy5mb2N1c3BvaW50IF0gKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRzZXRIZWlnaHQ6ZnVuY3Rpb24oKXtcblx0XHRcdHZhciBuZXdIZWlnaHQgPSBNYXRoLm1pbiggdGhpcy4kZWwucGFyZW50KCkuaGVpZ2h0KCksIHRoaXMuaW1hZ2UuJGVsLmhlaWdodCgpICk7XG5cdFx0XHR0aGlzLiRlbC5oZWlnaHQoIG5ld0hlaWdodCApXG5cdFx0fSxcblx0XHRzZXRFbmFibGVkOiBmdW5jdGlvbiggZW5hYmxlZCApIHtcblxuXHRcdFx0cmV0dXJuIHRoaXMuZm9jdXNwb2ludC5zZXRFbmFibGVkKCBlbmFibGVkIClcblx0XHR9LFxuXHRcdGdldEZvY3VzcG9pbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZm9jdXNwb2ludC5nZXRGb2N1c3BvaW50KCk7XG5cdFx0fSxcblx0XHRzZXRGb2N1c3BvaW50OiBmdW5jdGlvbiggZm9jdXNwb2ludCApIHtcblx0XHRcdHRoaXMuZm9jdXNwb2ludCAmJiB0aGlzLmZvY3VzcG9pbnQuc2V0Rm9jdXNwb2ludCggZm9jdXNwb2ludCApO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRnZXRJbWFnZVdpZHRoOiBmdW5jdGlvbiggKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5pbWFnZS4kZWwuZ2V0KDApLm5hdHVyYWxXaWR0aDtcblx0XHR9LFxuXHRcdGdldEltYWdlSGVpZ2h0OiBmdW5jdGlvbiggKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5pbWFnZS4kZWwuZ2V0KDApLm5hdHVyYWxIZWlnaHQ7XG5cdFx0fSxcblx0XHRzZXRTcmM6IGZ1bmN0aW9uKCBzcmMgKSB7XG5cdFx0XHR0aGlzLmltYWdlLiRlbC5hdHRyKCAnc3JjJywgc3JjICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHZhbHVlQ2hhbmdlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLnRyaWdnZXIoJ2NoYW5nZWQnKTtcblx0XHR9LFxuXHRcdHNob3dIaWxpdGU6IGZ1bmN0aW9uKGUpe1xuXHRcdFx0dGhpcy4kZWwuYXR0cignZGF0YS1oaWxpdGUnLCd0cnVlJyk7XG5cdFx0fSxcblx0XHRoaWRlSGlsaXRlOiBmdW5jdGlvbihlKXtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtaGlsaXRlJywnZmFsc2UnKTtcblx0XHR9XG5cdH0pO1xuXG5cdHJvYm9jcm9wLnZpZXcuRnJhbWUuRm9jdXNwb2ludCA9IHJvYm9jcm9wLnZpZXcuRnJhbWUuZXh0ZW5kKHtcblx0XHRjbGFzc05hbWU6ICdhc2stZm9jdXNwb2ludCBtZWRpYS1mcmFtZScsXG5cdFx0ZXZlbnRzOiB7XG5cdFx0XHQnY2xpY2sgLnJlc2V0JzogJ3Jlc2V0Jyxcblx0XHRcdCdjbGljayAucHJvY2VlZCc6ICdwcm9jZWVkJyxcblx0XHRcdCdjbGljayAuY2FuY2VsLXVwbG9hZCc6ICdjYW5jZWxVcGxvYWQnLFxuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oICkge1xuXG5cdFx0XHRfLmRlZmF1bHRzKCB0aGlzLm9wdGlvbnMsIHtcblx0XHRcdFx0dXBsb2FkZXI6XHRmYWxzZSxcblx0XHRcdFx0dGl0bGU6XHRcdGwxMG4uU2V0Rm9jdXNQb2ludCxcblx0XHRcdFx0bW9kYWw6IHRoaXMub3B0aW9ucyA/IHRoaXMub3B0aW9ucy5tb2RhbCA6IGZhbHNlLFxuXHRcdFx0XHRzcmM6ICcnIC8vIGV4cGVjdGluZyBhbiBpbWcgZWxlbWVudFxuXHRcdFx0fSk7XG5cblx0XHRcdHJvYm9jcm9wLnZpZXcuRnJhbWUucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG5cdFx0XHRpZiAoIHRoaXMubW9kYWwgKSB7XG5cdFx0XHRcdHRoaXMubW9kYWwub24oJ2VzY2FwZScsIHRoaXMuY2FuY2VsVXBsb2FkLCB0aGlzICk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLmNyZWF0ZVRpdGxlKCk7XG5cdFx0XHR0aGlzLmNyZWF0ZUNvbnRlbnQoKTtcblx0XHRcdHRoaXMuY3JlYXRlSW5zdHJ1Y3Rpb25zKCk7XG5cdFx0XHR0aGlzLmNyZWF0ZUJ1dHRvbnMoKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG4vLyBcdFx0cmVuZGVyOiBmdW5jdGlvbigpIHtcbi8vIFx0XHRcdC8vIGZyYW1lIGxheW91dFxuLy9cbi8vIFx0XHRcdHJvYm9jcm9wLnZpZXcuTW9kYWwucHJvdG90eXBlLnJlbmRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG4vLyBcdFx0fSxcblx0XHRjcmVhdGVUaXRsZTogZnVuY3Rpb24oICkge1xuXHRcdFx0dGhpcy5fdGl0bGUgPSBuZXcgd3AubWVkaWEuVmlldyh7XG5cdFx0XHRcdHRhZ05hbWU6ICdoMSdcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5fdGl0bGUuJGVsLnRleHQoIHRoaXMub3B0aW9ucy50aXRsZSApO1xuXHRcdFx0dGhpcy50aXRsZS5zZXQoIFsgdGhpcy5fdGl0bGUgXSApO1xuXHRcdH0sXG5cdFx0Y3JlYXRlQ29udGVudDogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLl9jb250ZW50ID0gbmV3IHJvYm9jcm9wLnZpZXcuZm9jdXNwb2ludC5JbWFnZUZvY3VzUG9pbnRTZWxlY3Qoe1xuXHRcdFx0XHRzcmM6ICcnLFxuXHRcdFx0XHRmb2N1c3BvaW50OnsgeDowLCB5OjAgfSxcblx0XHRcdFx0Y29udHJvbGxlcjogdGhpcyxcblx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcblx0XHRcdFx0dG9vbGJhcjp0aGlzLnRvb2xzXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMuY29udGVudC5zZXQoIFsgdGhpcy5fY29udGVudCBdICk7XG5cdFx0fSxcblx0XHRjcmVhdGVJbnN0cnVjdGlvbnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGluZm8sIGJ0bjtcblx0XHRcdHRoaXMuaW5zdHJ1Y3Rpb25zLnNldCggW1xuXHRcdFx0XHRuZXcgd3AubWVkaWEuVmlldyh7XG5cdFx0XHRcdFx0ZWw6ICQoICc8ZGl2IGNsYXNzPVwiaW5zdHJ1Y3Rpb25zXCI+JyArIGwxMG4uRm9jdXNQb2ludEluc3RydWN0aW9ucyArICc8L2Rpdj4nIClbMF0sXG5cdFx0XHRcdFx0cHJpb3JpdHk6IC00MFxuXHRcdFx0XHR9KSxcblx0XHRcdF0gKTtcblx0XHR9LFxuXHRcdGNyZWF0ZUJ1dHRvbnM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGluZm8sIGJ0bjtcblxuXHRcdFx0dGhpcy5idXR0b25zLnNldCggW1xuXHRcdFx0XHRuZXcgd3AubWVkaWEudmlldy5CdXR0b24oe1xuXHRcdFx0XHRcdHRleHQ6IGwxMG4uQ2FuY2VsVXBsb2FkLFxuXHRcdFx0XHRcdGNsYXNzTmFtZTogJ2NhbmNlbC11cGxvYWQnXG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgd3AubWVkaWEudmlldy5CdXR0b24oe1xuXHRcdFx0XHRcdHRleHQ6IGwxMG4uUmVzZXQsXG5cdFx0XHRcdFx0Y2xhc3NOYW1lOiAncmVzZXQnXG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgd3AubWVkaWEudmlldy5CdXR0b24oe1xuXHRcdFx0XHRcdHRleHQ6IGwxMG4uT2theSxcblx0XHRcdFx0XHRjbGFzc05hbWU6ICdidXR0b24tcHJpbWFyeSBwcm9jZWVkJ1xuXHRcdFx0XHR9KVxuXHRcdFx0XSApO1xuXHRcdH0sXG5cblx0XHRzZXRTcmM6IGZ1bmN0aW9uKCBzcmMgKSB7XG5cdFx0XHR0aGlzLl9jb250ZW50LnNldFNyYyggc3JjICk7XG5cdFx0fSxcblx0XHRzZXRGaWxlOiBmdW5jdGlvbiggZmlsZSApIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcywgZnIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXHRcdFx0ZnIub25sb2FkID0gZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRzZWxmLnNldFNyYyggZnIucmVzdWx0ICk7XG5cdFx0XHR9XG5cdFx0XHRmci5yZWFkQXNEYXRhVVJMKCBmaWxlICk7XG5cdFx0fSxcblx0XHRzZXRGb2N1c3BvaW50OiBmdW5jdGlvbiggZm9jdXNwb2ludCApIHtcblx0XHRcdHRoaXMuX2NvbnRlbnQuc2V0Rm9jdXNwb2ludCggZm9jdXNwb2ludCApO1xuXHRcdFx0dGhpcy5fY29udGVudC5zZXRFbmFibGVkKHRydWUpO1xuXHRcdH0sXG5cdFx0Z2V0Rm9jdXNwb2ludDogZnVuY3Rpb24oICkge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NvbnRlbnQuZ2V0Rm9jdXNwb2ludCgpO1xuXHRcdH0sXG5cdFx0Z2V0SW1hZ2VXaWR0aDogZnVuY3Rpb24oICkge1xuXHRcdFx0cmV0dXJuIHRoaXMuX2NvbnRlbnQuZ2V0SW1hZ2VXaWR0aCgpO1xuXHRcdH0sXG5cdFx0Z2V0SW1hZ2VIZWlnaHQ6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHJldHVybiB0aGlzLl9jb250ZW50LmdldEltYWdlSGVpZ2h0KCk7XG5cdFx0fSxcblx0XHRyZXNldDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dGhpcy5zZXRGb2N1c3BvaW50KCB7IHg6MCwgeTowIH0gKVxuXHRcdH0sXG5cdFx0cHJvY2VlZDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dGhpcy50cmlnZ2VyKCdwcm9jZWVkJyk7XG5cdFx0fSxcblx0XHRjYW5jZWxVcGxvYWQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdC8vIHJlbW92ZSBmcm9tIHF1ZXVlIVxuXHRcdFx0dGhpcy50cmlnZ2VyKCdjYW5jZWwtdXBsb2FkJyk7XG5cdFx0XHR0aGlzLmNsb3NlKCk7XG5cdFx0fVxuXHR9KTtcblxufSkod3AsalF1ZXJ5KTtcbiIsIihmdW5jdGlvbih3cCwkKSB7XG5cblx0dmFyIHJvYm9jcm9wIFx0XHQ9IHdwLm1lZGlhLnJvYm9jcm9wLFxuXHRcdGltYWdlX3JhdGlvc1x0PSByb2JvY3JvcC5pbWFnZV9yYXRpb3MsXG5cdFx0aW1hZ2Vfc2l6ZXNcdFx0PSByb2JvY3JvcC5pbWFnZV9zaXplcyxcblx0XHRsMTBuXHRcdFx0PSByb2JvY3JvcC5sMTBuLFxuXHRcdG9wdGlvbnNcdFx0XHQ9IHJvYm9jcm9wLm9wdGlvbnMsXG5cdFx0Y3JvcEJ0bkhUTUxcdFx0PSAnPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJidXR0b24gcm9ib2Nyb3Atb3BlblwiPicrbDEwbi5FZGl0SW1hZ2VTaXplcysnPC9idXR0b24+Jyxcblx0XHRjcm9wTGlua0hUTUxcdD0gJzxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiYnV0dG9uLWxpbmsgcm9ib2Nyb3Atb3BlblwiPicrbDEwbi5FZGl0SW1hZ2VTaXplcysnPC9idXR0b24+JztcblxuXHR2YXIgcm9ib2Nyb3BTdGF0ZUV4dGVuZCA9IHtcblx0XHRjcmVhdGVTdGF0ZXM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5fcGFyZW50Q3JlYXRlU3RhdGVzLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdHRoaXMuc3RhdGVzLmFkZChcblx0XHRcdFx0bmV3IHJvYm9jcm9wLmNvbnRyb2xsZXIuUm9ib2Nyb3BJbWFnZSgge1xuXHRcdFx0XHRcdG1vZGVsOiB0aGlzLm1vZGVsLFxuXHRcdFx0XHRcdHNlbGVjdGlvbjogdGhpcy5vcHRpb25zLnNlbGVjdGlvblxuXHRcdFx0XHR9IClcblx0XHRcdCk7XG5cdFx0fVxuXHR9O1xuXG5cdC8vIHBvc3QgaW5saW5lIGltYWdlIGVkaXRvclxuXHRfLmV4dGVuZCggd3AubWVkaWEudmlldy5JbWFnZURldGFpbHMucHJvdG90eXBlLCB7XG5cdFx0X3BhcmVudFBvc3RSZW5kZXI6IHdwLm1lZGlhLnZpZXcuSW1hZ2VEZXRhaWxzLnByb3RvdHlwZS5wb3N0UmVuZGVyLFxuXHRcdHBvc3RSZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5fcGFyZW50UG9zdFJlbmRlci5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cdFx0XHR0aGlzLiRlbC5maW5kKCcuYWN0aW9ucycpLmFwcGVuZChjcm9wQnRuSFRNTCk7XG5cdFx0fSxcblx0XHRyb2JvY3JvcE9wZW46IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdGNvbnNvbGUubG9nKCk7XG5cdFx0XHR2YXIgc2l6ZSA9IHRoaXMubW9kZWwuZ2V0KCdzaXplJyksXG5cdFx0XHRcdGNyb3B0b29sID0gbmV3IHJvYm9jcm9wLnZpZXcuRnJhbWUuQ3JvcCgge1xuXHRcdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMuY29udHJvbGxlcixcblx0XHRcdFx0XHRtb2RlbDogdGhpcy5jb250cm9sbGVyLmltYWdlLmF0dGFjaG1lbnQsXG5cdFx0XHRcdFx0c2l6ZVRvU2VsZWN0OiBzaXplXG5cdFx0XHRcdH0gKTtcblx0XHRcdGNyb3B0b29sLm9wZW4oKTtcblx0XHR9XG5cdH0pO1xuXHR3cC5tZWRpYS52aWV3LkltYWdlRGV0YWlscy5wcm90b3R5cGUuZXZlbnRzWydjbGljayAucm9ib2Nyb3Atb3BlbiddID0gJ3JvYm9jcm9wT3Blbic7XG5cblxuXHQvLyBJbmxpbmUgTWVkaWFMaWJyYXJ5LCBHcmlkIHZpZXcgTWVkaWFMaWJyYXJ5XG5cdF8uZXh0ZW5kKCB3cC5tZWRpYS52aWV3LkF0dGFjaG1lbnQuRGV0YWlscy5wcm90b3R5cGUsIHtcblx0XHRfcGFyZW50UmVuZGVyOiB3cC5tZWRpYS52aWV3LkF0dGFjaG1lbnQuRGV0YWlscy5wcm90b3R5cGUucmVuZGVyLFxuXHRcdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLl9wYXJlbnRSZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG5cdFx0XHQvLyBtZWRpYSBsaWJyYXJ5IHNjcmVlTlxuXHRcdFx0aWYgKCBbJ2ltYWdlL2pwZWcnLCdpbWFnZS9wbmcnLCdpbWFnZS9naWYnXS5pbmRleE9mKCB0aGlzLm1vZGVsLmdldCgnbWltZScpICkgPj0gMCApIHtcblx0XHRcdFx0dGhpcy4kKCcuYXR0YWNobWVudC1hY3Rpb25zJykuYXBwZW5kKGNyb3BCdG5IVE1MKTtcblx0XHRcdFx0JCggY3JvcExpbmtIVE1MICkuaW5zZXJ0QWZ0ZXIoIHRoaXMuJGVsLmZpbmQoICdhLmVkaXQtYXR0YWNobWVudCcgKSApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0cm9ib2Nyb3BPcGVuOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgY3JvcHRvb2wgPSBuZXcgcm9ib2Nyb3Audmlldy5GcmFtZS5Dcm9wKCB7XG5cdFx0XHRcdFx0Y29udHJvbGxlcjogdGhpcy5jb250cm9sbGVyLFxuXHRcdFx0XHRcdG1vZGVsOiB0aGlzLm1vZGVsXG5cdFx0XHRcdH0pO1xuXHRcdFx0Y3JvcHRvb2wub3BlbigpO1xuXHRcdH0sXG5cdFx0X3BhcmVudENyZWF0ZVN0YXRlczogd3AubWVkaWEudmlldy5BdHRhY2htZW50LkRldGFpbHMucHJvdG90eXBlLmNyZWF0ZVN0YXRlc1xuXHR9LCByb2JvY3JvcFN0YXRlRXh0ZW5kICk7XG5cblx0d3AubWVkaWEudmlldy5BdHRhY2htZW50LkRldGFpbHMucHJvdG90eXBlLmV2ZW50c1snY2xpY2sgLnJvYm9jcm9wLW9wZW4nXSA9ICdyb2JvY3JvcE9wZW4nO1xuXG5cbn0pKHdwLGpRdWVyeSk7XG4iXX0=
