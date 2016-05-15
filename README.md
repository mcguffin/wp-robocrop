WP RoboCrop
===========

Focus point based image cropping in WordPress.

Developed with WordPress 4.5.2

Known Browser Support
---------------------
 - Chrome 48+
 - Firefox 44+
 - Microsoft Edge
 - IE11
 - Safari 9.1+

Known Issues
------------
 - Cropped images get weird when you use WordPress "Edit Original" Feature.


Developing:
-----------

#### Sass watch commands

##### development
`sass --watch scss/wp-robocrop-admin.scss:css/wp-robocrop-admin.css --style compressed`

##### Production
`sass --sourcemap=none --watch scss/wp-robocrop-admin.scss:css/wp-robocrop-admin.css --style compressed`

#### JS compression

run `build.sh` from the terminal
