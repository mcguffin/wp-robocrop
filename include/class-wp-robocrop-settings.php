<?php

if ( ! defined('ABSPATH') ) 
	die();



class WPRoboCropSettings {
	private static $_instance = null;
	
	/**
	 * Setup which to WP options page the Rainbow options will be added.
	 * 
	 * Possible values: general | writing | reading | discussion | media | permalink
	 */
	private $optionset = 'media'; // writing | reading | discussion | media | permalink

	/**
	 * Getting a singleton.
	 *
	 * @return object single instance of TestSettings
	 */
	public static function getInstance() {
		if ( is_null( self::$_instance ) )
			self::$_instance = new self();
		return self::$_instance;
	}

	/**
	 * Private constructor
	 */
	private function __construct() {
		add_action( 'admin_init' , array( &$this , 'register_settings' ) );

		// add default options
		add_option( 'robocrop_ask_for_focuspoint', true );
	}

	/**
	 *	Setup options page.
	 *
	 *	@action admin_init
	 *	@uses settings_description
	 *	@uses checkbox
	 */
	function register_settings() {
		$settings_section = 'robocrop_settings';
		// more settings go here ...
		register_setting( $this->optionset , 'robocrop_ask_for_focuspoint' , 'boolval' );

		add_settings_section( $settings_section, __( 'WP RoboCrop',  'wp-robocrop' ), array( &$this, 'settings_description' ), $this->optionset );
		// ... and here
		add_settings_field(
			'robocrop_ask_for_focuspoint',
			__( 'Upload with Focus Point',  'wp-robocrop' ),
			array( $this, 'checkbox' ),
			$this->optionset,
			$settings_section,
			array(
				'option_name' => 'robocrop_ask_for_focuspoint',
				'option_label' => __('If checked you will be asked to set a focus point before an image gets uploaded','wp-robocrop'),
			)
		);
	}

	/**
	 *	Print some documentation for the optionset
	 *
	 *	@usedby register_settings
	 */
	public function settings_description() {
	}
	
	/**
	 *	Output checkbox
	 *
	 *	@usedby register_settings
	 */
	public function checkbox( $args ){
		$setting = get_option( $args['option_name'] );
		?><label><?php
			?><input type="checkbox" name="<?php echo $args['option_name'] ?>" <?php checked( $setting,true,true ) ?> value="1" /><?php
			echo $args['option_label']
		?></label><?php
		if ( isset($args['option_description']) ) {
			?><p class="description"><?php
				echo $args['option_description']
			?></p><?php
		}
	}
	
}

WPRoboCropSettings::getInstance();
