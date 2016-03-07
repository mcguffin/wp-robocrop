<?php

/*
Plugin Name: WP Smart Crop
Plugin URI: https://github.com/mcguffin/wp-smart-crop/
Description: Smart crop media
Author: Jörn Lund
Version: 0.0.1
Author URI: https://github.com/mcguffin/
License: GPL2
Text Domain: wp-smartcrop
Domain Path: /languages
*/


if ( ! defined('ABSPATH') ) 
	die();


if ( is_admin() || defined( 'DOING_AJAX' ) ) {
	require_once plugin_dir_path(__FILE__).'/include/class-wp-smartcrop-admin.php';
}

if ( is_admin() ) {
	require_once plugin_dir_path(__FILE__).'/include/class-wp-smartcrop-settings.php';
}

