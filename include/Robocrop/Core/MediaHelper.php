<?php

namespace Robocrop\Core;

class MediaHelper extends Singleton {

	private $original_image_sizes = null;
	private $skip_filter = false;

	/**
	 *	@inheritdoc
	 */
	protected function __construct() {

		if ( get_option( 'robocrop_manage_sizes' ) ) {
			add_action( 'after_setup_theme', array( $this, 'add_image_sizes' ), 11 );
			add_filter( 'image_size_names_choose', array( $this, 'image_size_names_choose' ) );
		}
	}

	/**
	 *	@action after_setup_theme
	 */
	public function add_image_sizes() {

		if ( ( ! $sizes = get_option('robocrop_sizes') ) || ! is_array( $sizes ) ) {
			return;
		}
		if ( is_null( $this->original_image_sizes ) ) {
			$this->original_image_sizes = $this->get_image_sizes( false, true );
		}
		foreach ( array_keys( $this->original_image_sizes ) as $slug ) {
			remove_image_size( $slug );
		}
		foreach ( get_option('robocrop_sizes') as $slug => $size ) {
			/* @vars $name, $width, $height, $crop, $selectable */
			extract( $size );
			add_image_size( $key, $width, $height, $crop );
			// add scaled sizes
			if ( isset( $scaled ) ) {
				foreach ( $scaled as $suffix => $factor ) {
					$factor = floatval($factor);
					if ( $factor && 1 !== $factor ) {
						add_image_size( "{$key}-{$suffix}", $width * $factor, $height * $factor, $crop );
					}
				}
			}
		}

	}

	/**
	 *	@filter image_size_names_choose
	 */
	public function image_size_names_choose( $names ) {
		if ( $this->skip_filter || ! ( $sizes = get_option('robocrop_sizes') ) || ! is_array( $sizes ) ) {
			return $names;
		}

		foreach ( $sizes as $slug => $size ) {
			/* @vars $name, $width, $height, $crop, $selectable */
			extract( $size );
			if ( $selectable ) {
				$names[ $slug ] = $name;
			}
		}
		return $names;
	}


	/**
	 *	Get image ratios and a ratio to size mapping.
	 *
	 *	@return associateve array containing defined image ratios
	 */
	public function get_image_ratios( ) {
		$int_ratios = array();
		$ratios = array();
		$all_sizes = $this->get_image_sizes();
		foreach ( $all_sizes as $key => $size ) {
			if ( $size['crop'] ) {
				$ratio = $size['ratio'];
				$ratio_key = strval( $ratio ) . '_';
				$prec = apply_filters('robocrop_rounding_precision', 2 );
				if ( ! isset( $ratios[$ratio_key] ) ) {
					if ( $size['width'] >= $size['height'] ) { // landscape, square
						$ratio_name = sprintf( '%s : 1',
							round( $size['width'] / $size['height'], $prec )
						);

					} else { // portrait

						$ratio_name = sprintf( '1 : %s',
							round( $size['height'] / $size['width'], $prec )
						);
					}
					$ratios[$ratio_key] = array('sizes'=> array(), 'name' => $ratio_name, 'ratio' => $ratio, 'min_width' => 9999, 'min_height' => 9999 );
				}
				$ratios[$ratio_key]['sizes'][]    = $key;
				$ratios[$ratio_key]['min_width']  = min( $ratios[$ratio_key]['min_width'],  $size['width'] );
				$ratios[$ratio_key]['min_height'] = min( $ratios[$ratio_key]['min_height'], $size['height'] );
			}
		}
		ksort( $ratios, SORT_NUMERIC );
		return array_reverse($ratios);
	}

	/**
	 *	Get image size by width and height
	 *
	 *	@param	$width	int Image width
	 *	@param	$height	int Image height
	 *	@param	$crop	bool|null	crop yes, no or don't care
	 *
	 *	@return array with size slug and size array
	 */
	public function get_image_size( $width, $height, $crop = null ) {
		$sizes = $this->get_image_sizes();
		foreach ( $sizes as $key => $size ) {
			if ( $size['width'] == intval($width) &&
				 $size['height'] == intval($height) &&
				 (( ! is_null($crop) && $size['crop'] == $crop ) || is_null($crop))
			) {
				return array( $key, $size );
			}
		}
	}

	/**
	 *	Get all image sizes
	 *
	 *	@param	bool	$with_core	Include Core sizes thumbnail, medium, medium_large
	 *
	 *	@return assocative array with all image sizes, their names and labels
	 */
	public function get_image_sizes( $with_core = true, $unfiltered = false ) {

		global $_wp_additional_image_sizes;

		$this->skip_filter = $unfiltered;
		if ( $unfiltered && ! is_null( $this->original_image_sizes ) ) {
			return $this->original_image_sizes;
		}

		$sizes = array();

		/**
		 * Get rounding precision for image ratios.
		 * E.g. 16/9 = 1.7777777.. will be rounded to 1.78
		 *
		 * @param int $precision decimal places after rounding
		 */
		$precision = apply_filters('robocrop_rounding_precision', 2 );

		$core_sizes = array( 'thumbnail', 'medium', 'medium_large', 'large', 'full' );

		$core_size_names = array(
			'thumbnail' => __( 'Thumbnail' ),
			'medium'    => __( 'Medium' ),
			'large'     => __( 'Large' ),
			'full'      => __( 'Full Size' )
		);

		// get size names
		$size_names = apply_filters( 'image_size_names_choose', $core_size_names );

		$intermediate_image_sizes = get_intermediate_image_sizes();

		// Create the full array with sizes and crop info
		foreach( $intermediate_image_sizes as $_size ) {
			if ( ! $with_core && in_array( $_size, $core_sizes ) ) {
				continue;
			}

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
				'name'			=> isset( $size_names[$_size] ) ? $size_names[$_size] : $_size,
				'selectable'	=> isset( $size_names[$_size] ),
				'key'			=> $_size,
				'width'			=> $w,
				'height'		=> $h,
				'crop'			=> $crop,
				'ratio'			=> $w && $h ? round($w / $h, $precision ) : 0,
//				'scaled'		=> array(),
			);
		}
		$this->skip_filter = false;
		return $sizes;
	}


	/**
	 *	Get Crop geometry by focuspoint
	 *
	 *	@param	$orig_w		int Image width
	 *	@param	$orig_h		int Image height
	 *	@param	$dest_w		int Crop width
	 *	@param	$dest_h		int	Crop height
	 *	@param	$focuspoint	array	array( 'x' => (float) -1..1, 'y' => (float) -1..1 )
	 *
	 *	@return array array( 'x' => (int), 'y' => (int), 'width' => (int), 'height' => (int) )
	 */
	public function crop_from_focuspoint( $orig_w, $orig_h, $dest_w, $dest_h, $focuspoint ) {
		$fp_x	= (  $focuspoint['x'] + 1) / 2 * $orig_w;
		$fp_y	= ( -$focuspoint['y'] + 1) / 2 * $orig_h;

		$scale	= min( $orig_w / $dest_w, $orig_h / $dest_h );

		$crop_w	= $dest_w * $scale;
		$crop_h	= $dest_h * $scale;
		$crop_x	= min( max( $fp_x - $crop_w / 2, 0 ) , $orig_w - $crop_w );
		$crop_y	= min( max( $fp_y - $crop_h / 2, 0 ) , $orig_h - $crop_h );

		return array(
			'x'			=> round( $crop_x ),
			'y'			=> round( $crop_y ),
			'width'		=> round( $crop_w ),
			'height'	=> round( $crop_h ),
		);
	}

}
