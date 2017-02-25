<?php

namespace Robocrop\Core;

class MediaHelper extends Singleton {

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
	public function get_image_size( $width, $height, $crop = null ) {
		$sizes = $this->get_image_sizes();
		foreach ( $sizes as $key => $size ) {
			if ( $size['width'] == intval($width) &&
				 $size['height'] == intval($height) &&
				 (( ! is_null($crop) && $size['crop'] == $crop ) || is_null($crop))
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
	public function get_image_sizes( ) {

		global $_wp_additional_image_sizes;

		$sizes = array();

		/**
		 * Get rounding precision for image ratios.
		 * E.g. 16/9 = 1.7777777.. will be rounded to 1.7778
		 *
		 * @param int $precision decimal places after rounding
		 */
		$precision = apply_filters('robocrop_rounding_precision', 2 );
		
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
				'ratio'  => $w && $h ? round($w / $h, $precision ) : 0,
			);
		}
		
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
		$crop_x	= min( max( $fp_y - $crop_h / 2, 0 ) , $orig_h - $crop_h );

		return array(
			'x'			=> round( $crop_x ),
			'y'			=> round( $crop_y ),
			'width'		=> round( $crop_w ),
			'height'	=> round( $crop_h ),
		);
	}

}