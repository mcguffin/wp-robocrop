<?php

namespace Robocrop\Admin;
use Robocrop\Core;


class Attachment extends Core\Singleton {

	/**
	 *	@var Robocrop\Core\Core
	 */
	private $core;

	/**
	 *	@var Robocrop\Core\MediaHelper
	 */
	private $media_helper;


	private $_crop_meta				= array();

	private $_current_attachment_ID	= null;


	/**
	 *	Set hooks
	 */
	protected function __construct() {
		$this->core			= Core\Core::instance();
		$this->media_helper	= Core\MediaHelper::instance();

		add_action( 'add_attachment', array( $this, 'add_attachment' ) );

		add_action( 'edit_attachment', array( $this, 'edit_attachment' ) );

		add_filter( 'wp_generate_attachment_metadata', array( $this, 'wp_generate_attachment_metadata'), 10, 2 );

		add_filter( 'image_resize_dimensions', array( $this, 'image_resize_dimensions'), 10, 6 );

	}


	/**
	 *	On create attachment:
	 *	Add focuspoint to attachment meta
	 *
	 *	@param int		$attachment_ID
	 *	@param WP_Post	$attachment
	 *
	 *	@action add_attachment
	 */
	public function add_attachment( $attachment_ID ) {

		if ( ! wp_attachment_is_image( $attachment_ID ) ) {
			return;
		}

		$sizes = $this->media_helper->get_image_sizes();

		$this->_current_attachment_ID = $attachment_ID;

		if ( isset( $_REQUEST['focuspoint'] ) ) {
			// user set focuspoint
			$this->_crop_meta[ $attachment_ID ] = array(
				'focuspoint'	=> $this->sanitize_focuspoint( json_decode( stripslashes( $_REQUEST['focuspoint'] ) ) ),
			);

		} else {
			// default focuspoint
			$this->_crop_meta[ $attachment_ID ] = array(
				'focuspoint'	=> $this->sanitize_focuspoint( array() ), // set default 0/0
			);
		}
	}

	/**
	 *	On update attachment.
	 *
	 *	@param int		$attachment_ID
	 *	@param WP_Post	$attachment
	 *
	 *	@action edit_attachment
	 */
	public function edit_attachment( $attachment_ID ) {

		if ( ! wp_attachment_is_image( $attachment_ID ) ) {
			return;
		}

		$this->setup_crop_meta( $attachment_ID );

		if ( function_exists( 'wp_get_original_image_path' ) ) {
			$fullsizepath = wp_get_original_image_path( $attachment_ID );
		} else {
			$fullsizepath = get_attached_file( $attachment_ID );
		}

		// trigger sizes regeneration
		$metadata = wp_generate_attachment_metadata( $attachment_ID, $fullsizepath );
		if ( ! is_wp_error( $metadata ) && ! empty( $metadata ) ) {
			// If this fails, then it just means that nothing was changed (old value == new value)
			wp_update_attachment_metadata( $attachment_ID, $metadata );
		}
	}

	/**
	 *	Read cropdata from $_REQUEST
	 *	We're expecting absolute coords (x, y, width and height in pixel) here.
	 *
	 *	@param int		$attachment_ID
	 */
	public function setup_crop_meta( $attachment_ID ) {

		$this->_current_attachment_ID = $attachment_ID;

		$this->_crop_meta[ $attachment_ID ] = wp_get_attachment_metadata( $attachment_ID );

		// populate _crop_meta;
		if ( isset( $_REQUEST[ 'attachments' ][ $attachment_ID ] ) ) {
			if ( isset( $_REQUEST[ 'attachments' ][ $attachment_ID ]['sizes'] ) ) {

				// focuspoint from attachment
				if ( isset( $_REQUEST[ 'attachments' ][ $attachment_ID ][ 'focuspoint' ] ) ) {
					$this->_crop_meta[ $attachment_ID ][ 'focuspoint' ] = $this->sanitize_focuspoint( $_REQUEST[ 'attachments' ][ $attachment_ID ][ 'focuspoint' ] );
				}

				// store crop information from user request
				foreach ( $_REQUEST[ 'attachments' ][ $attachment_ID ]['sizes'] as $sizeslug => $req_size ) {
					if ( isset( $req_size['cropdata'] ) ) {

						// sanitize cropdata
						$size_cropdata = array_map( 'floatval', $req_size['cropdata'] );

						if ( ! isset( $this->_crop_meta[ $attachment_ID ]['sizes'] ) ) {
							$this->_crop_meta[ $attachment_ID ]['sizes'] = array();
						}

						if ( ! isset( $this->_crop_meta[ $attachment_ID ]['sizes'][ $sizeslug ] ) ) {
							$this->_crop_meta[ $attachment_ID ]['sizes'][ $sizeslug ] = array();
						}

						$this->_crop_meta[ $attachment_ID ]['sizes'][ $sizeslug ]['cropdata'] = $size_cropdata;
					}
				}
			}
		}

	}

