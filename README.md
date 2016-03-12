Smart Crop
==========

Smart image cropping in WordPress.

Before uploading an image this plugin finds a good cropping rectangle.
If there are faces in the picture, it attempts to find a crop with as many faces as 
possible included and as few faces as possible cut in half. 

Requires at least WP 4.4


Use the WordPress JS-Uploader to make the plugin work.

 - Face detection: [https://github.com/eduardolundgren/tracking.js](tracking.js).
 - SmartCrop algorithm: [https://github.com/jwagner/smartcrop.js/](smartcrop.js).



Browser Support
---------------
Known Browser support
 - Chrome 48


ToDo:
-----
 - [x] Include cropped sizes + aspectratio2size in header
 	- [x] size item is 
 			'thumbnail' : {key: 'thumbnail', name: 'Thumbnail', width:160, height:160,crop:true,aspect:1.0000}
 	- [x] aspect item is 
 			'1.0000' : {sizes: ['thumbnail','other-rect'], aspect: 1.000, min_width:..., min_height:... }
 	- [x] adapt wp-upload
 	- [x] adapt media-view
 - [x] wp-upload
 	- [x] show modal message while analyzing and cropping
 - [ ] Error Handling
 	- [ ] Define Error cases
 - [ ] media-view
 	- [x] set wp defalt crop if no cropdata present.
 	- [x] implement analyze
 	- [x] save crops
 	- [x] Cancel
 	- [x] JS: Force reload Thumbnail after saving crop
 	- [x] JS: Ratios list: Grey out / hide unaffected imagesizes
 - [ ] UX
 	- [x] Croptool: disable save button when there is nothing to save.
	- [x] Make croptool available from edit post media modal
	- [x] Make croptool available from library view (extend wp.media.view.Attachment.Details);
	- [-] UX: start upload after an image has been processed
			*Not possible*
	- [ ] Kickout faces
 - [ ] Test 
 	- [x] autosmartcrop on edit post
 	- [ ] Test with no cropped images available (upload image, add another image size)
 		- [ ] disable autocrop, if cannot crop
 	- [ ] Test together with SayCheese
 	- [ ] Test in FF, Safari, Edge
 - [ ] Efficency
 	- [-] Serverside: only re-crop images that have been changed
 		  *Not possible due to WP image cropping internals*
 	- [ ] Minify and combine JS
 - [X] Code refactoring
 	- [x] Put main functionality in `include/` only load on `is_admin()`
 	- [x] add settings class
 - [x] Media Settings
 	- [x] enable smartcrop on upload (Default: On)
 	- [x] detect faces (Default: Off - slow)
 - [x] Security
 	- [x] serverside cropdata validation
 - [-] make smartercrop.js more robust
 - [ ] Bugs: 
 	- [x] First call of media-view dows not set crop rect
 	- [x] Open img > AutoCrop > open another img > autocrop : btns don't not get re-enabled
	- [x] Min height/width should be largest size, not smallest
	- [x] Smartcrop always cropping squares
	- [x] Smartcrop: use naturalWidth / Height in _cancrop()
 - [ ] Future
 	- [ ] Autocropping modes:
 		- [ ] Define focus point before upload

Support
-------
You like what you see? Here is a way to keep me rocking:

<a href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=F8NKC6TCASUXE"><img src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif" border="0" name="submit" alt="PayPal - The safer, easier way to pay online!" /></a>
