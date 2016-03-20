<?php

if ( ! defined('ABSPATH') ) 
	die();

?>
	<script type="text/html" id="tmpl-robocrop">
		<div class="robocrop-sidebar">
			<div class="select-ratio"></div>
			<div class="box actions">
				<button class="button robocrop-cancel"><?php _e('Close','wp-robocrop'); ?></button>
				<button class="button robocrop-autocrop"><?php _e('Auto','wp-robocrop'); ?></button>
				<button class="button-primary robocrop-save" disabled="disabled"><?php _e('Save','wp-robocrop'); ?></button>
			</div>
		</div>

		<div class="robocrop-content">
			<div class="robocrop-image-box">
			</div>
		</div>
	</script>
