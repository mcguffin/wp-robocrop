<?php

namespace Robocrop\Settings;
use Robocrop\Core;

class SettingsMedia extends Settings {

	private $optionset = 'media'; 

	/**
	 *	Constructor
	 */
	protected function __construct() {

		add_option( 'robocrop_ask_for_focuspoint', true );

		parent::__construct();

	}


	/**
	 *	Setup options.
	 *
	 *	@action admin_init
	 */
	public function register_settings() {

		$settings_section = 'robocrop_settings';

		// more settings go here ...
		register_setting( $this->optionset , 'robocrop_ask_for_focuspoint', 'boolval' );

		add_settings_section( $settings_section, __( 'WP RoboCrop',  'wp-robocrop' ), '__return_empty_string', $this->optionset );

		// ... and here
		add_settings_field(
			'robocrop_ask_for_focuspoint',
			__( 'Upload with Focus Point',  'wp-robocrop' ),
			array( $this, 'checkbox_ui' ),
			$this->optionset,
			$settings_section,
			array(
				'option_name'			=> 'robocrop_ask_for_focuspoint',
				'option_label'			=> __('If checked you will be asked to set a focus point before an image gets uploaded','wp-robocrop'),
				'option_description'	=> '',
			)
		);
	}

}
