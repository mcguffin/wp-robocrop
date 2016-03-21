WP RoboCrop
===========

Manual and Focus Point based image cropping in WordPress.

Developed with WordPress 4.5-beta

Known Browser Support
---------------------
 - Chrome 48+
 - Firefox 44+

Known Issues
------------
 - [SayCheese](https://github.com/mcguffin/say-cheese): Focuspoint will not be saved on upload. 

ToDo:
-----
 - [ ] Test 
 	- [ ] Test together with [SayCheese](https://github.com/mcguffin/say-cheese)
 		- [ ] Bug: Focuspoint does not get saved. BeforeUpload triggered immediate after file added.
 		- [ ] Sometimes images are not disaplayed in the media library (and plupload throws an exception)
 	- [ ] X-Browser
 		- [x] FF
 		- [ ] Safari
 		- [ ] Edge
 		- [ ] IE10-11
 - [x] Efficency
 	- [x] Minify and combine JS
 	- [ ] Cleanup css
 - [ ] UX
 	- [ ] At MediaFrame upload: setting State rather than opening a new modal
	- [ ] Option to disable focuspoint at post edit
 - [x] Default rounding precision to 2
 - [ ] Bug: Button does not work at MediaFrame.Select
