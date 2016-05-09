<?php

if ( ! defined('ABSPATH') ) 
	die();

?>
	<script type="text/html" id="tmpl-robocrop-modal">
		<div class="media-modal robocrop-modal wp-core-ui">
			<button type="button" class="button-link media-modal-prev"><span class="dashicons dashicons-arrow-left-alt2"><span class="screen-reader-text"><?php _e('Previous'); ?></span></span></button>
			<button type="button" class="button-link media-modal-next"><span class="dashicons dashicons-arrow-right-alt2"><span class="screen-reader-text"><?php _e('Next'); ?></span></span></button>
			<button type="button" class="button-link media-modal-close"><span class="media-modal-icon"><span class="screen-reader-text"><?php _e('Close'); ?></span></span></button>
			<div class="media-modal-content">
				<div class="media-frame-title">
					<h1><?php _e( 'Attachment Details', 'wp-robocrop' ) ?></h1>
				</div>
				<div class="media-frame-content"></div>
				<div class="media-frame-toolbar">
					<div class="media-frame-instructions"></div>
					<div class="media-frame-buttons"></div>
				</div>
			</div>
		</div>
	</script>
