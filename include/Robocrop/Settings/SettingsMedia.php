<?php

namespace Robocrop\Settings;
use Robocrop\Core;

class SettingsMedia extends Settings {

	private $optionset = 'media';

	/**
	 *	Constructor
	 */
	protected function __construct() {
/*
Default:
array(
	array(
		'slug'		=> 'tv',
		'name'		=> __('TV (16:9)','wp-robocrop'),
		'width'		=> 1920,
		'height'	=> 1080,
		'crop'		=> true,
		'active'	=> false,
		'downsize'	=> array(
			'lg'	=> 1440,
			'md'	=> 1024,
			'sm'	=> 768,
			'xs'	=> 480,
		)
	),
	array(
		'slug'		=> 'cinema',
		'name'		=> __('Cinemascope (2.35:1)','wp-robocrop'),
		'width'		=> 1920,
		'height'	=> 816,
		'crop'		=> true,
		'active'	=> false,
		'downsize'	=> array(
			'lg'	=> 1440,
			'md'	=> 1024,
			'sm'	=> 768,
			'xs'	=> 480,
		)
	),
	array(
		'slug'		=> 'din-landscape',
		'name'		=> __('DIN Landscape','wp-robocrop'),
		'width'		=> 1920,
		'height'	=> 1358,
		'crop'		=> true,
		'active'	=> false,
		'downsize'	=> array(
			'lg'	=> 1440,
			'md'	=> 1024,
			'sm'	=> 768,
			'xs'	=> 480,
		)
	),
	array(
		'slug'		=> 'din-portrait',
		'name'		=> __('DIN Portrait','wp-robocrop'),
		'width'		=> 1920,
		'height'	=> 2716,
		'crop'		=> true,
		'active'	=> false,
		'downsize'	=> array(
			'lg'	=> 1440,
			'md'	=> 1024,
			'sm'	=> 768,
			'xs'	=> 480,
		)
	),
)
*/
		add_option( 'robocrop_ask_for_focuspoint', true, '', true );
		add_option( 'robocrop_sizes', array(), '', true );
		add_option( 'robocrop_manage_sizes', false, '', true );
		add_option( 'robocrop_save_sizes', false, '', true );

		add_action( "load-options-media.php", array( $this, 'enqueue_assets') );

		parent::__construct();

	}

	/**
	 *	@return	string	path to json
	 */
	public function get_theme_json_file() {
		$ds = DIRECTORY_SEPARATOR;
		return get_stylesheet_directory() . $ds . 'robocrop-json' . $ds . 'image-sizes.json';
	}

	/**
	 *	Enqueue settings Assets
	 *
	 *	@action "settings_page_{$this->optionset}
	 */
	public function enqueue_assets() {
		$suffix = SCRIPT_DEBUG ? '' : '.min';
		$core = Core\Core::instance();
		$media = Core\MediaHelper::instance();

		$theme_sizes_file	= $this->get_theme_json_file();
		$theme_sizes		= false;

		if ( file_exists( $theme_sizes_file ) ) {
			$theme_data		= json_decode( file_get_contents( $theme_sizes_file ), true );
			$theme_sizes	= $theme_data['sizes'];
		}

		wp_enqueue_media();
		wp_enqueue_style( 'wp-robocrop-settings', $core->get_asset_url( "css/settings/media{$suffix}.css" ), array(), $core->get_version() );
		wp_enqueue_script( 'wp-robocrop-settings', $core->get_asset_url( "js/settings/media{$suffix}.js" ), array( 'jquery' ), $core->get_version() );
		wp_localize_script('wp-robocrop-settings','wp_robocrop_settings',array(
			'options'	=> array(
				'sizes'					=> array(
					'current'	=> $this->sanitize_sizes( get_option( 'robocrop_sizes' ) ),
					'original'	=> $this->sanitize_sizes( $media->get_image_sizes( false, true ) ),
					'theme'		=> $this->sanitize_sizes( $theme_sizes ),
				),
				'rounding_precision'	=> apply_filters('robocrop_rounding_precision', 2 ),
				'theme_sizes_enabled'	=> is_dir( dirname( $theme_sizes_file ) ),
			),
			'l10n'		=> array(),
		));
	}

