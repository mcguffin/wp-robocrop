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
