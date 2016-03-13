<?php



class WPSmartCropSettings {
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
		add_option( 'smartcrop_autocrop',     true );
	}

	/**
	 *	Setup options page.
	 *
	 *	@action admin_init
	 *	@uses settings_description
	 *	@uses checkbox
	 */
	function register_settings() {
		$settings_section = 'smartcrop_settings';
		// more settings go here ...
		register_setting( $this->optionset , 'smartcrop_autocrop' , 'boolval' );

		add_settings_section( $settings_section, __( 'WP Smartcrop',  'wp-smartcrop' ), array( &$this, 'settings_description' ), $this->optionset );
		// ... and here
		add_settings_field(
			'smartcrop_autocrop',
			__( 'Autocrop',  'wp-smartcrop' ),
			array( $this, 'checkbox' ),
			$this->optionset,
			$settings_section,
			array(
				'option_name' => 'smartcrop_autocrop',
				'option_label' => __('If checked images will be cropped automatically before they are uploaded','wp-smartcrop'),
				'option_description' => __('Depending on Your image sizes this may slow down the upload process.','wp-smartcrop')
			)
		);
	}

	/**
	 *	Print some documentation for the optionset
	 *
	 *	@usedby register_settings
	 */
	public function settings_description() {
		?>
		<div class="inside">
			<p><?php _e( 'Smartcrop provides a cropping tool for image thumbnails. You can enable automatic cropping upon image upload below.' , 'wp-smartcrop' ); ?></p>
		</div>
		<?php
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

WPSmartCropSettings::getInstance();
