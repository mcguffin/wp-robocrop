<?php

if ( ! defined('ABSPATH') ) 
	die();



class WPRoboCropAdmin {

	/**
	 *	Singleton instance
	 */
	private static $_instance	= null;

	/**
	 *	(uint) Default rounding precision for image ratios
	 *	Add a filter for this later
	 */
	private $ratio_precision 	= 4;

	/**
	 *	(assoc) crops gotten from request
	 */
	private $_crops				= array();

	/**
	 *	(assoc) crops gotten from request
	 */
	private $_focuspoint		= null;
	
	private $previous_metadata	= null;

	/**
	 *	Get singleton instance
	 */
	public static function getInstance() {
		if ( is_null( self::$_instance ) ) {
			self::$_instance = new self();
		}
		return self::$_instance;
	}
	
	/**
	 *	Prevent cloning
	 */
	private function __clone(){}
	
	/**
	 *	Private constructor
	 */
	private function __construct() {
		add_action( 'plugins_loaded',         array( $this, 'plugins_loaded' ) );
		add_action( 'admin_init',             array( $this, 'admin_init' ) );

		add_action( 'wp_enqueue_media' ,      array( $this, 'wp_enqueue_media' ) );
		add_action( 'print_media_templates',  array( $this, 'print_media_templates' ) );
		add_filter( 'plupload_init', array( $this, 'plupload_init' ) , 20);

		add_action( 'edit_attachment',        array( $this, 'edit_attachment' ) );

		add_filter( 'wp_generate_attachment_metadata', array( $this, 'wp_generate_attachment_metadata'), 10, 2 );

		add_filter( 'image_resize_dimensions', array( $this, 'image_resize_dimensions'), 10, 6 );

		add_filter( 'wp_prepare_attachment_for_js' , array( $this , 'wp_prepare_attachment_for_js' ),10,3);
	}
	
	
	/**
	 *	@action 'plugins_loaded'
	 */
	function plugins_loaded() {
		load_plugin_textdomain( 'wp-robocrop', false, dirname( plugin_basename( dirname(__FILE__) ) ) . '/languages/' );
	}

	/**
	 *	@action 'admin_init'
	 */
	function admin_init() {
		$version = '0.0.1';

		$script_l10n = array(
			'image_ratios' => $this->get_image_ratios(),
			'image_sizes'  => $this->get_image_sizes(),
			'l10n' => array(
				'cropImage'			=> __('Crop Image','wp-robocrop'),
				'robocropImage'		=> __('Robo Crop Image','wp-robocrop'),
				'back'				=> __('Back', 'wp-robocrop'),
				'okay'				=> __('Okay', 'wp-robocrop'),
				'done'				=> __('Done', 'wp-robocrop'),
				'reset'				=> __('Reset', 'wp-robocrop'),
				'Image'				=> __('Image', 'wp-robocrop'),
				'ImageSize'			=> __('Image size', 'wp-robocrop'),
				'AnalyzingImage'	=> __('Analyzing Image','wp-robocrop'),
				'SetFocusPoint'		=> __('Set Focus Point','wp-robocrop'),
				'FocusPointInstructions'
									=> __('Click on the most important spot of the image.','wp-robocrop'),
				'CancelUpload'		=> __('Cancel Upload','wp-robocrop'),
			),
			'options'		=> array(
				'ask_for_focuspoint'		=> !! get_option('robocrop_ask_for_focuspoint'),
			),
		);

		if ( defined('SCRIPT_DEBUG') && SCRIPT_DEBUG ) {

			wp_register_script( 'wp-robocrop-base' , 
								plugins_url( 'js/robocrop-base.js', dirname(__FILE__) ) , 
								array() , $version 
							);

			wp_register_script( 'wp-robocrop-focuspoint-media-view' , 
								plugins_url( 'js/robocrop-focuspoint-media-view.js', dirname(__FILE__) ) , 
								array('jquery', 'media-grid', 'wp-robocrop-base' ) , $version 
							);

			wp_register_script( 'wp-robocrop-media-view' , 
								plugins_url( 'js/robocrop-media-view.js' , dirname(__FILE__) ) , 
								array('media-grid', 'wp-robocrop-focuspoint-media-view', 'wp-robocrop-base') , $version );

			wp_register_script( 'wp-robocrop', 
								plugins_url( 'js/robocrop-focuspoint-wp-uploader.js', dirname(__FILE__) ) , 
								array('wp-robocrop-focuspoint-media-view', 'wp-robocrop-base', 'wp-robocrop-media-view' ) , $version 
							);

			wp_localize_script( 'wp-robocrop-focuspoint-media-view' , 'wp_robocrop' , $script_l10n );

		} else {
			wp_register_script( 'wp-robocrop' , plugins_url( 'js/wp-robocrop.combined.min.js' , dirname(__FILE__) ) , array( 'jquery', 'media-grid' ) , $version );
			wp_localize_script( 'wp-robocrop' , 'wp_robocrop' , $script_l10n );
		}

		wp_register_style( 'wp-robocrop-admin' , plugins_url( 'css/wp-robocrop-admin.css' , dirname(__FILE__) ) , array( ) , $version );
	}
	
