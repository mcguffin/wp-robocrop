(function(wp,$) {

	var image_ratios = window.wp_robocrop.image_ratios,
		image_sizes  = window.wp_robocrop.image_sizes,
		l10n = window.wp_robocrop.l10n;

	var View		= wp.media.View,
		MediaFrame	= wp.media.view.MediaFrame,
		Modal 		= wp.media.Modal;
	
	wp.media.robocrop.view.focuspoint = {};

	wp.media.robocrop.view.focuspoint.Img = View.extend({
		className:'attachment-image',
		tagName:'img',
// 		initialize:function(){
// 			this.$el.attr('type','image');
// 		},
		getSrc: function(src) {
			return this.$el.attr( 'src' );
		},
		setSrc: function(src) {
			!!src && this.$el.attr( 'src', src );
			return this;
		}
	});

	wp.media.robocrop.view.focuspoint.FocusPoint = View.extend({
		className:	'focuspoint-box',
		template:	wp.template('focuspoint'),
		initialize: function(){
			var self = this;
			_.defaults( this.options, { focuspoint:{x:0,y:0} } );

			this.$el.on('click',function( event ) {
				self.clickFocuspoint( event );
			});
		},
		clickFocuspoint: function( event ) {
			this.setFocuspoint( {
				x:  2 * event.offsetX / $( event.target ).width()  - 1,
				y: -2 * event.offsetY / $( event.target ).height() + 1,
			} );
		},
		getFocuspoint: function() {
			return this.focuspoint;
		},
		setFocuspoint: function( focuspoint ) {
			this.focuspoint = focuspoint;
			
			this.$el.find('.focuspoint').css({
				left: 	((focuspoint.x + 1) * 50)+'%',
				bottom:	((focuspoint.y + 1) * 50)+'%'
			});
			this.trigger('change:focuspoint', this.focuspoint );
			return this;
		},
	});

	wp.media.robocrop.view.focuspoint.ImageFocusPointSelect = View.extend({
		className:	'set-focuspoint',

		initialize: function(){
			_.defaults( this.options, { controller:this, focuspoint:{x:0,y:0} } );
			var self = this;
			this.image		= new wp.media.robocrop.view.focuspoint.Img({ src: this.options.src });
			this.focuspoint	= new wp.media.robocrop.view.focuspoint.FocusPoint({ 
				controller: this.controller,
				focuspoint: this.options.focuspoint
			});
		},
		render: function(){
			this.views.set( [ this.image, this.focuspoint ] );
		},
		getFocuspoint: function() {
			return this.focuspoint.getFocuspoint();
		},
		setFocuspoint: function( focuspoint ) {
			this.focuspoint && this.focuspoint.setFocuspoint( focuspoint );
			return this;
		},
		getImageWidth: function( ) {
			return this.$el.find('img').get(0).naturalWidth;
		},
		getImageHeight: function( ) {
			return this.$el.find('img').get(0).naturalHeight;
		},
		setSrc: function( src ) {
			this.$el.find('img').attr( 'src', src );
			return this;
		}
	});

	wp.media.robocrop.view.focuspoint.AskFocuspoint = MediaFrame.extend({
		className: 'ask-focuspoint media-frame',
		template:  wp.template('ask-focuspoint'),
		regions:   ['title','content','instructions','buttons'],
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

			MediaFrame.prototype.initialize.apply(this,arguments);
	
			if ( this.modal ) {
				this.modal.on('close',this.proceed,this);
			}
			this.createTitle();
			this.createContent();
			this.createInstructions();
			this.createButtons();
		},
		render: function() {
			// frame layout
			this.$el.addClass('hide-menu').addClass('hide-router');
	
			MediaFrame.prototype.render.apply(this,arguments);
		},
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
				controller: this
			});
			var inst = new wp.media.View({
					el: $( '<div class="instructions">' + l10n.FocusPointInstructions + '</div>' )[0],
					priority: -40
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
					text: l10n.reset,
					className: 'reset'
				}),
				new wp.media.view.Button({
					text: l10n.done,
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
				self._content.setSrc( event.target.result );
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
		cancelUpload: function( event ){
			// remove from queue!
			this.trigger('cancel-upload');
			this.close();
		}
	});

})(wp,jQuery);
