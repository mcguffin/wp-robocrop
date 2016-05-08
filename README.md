WP RoboCrop
===========

Manual and Focus Point based image cropping in WordPress.

Developed with WordPress 4.5.2

Known Browser Support
---------------------
 - Chrome 48+
 - Firefox 44+

Known Issues
------------
 - [SayCheese](https://github.com/mcguffin/say-cheese): Focuspoint will not be saved on upload. 

Developing:
-----------

#### Sass watch

##### development
`sass --watch scss/wp-robocrop-admin.scss:css/wp-robocrop-admin.css --style compressed`

##### Production
`sass --sourcemap=none --watch scss/wp-robocrop-admin.scss:css/wp-robocrop-admin.css --style compressed`


ToDo:
-----
 - [ ] Test 
 	- [ ] Test together with [SayCheese](https://github.com/mcguffin/say-cheese)
 		- [ ] Bug: Focuspoint does not get saved. BeforeUpload triggered immediate after file added.
 		- [ ] Sometimes images are not disaplayed in the media library (and plupload throws an exception)
 	- [ ] X-Browser
 		- [x] Chrome
 		- [x] FF
 		- [ ] Safari
 		- [ ] Edge
 		- [ ] IE10-11
