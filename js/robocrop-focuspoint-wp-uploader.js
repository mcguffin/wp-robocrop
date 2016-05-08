(function( $ ) {

	var image_ratios = window.wp_robocrop.image_ratios,
		image_sizes  = window.wp_robocrop.image_sizes,
		options = window.wp_robocrop.options,
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
					askModal = new wp.media.robocrop.view.Frame.Focuspoint({ controller: $(this) });
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
					if ( fileItem.dataUrl ) {
						askModal.setSrc( fileItem.dataUrl );
					} else {
						askModal.setFile( fileItem.blob );
					}
					askModal.open();
				} else {
					uploader.start();
				}
			}

			function addAskFocus( file, uploader ) {
				var fr;
				fileData = resolveFile( file );
				if ( fileData ) {
					askFocusImages.push( fileData );
					return true;
				} else {
					return false;
				}
			}

			/**
			 *	@return native file object or blob
			 */
			function resolveFile( file ) {
				var _ret = {
					file: file,
					blob:file.getNative(),
					dataUrl:false
				}, _ret2, bytes, i;
				if ( ! _ret.blob ) {
					_ret.blob = file.getSource();
				}
				if ( _ret.blob.getSource ) {
					_ret2 = _ret.blob.getSource();
					if ( 'string' === typeof(_ret2) ) {
						_ret.dataUrl = 'data:'+file.type+';base64,' + btoa( _ret2 );
						bytes = new Uint8Array(_ret2.length);
						for ( i=0; i < _ret2.length; i++ ) {
							bytes[i] = _ret2.charCodeAt(i);
						}
						_ret.blob = new Blob( bytes, {type: _ret.file.type } );
					}
				}
				return _ret;
			}

			// stop uploader and generate cropdata 
			this.uploader.uploader.bind('FilesAdded',function( up, files ) {
				up.stop();
				up.refresh();

				// put modal
				for (var i=0;i<files.length;i++) {
					if ( files[i].type == 'image/png' || files[i].type == 'image/jpeg' ) {
						addAskFocus( files[i], up );
					}
				}
				if ( askFocusImages.length ) {
					askFocus( up );
				} else {
					up.start();
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
						cropdata[ image_ratios[s].name ] = wp.media.robocrop.cropFromFocusPoint( imageinfo, image_ratios[s] );
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

