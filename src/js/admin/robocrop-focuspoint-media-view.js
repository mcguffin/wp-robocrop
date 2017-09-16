(function(wp,$) {

	var image_ratios = window.wp_robocrop.image_ratios,
		image_sizes  = window.wp_robocrop.image_sizes,
		l10n = window.wp_robocrop.l10n;

	var View		= wp.media.View,
		MediaFrame	= wp.media.view.MediaFrame,
		FocusPoint,
		CropRect;
	
	wp.media.robocrop.view.focuspoint = {};

	CropRect = wp.media.robocrop.view.focuspoint.CropRect = View.extend({
//		tagName: 'div',
		template: wp.template('croprect'),
		className:	'tool-croprect',
		controller:null,
		initialize: function() {
			View.prototype.initialize.apply(this,arguments);
			
			_.defaults( this.options, { 
				focuspoint: null, // focuspoint coords
				ratio: null
			} );
			this.controller = this.options.controller;
			this.listenTo( this.controller.image, 'load', this.imageLoaded );
		},
// 		render: function() {
//			View.prototype.render.apply(this,arguments);
//			this.$el.css( 'padding-bottom', ( this.options.ratio * 100 ) + '%' );
// 			this.$el.attr( 'data-dir', this.options.ratio > this.controller.image.ratio ? 'w' : 'h' );
// 			return this;
// 		},
		imageLoaded:function( image ) {
			this.$el.attr( 'data-ratio-name', this.options.ratio.name + ' : 1' );
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
				res = wp.media.robocrop.cropFromFocusPoint( imageinfo, this.options.ratio ),
				coord = wp.media.robocrop.relToAbsCoords( res, imageinfo );
 			this.$el.css('left',coord.x + 'px' );
 			this.$el.css('top',coord.y + 'px' );
 			return this;
		}
	});

	FocusPoint = wp.media.robocrop.view.focuspoint.FocusPoint = View.extend({
		className:	'tool-focuspoint',
		template:	wp.template('focuspoint'),
		initialize: function(){
			var self = this;
			_.defaults( this.options, { 
				focuspoint:{x:0,y:0}, 
				enabled: false ,
				cropRects:[]
			} );
			this.options.cropRects.sort(function(a,b){
				return a.options.ratio.ratio - b.options.ratio.ratio;
// 				var ra = a.options.ratio.ratio,
// 					rb = b.options.ratio.ratio;
// 				if ( ra < rb ) {
// 					return -1;
// 				} 
// 				if ( ra > rb ) {
// 					return 1;
// 				} 
// 				return 0;
			});

			this.$el.on('click', function( event ) {
				self.clickFocuspoint( event );
			});
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

	wp.media.robocrop.view.focuspoint.ImageFocusPointSelect = View.extend({
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

			var self 		= this;

			if ( this.options.image !== false && (this.options.image.constructor.prototype == wp.media.robocrop.view.Img.prototype ) ) {
				this.image = this.options.image;
			} else if ( this.options.src !== false ) {
				this.image	= new wp.media.robocrop.view.Img( { src: this.options.src });
			} else  {
				this.image = new wp.media.robocrop.view.Img( { src: '' }, this.options.image);
			}

			this.cropRects = [];
			_.each( image_ratios, function( ratio, key ) {
				self.cropRects.push( new CropRect( {
					controller: self,
					focuspoint: self.options.focuspoint,
					ratio: ratio
				} ) );
			});

			this.focuspoint	= new FocusPoint({ 
				controller: this.controller,
				focuspoint: this.options.focuspoint,
				enabled: 	this.options.enabled,
				cropRects:	this.cropRects,
			});

			this.listenTo( this.focuspoint, 'change:focuspoint', this.valueChanged );
		},
		setEnabled: function( enabled ) {
			return this.focuspoint.setEnabled( enabled )
		},
		render: function() {
			View.prototype.render.apply(this,arguments);
			var self = this;
			this.views.set( [ this.image, this.focuspoint ] );
			return this;
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
		}
	});

	wp.media.robocrop.view.Frame.Focuspoint = wp.media.robocrop.view.Frame.extend({
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

			wp.media.robocrop.view.Frame.prototype.initialize.apply(this,arguments);

			if ( this.modal ) {
				this.modal.on('escape', this.cancelUpload, this );
			}
			this.createTitle();
			this.createContent();
			this.createInstructions();
			this.createButtons();
		},
// 		render: function() {
// 			// frame layout
// 
// 			wp.media.robocrop.view.Modal.prototype.render.apply(this,arguments);
// 		},
		createTitle: function( ) {
			this._title = new wp.media.View({
				tagName: 'h1'
			});
			this._title.$el.text( this.options.title );
			this.title.set( [ this._title ] );
		},
		createContent: function() {
			this._content = new wp.media.robocrop.view.focuspoint.ImageFocusPointSelect({
				src: '',
				focuspoint:{ x:0, y:0 },
				controller: this,
				enabled: true
			});
			this.content.set( [ this._content ] );
		},
		createInstructions: function() {
			var info, btn;
			this.instructions.set( [
				new wp.media.View({
					el: $( '<div class="instructions">' + l10n.FocusPointInstructions + '</div>' )[0],
					priority: -40
				})
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
