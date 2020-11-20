<?php

if ( ! defined('ABSPATH') ) 
	die();

?>
	<script type="text/html" id="tmpl-robocrop">
		<div class="robocrop-sidebar">
			<div class="select-ratio"></div>
			<div class="box actions">
				<button class="button robocrop-autocrop-current"><?php esc_html_e('Apply Focus Point','wp-robocrop'); ?></button>
				<button class="button robocrop-autocrop-all"><?php esc_html_e('Apply to all sizes','wp-robocrop'); ?></button>
			</div>
		</div>

		<div class="robocrop-content">
		</div>
	</script>
