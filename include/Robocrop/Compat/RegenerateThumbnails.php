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
		add_action('wp_ajax_regeneratethumbnail',array( $this,'ajax_regeneratethumbnail'), 1 );
	}

	/**
	 *	Hook into regen-thumbs ajax_regeneratethumbnail
	 *
	 *	@action wp_ajax_regeneratethumbnail
	 */
	public function ajax_regeneratethumbnail() {
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
