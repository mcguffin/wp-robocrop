<?php

/*
Plugin Name: WP RoboCrop
Description: Manual and Focus Point based image cropping.
Plugin URI: https://github.com/mcguffin/wp-robocrop/
Author: Jörn Lund
Version: 0.1.0
Author URI: https://github.com/mcguffin/
License: GPL2
Text Domain: wp-robocrop
Domain Path: /languages
*/


if ( ! defined('ABSPATH') ) 
	die();


if ( is_admin() || defined( 'DOING_AJAX' ) ) {
	require_once plugin_dir_path(__FILE__).'/include/class-wp-robocrop-admin.php';
}

if ( is_admin() ) {
	require_once plugin_dir_path(__FILE__).'/include/class-wp-robocrop-settings.php';
}

