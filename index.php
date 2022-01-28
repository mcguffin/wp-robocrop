<?php

/*
Plugin Name: WP Robocrop
Plugin URI: https://github.com/mcguffin/wp-robocrop
Bitbucket Plugin URI: https://github.com/mcguffin/wp-robocrop.git
Description: Focus point based image cropping in WordPress
Author: Jörn Lund
Version: 1.2.5
Github Plugin URI: mcguffin/wp-robocrop
Requires WP: 4.8
Requires PHP: 5.6
Author URI: https://github.com/mcguffin/
License: GPL3

Text Domain: wp-robocrop
Domain Path: /languages/
*/

/*  Copyright 2017  Jörn Lund

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License, version 2, as
    published by the Free Software Foundation.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/

/*
Plugin was generated by WP Plugin Scaffold
https://github.com/mcguffin/wp-plugin-scaffold
Command line args were: `"WP Robocrop" core+css+js admin+css+js settings:media gulp git --force`
*/


namespace Robocrop;

require_once __DIR__ . DIRECTORY_SEPARATOR . 'include/autoload.php';

Core\Core::instance( __FILE__ );

Core\MediaHelper::instance();

if ( is_admin() ) {
	Settings\SettingsMedia::instance();

	Admin\Admin::instance();
}