	/**
	 *	Enable client side image resize.
	 *
	 *	@filter 'plupload_init'
	 */
	function plupload_init( $params ) {
		// get biggest possible image
		$sizes = $this->get_image_sizes();
		$largest = array( 'width'=>0 , 'height'=>0 );
		foreach ( $sizes as $size ) {
			$largest['width'] = max($size['width'],$largest['width']);
			$largest['height'] = max($size['height'],$largest['height']);
		}
		$params['resize'] = array(
			'enabled' => true,
			'width'		=> intval($largest['width']),
			'height'	=> intval($largest['height']),
			'quality'	=> 90
		);
		return $params;
	}


	/**
	 *	Read cropdata from our Cropping tool and keep it for later use.
	 *	We're expecting absolute coords (x, y, width and height in pixel) here.
	 *
	 *	@action 'edit_attachment'
	 */
	function edit_attachment( $attachment_ID ) {

		if ( wp_attachment_is_image( $attachment_ID ) ) {
			
			$this->previous_metadata = wp_get_attachment_metadata( $attachment_ID );
			
			if ( isset( $_REQUEST[ 'attachments' ], $_REQUEST[ 'attachments' ][$attachment_ID] ) ) {
				if ( isset( $_REQUEST[ 'attachments' ][$attachment_ID]['sizes'] ) ) {

					// store crop information from user request
					foreach ( $_REQUEST[ 'attachments' ][$attachment_ID]['sizes'] as $sizeslug => $size ) {
						if ( isset( $size['cropdata'] ) ) {
							// sanitize cropdata
							$size_cropdata = array_map( 'floatval', $size['cropdata'] );
							$this->_crops[$sizeslug] = $size_cropdata;
						}
					}
				}
			}

			// trigger sizes regeneration
			$fullsizepath = get_attached_file( $attachment_ID );
			$metadata = wp_generate_attachment_metadata( $attachment_ID, $fullsizepath );
			if ( ! is_wp_error( $metadata ) && !empty( $metadata ) ) {
				// If this fails, then it just means that nothing was changed (old value == new value)
				wp_update_attachment_metadata( $attachment_ID, $metadata );
			}
		}
	}

	/**
	 *	@action 'print_media_templates'
	 */
	function print_media_templates() {
		// cropping tool
		include __DIR__.'/template/robocrop-tpl.php';
		include __DIR__.'/template/robocrop-select-tpl.php';
		include __DIR__.'/template/robocrop-select-item-tpl.php';

		// focus point editor
		include __DIR__.'/template/robocrop-ask-focuspoint-tpl.php';
		include __DIR__.'/template/robocrop-focuspoint-tpl.php';
	}

	/**
	 *	Add our cropdata to js image data
	 *
	 *	@filter 'wp_prepare_attachment_for_js'
	 */
	function wp_prepare_attachment_for_js( $response, $attachment, $meta ) {
		if ( isset($response['sizes'],$meta['sizes'] ) ) {
			foreach ( $meta['sizes'] as $size => $sizedata ) {
				if ( isset( $sizedata['cropdata'] ) ) {
					$response['sizes'][$size]['cropdata'] = array_map('intval',$sizedata['cropdata']);
				}
			}
		}

		if ( isset( $meta['focuspoint'] ) ) {
			$response['focuspoint'] = $meta['focuspoint'];
		} else {
			$response['focuspoint'] = array( 'x' => 0, 'y' => 0 );
		}
		return $response;
	}

