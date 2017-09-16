<?php

namespace Robocrop\Core;

class Core extends Module {

	/**
	 *	Private constructor
	 */
	protected function __construct() {
		add_action( 'plugins_loaded' , array( $this , 'load_textdomain' ) );
		add_action( 'init' , array( $this , 'init' ) );
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
		wp_enqueue_style( 'wp-robocrop-style', $this->get_asset_url( 'css/frontend.css' ) );
		wp_enqueue_script( 'wp-robocrop-script', $this->get_asset_url( 'js/frontend.js' ), array( 'jquery' ) );
	}

	
	/**
	 *	Load text domain
	 * 
	 *  @action plugins_loaded
	 */
	public function load_textdomain() {
		load_plugin_textdomain( 'wp-robocrop' , false, ROBOCROP_DIRECTORY . '/languages/' );
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
		$old_version = get_option( 'robocrop_version' );
		update_option( 'robocrop_version', ROBOCROP_VERSION );
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
	}

}
