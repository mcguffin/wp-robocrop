<?php

namespace Robocrop\Core;

use Robocrop\Compat;

class Core extends Module {

	/**
	 *	Private constructor
	 */
	protected function __construct() {
		add_action( 'plugins_loaded' , array( $this , 'load_textdomain' ) );
		add_action( 'plugins_loaded' , array( $this , 'init_compat' ) );
		add_action( 'init' , array( $this , 'init' ) );
		add_action( 'robocrop_upgraded', array( __CLASS__ , 'upgrade'), 10, 2 );
//		add_action( 'wp_enqueue_scripts' , array( $this , 'wp_enqueue_style' ) );

		register_activation_hook( ROBOCROP_FILE, array( __CLASS__ , 'activate' ) );
		register_deactivation_hook( ROBOCROP_FILE, array( __CLASS__ , 'deactivate' ) );
		register_uninstall_hook( ROBOCROP_FILE, array( __CLASS__ , 'uninstall' ) );


		parent::__construct();
	}

	/**
	 *	Load frontend styles and scripts
	 *
	 *	@action wp_enqueue_scripts
	 */
	public function wp_enqueue_style() {
		// wp_enqueue_style( 'wp-robocrop-style', $this->get_asset_url( 'css/frontend.css' ) );
		// wp_enqueue_script( 'wp-robocrop-script', $this->get_asset_url( 'js/frontend.js' ), array( 'jquery' ) );
	}


	/**
	 *	Load text domain
	 *
	 *  @action plugins_loaded
	 */
	public function load_textdomain() {
		$path = pathinfo( dirname( ROBOCROP_FILE ), PATHINFO_FILENAME );
		load_plugin_textdomain( 'wp-robocrop', false, $path . '/languages' );
	}

	/**
	 *	Init Compatibility module
	 *
	 *  @action plugins_loaded
	 */
	public function init_compat() {
		if ( class_exists( '\RegenerateThumbnails' ) ) {
			Compat\RegenerateThumbnails::instance();
		}

	}

	/**
	 *	Init hook.
	 *
	 *  @action init
	 */
	public function init() {
	}


	/**
	 *	Fired on plugin activation
	 */
	public static function activate() {
	}

	/**
	 *	Fired on plugin deactivation
	 */
	public static function deactivate() {
	}

	/**
	 *	Fired on plugin deinstallation
	 */
	public static function uninstall() {
		delete_option( 'robocrop_version' );
		delete_option( 'robocrop_ask_for_focuspoint' );
		delete_option( 'robocrop_manage_sizes' );
		delete_option( 'robocrop_sizes' );
	}

	/**
	 *	Fired on plugin deinstallation
	 */
	public static function upgrade( $new_version, $old_version ) {
		update_option( 'robocrop_version', $new_version );
	}

}