	/**
	 *	Add crop data to image metadata
	 *
	 *	@filter 'wp_generate_attachment_metadata'
	 */
	function wp_generate_attachment_metadata( $metadata, $attachment_id ) {
		if ( isset($metadata['sizes']) ) {
			foreach ( $metadata['sizes'] as $sizeslug => $size ) {
				if ( isset( $this->_crops[$sizeslug] ) ) {
					$metadata['sizes'][$sizeslug]['cropdata'] = $this->_crops[$sizeslug];
				}
			}
		}

		if ( isset( $_REQUEST['focuspoint'] ) ) {
			// upload
			$metadata['focuspoint'] = $this->sanitize_focuspoint( json_decode( stripslashes( $_REQUEST['focuspoint'] ) ) );
		} else if ( isset( $_REQUEST[ 'attachments' ][$attachment_id]['focuspoint'] ) ) { 
			// save image
			$metadata['focuspoint'] = $this->sanitize_focuspoint( $_REQUEST[ 'attachments' ][$attachment_id]['focuspoint'] );
		} else if ( isset( $this->previous_metadata, $this->previous_metadata['focuspoint'] ) ) {
			// keep old value when updating from somewhere else
			$metadata['focuspoint'] = $this->previous_metadata['focuspoint'];
		}
		return $metadata;
	}
	
	/**
	 *	See if there is cropdata in the HTTP-Request.
	 *	On WP Upload we don't know the actual image dimensions,
	 *	so we expect x, y, width and height in fractions of the actual image width and height.
	 *
	 *	@uses get_image_size
	 *	@usedby image_resize_dimensions()
	 *	
	 *	@param	$orig_w	int
	 *	@param	$dest_h	int
	 *	@param	$dest_w	int
	 *	@param	$dest_w	int
	 *	@return bool|array	a set of cropdata or false if not found
	 */
	private function _get_cropsize_from_request( $orig_w, $orig_h, $dest_w, $dest_h ) {
		if ( isset( $_REQUEST['cropdata'] ) ) {
			$cropdata = json_decode(stripslashes($_REQUEST['cropdata']));
			if ( is_object( $cropdata ) ) {
				// what size are we working with
				list( $sizeslug, $size ) = $this->get_image_size( $dest_w, $dest_h, true );
				foreach ( $cropdata as $cropsize ) {
					if ( isset($cropsize->names) && in_array($sizeslug, $cropsize->names ) ) {
						return array(
							'x'      => floatval( $cropsize->x )      * $orig_w,
							'y'      => floatval( $cropsize->y )      * $orig_h,
							'width'  => floatval( $cropsize->width )  * $orig_w,
							'height' => floatval( $cropsize->height ) * $orig_h,
						);
					}
				}
			}
		}
		return false;
	}
	
	/**
	 *	@filter 'image_resize_dimensions'
	 */
	function image_resize_dimensions( $result, $orig_w, $orig_h, $dest_w, $dest_h, $crop ) {

		if ( $crop ) {
			
			// get sizeslug and size
			list( $sizeslug, $size ) = $this->get_image_size( $dest_w, $dest_h, $crop );

			// see if we have crop info in $_REQUEST
			$cropsize = $this->_get_cropsize_from_request( $orig_w, $orig_h, $dest_w, $dest_h );

			// see if cropsize is already defined
			if ( ! $cropsize && ! empty($this->_crops) ) {
				// get image size by ratio
				if ( isset( $this->_crops[$sizeslug] ) ) {
					$cropsize = $this->_crops[$sizeslug];
				}
			}
			if ( $cropsize ) {
				$this->_crops[$sizeslug] = $cropsize;
				$result = array( 0, 0, $cropsize['x'], $cropsize['y'], $dest_w, $dest_h, $cropsize['width'], $cropsize['height'] );
			}
		}
		return $result;
	}
	
	/**
	 *	@action 'wp_enqueue_media'
	 */
	function wp_enqueue_media() {
		if ( ! did_action('wp_enqueue_media') ) 
			wp_enqueue_media();
		wp_enqueue_script( 'wp-robocrop' );

		wp_enqueue_style( 'wp-robocrop-admin' );
	}
	
