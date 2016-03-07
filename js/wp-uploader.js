(function(exports,SmarterCrop,plupload){

	var image_ratios = window.wp_smartcrop.image_ratios,
		image_sizes  = window.wp_smartcrop.image_sizes,
		l10n = window.wp_smartcrop.l10n,
		options = window.wp_smartcrop.options,
		oldReady = exports.media.view.UploaderWindow.prototype.ready,
		didReady = false;
	
	/**
	 *	Early return if autocrop is disabled
	 */
	if ( ! options.autocrop ) {
		return;
	}

	
	exports.media.view.UploaderWindow.prototype.ready = function() {

		// prevent double init
		if ( didReady )
			return oldReady.apply( this , arguments );
		didReady = true;
		
		var crops = {},
			self = this,
			old_start, start_to,
			msg, ret;
		function countCrops() {
			var len=0;
			for (var s in crops)
				len++;
			return len;
		}
		function crop( file, up ) {
			if ( ! file ) {
				console.log(file);
				return false;
			}
			var s, croppers={};
			function check() {
				var s,t;
				for (s in crops )
					for (t in crops[s] )
						if ( ! crops[s][t] )
							return false;
				return true;
			}
			function mkCropData(data,ratio){
				return {
					names: ratio.sizes,
					x: data.x,
					y: data.y,
					width: data.width,
					height: data.height,
				};
			}
			for (s in image_ratios) {
				croppers[s] = new SmarterCrop(image_ratios[s],options);
				croppers[s].on('cancrop',function( ratio ) {
					crops[ file.name ][ ratio.name ] = false;
				});
				croppers[s].cropFile( file );
				croppers[s].on('cropresult' , function(cropData,ratio) {
					if ( !!cropData ) {
						!crops[ file.name ] && (crops[file.name] = {});
						crops[ file.name ][ ratio.name ] = mkCropData( cropData.relative, ratio );
						if ( check() ) {
							up.start();
						}
					}
				});
			}
			return true;
		}

		ret = oldReady.apply( this , arguments );
		
		
		function resolveFile( file ) {
			var _ret = file.getNative();
			if ( _ret ) {
				return _ret;
			}
			_ret = file.getSource();
			_ret2 = _ret.getSource();
			if ( 'string' === typeof(_ret2) ) {
				var bytes = new Uint8Array(_ret2.length);
				for (var i=0; i<_ret2.length; i++) {
					bytes[i] = _ret2.charCodeAt(i);
				}
				return new Blob(bytes,{type:file.type});
			}
			return null;
		}
		
		// stop uploader and generate cropdata 
		this.uploader.uploader.bind('FilesAdded',function(up, files ) {
			var images = 0, file;
			up.stop();

			// put modal
			for (var i=0;i<files.length;i++) {
				if ( files[i].type == 'image/png' || files[i].type == 'image/jpeg' ) {
					crops[ files[i].name ] = {};
					if ( crop( resolveFile( files[i] ), up ) ) {
						images++;
					}
				}
			}
			if ( !!images ) {
//				showMessage();
			} else {
				console.log('crop:up.start');
				up.start();
			}
		});
		// send cropdata 
		this.uploader.uploader.bind('BeforeUpload',function(up, file ) {
//			delete up.settings.multipart_params.cropdata;
			if ( crops[file.name] ) {
				up.settings.multipart_params.cropdata = JSON.stringify(crops[file.name]);//crops[file.name]; //escape();
			}
		});
		return ret;
	};


})(wp,SmarterCrop,plupload);

