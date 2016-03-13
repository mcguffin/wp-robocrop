(function(wp,$) {

	var image_ratios = window.wp_smartcrop.image_ratios,
		image_sizes  = window.wp_smartcrop.image_sizes,
		l10n = window.wp_smartcrop.l10n;

	var View		= wp.media.View,
		MediaFrame	= wp.media.view.MediaFrame,
		Modal 		= wp.media.Modal;


	wp.media.view.FocusPointSelect = View.extend({
		className:	'set-focuspoint',
		template:	wp.template('set-focuspoint'),

		initialize: function(){
			var self = this;
			this.$el.on('click','.attachment-image',function( event ) {
				self.clickFocuspoint( event );
			});
		},
		clickFocuspoint: function( event ) {
			this.setFocuspoint( {
				x:  2 * event.offsetX / $( event.target ).width()  - 1,
				y: -2 * event.offsetY / $( event.target ).height() + 1,
			} );
		},
		getFocuspoint: function(){
			return this.focuspoint;
		},
		setFocuspoint: function( focuspoint ) {
			this.focuspoint = focuspoint;
			console.log(this.focuspoint);
			this.$el.find('.focuspoint').css({
				left: 	((focuspoint.x + 1) * 50)+'%',
				bottom:	((focuspoint.y + 1) * 50)+'%'
			});
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

	wp.media.view.AskFocuspointToolbar = View.extend({
		tagName:   'div',
		className: 'media-toolbar',
		initialize: function() {
			this.instructions = 
			this.primary   = new wp.media.view.PriorityList();
			this.primary.$el.addClass('media-toolbar-primary');
		}
	});
	wp.media.view.AskFocuspoint = MediaFrame.extend({
		className: 'ask-focuspoint media-frame',
		template:  wp.template('ask-focuspoint'),
		regions:   ['title','content','toolbar'],
		events: {
			'click .reset': 'reset',
			'click .proceed': 'proceed',
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
			this.createToolbar();
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
			this._content = new wp.media.view.FocusPointSelect({
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
		createToolbar: function() {
			var info, btn;

			this.toolbar.set( [
				new wp.media.View({
					el: $( '<div class="instructions">' + l10n.FocusPointInstructions + '</div>' )[0],
					priority: -40
				}),
				new wp.media.view.Button({
					text: l10n.done,
					className: 'button-primary proceed'
				}),
				new wp.media.view.Button({
					text: l10n.reset,
					className: 'reset'
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
		}
	});

})(wp,jQuery);
