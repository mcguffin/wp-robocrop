<?php

namespace Robocrop\Compat;

use Robocrop\Admin;
use Robocrop\Core;

class RegenerateThumbnails extends Core\Singleton {

	private $stored_meta;

	/**
	 *	@inheritdoc
	 */
	protected function __construct() {
		// v1+
		add_action('wp_ajax_regeneratethumbnail',array( $this,'prepare_request_data'), 1 );

		// v3
		add_filter('rest_pre_dispatch',array( $this,'rest_pre_dispatch'), 1, 3 );
	}

	/**
	 *	Hook into regen-thumbs ajax_regeneratethumbnail
	 *
	 *	@action rest_pre_dispatch
	 */
	public function rest_pre_dispatch( $result, $wp_rest_server, $request ) {
		if ( -1 !== strpos( '/regenerate-thumbnails', $request->get_route() ) ) {
			$_REQUEST['id'] = preg_replace('/.*\/(\d+)$/imsU','\1',$request->get_route());
			$this->prepare_request_data();
		}
		return $result;
	}

	/**
	 *	Hook into regen-thumbs ajax_regeneratethumbnail
	 *
	 *	@action wp_ajax_regeneratethumbnail
	 */
	public function prepare_request_data() {
		$attachment_id = (int) $_REQUEST['id'];
		$prev_meta = wp_get_attachment_metadata( $attachment_id, true );

		$admin = Admin\Attachment::instance();

		// focuspoint
		if ( isset( $prev_meta['focuspoint'] ) ) {
			$_REQUEST['focuspoint'] = json_encode( $prev_meta['focuspoint'] );
			$admin->add_attachment( $attachment_id );
		}

		// individual cropdata
		if ( isset( $prev_meta['sizes'] ) ) {
			$sizeupdate = array();

			foreach ( $prev_meta['sizes'] as $sizeslug => $size_meta ) {
				if ( isset( $size_meta['cropdata'] ) ) {
					$sizeupdate[ $sizeslug ] = array(
						'cropdata'	=> $size_meta['cropdata'],
					);
				}
			}

			if ( count( $sizeupdate ) ) {
				$_REQUEST[ 'attachments' ] = array( $attachment_id => array(
					'sizes'	=> $sizeupdate,
				) );
				$admin->setup_crop_meta( $attachment_id );
			}
		}
	}

}
