<?php

/*
Plugin Name: WP Smart Crop
Plugin URI: https://github.com/mcguffin/wp-smart-crop/
Description: Smart crop media
Author: Jörn Lund
Version: 0.0.1
Author URI: https://github.com/mcguffin/
License: GPL2
Text Domain: smart-crop
Domain Path: /languages
*/


class WPSmartCrop {
	private static $_instance = null;
	
	public static function getInstance(){
		if ( is_null( self::$_instance ) {
			self::$_instance = new self();
		}
		return self::$_instance;
	}
	
	private function __clone(){}
	
	private function __construct(){
		add_action( 'admin_init', array($this,'admin_init') );
		add_action( 'plugins_loaded', array($this,'plugins_loaded') );
		add_action( 'wp_enqueue_media' , array( &this, 'wp_enqueue_media' ) );
	}
	
	function plugins_loaded() {
		load_plugin_textdomain( 'smart-crop', false, dirname( plugin_basename( __FILE__ ) ) . '/languages/' );
	}
	
	function admin_init() {
		wp_register_script( 'smart-crop' , plugins_url( 'js/smart-crop.js' , __FILE__ ) , array( 'jquery' ) , '0.0.1' );
		wp_localize_script( 'smart-crop' , 'smart_crop_l10n' , array(
			'image_ratios' => json_encode($this->get_image_ratios()),
		) );

		wp_register_style( 'smart-crop' , plugins_url( 'css/smart-crop.css' , __FILE__ ) , array( ) , '0.1.0' );
	}
	
	function wp_enqueue_media() {
		if ( ! did_action('wp_enqueue_media') ) 
			wp_enqueue_media();
		wp_enqueue_script( 'smart-crop');
		wp_enqueue_style( 'smart-crop' );
	}
	
	private function get_image_ratios( ) {
		$ratios = array();
		
	
	}

	private function get_image_sizes( ) {
		$sizes = array();
		// do that stuff
		
		return $sizes;
	}
}

WPSmartCrop::getInstance();