	/**
	 *	Add crop data to image metadata
	 *
	 *	@filter 'wp_generate_attachment_metadata'
	 */
	public function wp_generate_attachment_metadata( $metadata, $attachment_ID ) {

		if ( ! wp_attachment_is_image( $attachment_ID ) ) {
			return $metadata;
		}

		$sizes = $this->media_helper->get_image_sizes();

		if ( isset( $this->_crop_meta[ $attachment_ID ]['focuspoint'] ) ) {

			// keep old value when updating from somewhere else
			$metadata['focuspoint'] = $this->_crop_meta[ $attachment_ID ]['focuspoint'];
		} else if ( ! isset( $metadata['focuspoint'] ) ) {
			$metadata['focuspoint'] = $this->sanitize_focuspoint( array() );
		}
		$orig_w = $metadata['width'];
		$orig_h = $metadata['height'];

		$remove_sizes = array();

		if ( isset( $metadata['sizes'] ) ) {
			foreach ( $metadata['sizes'] as $sizeslug => $size ) {
				$current_size = $sizes[$sizeslug];
//
				if ( $sizes[ $sizeslug ]['crop'] ) {
					$cancrop = $this->can_crop( $orig_w, $orig_h, $current_size['width'], $current_size['height'] );

					if ( ! $cancrop ) {
						$remove_sizes[] = $sizeslug;
					} else if ( isset( $this->_crop_meta[ $attachment_ID ]['sizes'][ $sizeslug ]['cropdata' ] ) ) {
						$metadata['sizes'][ $sizeslug ]['cropdata' ] = $this->_crop_meta[ $attachment_ID ]['sizes'][ $sizeslug ]['cropdata' ];
					}
				}
			}
		}

		foreach ( $remove_sizes as $sizeslug ) {
			unset($metadata['sizes'][ $sizeslug ]);
		}

		return $metadata;
	}

	/**
	 *	Whether an image can be cropped to a specific size
	 *
	 *	@param	int		$orig_w
	 *	@param	int		$orig_h
	 *	@param	int		$dest_w
	 *	@param	int		$dest_h
	 *
	 *	@return bool
	 */
	private function can_crop( $orig_w, $orig_h, $dest_w, $dest_h ) {
		return ( $orig_w >= $dest_w ) && ( $orig_h >= $dest_h );


	}

	/**
	 *	Filter applied by image editor instance
	 *
	 *	@param	string	$sizeslug
	 *	@param	array	$focuspoint
	 *	@param	int		$orig_w
	 *	@param	int		$orig_h
	 *
	 *	@return array	array( 'x' => (int), 'y' => (int), 'width' => (int), 'height' => (int),  )
	 */
	private function generate_cropdata( $sizeslug, $focuspoint, $orig_w, $orig_h ) {

		$sizes		= $this->media_helper->get_image_sizes();
		$size		= $sizes[ $sizeslug ];

		$cropdata	= $this->media_helper->crop_from_focuspoint( $orig_w, $orig_h, $size['width'], $size['height'], $focuspoint );

		return $cropdata;
	}

	/**
	 *	Filter applied by image editor instance
	 *
	 *	@filter 'image_resize_dimensions'
	 */
	public function image_resize_dimensions( $result, $orig_w, $orig_h, $dest_w, $dest_h, $crop ) {

		if ( $crop && $this->can_crop( $orig_w, $orig_h, $dest_w, $dest_h )) {
			$cropsize = false;

			// get sizeslug and size
			list( $sizeslug, $size ) = $this->media_helper->get_image_size( $dest_w, $dest_h, $crop );

			// get cropsize from previously stored image meta
			if ( $cropsize = $this->get_current_cropdata( $sizeslug, $orig_w, $orig_h ) ) {
				$result = array( 0, 0, $cropsize['x'], $cropsize['y'], $dest_w, $dest_h, $cropsize['width'], $cropsize['height'] );
			}
		}
		return $result;
	}

	/**
	 *	@return bool|array
	 */
	private function get_current_cropdata( $sizeslug, $orig_w = 0, $orig_h = 0 ) {
		if ( isset( $this->_crop_meta[ $this->_current_attachment_ID ]['sizes'][ $sizeslug ]['cropdata' ] ) ) {

			// explicit cropdata available
			return $this->_crop_meta[ $this->_current_attachment_ID ]['sizes'][ $sizeslug ]['cropdata' ];

		} else if ( $orig_w && $orig_h && isset( $this->_crop_meta[ $this->_current_attachment_ID ][ 'focuspoint' ] ) ) {
			// focuspoint available
			// set cropdata
			$this->_crop_meta[ $this->_current_attachment_ID ][ 'sizes' ][ $sizeslug ]['cropdata'] = $this->generate_cropdata( $sizeslug, $this->_crop_meta[ $this->_current_attachment_ID ][ 'focuspoint' ], $orig_w, $orig_h );
			return $this->_crop_meta[ $this->_current_attachment_ID ][ 'sizes' ][ $sizeslug ]['cropdata'];

		}
		return false;

	}

	/**
	 *	Return if set of cropdata values is equal to another set of cropdata values.
	 *
	 *	@param $cropdata	associative array containing a set of cropdata
	 *	@param $other		set of cropdata to be compared
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

	/**
	 *	Sanitize focuspoint
	 *	Default
	 *
	 *	@param	mixed	$focuspoint
	 *	@return array	array( 'x' => (int) -1..1, 'y' => (int) -1..1 )
	 *					default: array( 'x' => 0, 'y' => 0 )
	 */
	private function sanitize_focuspoint( $focuspoint ) {
		$focuspoint = wp_parse_args( array_map('floatval', (array) $focuspoint ), array(
			'x' => 0,
			'y' => 0,
		));

		return array(
			'x' => min( max( $focuspoint['x'], -1), 1),
			'y' => min( max( $focuspoint['y'], -1), 1),
		);
	}

}