	/**
	 *	Setup options.
	 *
	 *	@action admin_init
	 */
	public function register_settings() {

		$settings_section = 'robocrop_settings';

		// more settings go here ...
		register_setting( $this->optionset, 'robocrop_ask_for_focuspoint', 'boolval' );
		register_setting( $this->optionset, 'robocrop_manage_sizes', 'boolval' );
		register_setting( $this->optionset, 'robocrop_save_sizes', 'boolval' );
		register_setting( $this->optionset, 'robocrop_sizes', array( $this, 'sanitize_sizes' ) );

		add_settings_section( $settings_section, __( 'WP RoboCrop',  'wp-robocrop' ), '__return_empty_string', $this->optionset );

		// ... and here
		$option_name = 'robocrop_ask_for_focuspoint';
		add_settings_field(
			$option_name,
			__( 'Upload with Focus Point',  'wp-robocrop' ),
			array( $this, 'checkbox_ui' ),
			$this->optionset,
			$settings_section,
			array(
				'option_name'			=> $option_name,
				'option_label'			=> __('If checked you will be asked to set a focus point before an image gets uploaded','wp-robocrop'),
				'option_description'	=> '',
			)
		);

		// ... and here
		$option_name = 'robocrop_manage_sizes';
		add_settings_field(
			$option_name,
			__( 'Custom Image Sizes',  'wp-robocrop' ),
			array( $this, 'checkbox_ui' ),
			$this->optionset,
			'default',
			array(
				'option_name'			=> $option_name,
				'option_label'			=> __('Let Robocrop manage image sizes.','wp-robocrop'),
				'option_description'	=> __('If checked you will be able to manage all image sizes here.','wp-robocrop'),
				'class'					=> 'robocrop-manage-sizes' . ( get_option( $option_name ) ? '' : ' off' ),
			)
		);


		$option_name = 'robocrop_sizes';
		add_settings_field(
			$option_name,
			__( 'Additional Sizes',  'wp-robocrop' ),
			array( $this, 'sizes_ui' ),
			$this->optionset,
			'default',
			array(
				'option_name'			=> $option_name,
				'option_label'			=> __('Add additional image sizes', 'wp-robocrop' ),
				'option_description'	=> '',
				'class'					=> 'robocrop-sizes',
			)
		);

	}

	/**
	 *	@param array $args
	 */
	public function sizes_ui( $args ) {

		$core = Core\Core::instance();

		@list( $option_name, $label, $description ) = array_values( $args );

		$sizes = get_option( $option_name );

		include implode( DIRECTORY_SEPARATOR,
			array( $core->get_plugin_dir(), 'include', 'views', 'settings', 'sizes.php' )
	 	);
	}

	/**
	 *	@param mixed $sizes
	 *	@return array
	 */
	public function sanitize_sizes( $sizes ) {
		$return = array();

		if ( ! is_array( $sizes ) ) {
			return $return;
		}
		$sanitize = array(
			'key'			=> 'sanitize_title',
			'name'			=> 'esc_html',
			'width'			=> 'intval',
			'height'		=> 'intval',
			'crop'			=> 'boolval',
			'selectable'	=> 'boolval',
			'scaled'		=> array( $this, 'sanitize_scaled' )
		);
		foreach ( $sizes as $key => $size ) {
			$size = wp_parse_args( $size, array(
				'key'			=> '',
				'name'			=> '',
				'width'			=> 0,
				'height'		=> 0,
				'crop'			=> false,
				'selectable'	=> false,
				'scaled'		=> array(),
			));
			foreach( $sanitize as $k => $cb ) {
				$size[$k] = call_user_func($cb,$size[$k]);
			}
			if ( ! empty( $size['key'] ) ) {
				$return[ $size['key'] ] = $size;
			}
		}
		if ( isset( $_REQUEST[ 'robocrop_save_sizes' ] ) && intval( $_REQUEST[ 'robocrop_save_sizes' ] ) ) {
			$data = array(
				'sizes'		=> $return,
				'updated'	=> time(),
			);
			file_put_contents( $this->get_theme_json_file(), json_encode( $data, JSON_PRETTY_PRINT ) );
		}

		return $return;
	}

	/**
	 *	@param mixed $scaled
	 *	@return array	assoc
	 */
	public function sanitize_scaled($scaled) {
		$scaled = (array) $scaled;
		$sanitized = array();
		foreach ( $scaled as $key => $value ) {
			if ( ! is_string($key) || ! boolval($key) || ! floatval($value) ) {
				continue;
			}
			$sanitized[ sanitize_title($key) ] = floatval( $value );
		}
		return $sanitized;
	}

	/**
	 *	@inheritdoc
	 */
	public function activate(){

	}

	/**
	 *	@inheritdoc
	 */

	public function deactivate(){

	}

	/**
	 *	@inheritdoc
	 */
	public function upgrade( $new_version, $old_version ){

	}

	/**
	 *	@inheritdoc
	 */
	public function uninstall() {
		delete_option( 'robocrop_version' );
		delete_option( 'robocrop_ask_for_focuspoint' );
		delete_option( 'robocrop_manage_sizes' );
		delete_option( 'robocrop_sizes' );
	}

}
