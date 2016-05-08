(function(wp,$) {

	var image_ratios		= window.wp_robocrop.image_ratios,
		image_sizes			= window.wp_robocrop.image_sizes,
		l10n				= window.wp_robocrop.l10n,
		options				= window.wp_robocrop.options,
		cropBtnHTML			= '<button type="button" class="button robocrop-open">'+l10n.EditImageSizes+'</button>',
		cropLinkHTML		= '<button type="button" class="button-link robocrop-open">'+l10n.EditImageSizes+'</button>';
// 
// // blörx.
	var robocropStateExtend = {
		createStates: function() {
			this._parentCreateStates.apply(this,arguments);
			this.states.add(
				new wp.media.robocrop.controller.RobocropImage( {
					model: this.model,
					selection: this.options.selection
				} )
			);
		}
	};
// 
// 	var robocropHandlersExtend = {
// 		bindHandlers: function() {
// 			this._parentBindHandlers.apply( this, arguments );
// 			this.on( 'content:create:robocrop-image', this.robocropImageMode, this );
// 			this.on( 'content:render:robocrop-image', this.robocropImageModeRender, this );
// 		},
// 		robocropImageMode: function( contentRegion ) {
// 			var robocropImageController = new wp.media.robocrop.controller.RobocropImage( {
// 				model: 			robocrop_model,
// 				frame: 			this,
// 				content:		this.content
// 			} );
// 			robocropImageController._toolbar = function() {};
// 			robocropImageController._router = function() {};
// 			robocropImageController._menu = function() {};
// 			
// 			contentRegion.view = new wp.media.robocrop.view.RobocropImage( {
// 				model: 		robocrop_model,
// 				frame: 		this,
// 				controller:	this.controller
// 			});
// 		},
// 		robocropImageModeRenderer: function( view ) {
// 			view.on( 'ready', view.loadEditor );
// 		}
// 	};
// 
// 
// 	// grid view media library
// 	_.extend(	wp.media.view.MediaFrame.EditAttachments.prototype, { 
// 			_parentBindHandlers: wp.media.view.MediaFrame.EditAttachments.prototype.bindHandlers
// 		}, 
// 		robocropHandlersExtend
// 	);
// 	
// 
// 	// Inline MediaLibrary
// 	_.extend(	wp.media.view.MediaFrame.Post.prototype, { 
// 			_parentBindHandlers: wp.media.view.MediaFrame.Post.prototype.bindHandlers,
// 			_parentCreateStates: wp.media.view.MediaFrame.Post.prototype.createStates
// 		}, 
// 		robocropHandlersExtend,
// 		robocropStateExtend 
// 	);
// 
// 
// 	// post inline image editor
	_.extend( wp.media.view.ImageDetails.prototype, {
		_parentPostRender: wp.media.view.ImageDetails.prototype.postRender,
		postRender: function() {
			this._parentPostRender.apply(this,arguments);
			this.$el.find('.actions').append(cropBtnHTML);
		},
		robocropOpen: function( event ) {
			var croptool = new wp.media.robocrop.view.Frame.Crop( { controller: this.controller, model: this.controller.image.attachment } );
			croptool.open();
		}
	});
	wp.media.view.ImageDetails.prototype.events['click .robocrop-open'] = 'robocropOpen';
// 
// 	// post inline image editor
// 	_.extend( wp.media.view.MediaFrame.ImageDetails.prototype, {
// 			_parentBindHandlers: wp.media.view.MediaFrame.ImageDetails.prototype.bindHandlers,
// 			_parentCreateStates: wp.media.view.MediaFrame.ImageDetails.prototype.createStates
// 		}, 
// 		robocropHandlersExtend,
// 		robocropStateExtend 
// 	);


	// Inline MediaLibrary, Grid view MediaLibrary
	_.extend( wp.media.view.Attachment.Details.prototype, {
		_parentRender: wp.media.view.Attachment.Details.prototype.render,
		render: function() {
			this._parentRender.apply(this,arguments);
			// media library screen
			if ( this.model.get('type') === 'image' ) {
				this.$('.attachment-actions').append(cropBtnHTML);
				$( cropLinkHTML ).insertAfter( this.$el.find( 'a.edit-attachment' ) );
			}
		},
		robocropOpen: function( event ) {
			var croptool = new wp.media.robocrop.view.Frame.Crop( { controller: this.controller, model: this.model } );
			croptool.open();
		},
		_parentCreateStates: wp.media.view.Attachment.Details.prototype.createStates
	}, robocropStateExtend );
	
	wp.media.view.Attachment.Details.prototype.events['click .robocrop-open'] = 'robocropOpen';


})(wp,jQuery);