	/**
	 *	Get image ratios and a ratio to size mapping.
	 *
	 *	@return associateve array containing defined image ratios
	 */
	private function get_image_ratios( ) {
		$int_ratios = array();
		$ratios = array();
		$all_sizes = $this->get_image_sizes();
		foreach ( $all_sizes as $key => $size ) {
			if ( $size['crop'] ) {
				$ratio = $size['ratio'];
				$ratio_key = strval( $ratio );
				if ( ! isset( $ratios[$ratio_key] ) ) {
					$ratios[$ratio_key] = array('sizes'=> array(), 'name' => $ratio_key, 'ratio' => $ratio, 'min_width' => 9999, 'min_height' => 9999 );
				}
				$ratios[$ratio_key]['sizes'][]    = $key;
				$ratios[$ratio_key]['min_width']  = min( $ratios[$ratio_key]['min_width'],  $size['width'] );
				$ratios[$ratio_key]['min_height'] = min( $ratios[$ratio_key]['min_height'], $size['height'] );
			}
		}
		
		return $ratios;
	}
	
	/**
	 *	Get image size based on width and height
	 *	
	 *	@param	$width	int Image width
	 *	@param	$height	int Image height
	 *	@param	$crop	bool|null	crop yes, no or don't care
	 *
	 *	@return array with size slug and size array
	 */
	private function get_image_size( $width, $height, $crop = null ) {
		$sizes = $this->get_image_sizes();
		foreach ( $sizes as $key => $size ) {
			if ( $size['width'] == intval($width) &&
				 $size['height'] == intval($height) &&
				 (( !is_null($crop) && $size['crop'] == $crop ) || is_null($crop))
			) {
				return array($key,$size);
			}
		}
	}
	
	/**
	 *	Get all image sizes
	 *	
	 *	@return assocative array with all image sizes, their names and labels
	 */
	private function get_image_sizes( ) {

		global $_wp_additional_image_sizes;

		$sizes = array();
		
		/**
		 * Get rounding precision for image ratios.
		 * E.g. 16/9 = 1.7777777.. will be rounded to 1.7778
		 *
		 * @param int $precision decimal places after rounding
		 */
		$precision = apply_filters('robocrop_rounding_precision', 4 );
		
		// get size names
		$size_names = apply_filters( 'image_size_names_choose', array(
			'thumbnail' => __( 'Thumbnail' ),
			'medium'    => __( 'Medium' ),
			'large'     => __( 'Large' ),
			'full'      => __( 'Full Size' )
		) );
		
		
		$get_intermediate_image_sizes = get_intermediate_image_sizes();

		// Create the full array with sizes and crop info
		foreach( $get_intermediate_image_sizes as $_size ) {
			
			if ( in_array( $_size, array( 'thumbnail', 'medium', 'large' ) ) ) {
				$w    = intval( get_option( $_size . '_size_w' ) );
				$h    = intval( get_option( $_size . '_size_h' ) );
				$crop = (bool) get_option( $_size . '_crop' );
			} elseif ( isset( $_wp_additional_image_sizes[ $_size ] ) ) {
				$w    = intval( $_wp_additional_image_sizes[ $_size ]['width'] );
				$h    = intval( $_wp_additional_image_sizes[ $_size ]['height'] );
				$crop = (bool) $_wp_additional_image_sizes[ $_size ]['crop'];
			}
			$sizes[$_size] = array(
				'name'	=> isset($size_names[$_size]) ? $size_names[$_size] : $_size,
				'key'   => $_size,
				'width'  => $w,
				'height' => $h,
				'crop'   => $crop,
				'ratio'  => round($w / $h, $precision ),
			);
		}
		
		return $sizes;
	}

	/**
	 *	Return if set of cropdata values is equal to another set of cropdata values.
	 *
	 *	@usedby intermediate_image_sizes_advanced
	 *	
	 *	@param $cropdata	associative array containing a set of cropdata
	 *	@param $other		associative array containing a set of cropdata to be compared
	 *	@return bool whether the to arguments are equal
	 */
	private function is_equal_cropdata( $cropdata, $other ) {
		$cropdata = (array) $cropdata;
		$other    = (array) $other;
		foreach ( $cropdata as $key => $val ) {
			if ( ! isset( $other[$key] ) || round($other[$key]) != round($val) ) {
				return false;
			}
		}
		return true;
	}
	
	
	private function sanitize_focuspoint( $focuspoint ) {
		$focuspoint = wp_parse_args( array_map('floatval',(array) $focuspoint), array(
			'x' => 0,
			'y' => 0,
		));
		
		return array(
			'x' => min( max( $focuspoint['x'], -1), 1),
			'y' => min( max( $focuspoint['y'], -1), 1),
		);
	
	}
	
}

WPRoboCropAdmin::getInstance();
