(function( $ ) {

	var robocrop = wp.media.robocrop,
		image_ratios = robocrop.image_ratios,
		image_sizes  = robocrop.image_sizes,
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

