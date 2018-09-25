<?php

namespace Robocrop\Core;

use Robocrop\Compat;

class Core extends Plugin {

	/**
	 *	Private constructor
	 */
	protected function __construct() {
		add_action( 'plugins_loaded' , array( $this , 'load_textdomain' ) );
		add_action( 'plugins_loaded' , array( $this , 'init_compat' ) );
		add_action( 'init' , array( $this , 'init' ) );

		$args = func_get_args();
		parent::__construct( ...$args );
	}

	/**
	 *	Load frontend styles and scripts
	 *
	 *	@action wp_enqueue_scripts
	 */
	public function wp_enqueue_style() {
	}


	/**
	 *	Load text domain
	 *
	 *  @action plugins_loaded
	 */
	public function load_textdomain() {
		load_plugin_textdomain( 'wp-robocrop', false, $this->get_plugin_dir() . 'languages' );
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


}
